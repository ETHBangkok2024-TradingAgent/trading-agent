import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { FirebaseModule } from '../firebase/firebase.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { OneInchModule } from '../1inch/oneinch.module';

@Module({
  imports: [FirebaseModule, EncryptionModule, OneInchModule],
  providers: [TelegramUpdate],
})
export class TelegramModule {}
