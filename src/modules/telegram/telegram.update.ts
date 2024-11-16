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

@Update()
export class TelegramUpdate {
  private readonly firestore: Firestore;
  constructor(
    @InjectBot()
    private readonly bot: Telegraf<Context>,
    private readonly firebaseService: FirebaseService,
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
      // If settings not found, create default settings
      if (!settings.exists) {
        await groupRef.set({
          groupName: ctx.chat.title,
          createdAt: new Date(),
          createdBy: {
            id: ctx.from.id,
            username: ctx.from.username,
          },
          settings: defaultSettings,
        });
      }
      const welcomeMessage = `Welcome!`;
      const mainKeyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('Settings', 'settings'),
          Markup.button.callback('Sell 💱', 'sell'),
        ],
      ]);

      await ctx.reply(welcomeMessage, mainKeyboard);
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

  @On('text')
  async onMessage(@Message('text') text: string, @Ctx() ctx: Context) {
    const chatType = ctx.chat.type;
    console.log(ctx.chat);
    const username = ctx.from.username || ctx.from.first_name;

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
    } else {
      console.log(`Private message from @${username}:`, text);
      // Handle private message
    }
  }
}
