import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PortfolioService } from './portfolio.service';
import { TokenService } from './token.service';
import { RpcService } from './rpc.service';

@Module({
  imports: [HttpModule],
  providers: [PortfolioService, TokenService, RpcService],
  exports: [PortfolioService, TokenService, RpcService],
})
export class OneInchModule {}
