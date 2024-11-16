import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PortfolioService } from './portfolio.service';
import { TokenService } from './token.service';
import { RpcService } from './rpc.service';
import { SwapService } from './swap.service';

@Module({
  imports: [HttpModule],
  providers: [PortfolioService, TokenService, RpcService, SwapService],
  exports: [PortfolioService, TokenService, RpcService, SwapService],
})
export class OneInchModule {}
