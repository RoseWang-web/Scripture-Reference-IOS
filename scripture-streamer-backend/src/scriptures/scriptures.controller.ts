import { Controller } from '@nestjs/common';
import { ScriptureService } from './scriptures.service';

@Controller('scriptures')
export class ScriptureController {
    constructor(private readonly scriptureService: ScriptureService) { }
}