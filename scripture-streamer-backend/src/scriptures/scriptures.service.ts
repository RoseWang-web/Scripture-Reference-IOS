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
    /**
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

    toStudyUrl(key: string, lang = 'emg'): ScriptureReference | null {
        if (!key) return null;

        const normalizedKey = key.toLowerCase().replace(/[\.,]/g, ''.trim());

        // Try multiple parsing patterns
        const patterns = [
            // "Second Nephi Chapter 1 verse 1"
            /([A-Za-z0-9\s]+)\s+Chapter\s+(\d+)\s+verse\s+(\d+)*/gi,
            // "2 Nephi 1:1", "Alma 32:21", "Doctrine and Covenants 1:1" 
            /([A-Za-z0-9\s]+)\s+(\d+):(\d+)/gi,
            // "Genesis Chpater 1 to 3"
            /([A-Za-z0-9\s]+)\s+Chapter\s+(\d+)\s+to\s+(\d+)*/gi,
            // "Genesis Chapter 1 verse 1 to 3"
            /([A-Za-z0-9\s]+)\s+Chapter\s+(\d+)\s+verse\s+(\d+)\s+to\s+(\d+)*/gi,
            // "Genesis 1:1-3"
            /([A-Za-z0-9\s]+)\s+(\d+):(\d+)-(\d+)*/gi,
        ];

        let book = '';
        let chapter = '';
        let verse = '';

        // Try each pattern until a match is found
        for (const pattern of patterns) {
            const match = normalizedKey.match(pattern);
            if (match) {
                book = match[1];
                chapter = match[2];
                verse = match[3];
            }



            return null; // tempo


        }
    }