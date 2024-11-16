import { Module } from '@nestjs/common';
import { OneInchModule } from '../1inch/oneinch.module';
import { PositionService } from './position.service';

@Module({
  imports: [OneInchModule],
  providers: [PositionService],
  exports: [PositionService],
})
export class PositionModule {}
