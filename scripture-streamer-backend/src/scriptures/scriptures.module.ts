import { Module } from '@nestjs/common';
import { ScriptureService } from './scriptures.service';
import { ScriptureController } from './scriptures.controller';

@Module({
    providers: [ScriptureService],
    controllers: [ScriptureController],
    exports: [ScriptureService],
})
export class ScripturesModule { }