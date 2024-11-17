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
import { Wallet, utils } from 'ethers';
import { Positions } from './decorators/positions.decorator';
import { RpcService } from '../1inch/rpc.service';
import { AgentService } from '../agent/agent.service';
import { PositionService } from '../position/position.service';
import { SwapScrollService } from '../swapuniv2/swapscroll.service';
import { SwapflowService } from '../swapuniv2/swapflow.service';

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
    private readonly agentService: AgentService,
    private readonly positionService: PositionService,
    private readonly swapScrollService: SwapScrollService,
    private readonly swapFlowService: SwapflowService,
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
        `🛒 ${amount} ETH`,
        `buy_${contractAddress}_${chainId}_${amount}`,
      ),
    );
  }

  private async createBuyButtonsPercent(
    contractAddress: string,
    address,
    chainId: number,
    percents: number[] = [10, 20, 50],
  ) {
    // const ethBalance = await this.rpcService.getEtherBalance(address, chainId);
    const ethBalance = 0.001;
    return percents.map((percent) => {
      const amount = ((Number(ethBalance) * percent) / 100).toFixed(3);
      return Markup.button.callback(
        `🛒 ${percent}%`,
        `buy_${contractAddress}_${chainId}_${amount}`,
      );
    });
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
      const flowBalance = await this.rpcService.getEtherBalance(address, 747);

      const ethUsdPrice = 3000;
      const flowUsdPrice = 0.66;
      const usdBalances = {
        eth: Number(ethBalance) * ethUsdPrice,
        base: Number(baseBalance) * ethUsdPrice,
        scroll: Number(scrollBalance) * ethUsdPrice,
        polygon: Number(polygonBalance) * ethUsdPrice,
        linea: Number(lineaBalance) * ethUsdPrice,
        flow: Number(flowBalance) * flowUsdPrice,
      };

      const welcomeMessage =
        `*Welcome to Moon Gang* 🚀\n\n` +
        `*Start Depositing:*\n` +
        `\`${address}\`\n\n` +
        `*Ethereum* 🦇\n` +
        `Balance: ${ethBalance} ETH ($${usdBalances.eth.toFixed(2)})\n\n` +
        `*Base* 🔷\n` +
        `Balance: ${baseBalance} ETH ($${usdBalances.base.toFixed(2)})\n\n` +
        `*Scroll* 📜\n` +
        `Balance: ${scrollBalance} ETH ($${usdBalances.scroll.toFixed(
          2,
        )})\n\n` +
        `*Polygon* 🟣\n` +
        `Balance: ${polygonBalance} ETH ($${usdBalances.polygon.toFixed(
          2,
        )})\n\n` +
        `*Linea* 🖥️\n` +
        `Balance: ${lineaBalance} ETH ($${usdBalances.linea.toFixed(2)})\n\n` +
        `*Flow* 💚\n` +
        `Balance: ${flowBalance} FLOW ($${usdBalances.flow.toFixed(2)})\n\n`;

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
      await ctx.answerCbQuery('Refreshing Positions...');

      // Call onStart to show the fresh data
      await this.onPositions(ctx);
    } catch (error) {
      console.error('Error refreshing positions:', error);
      await ctx.answerCbQuery('Error refreshing positions. Please try again.');
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

    // TEMP
    const positions = [
      {
        user: 'Alice',
        totalBalance: 2,
        ethBalance: 0.5,
        baseBalance: 1.5,
        scrollBalance: 0.5,
        tokens: [
          {
            name: 'Pepe Token',
            symbol: 'PEPE',
            contractAddress: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
            amount: 1000000,
            amountUSD: 5000,
            price: 0.000005,
            marketCap: 5000000,
            avgEntry: 0.000004,
            pnlUSD: 1000,
            pnlPercentage: 25,
          },
          {
            name: 'Doge Token',
            symbol: 'DOGE',
            contractAddress: '0x1234567890123456789012345678901234567890',
            amount: 50000,
            amountUSD: 3000,
            price: 0.06,
            marketCap: 8000000,
            avgEntry: 0.05,
            pnlUSD: 500,
            pnlPercentage: 20,
          },
        ],
      },
      {
        user: 'Bob',
        totalBalance: 2,
        ethBalance: 0.5,
        baseBalance: 1.5,
        scrollBalance: 0.5,
        tokens: [
          {
            name: 'Moon Coin',
            symbol: 'MOON',
            contractAddress: '0x9876543210987654321098765432109876543210',
            amount: 75000,
            amountUSD: 7500,
            price: 0.1,
            marketCap: 10000000,
            avgEntry: 0.08,
            pnlUSD: 1500,
            pnlPercentage: 30,
          },
        ],
      },
    ];
    const message =
      `*📊 Current Balance*\n\n` +
      positions
        .map(
          (position) =>
            `👤 *${position.user}*\n` +
            `💰 Total Balance: $${position.totalBalance.toFixed(4)}\n` +
            `⚡ ETH Balance: ${position.ethBalance.toFixed(4)} ETH\n` +
            `🔵 Base Balance: ${position.baseBalance.toFixed(4)} ETH\n` +
            `📜 Scroll Balance: ${position.scrollBalance.toFixed(4)} ETH\n`,
        )
        .join('\n') +
      `\n*🎯 Active Positions*\n\n` +
      positions
        .map((position) =>
          position.tokens
            .map(
              (token) =>
                `👤 *${position.user}'s Position*\n` +
                `*${token.name}* (${token.symbol})\n` +
                `📍 \`${token.contractAddress}\`\n` +
                `💎 Holdings: ${token.amount.toFixed(4)} ${
                  token.symbol
                } ($${token.amountUSD.toLocaleString()})\n` +
                `💵 Price: $${token.price.toFixed(
                  6,
                )} | MC: $${token.marketCap.toLocaleString()}\n` +
                `📈 Avg Entry: $${token.avgEntry.toFixed(6)}\n` +
                `💫 PNL: $${token.pnlUSD.toLocaleString()} (${token.pnlPercentage.toFixed(
                  2,
                )}%)\n`,
            )
            .join('\n\n'),
        )
        .join('\n\n');

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'refresh_positions')],
        [Markup.button.callback('🏠 Home', 'start')],
      ]),
    });
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

  async handleSetSlippage(text: string, ctx: Context) {
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

  async handleSetBuySize(text: string, ctx: Context) {
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

  async handleSetTradingEnabled(text: string, ctx: Context) {
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
    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);
    const groupData = await groupRef.get();
    const decryptedPrivateKey = this.encryptionService.decrypt(
      groupData.data()?.encryptedPrivateKey,
    );
    const address = groupData.data()?.address;

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
    const pair = data.pairs && data.pairs.length > 0 ? data.pairs[0] : null;
    let tokenMessage = '';
    let chainId = 0;
    if (!pair) {
      // check flow
      const flow_response = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/flow-evm/tokens/${contractAddress}/pools`,
      );
      const flow_data = await flow_response.json();
      const pair =
        flow_data.data && flow_data.data.length > 0 ? flow_data.data[0] : null;
      if (!pair) {
        // check bitkub
        const bitkub_response = await fetch(
          `https://api.geckoterminal.com/api/v2/networks/bitkub_chain/tokens/${contractAddress}/pools`,
        );
        const bitkub_data = await bitkub_response.json();
        const pair =
          bitkub_data.data && bitkub_data.data.length > 0
            ? bitkub_data.data[0]
            : null;
        if (!pair) {
          return;
        } else {
          tokenMessage =
            `*${pair.attributes.name}* 🎯\n\n` +
            `*Price:* $${parseFloat(pair.attributes.token_price_usd).toFixed(
              4,
            )}\n` +
            `*24h Change:* ${pair.attributes.price_change_percentage.h24}%\n\n` +
            `*Liquidity:* $${Math.round(
              pair.attributes.reserve_in_usd,
            ).toLocaleString()}\n` +
            `*Market Cap:* $${Math.round(
              pair.attributes.fdv_usd,
            ).toLocaleString()}\n\n` +
            `*24h Volume:* $${Math.round(
              pair.attributes.volume_usd.h24,
            ).toLocaleString()}\n` +
            `*24h Trades:* ${
              pair.attributes.transactions.h24.buys +
              pair.attributes.transactions.h24.sells
            }\n` +
            `*Contract:* \`${contractAddress}\`\n\n` +
            `[View Chart 📊](https://www.geckoterminal.com/bitkub_chain/pools/${pair.attributes.address})`;
          chainId = 96;
        }
      } else {
        tokenMessage =
          `*${pair.attributes.name}* 🎯\n\n` +
          `*Price:* $${parseFloat(pair.attributes.token_price_usd).toFixed(
            4,
          )}\n` +
          `*24h Change:* ${pair.attributes.price_change_percentage.h24}%\n\n` +
          `*Liquidity:* $${Math.round(
            pair.attributes.reserve_in_usd,
          ).toLocaleString()}\n` +
          `*Market Cap:* $${Math.round(
            pair.attributes.fdv_usd,
          ).toLocaleString()}\n\n` +
          `*24h Volume:* $${Math.round(
            pair.attributes.volume_usd.h24,
          ).toLocaleString()}\n` +
          `*24h Trades:* ${
            pair.attributes.transactions.h24.buys +
            pair.attributes.transactions.h24.sells
          }\n` +
          `*Contract:* \`${contractAddress}\`\n\n` +
          `[View Chart 📊](https://www.geckoterminal.com/flow-evm/pools/${pair.attributes.address})`;
        chainId = 747;
      }
    } else {
      tokenMessage =
        `*${pair.baseToken.name} (${pair.baseToken.symbol})* 🎯\n\n` +
        `*Price:* $${parseFloat(pair.priceUsd).toFixed(4)}\n` +
        `*24h Change:* ${pair.priceChange.h24}%\n\n` +
        `*Liquidity:* $${Math.round(pair.liquidity.usd).toLocaleString()}\n` +
        `*Market Cap:* $${Math.round(pair.marketCap).toLocaleString()}\n\n` +
        `*24h Volume:* $${Math.round(pair.volume.h24).toLocaleString()}\n` +
        `*24h Trades:* ${pair.txns.h24.buys + pair.txns.h24.sells}\n` +
        `*Contract:* \`${contractAddress}\`\n\n` +
        `[View Chart 📊](${pair.url})`;

      chainId = this.getChainId(pair.chainId);
    }

    const actionKeyboard = Markup.inlineKeyboard([
      this.createBuyButtons(contractAddress, chainId),
      await this.createBuyButtonsPercent(contractAddress, address, chainId),
      [Markup.button.callback('🔄 Refresh', `refresh_${contractAddress}`)],
      [Markup.button.callback('🏠 Home', 'start')],
    ]);

    await ctx.reply(tokenMessage, {
      parse_mode: 'Markdown',
      ...actionKeyboard,
    });

    const agentResponse = await this.agentService.getAgentThoughts(
      tokenMessage,
    );
    console.log(agentResponse);
    await ctx.reply(agentResponse, {
      parse_mode: 'Markdown',
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

      const groupId = ctx.chat.id.toString();
      const userId = ctx.from.id.toString();
      const groupRef = this.firestore.collection('groups').doc(groupId);
      const data = await groupRef.get();
      const slippage = data.data()?.settings?.slippage | 1;
      const encryptedPrivateKey = data.data()?.encryptedPrivateKey;
      const decryptedPrivateKey =
        this.encryptionService.decrypt(encryptedPrivateKey);
      console.log(decryptedPrivateKey);
      const result = await this.positionService.buy(
        groupId,
        userId,
        Number(chainId),
        contractAddress,
        '0.001',
        slippage,
        decryptedPrivateKey,
      );
      // TODO: Implement your buy logic here using contractAddress, chainId, and buyAmount
      // await this.portfolioService.buyToken(contractAddress, chainId, buyAmount);

      await groupRef.update({
        related_tokens: [
          ...(data.data()?.related_tokens || []),
          { contractAddress, chainId },
        ],
      });

      await ctx.reply(
        `Buy order placed for ${buyAmount} ETH of ${contractAddress}. txhash: ${result.transactionHash}`,
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

  async handleDeposit(txHash: string, ctx: Context) {
    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);
    const data = await groupRef.get();
    const gangAddress = data.data()?.address;

    // Check if txHash already exists in deposit_logs
    const existingLogs = data.data()?.deposit_logs || [];
    if (existingLogs.some((log) => log.txHash === txHash)) {
      await ctx.reply('This transaction has already been processed.');
      return;
    }

    // https://eth.blockscout.com/api/v2/transactions/0xb0fa3310e59215faa8828c6518ba8d784c6d21c246dd2ea104a3685253e23131

    let txData = null;
    let chainString = '';
    let txLink = '';
    for (const chain of [
      'base',
      'eth',
      'flow-evm',
      'scroll',
      'linea',
      'polygon',
    ]) {
      const response = await fetch(
        `https://${chain}.blockscout.com/api/v2/transactions/${txHash}`,
      );
      if (response.status != 200) {
        console.log(response.status);
        continue;
      }
      txData = await response.json();
      chainString = chain;
      txLink = `https://${chain}.blockscout.com/tx/${txHash}`;
      break;
    }
    if (txData && txData.to.hash == gangAddress) {
      const amount = Number(txData.value) / 1e18;
      const positions = data.data()?.positions || [];
      let positionIndex = positions.findIndex(
        (pos) => pos.user === ctx.from.id,
      );
      if (positionIndex === -1) {
        positions.push({
          user: ctx.from.id,
          baseBalance: 0,
          ethBalance: 0,
          flowBalance: 0,
          scrollBalance: 0,
          lineaBalance: 0,
          polygonBalance: 0,
          tokens: [],
        });
        positionIndex = 0;
      }
      if (chainString === 'base') {
        positions[positionIndex].baseBalance += amount;
      } else if (chainString === 'eth') {
        positions[positionIndex].ethBalance += amount;
      } else if (chainString === 'flow-evm') {
        positions[positionIndex].flowBalance += amount;
      } else if (chainString === 'scroll') {
        positions[positionIndex].scrollBalance += amount;
      } else if (chainString === 'linea') {
        positions[positionIndex].lineaBalance += amount;
      } else if (chainString === 'polygon') {
        positions[positionIndex].polygonBalance += amount;
      }
      await groupRef.update({
        deposit_logs: [
          ...(data.data()?.deposit_logs || []),
          {
            txHash,
            chain: chainString,
            amount,
            depositor: ctx.from.id,
            depositorName: ctx.from.username,
            createdAt: new Date(),
          },
        ],
        positions,
      });

      await ctx.reply(
        `*🎉 Deposit Detected!*\n\n` +
          `*Chain:* ${chainString}\n` +
          `*From:* \`${txData.from.hash}\`\n` +
          `*Amount:* ${(Number(txData.value) / 1e18).toFixed(4)} ETH\n\n` +
          `*Transaction:* \`${txLink}\`\n`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Refresh Balance', 'refresh_balance')],
            [Markup.button.callback('🏠 Home', 'start')],
          ]),
        },
      );
    }
  }

  @On('text')
  async onMessage(@Message('text') text: string, @Ctx() ctx: Context) {
    const chatType = ctx.chat.type;

    if (chatType === 'group' || chatType === 'supergroup') {
      // Handle slippage command
      if (text.startsWith('/slippage')) {
        await this.handleSetSlippage(text, ctx);
        return;
      }

      // Handle buy size command
      if (text.startsWith('/buy_size')) {
        await this.handleSetBuySize(text, ctx);
        return;
      }

      // Handle trading enabled command
      if (text.startsWith('/trading_enabled')) {
        await this.handleSetTradingEnabled(text, ctx);
        return;
      }

      // Check for transaction hash (0x + 64 hex characters)
      if (text.match(/0x[a-fA-F0-9]{64}/)) {
        const txHash = text.match(/0x[a-fA-F0-9]{64}/)[0];
        await this.handleDeposit(txHash, ctx);
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

  @On('my_chat_member')
  async onBotJoinGroup(@Ctx() ctx: Context) {
    // Check if this is a new group join event
    const update = ctx.update['my_chat_member'];
    if (
      update.new_chat_member.status === 'member' ||
      update.new_chat_member.status === 'administrator'
    ) {
      // This is a new join event
      const groupId = ctx.chat.id.toString();
      if (ctx.chat.type != 'private') {
        const groupName = ctx.chat.title ?? null;
        // Send welcome message
        await ctx.telegram.sendMessage(
          groupId,
          `Thanks for adding me to ${groupName}! 🚀\n\n` +
            `To get started, please use the /start command to set up your trading wallet.`,
        );
      }
    }
  }
}
