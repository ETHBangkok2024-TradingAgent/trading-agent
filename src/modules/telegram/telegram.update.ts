import { Help, InjectBot, Message, On, Start, Update } from 'nestjs-telegraf';
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
  onMessage(@Message('text') text: string) {
    // receive text from bot
    console.log(text);
  }
}
