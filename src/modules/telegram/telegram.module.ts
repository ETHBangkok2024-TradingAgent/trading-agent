import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { FirebaseModule } from '../firebase/firebase.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { OneInchModule } from '../1inch/oneinch.module';
import { AgentModule } from '../agent/agent.module';
import { PositionModule } from '../position/position.module';
import { SwapUniV2Module } from '../swapuniv2/swapuniv2.module';

@Module({
  imports: [
    FirebaseModule,
    EncryptionModule,
    OneInchModule,
    AgentModule,
    PositionModule,
    SwapUniV2Module,
  ],
  providers: [TelegramUpdate],
})
export class TelegramModule {}
