import { Module } from '@nestjs/common';
import { StreamingGateway } from './streaming.gateway';

@Module({
  imports: [],
  providers: [StreamingGateway],
  exports: [StreamingGateway],
})
export class AssemblyAiModule {}
