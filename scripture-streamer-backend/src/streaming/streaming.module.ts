import { Module } from '@nestjs/common';
import { StreamingGateway } from './streaming.gateway';
import { ScripturesModule } from '../scriptures/scriptures.module';

@Module({
  imports: [ScripturesModule],
  providers: [StreamingGateway],
  exports: [StreamingGateway],
})
export class StreamingModule {}
