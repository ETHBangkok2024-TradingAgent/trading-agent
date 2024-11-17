import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { SwapflowService } from './swapflow.service';
import { SwapScrollService } from './swapscroll.service';

@Module({
  imports: [FirebaseModule],
  providers: [SwapflowService, SwapScrollService],
  exports: [SwapflowService, SwapScrollService],
})
export class SwapUniV2Module {}
