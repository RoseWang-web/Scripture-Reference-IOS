import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StreamingModule } from './streaming/streaming.module';
import { AssemblyAiModule } from './assemblyai/assemblyai.module';

@Module({
  imports: [StreamingModule, AssemblyAiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
