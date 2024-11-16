import { Module } from '@nestjs/common';
import { OneInchModule } from '../1inch/oneinch.module';
import { PositionService } from './position.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [OneInchModule, FirebaseModule],
  providers: [PositionService],
  exports: [PositionService],
})
export class PositionModule {}
