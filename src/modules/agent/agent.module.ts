import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AgentService } from './agent.service';

@Module({
  imports: [HttpModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
