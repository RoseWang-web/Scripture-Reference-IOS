import { Injectable } from '@nestjs/common';

export interface ScriptureReference {
    book: string;
    chapter: number;
    verse?: number;
    url: string;
}

export interface ScriptureBook {
    name: string;
    shortName: string;
    path: string;
    aliases: string[];
    chapters: number[];
}

@Injectable()
export class ScriptureService {
    // Complete scripture database based on churchofjesuschrist.org structure
    private readonly scriptureDatabase: Record<string, ScriptureBook> = {
    }

}