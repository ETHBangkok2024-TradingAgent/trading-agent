import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { SwapflowService } from './swapflow.service';

@Module({
  imports: [FirebaseModule],
  providers: [SwapflowService],
  exports: [SwapflowService],
})
export class SwapflowModule {}
