import { Injectable } from '@nestjs/common';

export interface ScriptureReference {
    book: string;
    chapter: number;
    verse?: number;
    endVerse?: number;
    endChapter?: number;
    url: string;
    // original Text, help to debug parsing issues
    originalText: string;
}

export interface ScriptureBook {
    name: string;
    shortName: string;
    path: string;
    aliases: string[];
    chapters: number[];
}

// AssemblyAI Word Search Match Interface
export interface AssemblyAIWordMatch {
    text: string;
    results: {
        start: number; //start time in milliseconds
        end: number; //end time in milliseconds
    }[];
}
// AssemblyAI 完整轉錄稿物件的簡化表示，用於我們的方法輸入
export interface AssemblyAITranscript {
    text: string;
    word_search_matches: AssemblyAIWordMatch[];
    // otherwords
}

// 經文引用及時間戳記的輸出結構
export interface TimedScriptureReference extends ScriptureReference {
    startMs: number;
    endMs: number;
}

@Injectable()
export class ScripturesService {
    // Complete scripture database based on churchofjesuschrist.org structure
    private readonly scriptureDatabase: Record<string, ScriptureBook> = {
        // Book of Mormon
        'book of mormon': {
            name: 'Book of Mormon',
            shortName: 'bofm',
            path: 'bofm',
            aliases: ['book of mormon', 'bom'],
            chapters: []
        },
        // The Books of the Book of Mormon
        '1 nephi': {
            name: '1 Nephi',
            shortName: '1-ne',
            path: 'bofm/1-ne',
            aliases: ['first nephi', '1 nephi', '1 ne', 'nephi 1'],
            chapters: Array.from({ length: 22 }, (_, i) => i + 1)
        },
        '2 nephi': {
            name: '2 Nephi',
            shortName: '2-ne',
            path: 'bofm/2-ne',
            aliases: ['second nephi', '2 nephi', '2 ne', 'nephi 2'],
            chapters: Array.from({ length: 33 }, (_, i) => i + 1)
        },
        'jacob': {
            name: 'Jacob',
            shortName: 'jacob',
            path: 'bofm/jacob',
            aliases: ['jacob'],
            chapters: Array.from({ length: 7 }, (_, i) => i + 1)
        },
        'enos': {
            name: 'Enos',
            shortName: 'enos',
            path: 'bofm/enos',
            aliases: ['enos'],
            chapters: [1]
        },
        'jarom': {
            name: 'Jarom',
            shortName: 'jarom',
            path: 'bofm/jarom',
            aliases: ['jarom'],
            chapters: [1]
        },
        'omni': {
            name: 'Omni',
            shortName: 'omni',
            path: 'bofm/omni',
            aliases: ['omni'],
            chapters: [1]
        },
        'words of mormon': {
            name: 'Words of Mormon',
            shortName: 'w-of-m',
            path: 'bofm/w-of-m',
            aliases: ['words of mormon', 'w of m'],
            chapters: [1]
        },
        'mosiah': {
            name: 'Mosiah',
            shortName: 'mosiah',
            path: 'bofm/mosiah',
            aliases: ['mosiah'],
            chapters: Array.from({ length: 29 }, (_, i) => i + 1)
        },
        'alma': {
            name: 'Alma',
            shortName: 'alma',
            path: 'bofm/alma',
            aliases: ['alma'],
            chapters: Array.from({ length: 63 }, (_, i) => i + 1)
        },
        'helaman': {
            name: 'Helaman',
            shortName: 'hel',
            path: 'bofm/hel',
            aliases: ['helaman'],
            chapters: Array.from({ length: 16 }, (_, i) => i + 1)
        },
        '3 nephi': {
            name: '3 Nephi',
            shortName: '3-ne',
            path: 'bofm/3-ne',
            aliases: ['third nephi', '3 nephi', '3 ne', 'nephi 3'],
            chapters: Array.from({ length: 30 }, (_, i) => i + 1)
        },
        '4 nephi': {
            name: '4 Nephi',
            shortName: '4-ne',
            path: 'bofm/4-ne',
            aliases: ['fourth nephi', '4 nephi', '4 ne', 'nephi 4'],
            chapters: [1]
        },
        'mormon': {
            name: 'Mormon',
            shortName: 'morm',
            path: 'bofm/morm',
            aliases: ['mormon'],
            chapters: Array.from({ length: 9 }, (_, i) => i + 1)
        },
        'ether': {
            name: 'Ether',
            shortName: 'ether',
            path: 'bofm/ether',
            aliases: ['ether'],
            chapters: Array.from({ length: 15 }, (_, i) => i + 1)
        },
        'moroni': {
            name: 'Moroni',
            shortName: 'moro',
            path: 'bofm/moro',
            aliases: ['moroni'],
            chapters: Array.from({ length: 10 }, (_, i) => i + 1)
        },
        // Doctrine and Covenants
        'doctrine and covenants': {
            name: 'Doctrine and Covenants',
            shortName: 'dc',
            path: 'dc-testament/dc',
            aliases: ['doctrine and covenants', 'd&c', 'dc'],
            chapters: Array.from({ length: 138 }, (_, i) => i + 1)
        },
        // Pearl of Great Price
        'pearl of great price': {
            name: 'Pearl of Great Price',
            shortName: 'pgp',
            path: 'pgp',
            aliases: ['pearl of great price', 'pgp'],
            chapters: []
        },
        // The Books of Pearl of Great Price
        'moses': {
            name: 'Moses',
            shortName: 'moses',
            path: 'pgp/moses',
            aliases: ['moses'],
            chapters: Array.from({ length: 8 }, (_, i) => i + 1)
        },
        'abraham': {
            name: 'Abraham',
            shortName: 'abr',
            path: 'pgp/abr',
            aliases: ['abraham'],
            chapters: Array.from({ length: 5 }, (_, i) => i + 1)
        },
        'joseph smith—matthew': {
            name: 'Joseph Smith—Matthew',
            shortName: 'js-m',
            path: 'pgp/js-m',
            aliases: ['joseph smith matthew', 'js matthew', 'js-m'],
            chapters: [1]
        },
        'joseph smith—history': {
            name: 'Joseph Smith—History',
            shortName: 'js-h',
            path: 'pgp/js-h',
            aliases: ['joseph smith history', 'js history', 'js-h'],
            chapters: [1]
        },
        'articles of faith': {
            name: 'Articles of Faith',
            shortName: 'a-of-f',
            path: 'pgp/a-of-f',
            aliases: ['articles of faith', 'a of f', 'a-of-f'],
            chapters: [1]
        },
        // Old Testament
        'old testament': {
            name: 'Old Testament',
            shortName: 'ot',
            path: 'ot',
            aliases: ['old testament', 'ot'],
            chapters: []
        },
        // the books of the Old Testament
        'genesis': {
            name: 'Genesis',
            shortName: 'gen',
            path: 'ot/gen',
            aliases: ['genesis', 'gen'],
            chapters: Array.from({ length: 50 }, (_, i) => i + 1)
        },
        'exodus': {
            name: 'Exodus',
            shortName: 'ex',
            path: 'ot/ex',
            aliases: ['exodus', 'ex'],
            chapters: Array.from({ length: 40 }, (_, i) => i + 1)
        },
        'leviticus': {
            name: 'Leviticus',
            shortName: 'lev',
            path: 'ot/lev',
            aliases: ['leviticus', 'lev'],
            chapters: Array.from({ length: 27 }, (_, i) => i + 1)
        },
        'numbers': {
            name: 'Numbers',
            shortName: 'num',
            path: 'ot/num',
            aliases: ['numbers', 'num'],
            chapters: Array.from({ length: 36 }, (_, i) => i + 1)
        },
        'deuteronomy': {
            name: 'Deuteronomy',
            shortName: 'deut',
            path: 'ot/deut',
            aliases: ['deuteronomy', 'deut'],
            chapters: Array.from({ length: 34 }, (_, i) => i + 1)
        },
        'joshua': {
            name: 'Joshua',
            shortName: 'josh',
            path: 'ot/josh',
            aliases: ['joshua', 'josh'],
            chapters: Array.from({ length: 24 }, (_, i) => i + 1)
        },
        'judges': {
            name: 'Judges',
            shortName: 'judg',
            path: 'ot/judg',
            aliases: ['judges', 'judg'],
            chapters: Array.from({ length: 21 }, (_, i) => i + 1)
        },
        'ruth': {
            name: 'Ruth',
            shortName: 'ruth',
            path: 'ot/ruth',
            aliases: ['ruth'],
            chapters: Array.from({ length: 4 }, (_, i) => i + 1)
        },
        '1 samuel': {
            name: '1 Samuel',
            shortName: '1-sam',
            path: 'ot/1-sam',
            aliases: ['first samuel', '1 samuel', '1 sam'],
            chapters: Array.from({ length: 31 }, (_, i) => i + 1)
        },
        '2 samuel': {
            name: '2 Samuel',
            shortName: '2-sam',
            path: 'ot/2-sam',
            aliases: ['second samuel', '2 samuel', '2 sam'],
            chapters: Array.from({ length: 24 }, (_, i) => i + 1)
        },
        '1 kings': {
            name: '1 Kings',
            shortName: '1-kgs',
            path: 'ot/1-kgs',
            aliases: ['first kings', '1 kings', '1 kgs'],
            chapters: Array.from({ length: 22 }, (_, i) => i + 1)
        },
        '2 kings': {
            name: '2 Kings',
            shortName: '2-kgs',
            path: 'ot/2-kgs',
            aliases: ['second kings', '2 kings', '2 kgs'],
            chapters: Array.from({ length: 25 }, (_, i) => i + 1)
        },
        '1 chronicles': {
            name: '1 Chronicles',
            shortName: '1-chr',
            path: 'ot/1-chr',
            aliases: ['first chronicles', '1 chronicles', '1 chr'],
            chapters: Array.from({ length: 29 }, (_, i) => i + 1)
        },
        '2 chronicles': {
            name: '2 Chronicles',
            shortName: '2-chr',
            path: 'ot/2-chr',
            aliases: ['second chronicles', '2 chronicles', '2 chr'],
            chapters: Array.from({ length: 36 }, (_, i) => i + 1)
        },
        'ezra': {
            name: 'Ezra',
            shortName: 'ezra',
            path: 'ot/ezra',
            aliases: ['ezra'],
            chapters: Array.from({ length: 10 }, (_, i) => i + 1)
        },
        'nehemiah': {
            name: 'Nehemiah',
            shortName: 'neh',
            path: 'ot/neh',
            aliases: ['nehemiah', 'neh'],
            chapters: Array.from({ length: 13 }, (_, i) => i + 1)
        },
        'esther': {
            name: 'Esther',
            shortName: 'esth',
            path: 'ot/esth',
            aliases: ['esther', 'esth'],
            chapters: Array.from({ length: 10 }, (_, i) => i + 1)
        },
        'job': {
            name: 'Job',
            shortName: 'job',
            path: 'ot/job',
            aliases: ['job'],
            chapters: Array.from({ length: 42 }, (_, i) => i + 1)
        },
        'psalms': {
            name: 'Psalms',
            shortName: 'ps',
            path: 'ot/ps',
            aliases: ['psalms', 'psalm', 'ps'],
            chapters: Array.from({ length: 150 }, (_, i) => i + 1)
        },
        'proverbs': {
            name: 'Proverbs',
            shortName: 'prov',
            path: 'ot/prov',
            aliases: ['proverbs', 'prov'],
            chapters: Array.from({ length: 31 }, (_, i) => i + 1)
        },
        'ecclesiastes': {
            name: 'Ecclesiastes',
            shortName: 'eccl',
            path: 'ot/eccl',
            aliases: ['ecclesiastes', 'eccl'],
            chapters: Array.from({ length: 12 }, (_, i) => i + 1)
        },
        'song of solomon': {
            name: 'Song of Solomon',
            shortName: 'song',
            path: 'ot/song',
            aliases: ['song of solomon', 'song'],
            chapters: Array.from({ length: 8 }, (_, i) => i + 1)
        },
        'isaiah': {
            name: 'Isaiah',
            shortName: 'isa',
            path: 'ot/isa',
            aliases: ['isaiah', 'isa'],
            chapters: Array.from({ length: 66 }, (_, i) => i + 1)
        },
        'jeremiah': {
            name: 'Jeremiah',
            shortName: 'jer',
            path: 'ot/jer',
            aliases: ['jeremiah', 'jer'],
            chapters: Array.from({ length: 52 }, (_, i) => i + 1)
        },
        'lamentations': {
            name: 'Lamentations',
            shortName: 'lam',
            path: 'ot/lam',
            aliases: ['lamentations', 'lam'],
            chapters: Array.from({ length: 5 }, (_, i) => i + 1)
        },
        'ezekiel': {
            name: 'Ezekiel',
            shortName: 'ezek',
            path: 'ot/ezek',
            aliases: ['ezekiel', 'ezek'],
            chapters: Array.from({ length: 48 }, (_, i) => i + 1)
        },
        'daniel': {
            name: 'Daniel',
            shortName: 'dan',
            path: 'ot/dan',
            aliases: ['daniel', 'dan'],
            chapters: Array.from({ length: 12 }, (_, i) => i + 1)
        },
        'hosea': {
            name: 'Hosea',
            shortName: 'hosea',
            path: 'ot/hosea',
            aliases: ['hosea'],
            chapters: Array.from({ length: 14 }, (_, i) => i + 1)
        },
        'joel': {
            name: 'Joel',
            shortName: 'joel',
            path: 'ot/joel',
            aliases: ['joel'],
            chapters: Array.from({ length: 3 }, (_, i) => i + 1)
        },
        'amos': {
            name: 'Amos',
            shortName: 'amos',
            path: 'ot/amos',
            aliases: ['amos'],
            chapters: Array.from({ length: 9 }, (_, i) => i + 1)
        },
        'obadiah': {
            name: 'Obadiah',
            shortName: 'obad',
            path: 'ot/obad',
            aliases: ['obadiah', 'obad'],
            chapters: [1]
        },
        'jonah': {
            name: 'Jonah',
            shortName: 'jonah',
            path: 'ot/jonah',
            aliases: ['jonah'],
            chapters: Array.from({ length: 4 }, (_, i) => i + 1)
        },
        'micah': {
            name: 'Micah',
            shortName: 'micah',
            path: 'ot/micah',
            aliases: ['micah'],
            chapters: Array.from({ length: 7 }, (_, i) => i + 1)
        },
        'nahum': {
            name: 'Nahum',
            shortName: 'nahum',
            path: 'ot/nahum',
            aliases: ['nahum'],
            chapters: Array.from({ length: 3 }, (_, i) => i + 1)
        },
        'habakkuk': {
            name: 'Habakkuk',
            shortName: 'hab',
            path: 'ot/hab',
            aliases: ['habakkuk', 'hab'],
            chapters: Array.from({ length: 3 }, (_, i) => i + 1)
        },
        'zephaniah': {
            name: 'Zephaniah',
            shortName: 'zeph',
            path: 'ot/zeph',
            aliases: ['zephaniah', 'zeph'],
            chapters: Array.from({ length: 3 }, (_, i) => i + 1)
        },
        'haggai': {
            name: 'Haggai',
            shortName: 'hag',
            path: 'ot/hag',
            aliases: ['haggai', 'hag'],
            chapters: Array.from({ length: 2 }, (_, i) => i + 1)
        },
        'zechariah': {
            name: 'Zechariah',
            shortName: 'zech',
            path: 'ot/zech',
            aliases: ['zechariah', 'zech'],
            chapters: Array.from({ length: 14 }, (_, i) => i + 1)
        },
        'malachi': {
            name: 'Malachi',
            shortName: 'mal',
            path: 'ot/mal',
            aliases: ['malachi', 'mal'],
            chapters: Array.from({ length: 4 }, (_, i) => i + 1)
        },

        // New Testament
        'new testament': {
            name: 'New Testament',
            shortName: 'nt',
            path: 'nt',
            aliases: ['new testament', 'nt'],
            chapters: []
        },
        // the books of the New Testament
        'matthew': {
            name: 'Matthew',
            shortName: 'matt',
            path: 'nt/matt',
            aliases: ['matthew', 'matt'],
            chapters: Array.from({ length: 28 }, (_, i) => i + 1)
        },
        'mark': {
            name: 'Mark',
            shortName: 'mark',
            path: 'nt/mark',
            aliases: ['mark'],
            chapters: Array.from({ length: 16 }, (_, i) => i + 1)
        },
        'luke': {
            name: 'Luke',
            shortName: 'luke',
            path: 'nt/luke',
            aliases: ['luke'],
            chapters: Array.from({ length: 24 }, (_, i) => i + 1)
        },
        'john': {
            name: 'John',
            shortName: 'john',
            path: 'nt/john',
            aliases: ['john'],
            chapters: Array.from({ length: 21 }, (_, i) => i + 1)
        },
        'acts': {
            name: 'Acts',
            shortName: 'acts',
            path: 'nt/acts',
            aliases: ['acts'],
            chapters: Array.from({ length: 28 }, (_, i) => i + 1)
        },
        'romans': {
            name: 'Romans',
            shortName: 'rom',
            path: 'nt/rom',
            aliases: ['romans', 'rom'],
            chapters: Array.from({ length: 16 }, (_, i) => i + 1)
        },
        '1 corinthians': {
            name: '1 Corinthians',
            shortName: '1-cor',
            path: 'nt/1-cor',
            aliases: ['first corinthians', '1 corinthians', '1 cor'],
            chapters: Array.from({ length: 16 }, (_, i) => i + 1)
        },
        '2 corinthians': {
            name: '2 Corinthians',
            shortName: '2-cor',
            path: 'nt/2-cor',
            aliases: ['second corinthians', '2 corinthians', '2 cor'],
            chapters: Array.from({ length: 13 }, (_, i) => i + 1)
        },
        'galatians': {
            name: 'Galatians',
            shortName: 'gal',
            path: 'nt/gal',
            aliases: ['galatians', 'gal'],
            chapters: Array.from({ length: 6 }, (_, i) => i + 1)
        },
        'ephesians': {
            name: 'Ephesians',
            shortName: 'eph',
            path: 'nt/eph',
            aliases: ['ephesians', 'eph'],
            chapters: Array.from({ length: 6 }, (_, i) => i + 1)
        },
        'philippians': {
            name: 'Philippians',
            shortName: 'philip',
            path: 'nt/philip',
            aliases: ['philippians', 'philip'],
            chapters: Array.from({ length: 4 }, (_, i) => i + 1)
        },
        'colossians': {
            name: 'Colossians',
            shortName: 'col',
            path: 'nt/col',
            aliases: ['colossians', 'col'],
            chapters: Array.from({ length: 4 }, (_, i) => i + 1)
        },
        '1 thessalonians': {
            name: '1 Thessalonians',
            shortName: '1-thes',
            path: 'nt/1-thes',
            aliases: ['first thessalonians', '1 thessalonians', '1 thes'],
            chapters: Array.from({ length: 5 }, (_, i) => i + 1)
        },
        '2 thessalonians': {
            name: '2 Thessalonians',
            shortName: '2-thes',
            path: 'nt/2-thes',
            aliases: ['second thessalonians', '2 thessalonians', '2 thes'],
            chapters: Array.from({ length: 3 }, (_, i) => i + 1)
        },
        '1 timothy': {
            name: '1 Timothy',
            shortName: '1-tim',
            path: 'nt/1-tim',
            aliases: ['first timothy', '1 timothy', '1 tim'],
            chapters: Array.from({ length: 6 }, (_, i) => i + 1)
        },
        '2 timothy': {
            name: '2 Timothy',
            shortName: '2-tim',
            path: 'nt/2-tim',
            aliases: ['second timothy', '2 timothy', '2 tim'],
            chapters: Array.from({ length: 4 }, (_, i) => i + 1)
        },
        'titus': {
            name: 'Titus',
            shortName: 'titus',
            path: 'nt/titus',
            aliases: ['titus'],
            chapters: Array.from({ length: 3 }, (_, i) => i + 1)
        },
        'philemon': {
            name: 'Philemon',
            shortName: 'philem',
            path: 'nt/philem',
            aliases: ['philemon', 'philem'],
            chapters: [1]
        },
        'hebrews': {
            name: 'Hebrews',
            shortName: 'heb',
            path: 'nt/heb',
            aliases: ['hebrews', 'heb'],
            chapters: Array.from({ length: 13 }, (_, i) => i + 1)
        },
        'james': {
            name: 'James',
            shortName: 'james',
            path: 'nt/james',
            aliases: ['james'],
            chapters: Array.from({ length: 5 }, (_, i) => i + 1)
        },
        '1 peter': {
            name: '1 Peter',
            shortName: '1-pet',
            path: 'nt/1-pet',
            aliases: ['first peter', '1 peter', '1 pet'],
            chapters: Array.from({ length: 5 }, (_, i) => i + 1)
        },
        '2 peter': {
            name: '2 Peter',
            shortName: '2-pet',
            path: 'nt/2-pet',
            aliases: ['second peter', '2 peter', '2 pet'],
            chapters: Array.from({ length: 3 }, (_, i) => i + 1)
        },
        '1 john': {
            name: '1 John',
            shortName: '1-jn',
            path: 'nt/1-jn',
            aliases: ['first john', '1 john', '1 jn'],
            chapters: Array.from({ length: 5 }, (_, i) => i + 1)
        },
        '2 john': {
            name: '2 John',
            shortName: '2-jn',
            path: 'nt/2-jn',
            aliases: ['second john', '2 john', '2 jn'],
            chapters: [1]
        },
        '3 john': {
            name: '3 John',
            shortName: '3-jn',
            path: 'nt/3-jn',
            aliases: ['third john', '3 john', '3 jn'],
            chapters: [1]
        },
        'jude': {
            name: 'Jude',
            shortName: 'jude',
            path: 'nt/jude',
            aliases: ['jude'],
            chapters: [1]
        },
        'revelation': {
            name: 'Revelation',
            shortName: 'rev',
            path: 'nt/rev',
            aliases: ['revelation', 'rev'],
            chapters: Array.from({ length: 22 }, (_, i) => i + 1)
        }
    };

    // numberWordsToNumbers mapping
    private readonly wordToNumberMap: Record<string, number> = {
        // 1-20
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
        // Tens
        'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
        // Hundreds
        'hundred': 100, 'one hundred': 100,

        // Combinations 21-99 (考慮到轉錄的空格和連字符)
        // 21-29
        'twenty one': 21, 'twenty-one': 21, 'twenty two': 22, 'twenty-two': 22, 'twenty three': 23, 'twenty-three': 23, 'twenty four': 24, 'twenty-four': 24, 'twenty five': 25, 'twenty-five': 25, 'twenty six': 26, 'twenty-six': 26, 'twenty seven': 27, 'twenty-seven': 27, 'twenty eight': 28, 'twenty-eight': 28, 'twenty nine': 29, 'twenty-nine': 29,
        // 31-39
        'thirty one': 31, 'thirty-one': 31, 'thirty two': 32, 'thirty-two': 32, 'thirty three': 33, 'thirty-three': 33, 'thirty four': 34, 'thirty-four': 34, 'thirty five': 35, 'thirty-five': 35, 'thirty six': 36, 'thirty-six': 36, 'thirty seven': 37, 'thirty-seven': 37, 'thirty eight': 38, 'thirty-eight': 38, 'thirty nine': 39, 'thirty-nine': 39,
        // 41-49
        'forty one': 41, 'forty-one': 41, 'forty two': 42, 'forty-two': 42, 'forty three': 43, 'forty-three': 43, 'forty four': 44, 'forty-four': 44, 'forty five': 45, 'forty-five': 45, 'forty six': 46, 'forty-six': 46, 'forty seven': 47, 'forty-seven': 47, 'forty eight': 48, 'forty-eight': 48, 'forty nine': 49, 'forty-nine': 49,
        // 51-59
        'fifty one': 51, 'fifty-one': 51, 'fifty two': 52, 'fifty-two': 52, 'fifty three': 53, 'fifty-three': 53, 'fifty four': 54, 'fifty-four': 54, 'fifty five': 55, 'fifty-five': 55, 'fifty six': 56, 'fifty-six': 56, 'fifty seven': 57, 'fifty-seven': 57, 'fifty eight': 58, 'fifty-eight': 58, 'fifty nine': 59, 'fifty-nine': 59,
        // 61-69
        'sixty one': 61, 'sixty-one': 61, 'sixty two': 62, 'sixty-two': 62, 'sixty three': 63, 'sixty-three': 63, 'sixty four': 64, 'sixty-four': 64, 'sixty five': 65, 'sixty-five': 65, 'sixty six': 66, 'sixty-six': 66, 'sixty seven': 67, 'sixty-seven': 67, 'sixty eight': 68, 'sixty-eight': 68, 'sixty nine': 69, 'sixty-nine': 69,
        // 71-79
        'seventy one': 71, 'seventy-one': 71, 'seventy two': 72, 'seventy-two': 72, 'seventy three': 73, 'seventy-three': 73, 'seventy four': 74, 'seventy-four': 74, 'seventy five': 75, 'seventy-five': 75, 'seventy six': 76, 'seventy-six': 76, 'seventy seven': 77, 'seventy-seven': 77, 'seventy eight': 78, 'seventy-eight': 78, 'seventy nine': 79, 'seventy-nine': 79,
        // 81-89
        'eighty one': 81, 'eighty-one': 81, 'eighty two': 82, 'eighty-two': 82, 'eighty three': 83, 'eighty-three': 83, 'eighty four': 84, 'eighty-four': 84, 'eighty five': 85, 'eighty-five': 85, 'eighty six': 86, 'eighty-six': 86, 'eighty seven': 87, 'eighty-seven': 87, 'eighty eight': 88, 'eighty-eight': 88, 'eighty nine': 89, 'eighty-nine': 89,
        // 91-99
        'ninety one': 91, 'ninety-one': 91, 'ninety two': 92, 'ninety-two': 92, 'ninety three': 93, 'ninety-three': 93, 'ninety four': 94, 'ninety-four': 94, 'ninety five': 95, 'ninety-five': 95, 'ninety six': 96, 'ninety-six': 96, 'ninety seven': 97, 'ninety-seven': 97, 'ninety eight': 98, 'ninety-eight': 98, 'ninety nine': 99, 'ninety-nine': 99,

        // 100-140 (包含 "one hundred and X" 的常見口語格式)
        'one hundred one': 101, 'one hundred and one': 101,
        'one hundred two': 102, 'one hundred and two': 102,
        'one hundred three': 103, 'one hundred and three': 103,
        'one hundred four': 104, 'one hundred and four': 104,
        'one hundred five': 105, 'one hundred and five': 105,
        'one hundred six': 106, 'one hundred and six': 106,
        'one hundred seven': 107, 'one hundred and seven': 107,
        'one hundred eight': 108, 'one hundred and eight': 108,
        'one hundred nine': 109, 'one hundred and nine': 109,
        'one hundred ten': 110, 'one hundred and ten': 110,
        'one hundred eleven': 111, 'one hundred and eleven': 111,
        'one hundred twelve': 112, 'one hundred and twelve': 112,
        'one hundred thirteen': 113, 'one hundred and thirteen': 113,
        'one hundred fourteen': 114, 'one hundred and fourteen': 114,
        'one hundred fifteen': 115, 'one hundred and fifteen': 115,
        'one hundred sixteen': 116, 'one hundred and sixteen': 116,
        'one hundred seventeen': 117, 'one hundred and seventeen': 117,
        'one hundred eighteen': 118, 'one hundred and eighteen': 118,
        'one hundred nineteen': 119, 'one hundred and nineteen': 119,
        'one hundred twenty': 120, 'one hundred and twenty': 120,
        'one hundred twenty one': 121, 'one hundred and twenty one': 121,
        'one hundred twenty two': 122, 'one hundred and twenty two': 122,
        'one hundred twenty three': 123, 'one hundred and twenty three': 123,
        'one hundred twenty four': 124, 'one hundred and twenty four': 124,
        'one hundred twenty five': 125, 'one hundred and twenty five': 125,
        'one hundred twenty six': 126, 'one hundred and twenty six': 126,
        'one hundred twenty seven': 127, 'one hundred and twenty seven': 127,
        'one hundred twenty eight': 128, 'one hundred and twenty eight': 128,
        'one hundred twenty nine': 129, 'one hundred and twenty nine': 129,
        'one hundred thirty': 130, 'one hundred and thirty': 130,
        'one hundred thirty one': 131, 'one hundred and thirty one': 131,
        'one hundred thirty two': 132, 'one hundred and thirty two': 132,
        'one hundred thirty three': 133, 'one hundred and thirty three': 133,
        'one hundred thirty four': 134, 'one hundred and thirty four': 134,
        'one hundred thirty five': 135, 'one hundred and thirty five': 135,
        'one hundred thirty six': 136, 'one hundred and thirty six': 136,
        'one hundred thirty seven': 137, 'one hundred and thirty seven': 137,
        'one hundred thirty eight': 138, 'one hundred and thirty eight': 138,
        'one hundred thirty nine': 139, 'one hundred and thirty nine': 139,
        'one hundred forty': 140, 'one hundred and forty': 140,
    };

    private normalizeForLookup(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/[\s\-\.&,]/g, ''); // 移除空格、連字符(-)、&、點號(.)和逗號(,)
    }
    /**
     * According to alias to find the scripture data
     * Parse scripture reference and generate URL
     * Supports various formats:
     * - "Second Nephi Chapter 1 verse 1"
     * - "Second Nephi Chapter one verse one"
     * - "2 Nephi 1:1" / "Doctrine and Covenants 1:1"/ "Alma 32:21"
     * - "2 Nephi Chapter Chapter 1 verse 1 to 3"
     * - "2 Nephi Chapter Chapter 1 verse 1-3"
     * - "2 Nephi Chapter Chapter 1 verse 1-3, 6-8"
     * - "2 Nephi Chapter Chapter 1:1 to 3"
     * - "2 Nephi Chapter Chapter 1 verse 1 and 3"
     * - "Alma Chapter twenty one verse twenty one" 數字都變成英文字怎麼整?
     * - "Alma 32:21-24"
     * - "Alma chapter 3 verse 3 through 5"
     * - "Alma chapter 3 verse 3,5"
     * - "Alma chapter 3 verse 3, 5-7"
     * - "Alma chapter 3 verse 3 and 5 to 7"
     * - "Alma chapter 3 to chapter 5"
     *  如果只有N1 or Ni 沒有全部的Nephi 會可以嗎？
     */

    public findBookByAlias(alias: string): ScriptureBook | null {
        if (!alias) return null;

        // Normalize the alias for consistent lookup
        const normalizedAlias = this.normalizeForLookup(alias);

        // Direct lookup by name (key)
        // 嘗試透過標準化後的主鍵進行直接查詢
        // 注意：這裡我們假設資料庫的鍵也是標準化的（或至少可以透過標準化輸入匹配）。
        // 由於原始資料庫鍵包含空格 ('1 nephi')，我們需要先標準化資料庫鍵再查找
        for (const key in this.scriptureDatabase) {
            if (this.normalizeForLookup(key) === normalizedAlias) {
                return this.scriptureDatabase[key];
            }
        }

        // Search through aliases
        // 3. 遍歷所有書目並檢查其 aliases 陣列
        for (const key in this.scriptureDatabase) {
            const book = this.scriptureDatabase[key];

            // 對於每本書，檢查它的所有別名中是否有與標準化後的輸入匹配的項目
            const aliasMatch = book.aliases.some(a => this.normalizeForLookup(a) === normalizedAlias);

            if (aliasMatch) {
                return book;
            }
        }

        return null;
    }
    /**
     * Transfer number words to numbers
     * E.g., "twenty one" -> 21
     * @param text The number in words
     */
    private convertWordsToNumbers(text: string): string {
        let convertedText = text.toLowerCase().trim();

        convertedText = convertedText.replace(/\s+through\s+/gi, '-'); // "through" -> "-"
        convertedText = convertedText.replace(/\s+to\s+/gi, '-');     // "to" -> "-"
        convertedText = convertedText.replace(/\s+and\s+/gi, ',');    // "and" -> ","
        convertedText = convertedText.replace(/\s+:\s+/gi, ':');

        // Replace number words with digits
        const sortedWords = Object.keys(this.wordToNumberMap).sort((a, b) => b.length - a.length);


        for (const word of sortedWords) {
            const num = this.wordToNumberMap[word];
            convertedText = convertedText.replace(new RegExp('\\b' + word + '\\b', 'gi'), num.toString());
        }
        // Clean up any duplicate keywords that may have arisen during replacement
        convertedText = convertedText.replace(/chapter\s+chapter/gi, 'chapter');
        convertedText = convertedText.replace(/verse\s+verse/gi, 'verse');

        return convertedText;
    }

    /**
     * Get all book aliases in the scripture database for AaemblyAI Word Search usage
     */
    public getAllBookAliases(): string[] {
        const aliases = new Set<string>();
        for (const book of Object.values(this.scriptureDatabase)) {
            book.aliases.forEach(alias => aliases.add(alias));
        }

        // Return all unique aliases as an array
        return Array.from(aliases);
    }
    /**
     * Converts a scripture key string (e.g., "2 Nephi 1:1-3") into a ScriptureReference object and URL.
     * 
     * 
     *  
     */
    public toStudyUrl(key: string, originslText: string, lang: string = 'eng'): ScriptureReference | null {
        if (!key) return null;

        let cleanKey = key.toLowerCase();
        // convert to numbers
        cleanKey = this.convertWordsToNumbers(cleanKey);

        // convert chapter and verse to standard note
        cleanKey = cleanKey
            .replace(/\s+chapter\s+/g, ' ')
            .replace(/\s+verse\s+/g, ':') // for only 1 verse
            .replace(/:\s+/g, ':')
            .replace(/,(\s*)/g, ',')


        // Scripture Format：(Book) (Chapter):(VerseStart) (range/list)
        // Support: (Book) (Chapter):(VerseStart-VerseEnd, Verse, VerseStart-VerseEnd)
        const verseRangeRegex = /([a-z0-9\s]+)\s+(\d+):([\d\-,]+)/;

        // Chpater Verse Format：(Book) (ChapterStart)-(ChapterEnd)
        // Support: (Book) (ChapterStart) to/through (ChapterEnd)
        const chapterRangeRegex = /([a-z0-9\s]+)\s+(\d+)\s*-\s*(\d+)\s*(?!:)/;

        // single scripture Format：(Book) (Chapter)
        const chapterOnlyRegex = /([a-z0-9\s]+)\s+(\d+)\s*(?![:\-])/;

        let match;
        let bookAlias: string;
        let chapter: number;
        let verse: number = 0;
        let endVerse: number = 0;
        let endChapter: number = 0;
        let urlFragment: string = '';
        let originalText: string = '';

        // --- Attempt to match scripture scale (Book Chapter:Verse[s]) ---
        if ((match = cleanKey.match(verseRangeRegex))) {
            bookAlias = match[1].trim();
            chapter = parseInt(match[2], 10);
            const verseList = match[3];

            const firstVerseMatch = verseList.match(/(\d+)/);
            if (firstVerseMatch) {
                verse = parseInt(firstVerseMatch[1], 10);
            } else {
                return null;
            }
            // For find the end verse
            const allNumbers = verseList.match(/(\d+)/g);
            if (allNumbers && allNumbers.length > 1) {
                const lastNumber = parseInt(allNumbers[allNumbers.length - 1], 10);
                if (lastNumber !== verse) {
                    endVerse = lastNumber;
                }
            } else if (verseList.includes('-')) {
                // 只有一個範圍，例如 '1-3'
                const parts = verseList.split('-');
                if (parts.length === 2) {
                    endVerse = parseInt(parts[1], 10);
                }
            }

            // 處理 URL 片段
            urlFragment = `${chapter}/${verse}`;
            if (endVerse) urlFragment += `-${endVerse}`;

            // --- 嘗試匹配章節範圍 (Book Chapter-Chapter) ---
        } else if ((match = cleanKey.match(chapterRangeRegex))) {
            bookAlias = match[1].trim();
            chapter = parseInt(match[2], 10); // Start Chapter
            endChapter = parseInt(match[3], 10); // End Chapter

            // URL 結構：/book/chapterStart-chapterEnd
            urlFragment = `${chapter}-${endChapter}`;

            // --- 嘗試匹配單章節 (Book Chapter) ---
        } else if ((match = cleanKey.match(chapterOnlyRegex))) {
            bookAlias = match[1].trim();
            chapter = parseInt(match[2], 10);
            urlFragment = `${chapter}`;

        } else {
            return null; // 無法匹配任何已知格式
        }

        // ----------------------------------------------------
        // 處理匹配到的結果 (Book Alias, Chapter, Verse/Range)
        // ----------------------------------------------------

        const book = this.findBookByAlias(bookAlias);

        if (book) {
            // 驗證起始章節是否存在
            if (book.chapters.includes(chapter)) {
                // 構建 URL (簡化，實際應用中會更複雜)
                const url = `https://www.churchofjesuschrist.org/study/${book.path}/${urlFragment}?lang=${lang}`;

                return {
                    book: book.name,
                    chapter: chapter,
                    verse: verse, // 只有單節時有值
                    endVerse: endVerse,
                    endChapter: endChapter,
                    url: url,
                    originalText: originalText // 存儲原始文字
                };
            }
        }

        return null;
    }

    /**
     * 從 AssemblyAI Word Search 結果中提取經文引用。
     * 這是兩階段偵測的第二階段。
     * * @param fullTranscript 完整的音訊轉錄文本
     * @param matches AssemblyAI Word Search 匹配到的書名結果
     * @param contextWindow 擷取書名周圍文本的字元數量 (例如 50)
     * @returns 經文引用列表
     */
    public processWordSearchResults(
        fullTranscript: string,
        matches: AssemblyAIWordMatch[],
        contextWindow: number = 70 // 增加上下文視窗，以捕捉更長的範圍引用
    ): ScriptureReference[] {
        const detectedReferences: ScriptureReference[] = [];
        const processedReferences = new Set<string>(); // 用來避免重複檢測

        for (const match of matches) {
            const bookAlias = match.text;

            for (const result of match.results) {
                // ----------------------------------------------------------------------
                // **注意：在實際應用中，我們需要 AssemblyAI 提供的字元索引來精確定位。
                // 這裡我們假設 fullTranscript 是時間序列對齊的文本，並且使用簡易的 indexOf 模擬
                // 由於我們不知道書名在 fullTranscript 中出現的精確字元位置，我們只能掃描。
                // ----------------------------------------------------------------------

                // 掃描 fullTranscript 中所有該書名出現的位置 (可能重複，但我們需要所有上下文)
                let index = -1;
                do {
                    index = fullTranscript.toLowerCase().indexOf(bookAlias.toLowerCase(), index + 1);
                    if (index === -1) break;

                    const bookIndex = index;

                    // 擷取書名出現前後的上下文
                    const start = Math.max(0, bookIndex - contextWindow);
                    const end = Math.min(fullTranscript.length, bookIndex + bookAlias.length + contextWindow);

                    // 擷取的文字片段
                    const contextText = fullTranscript.substring(start, end);

                    // 使用 toStudyUrl 邏輯來解析上下文，並傳入原始的 contextText
                    const reference = this.toStudyUrl(contextText, contextText);

                    if (reference) {
                        // 產生一個唯一的 key (Book Chapter:Verse[s] 或 Book Chapter[-Chapter])
                        let uniqueKey = `${reference.book} ${reference.chapter}`;
                        if (reference.endChapter) uniqueKey += `-${reference.endChapter}`;
                        if (reference.verse) uniqueKey += `:${reference.verse}`;
                        if (reference.endVerse) uniqueKey += `-${reference.endVerse}`;

                        if (!processedReferences.has(uniqueKey)) {
                            detectedReferences.push(reference);
                            processedReferences.add(uniqueKey);
                        }
                    }
                } while (index !== -1);
            }
        }

        return detectedReferences;
    }

    /**
     * 直接從一段文字中提取多個經文引用。（已更新為使用更強大的 toStudyUrl 邏輯）
     */
    public async extractScriptureReferences(text: string): Promise<ScriptureReference[]> {
        const references: ScriptureReference[] = [];

        // 整合所有經文引用格式的正則表達式
        // \s* (?:chapter\s+|verse\s+|:|-) 是用來處理數字之間的連字符、冒號、逗號等
        const complexReferenceRegex =
            /([A-Za-z0-9\s]+)\s+([\d\w\s,:;.\-\'"]+)/gi; // 匹配書名後接任何可能的章節/節號組合

        let cleanText = this.convertWordsToNumbers(text);
        let match;
        const processedSpans = new Set<string>();

        while ((match = complexReferenceRegex.exec(cleanText)) !== null) {
            const fullMatch = match[0];
            const bookAlias = match[1].trim();

            // 檢查書名是否有效
            if (!this.findBookByAlias(bookAlias)) continue;

            // 確保不處理重複的片段
            if (processedSpans.has(fullMatch)) continue;
            processedSpans.add(fullMatch);

            // toStudyUrl 會嘗試解析 numbersAndSymbols
            const scriptureRef = this.toStudyUrl(fullMatch, fullMatch);
            if (scriptureRef) {
                references.push(scriptureRef);
            }
        }

        return references;
    }
    /**
     * 【新功能】處理 AssemblyAI 轉錄稿中的 word_search_matches
     * 提取與經文書名或別名匹配的詞彙及其時間戳記。
     * * @param transcript 完整的 AssemblyAI 轉錄稿物件。
     * @returns 帶有時間戳記的經文引用列表。
     */
    public processAssemblyAITranscriptForScriptures(transcript: AssemblyAITranscript): TimedScriptureReference[] {
        const timedReferences: TimedScriptureReference[] = [];
        const matchedBookNames = new Set<string>();

        // 1. 收集所有可能的書名和別名 (正規化後)
        const allNormalizedAliases: string[] = [];
        Object.values(this.scriptureDatabase).forEach(book => {
            allNormalizedAliases.push(this.normalizeForLookup(book.name));
            book.aliases.forEach(alias => allNormalizedAliases.push(this.normalizeForLookup(alias)));
        });

        // 2. 處理 word_search_matches 列表
        for (const match of transcript.word_search_matches) {
            const normalizedText = this.normalizeForLookup(match.text);

            // 檢查這個單詞是否是有效的經文書名或別名
            if (this.findBookByAlias(match.text)) {
                // 如果是有效的書名/別名，我們就有了時間戳記

                // 注意：AssemblyAI 的 word_search 提供了單詞在音訊中出現的所有時間戳記
                // 我們假設每個匹配結果都是一次獨立的引用。

                // 為了簡化，這裡我們只處理單詞匹配。要處理完整的 "Alma 32:21" 引用，
                // 你需要在 `StreamingGateway` 中將所有可能的引用 (如 "Alma thirty-two twenty-one") 作為自定義關鍵詞傳遞。

                // 假設我們在 word_search 中搜索了所有經文書名和別名，
                // 並且 AssemblyAI 返回了這些詞彙在轉錄稿中的位置。

                // 由於我們只匹配單詞，所以我們不能在這裡直接建立完整的 ScriptureReference。
                // 更好的做法是：使用這個時間戳記作為參考，然後從該時間點附近的文本中提取完整的引用。

                // 由於我們無法存取轉錄稿中詞彙周圍的上下文，這裡只能標記書名出現的時間。
                // 為了滿足 TimedScriptureReference 介面的要求，我們只能返回一個不完整的引用（缺少 chapter/verse）。
                // 但如果我們知道這是 AssemblyAI 轉錄，我們可以將其視為一個完整的引用偵測。

                // 由於我們不知道上下文，我們將假設這是對應書本的總體提及。

                for (const result of match.results) {
                    // 為了避免重複，我們需要一個獨特的識別碼 (normalizedText + start)
                    const uniqueKey = `${normalizedText}-${result.start}`;
                    if (matchedBookNames.has(uniqueKey)) continue;
                    matchedBookNames.add(uniqueKey);

                    const book = this.findBookByAlias(match.text);
                    if (book) {
                        timedReferences.push({
                            book: book.name,
                            chapter: 1, // 由於無法確定，使用預設值 1
                            url: `https://www.churchofjesuschrist.org/study/scriptures/${book.path}?lang=eng`,
                            originalText: match.text,
                            startMs: result.start,
                            endMs: result.end,
                        });
                    }
                }
            }
        }

        return timedReferences;
    }


    // 保持其他輔助函數不變...
    public getAllBooks() {
        return Object.values(this.scriptureDatabase);
    }

    public searchBooks(query: string): ScriptureBook[] {
        const normalizedQuery = query.toLowerCase().trim();
        return Object.values(this.scriptureDatabase).filter(book =>
            book.name.toLowerCase().includes(normalizedQuery) ||
            book.aliases.some(alias => alias.toLowerCase().includes(normalizedQuery))
        );
    }

    // 佔位符
    public async processScriptureDetection(data: { text: string, confidence?: number, timestamp?: number, metadata: any }): Promise<any> {
        // 這是您之前定義的佔位符邏輯
        console.log('Processing detection DTO:', data);

        // 這裡可以呼叫 extractScriptureReferences 或其他邏輯
        const references = await this.extractScriptureReferences(data.text);

        if (references.length > 0) {
            // 返回第一個檢測到的引用
            return references[0];
        }

        return null;
    }
}
