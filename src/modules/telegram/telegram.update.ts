import {
  Ctx,
  Help,
  InjectBot,
  Message,
  On,
  Start,
  Update,
} from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { Context } from './interfaces/context.interface';

@Update()
export class TelegramUpdate {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf<Context>,
  ) {}

  @Start()
  async onStart() {
    const me = await this.bot.telegram.getMe();
    console.log(me);
  }

  @Help()
  async onHelp(): Promise<string> {
    return 'Send me any text';
  }

  @On('text')
  async onMessage(@Message('text') text: string, @Ctx() ctx: Context) {
    // receive text from bot
    const chatId = ctx.chat.id;
    console.log(text);
    await this.bot.telegram.sendMessage(chatId, 'hello welcome, have room');
  }
}
