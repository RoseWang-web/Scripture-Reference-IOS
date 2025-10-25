import { Test, TestingModule } from '@nestjs/testing';
import { ScripturesService, ScriptureReference } from './scriptures.service';

// 測試套件：ScripturesService
describe('ScripturesService', () => {
    let service: ScripturesService;

    beforeEach(async () => {
        // 建立一個測試模組，只包含 ScripturesService
        const module: TestingModule = await Test.createTestingModule({
            providers: [ScripturesService],
        }).compile();

        // 取得服務實例
        service = module.get<ScripturesService>(ScripturesService);
    });

    // 測試服務是否已定義
    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // 測試 toStudyUrl 方法
    describe('toStudyUrl', () => {
        // 測試簡單的經文引用：書名 + 章:節 (例如: 2 Nephi 1:1)
        it('should parse "2 Nephi 1:1" correctly and generate URL', () => {
            const result = service.toStudyUrl('2 Nephi 1:1', '2 Nephi 1:1');
            expect(result).toBeDefined();
            expect(result?.book).toBe('2 Nephi');
            expect(result?.chapter).toBe(1);
            expect(result?.verse).toBe(1);
            expect(result?.endVerse).toBeUndefined();
            // 驗證生成的 URL 路徑是否正確
            expect(result?.url).toContain('bofm/2-ne/1.1');
        });

        // 測試使用別名的經文引用 (例如: D&C 1:1)
        it('should parse "D&C 1:1" (alias) correctly', () => {
            const result = service.toStudyUrl('D&C 1:1', 'D&C 1:1');
            expect(result).toBeDefined();
            expect(result?.book).toBe('Doctrine and Covenants');
            expect(result?.chapter).toBe(1);
            expect(result?.verse).toBe(1);
            expect(result?.url).toContain('dc-testament/dc/1.1');
        });

        // 測試包含連節的經文引用 (例如: Alma 32:21-22)
        it('should parse verse range "Alma 32:21-22" correctly', () => {
            const result = service.toStudyUrl('Alma 32:21-22', 'Alma 32:21-22');
            expect(result).toBeDefined();
            expect(result?.book).toBe('Alma');
            expect(result?.chapter).toBe(32);
            expect(result?.verse).toBe(21);
            expect(result?.endVerse).toBe(22);
            expect(result?.url).toContain('bofm/alma/32.21-22');
        });

        // 測試只有章節的經文引用 (例如: 1 Nephi 3)
        it('should parse chapter only "1 Nephi 3" correctly', () => {
            const result = service.toStudyUrl('1 Nephi 3', '1 Nephi 3');
            expect(result).toBeDefined();
            expect(result?.book).toBe('1 Nephi');
            expect(result?.chapter).toBe(3);
            expect(result?.verse).toBeUndefined();
            expect(result?.url).toContain('bofm/1-ne/3');
        });

        // 測試 Old Testament (舊約) 經文引用 (例如: Genesis 1:1)
        it('should parse Old Testament reference "Genesis 1:1" correctly', () => {
            const result = service.toStudyUrl('Genesis 1:1', 'Genesis 1:1');
            expect(result).toBeDefined();
            expect(result?.book).toBe('Genesis');
            expect(result?.chapter).toBe(1);
            expect(result?.verse).toBe(1);
            expect(result?.url).toContain('ot/gen/1.1');
        });


        // 測試無效的經文引用 (例如: Invalid Book 999:999)
        it('should return null for invalid references', () => {
            const result = service.toStudyUrl('Invalid Book 999:999', 'Invalid Book 999:999');
            expect(result).toBeNull();
        });

        // 測試關鍵詞獲取功能
        it('should return a list of unique, lowercase scripture keywords for AssemblyAI', () => {
            const keywords = service.getAllScriptureKeywords();
            expect(keywords.length).toBeGreaterThan(5); // 確保有足夠多的關鍵詞
            expect(keywords).toContain('2 nephi');
            expect(keywords).toContain('d&c');
            expect(keywords).toContain('genesis');
            // 確保關鍵詞都是小寫
            expect(keywords.some(k => k !== k.toLowerCase())).toBeFalsy();
            // 確保關鍵詞是唯一的
            expect(new Set(keywords).size).toEqual(keywords.length);
        });
    });

    // 測試 extractScriptureReferences 方法（從文本中提取）
    describe('extractScriptureReferences', () => {
        it('should extract a single standard reference from text', async () => {
            const text = '我們來看 2 Nephi 1:1，它教導我們關於信心。';
            const references = await service.extractScriptureReferences(text);
            expect(references).toHaveLength(1);
            expect(references[0].book).toBe('2 Nephi');
            expect(references[0].chapter).toBe(1);
            expect(references[0].verse).toBe(1);
        });

        it('should extract multiple references from complex text', async () => {
            const text = '這是關於 Alma 32:21 的教導。之後，我們討論了 D&C 1:1-3 的原則。';
            const references = await service.extractScriptureReferences(text);
            expect(references).toHaveLength(2);
            expect(references[0].book).toBe('Alma');
            expect(references[0].chapter).toBe(32);
            expect(references[0].verse).toBe(21);

            expect(references[1].book).toBe('Doctrine and Covenants');
            expect(references[1].chapter).toBe(1);
            expect(references[1].verse).toBe(1);
            expect(references[1].endVerse).toBe(3);
        });

        it('should return an empty array if no known references are found', async () => {
            const text = '這段文字不包含任何經文引用。';
            const references = await service.extractScriptureReferences(text);
            expect(references).toHaveLength(0);
        });
    });

    // 測試 AssemblyAI 處理邏輯
    describe('processAssemblyAITranscriptForScriptures', () => {
        it('should convert AssemblyAI word_search_matches into TimedScriptureReference', () => {
            const mockTranscript = {
                text: "This is a mention of 2 Nephi and also Alma.",
                word_search_matches: [
                    {
                        text: "2 Nephi",
                        results: [
                            { start: 1500, end: 2000 },
                        ]
                    },
                    {
                        text: "Alma",
                        results: [
                            { start: 3000, end: 3500 },
                            { start: 5000, end: 5500 }, // 模擬兩個時間點的匹配
                        ]
                    },
                    {
                        text: "InvalidWord",
                        results: [{ start: 9000, end: 9500 }]
                    }
                ]
            };

            const timedReferences = service.processAssemblyAITranscriptForScriptures(mockTranscript);

            expect(timedReferences).toHaveLength(3);

            // 驗證第一個匹配
            expect(timedReferences[0].book).toBe('2 Nephi');
            expect(timedReferences[0].startMs).toBe(1500);
            expect(timedReferences[0].endMs).toBe(2000);
            expect(timedReferences[0].chapter).toBe(1); // 預期預設為 1

            // 驗證第二和第三個匹配
            expect(timedReferences[1].book).toBe('Alma');
            expect(timedReferences[1].startMs).toBe(3000);
            expect(timedReferences[2].book).toBe('Alma');
            expect(timedReferences[2].startMs).toBe(5000);
        });

        it('should return empty array if word_search_matches is empty or null', () => {
            const mockTranscript = { text: "No matches.", word_search_matches: [] };
            let timedReferences = service.processAssemblyAITranscriptForScriptures(mockTranscript);
            expect(timedReferences).toHaveLength(0);

            const mockTranscriptNull = { text: "No matches.", word_search_matches: null as any };
            timedReferences = service.processAssemblyAITranscriptForScriptures(mockTranscriptNull);
            expect(timedReferences).toHaveLength(0);
        });
    });
});
