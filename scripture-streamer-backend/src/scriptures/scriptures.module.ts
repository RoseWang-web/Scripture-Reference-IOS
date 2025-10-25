import { Module } from '@nestjs/common';
import { ScripturesController } from './scriptures.controller';
import { LlmScriptureDetectorService } from './llm-scripture-detector.service';

@Module({
    providers: [LlmScriptureDetectorService],
    controllers: [ScripturesController],
    exports: [LlmScriptureDetectorService],
})
export class ScripturesModule { }