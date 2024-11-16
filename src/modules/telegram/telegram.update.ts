import {
  Action,
  Ctx,
  Help,
  InjectBot,
  Message,
  On,
  Settings,
  Start,
  Update,
} from 'nestjs-telegraf';
import { Markup, Telegraf } from 'telegraf';
import { Context } from './interfaces/context.interface';
import { FirebaseService, Firestore } from '../firebase/firebase.service';
import { EncryptionService } from '../encryption/encryption.service';
import * as crypto from 'crypto';
import { PortfolioService } from '../1inch/portfolio.service';
import { TokenService } from '../1inch/token.service';
import { Wallet } from 'ethers';
import { Positions } from './decorators/positions.decorator';
import { RpcService } from '../1inch/rpc.service';

@Update()
export class TelegramUpdate {
  private readonly firestore: Firestore;
  constructor(
    @InjectBot()
    private readonly bot: Telegraf<Context>,
    private readonly firebaseService: FirebaseService,
    private readonly encryptionService: EncryptionService,
    private readonly portfolioService: PortfolioService,
    private readonly tokenService: TokenService,
    private readonly rpcService: RpcService,
  ) {
    this.firestore = this.firebaseService.getFirestore();
  }

  private createBuyButtons(
    contractAddress: string,
    chainId: number,
    amounts: number[] = [0.1, 0.2, 0.5],
  ) {
    return amounts.map((amount) =>
      Markup.button.callback(
        `🛒 Buy ${amount} ETH`,
        `buy_${contractAddress}_${chainId}_${amount}`,
      ),
    );
  }

  private getChainId(chainIdString: string) {
    let chainId = 1;
    if (chainIdString.toLowerCase() === 'base') {
      chainId = 8453;
    }
    return chainId;
  }

  @Start()
  @Action('start')
  async onStart(ctx: Context) {
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
    if (!isGroup) {
      const welcomeMessage = `Welcome! Add me to your group to start trading.`;
      await ctx.reply(welcomeMessage);
    } else {
      const groupId = ctx.chat.id.toString();
      const groupRef = this.firestore.collection('groups').doc(groupId);
      // Get group settings
      const settings = await groupRef.get();
      const defaultSettings = {
        buySize: 0.01,
        slippage: 2.5,
        tradingEnabled: true,
      };
      let address = settings.data()?.address || '';
      // If settings not found, create default settings
      if (!settings.exists) {
        // generate private key
        const privateKey = crypto.randomBytes(32).toString('hex');
        const encryptedPrivateKey = this.encryptionService.encrypt(privateKey);
        const wallet = new Wallet(`0x${privateKey}`);
        address = await wallet.getAddress();

        await groupRef.set({
          groupName: ctx.chat.title,
          createdAt: new Date(),
          createdBy: {
            id: ctx.from.id,
            username: ctx.from.username,
          },
          encryptedPrivateKey,
          address,
          settings: defaultSettings,
        });
      }

      const baseBalance = await this.rpcService.getEtherBalance(address, 8453);
      const ethBalance = await this.rpcService.getEtherBalance(address, 1);
      // const scrollBalance = await this.rpcService.getEtherBalance(
      //   address,
      //   534352,
      // );
      // const polygonBalance = await this.rpcService.getEtherBalance(
      //   address,
      //   137,
      // );
      // const lineaBalance = await this.rpcService.getEtherBalance(
      //   address,
      //   59144,
      // );
      const scrollBalance = 0;
      const polygonBalance = 0;
      const lineaBalance = 0;

      const welcomeMessage =
        `*Welcome to Moon Gang* 🚀\n\n` +
        `*Start Depositing:*\n` +
        `\`${address}\`\n\n` +
        `*Ethereum* 🦇\n` +
        `Balance: ${ethBalance} ETH ($0.00)\n\n` +
        `*Base* 🔷\n` +
        `Balance: ${baseBalance} ETH ($0.00)\n\n` +
        `*Scroll* 📜\n` +
        `Balance: ${scrollBalance} ETH ($0.00)\n\n` +
        `*Polygon* 🟣\n` +
        `Balance: ${polygonBalance} ETH ($0.00)\n\n` +
        `*Linea* 🖥️\n` +
        `Balance: ${lineaBalance} ETH ($0.00)\n\n`;

      const mainKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'refresh_balance')],
        [
          Markup.button.callback('📊 Positions', 'positions'),
          Markup.button.callback('📤 Settings', 'settings'),
        ],
      ]);

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...mainKeyboard,
      });
    }
  }

  @Action('refresh_balance')
  async onRefreshBalance(ctx: Context) {
    try {
      // Delete the previous message
      await ctx.deleteMessage();

      // Show loading state to user
      await ctx.answerCbQuery('Refreshing balances...');

      // Call onStart to show the fresh data
      await this.onStart(ctx);
    } catch (error) {
      console.error('Error refreshing balance:', error);
      await ctx.answerCbQuery('Error refreshing balances. Please try again.');
    }
  }

  @Action('refresh_positions')
  async onRefreshPositions(ctx: Context) {
    try {
      // Delete the previous message
      await ctx.deleteMessage();

      // Show loading state to user
      await ctx.answerCbQuery('Refreshing balances...');

      // Call onStart to show the fresh data
      await this.onStart(ctx);
    } catch (error) {
      console.error('Error refreshing balance:', error);
      await ctx.answerCbQuery('Error refreshing balances. Please try again.');
    }
  }

  @Action('settings')
  @Settings()
  async onSettings(ctx: Context) {
    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);
    const settings = await groupRef.get();
    const currentSettings = settings.data()?.settings;

    const message = `Current Settings:`;
    const mainKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          `Slippage: ${currentSettings.slippage}`,
          'change_slippage',
        ),
        Markup.button.callback(
          `Buy Size: ${currentSettings.buySize}`,
          'change_buy_size',
        ),
      ],
      [
        Markup.button.callback(
          `Trading Enabled: ${currentSettings.tradingEnabled ? 'Yes' : 'No'}`,
          'change_trading_enabled',
        ),
      ],
    ]);
    await ctx.reply(message, mainKeyboard);
  }

  @Action('positions')
  @Positions()
  async onPositions(ctx: Context) {
    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);
    const data = await groupRef.get();
    // const address = data.data()?.address;
    const tokens = data.data()?.related_tokens || [];

    const address = '0x58ffd1447e30ede4f53f9ebbc7e8c93861c59e62';

    const response = await this.portfolioService.getBalance(address, 1);
    console.log(response);

    // // TEMP
    // const positions = [
    //   {
    //     user: 'Alice',
    //     totalBalance: 2,
    //     ethBalance: 0.5,
    //     baseBalance: 1.5,
    //     scrollBalance: 0.5,
    //     tokens: [
    //       {
    //         name: 'Pepe Token',
    //         symbol: 'PEPE',
    //         contractAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
    //         amount: 1000000,
    //         amountUSD: 5000,
    //         price: 0.000005,
    //         marketCap: 5000000,
    //         avgEntry: 0.000004,
    //         pnlUSD: 1000,
    //         pnlPercentage: 25,
    //       },
    //       {
    //         name: 'Doge Token',
    //         symbol: 'DOGE',
    //         contractAddress: '0x1234567890123456789012345678901234567890',
    //         amount: 50000,
    //         amountUSD: 3000,
    //         price: 0.06,
    //         marketCap: 8000000,
    //         avgEntry: 0.05,
    //         pnlUSD: 500,
    //         pnlPercentage: 20,
    //       },
    //     ],
    //   },
    //   {
    //     user: 'Bob',
    //     totalBalance: 2,
    //     ethBalance: 0.5,
    //     baseBalance: 1.5,
    //     scrollBalance: 0.5,
    //     tokens: [
    //       {
    //         name: 'Moon Coin',
    //         symbol: 'MOON',
    //         contractAddress: '0x9876543210987654321098765432109876543210',
    //         amount: 75000,
    //         amountUSD: 7500,
    //         price: 0.1,
    //         marketCap: 10000000,
    //         avgEntry: 0.08,
    //         pnlUSD: 1500,
    //         pnlPercentage: 30,
    //       },
    //     ],
    //   },
    // ];
    // const message =
    //   `*📊 Current Balance*\n\n` +
    //   positions
    //     .map(
    //       (position) =>
    //         `👤 *${position.user}*\n` +
    //         `💰 Total Balance: $${position.totalBalance.toFixed(4)}\n` +
    //         `⚡ ETH Balance: ${position.ethBalance.toFixed(4)} ETH\n` +
    //         `🔵 Base Balance: ${position.baseBalance.toFixed(4)} ETH\n` +
    //         `📜 Scroll Balance: ${position.scrollBalance.toFixed(4)} ETH\n`,
    //     )
    //     .join('\n') +
    //   `\n*🎯 Active Positions*\n\n` +
    //   positions
    //     .map((position) =>
    //       position.tokens
    //         .map(
    //           (token) =>
    //             `👤 *${position.user}'s Position*\n` +
    //             `*${token.name}* (${token.symbol})\n` +
    //             `📍 \`${token.contractAddress}\`\n` +
    //             `💎 Holdings: ${token.amount.toFixed(4)} ${
    //               token.symbol
    //             } ($${token.amountUSD.toLocaleString()})\n` +
    //             `💵 Price: $${token.price.toFixed(
    //               6,
    //             )} | MC: $${token.marketCap.toLocaleString()}\n` +
    //             `📈 Avg Entry: $${token.avgEntry.toFixed(6)}\n` +
    //             `💫 PNL: $${token.pnlUSD.toLocaleString()} (${token.pnlPercentage.toFixed(
    //               2,
    //             )}%)\n`,
    //         )
    //         .join('\n\n'),
    //     )
    //     .join('\n\n');

    // await ctx.reply(message, {
    //   parse_mode: 'Markdown',
    //   ...Markup.inlineKeyboard([
    //     [Markup.button.callback('🔄 Refresh', 'refresh_positions')],
    //     [Markup.button.callback('🏠 Home', 'start')],
    //   ]),
    // });
  }

  @Action('change_slippage')
  async onChangeSlippage(ctx: Context) {
    await ctx.reply(
      'Please enter the new slippage percentage (0.1 to 100):\n' +
        'Format: /slippage <value>\n' +
        'Example: /slippage 2.5',
    );
  }

  @Action('change_buy_size')
  async onChangeBuySize(ctx: Context) {
    await ctx.reply(
      'Please enter the new buy size (ETH):\n' +
        'Format: /buy_size <value>\n' +
        'Example: /buy_size 0.5',
    );
  }

  @Action('change_trading_enabled')
  async onChangeTradingEnabled(ctx: Context) {
    await ctx.reply(
      'Please enter the new trading enabled (true/false):\n' +
        'Format: /trading_enabled <value>\n' +
        'Example: /trading_enabled true',
    );
  }

  @Help()
  async onHelp(): Promise<string> {
    return 'Send me any text';
  }

  async handleSlippage(text: string, ctx: Context) {
    const slippageValue = parseFloat(text.split(' ')[1]);

    if (isNaN(slippageValue) || slippageValue < 0.1 || slippageValue > 100) {
      await ctx.reply(
        'Invalid slippage value. Please enter a number between 0.1 and 100.',
      );
      return;
    }

    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);

    await groupRef.update({
      'settings.slippage': slippageValue,
    });

    await ctx.reply(`Slippage has been updated to ${slippageValue}%`);

    // Refresh settings view
    await this.onSettings(ctx);
  }

  async handleBuySize(text: string, ctx: Context) {
    const buySizeValue = parseFloat(text.split(' ')[1]);
    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);

    await groupRef.update({
      'settings.buySize': buySizeValue,
    });

    await ctx.reply(`Buy size has been updated to ${buySizeValue}`);

    // Refresh settings view
    await this.onSettings(ctx);
  }

  async handleTradingEnabled(text: string, ctx: Context) {
    const tradingEnabledValue = text.split(' ')[1].toLowerCase() === 'true';

    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);

    await groupRef.update({
      'settings.tradingEnabled': tradingEnabledValue,
    });

    await ctx.reply(
      `Trading enabled has been updated to ${tradingEnabledValue}`,
    );

    // Refresh settings view
    await this.onSettings(ctx);
  }

  async handleContractAddress(contractAddress: string, ctx: Context) {
    // // handle Buy
    // const groupId = ctx.chat.id.toString();
    // const groupRef = this.firestore.collection('groups').doc(groupId);
    // const encryptedPrivateKey = await groupRef.get();
    // const decryptedPrivateKey = this.encryptionService.decrypt(
    //   encryptedPrivateKey.data()?.encryptedPrivateKey,
    // );
    // console.log(decryptedPrivateKey);

    // // save calls to firestore
    // const username = ctx.from.username || ctx.from.first_name;
    // const callRef = this.firestore.collection('calls').doc();
    // await callRef.set({
    //   contractAddress,
    //   createdBy: username,
    //   createdAt: new Date(),
    // });

    // save holding to firestore

    // reply
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`,
    );
    const data = await response.json();
    const pair = data.pairs[0] || null;
    if (!pair) {
      return;
    }
    const tokenMessage =
      `*${pair.baseToken.name} (${pair.baseToken.symbol})* 🎯\n\n` +
      `*Price:* $${parseFloat(pair.priceUsd).toFixed(4)}\n` +
      `*24h Change:* ${pair.priceChange.h24}%\n\n` +
      `*Liquidity:* $${Math.round(pair.liquidity.usd).toLocaleString()}\n` +
      `*Market Cap:* $${Math.round(pair.marketCap).toLocaleString()}\n\n` +
      `*24h Volume:* $${Math.round(pair.volume.h24).toLocaleString()}\n` +
      `*24h Trades:* ${pair.txns.h24.buys + pair.txns.h24.sells}\n` +
      `*Contract:* \`${contractAddress}\`\n\n` +
      `[View Chart 📊](${pair.url})`;

    const chainId = this.getChainId(pair.chainId);

    const actionKeyboard = Markup.inlineKeyboard([
      this.createBuyButtons(contractAddress, chainId),
      [Markup.button.callback('🔄 Refresh', `refresh_${contractAddress}`)],
    ]);

    await ctx.reply(tokenMessage, {
      parse_mode: 'Markdown',
      ...actionKeyboard,
    });
  }

  @Action(/^buy_0x[a-fA-F0-9]{40}_[0-9]+_[0-9.]+$/)
  async onBuyToken(ctx: Context & { callbackQuery: { data: string } }) {
    try {
      const [_, contractAddress, chainId, amount] =
        ctx.callbackQuery.data.split('_');
      const buyAmount = parseFloat(amount);

      // Show loading state
      await ctx.answerCbQuery(`Processing buy order for ${buyAmount} ETH...`);

      // TODO: Implement your buy logic here using contractAddress, chainId, and buyAmount
      // await this.portfolioService.buyToken(contractAddress, chainId, buyAmount);

      const groupId = ctx.chat.id.toString();
      const groupRef = this.firestore.collection('groups').doc(groupId);
      const data = await groupRef.get();
      await groupRef.update({
        related_tokens: [
          ...(data.data()?.related_tokens || []),
          { contractAddress, chainId },
        ],
      });

      await ctx.reply(
        `Buy order placed for ${buyAmount} ETH of ${contractAddress}`,
        Markup.inlineKeyboard([
          [Markup.button.callback('📊 Position', 'positions')],
        ]),
      );
    } catch (error) {
      console.error('Error processing buy:', error);
      await ctx.answerCbQuery('Error processing buy order. Please try again.');
    }
  }

  @Action(/^refresh_0x[a-fA-F0-9]{40}$/)
  async onRefreshToken(ctx: Context & { callbackQuery: { data: string } }) {
    try {
      // Extract contract address from the callback data
      const contractAddress = ctx.callbackQuery.data.split('_')[1];

      // Delete the previous message
      await ctx.deleteMessage();

      // Show loading state to user
      await ctx.answerCbQuery('Refreshing token info...');

      // Call handleContractAddress to show fresh data
      await this.handleContractAddress(contractAddress, ctx);
    } catch (error) {
      console.error('Error refreshing token info:', error);
      await ctx.answerCbQuery('Error refreshing token info. Please try again.');
    }
  }

  @On('text')
  async onMessage(@Message('text') text: string, @Ctx() ctx: Context) {
    const chatType = ctx.chat.type;

    if (chatType === 'group' || chatType === 'supergroup') {
      // Handle slippage command
      if (text.startsWith('/slippage')) {
        await this.handleSlippage(text, ctx);
        return;
      }

      // Handle buy size command
      if (text.startsWith('/buy_size')) {
        await this.handleBuySize(text, ctx);
        return;
      }

      // Handle trading enabled command
      if (text.startsWith('/trading_enabled')) {
        await this.handleTradingEnabled(text, ctx);
        return;
      }

      if (text.match(/0x[a-fA-F0-9]{40}/)) {
        // Contract address detected
        const contractAddress = text.match(/0x[a-fA-F0-9]{40}/)[0];
        await this.handleContractAddress(contractAddress, ctx);
        return;
      }
    } else {
      const welcomeMessage = `Welcome! Add me to your group to start trading.`;
      await ctx.reply(welcomeMessage);
    }
  }
}
