import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';

@Module({
  imports: [],
  providers: [TelegramUpdate],
})
export class TelegramModule {}
