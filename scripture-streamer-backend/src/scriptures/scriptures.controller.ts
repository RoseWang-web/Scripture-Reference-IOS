import { Controller } from '@nestjs/common';
import { ScripturesService } from './scriptures.service';

@Controller('scriptures')
export class ScriptureController {
    constructor(private readonly scriptureService: ScripturesService) { }
}