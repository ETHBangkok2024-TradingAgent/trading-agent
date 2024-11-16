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
  ) {
    this.firestore = this.firebaseService.getFirestore();
  }

  @Start()
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

      const scrollBalance = '0';
      const baseBalance = '0';

      const welcomeMessage =
        `*Welcome to Moon Gang* 🚀\n\n` +
        `*Start Depositing:*\n\n` +
        `*Scroll* 📜\n` +
        `\`${address}\`\n` +
        `Balance: ${scrollBalance} ETH ($0.00)\n\n` +
        `*Base* 🔷\n` +
        `\`${address}\`\n` +
        `Balance: ${baseBalance} ETH ($0.00)`;

      const mainKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', 'refresh_balance')],
        [
          Markup.button.callback('📊 Position', 'positions'),
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
  async onPositions(ctx: Context) {
    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);
    const data = await groupRef.get();
    // const address = data.data()?.address;
    const address = '0x0000000000000000000000000000000000000000';
    // TEMP
    const positions = await this.portfolioService.getBalance(address);
    console.log(positions);
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
    // handle Buy
    const groupId = ctx.chat.id.toString();
    const groupRef = this.firestore.collection('groups').doc(groupId);
    const encryptedPrivateKey = await groupRef.get();
    const decryptedPrivateKey = this.encryptionService.decrypt(
      encryptedPrivateKey.data()?.encryptedPrivateKey,
    );
    console.log(decryptedPrivateKey);

    // save calls to firestore
    const username = ctx.from.username || ctx.from.first_name;
    const callRef = this.firestore.collection('calls').doc();
    await callRef.set({
      contractAddress,
      createdBy: username,
      createdAt: new Date(),
    });

    // save holding to firestore

    // reply
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`,
    );
    const data = await response.json();
    const pair = data.pairs[0];
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

    const actionKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('🛒 Buy 0.1 ETH', `buy_${contractAddress}_0.1`),
        Markup.button.callback('🛒 Buy 0.2 ETH', `buy_${contractAddress}_0.2`),
        Markup.button.callback('🛒 Buy 0.5 ETH', `buy_${contractAddress}_0.5`),
      ],
      [Markup.button.callback('🔄 Refresh', `refresh_${contractAddress}`)],
    ]);

    await ctx.reply(tokenMessage, {
      parse_mode: 'Markdown',
      ...actionKeyboard,
    });
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
