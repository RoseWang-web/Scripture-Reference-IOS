import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StreamingModule } from './streaming/streaming.module';
import { AssemblyAiModule } from './assemblyai/assemblyai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigModule available everywhere
      envFilePath: '.env',
    }),
    StreamingModule,
    AssemblyAiModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
