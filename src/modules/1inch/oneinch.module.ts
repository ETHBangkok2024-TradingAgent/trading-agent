import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PortfolioService } from './portfolio.service';
import { TokenService } from './token.service';

@Module({
  imports: [HttpModule],
  providers: [PortfolioService, TokenService],
  exports: [PortfolioService, TokenService],
})
export class OneInchModule {}
