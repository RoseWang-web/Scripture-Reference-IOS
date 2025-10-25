import { Test, TestingModule } from '@nestjs/testing';
import { ScripturesService } from './scriptures.service';

describe('ScripturesService', () => {
    let service: ScripturesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ScripturesService],
        }).compile();

        service = module.get<ScripturesService>(ScripturesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findBookByAlias', () => {
        // 假設 findBookByAlias 是 Service 內部的方法，但在測試中我們可以存取它。
        // We assume findBookByAlias is an internal method of the Service, but we can access it directly in tests.

        it('should find a book by its normalized key (e.g., "2 nephi")', () => {
            // 測試直接使用標準化後的書名鍵
            const result = service['findBookByAlias']('2 nephi');
            expect(result).toBeDefined();
            expect(result?.name).toBe('2 Nephi');
        });

        it('should find a book by a full alias (e.g., "Second Nephi")', () => {
            // 測試使用完整的別名
            const result = service['findBookByAlias']('Second Nephi');
            expect(result).toBeDefined();
            expect(result?.name).toBe('2 Nephi');
        });

        it('should find a book by a short alias (e.g., "1 NE")', () => {
            // 測試使用短別名，並驗證大小寫不敏感
            const result = service['findBookByAlias']('1 NE');
            expect(result).toBeDefined();
            expect(result?.name).toBe('1 Nephi');
        });

        it('should handle case-insensitivity correctly (e.g., "aLmA")', () => {
            // 測試大小寫混合的輸入
            const result = service['findBookByAlias']('aLmA');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Alma');
        });

        it('should find book of mormon by BOM alias', () => {
            // 測試 Book of Mormon 的 BOM 別名
            const result = service['findBookByAlias']('BOM');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Book of Mormon');
        });

        it('should find a book with a space in the key (e.g., "DOCTRINE AND COVENANTS")', () => {
            // 測試書名包含空格，且使用大小寫不敏感的直接鍵
            const result = service['findBookByAlias']('DOCTRINE AND COVENANTS');
            expect(result).toBeDefined();
            expect(result?.name).toBe('Doctrine and Covenants');
        });

        it('should return null for an alias that does not exist', () => {
            // 測試不存在的別名
            const result = service['findBookByAlias']('NonExistentBook');
            expect(result).toBeNull();
        });

        it('should return null for an empty string input', () => {
            // 測試空字串輸入
            const result = service['findBookByAlias']('');
            expect(result).toBeNull();
        });
    });
});
