import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { FirebaseModule } from '../firebase/firebase.module';
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [FirebaseModule, EncryptionModule],
  providers: [TelegramUpdate],
})
export class TelegramModule {}
