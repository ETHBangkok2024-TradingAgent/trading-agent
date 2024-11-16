import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [TelegramUpdate],
})
export class TelegramModule {}
