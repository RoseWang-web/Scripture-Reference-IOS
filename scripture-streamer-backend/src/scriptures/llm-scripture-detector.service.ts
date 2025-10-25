import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface DetectedScripture {
    book: string;
    chapter: number;
    verse?: number;
    endVerse?: number;
    originalText: string;
}

@Injectable()
export class LlmScriptureDetectorService {
    private readonly llmGatewayUrl = 'https://llm-gateway.assemblyai.com/v1/chat/completions';
    private readonly apiKey: string;
    
    // 🚀 OPTIMIZATION: Cache prompt template to avoid string concatenation overhead
    private readonly promptTemplate = `Extract scriptures, return JSON only.
Format: [{"book":"Alma","chapter":2,"verse":21,"endVerse":null,"originalText":"Alma 2:21"}]
Books: 1 Nephi, 2 Nephi, Jacob, Enos, Jarom, Omni, Words of Mormon, Mosiah, Alma, Helaman, 3 Nephi, 4 Nephi, Mormon, Ether, Moroni, Bible, D&C, Pearl of Great Price
Handle: "Alma 1:20", "Second Nephi 3:2", "2 Nephi chapter 3 verse 2", word numbers
verse=null if missing, verse=1 endVerse=5 for ranges
[] if none. Text: `;

    // 🚀 OPTIMIZATION: Reusable axios config
    private readonly axiosConfig = {
        headers: {
            'authorization': '',
            'content-type': 'application/json'
        },
        timeout: 5000
    };

    constructor() {
        // Support both ASSEMBLYAI_API_KEY and ASSEMBLY_AI_API_KEY
        this.apiKey = process.env.ASSEMBLYAI_API_KEY || process.env.ASSEMBLY_AI_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ ASSEMBLYAI_API_KEY not set - LLM scripture detection will not work');
        } else {
            console.log('✅ AssemblyAI API key loaded for LLM scripture detection');
            this.axiosConfig.headers.authorization = this.apiKey;
        }
    }

    /**
     * Use AssemblyAI LLM Gateway to detect scripture references in text
     * This is more powerful than regex as it understands context and variations
     */
    async detectScriptures(text: string): Promise<DetectedScripture[]> {
        // 🚀 OPTIMIZATION: Early returns to avoid unnecessary processing
        if (!text?.trim()) return [];
        if (!this.apiKey) {
            console.error('❌ Cannot detect scriptures: API key not set');
            return [];
        }

        try {
            console.log(`🤖 LLM: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            
            // 🚀 OPTIMIZATION: Use cached template + reusable config
            const response = await axios.post(
                this.llmGatewayUrl,
                {
                    model: 'claude-sonnet-4-5-20250929',
                    messages: [{ role: 'user', content: this.promptTemplate + text }],
                    max_tokens: 300, // Reduced from 500 - scripture refs are short
                    temperature: 0 // 0 for deterministic extraction (was 0.1)
                },
                this.axiosConfig
            );

            const llmOutput = response.data.choices[0]?.message?.content;
            if (!llmOutput) {
                return [];
            }

            // Extract JSON from markdown code blocks if present
            let jsonStr = llmOutput.trim();
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
            }

            const detected = JSON.parse(jsonStr) as DetectedScripture[];
            
            if (Array.isArray(detected) && detected.length > 0) {
                return detected;
            }
            
            return [];

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 429) {
                    console.warn(`Rate limited`);
                }
            }
            return [];
        }
    }

    /**
     * 🚀 OPTIMIZED: Batch detect scriptures with parallel processing and efficient deduplication
     */
    async detectScripturesFromChunks(chunks: string[]): Promise<DetectedScripture[]> {
        if (!chunks?.length) return [];
        
        // 🚀 OPTIMIZATION: Process chunks in parallel instead of sequentially
        const results = await Promise.allSettled(
            chunks.map(chunk => this.detectScriptures(chunk))
        );
        
        // Flatten successful results
        const allDetected = results
            .filter((r): r is PromiseFulfilledResult<DetectedScripture[]> => r.status === 'fulfilled')
            .flatMap(r => r.value);

        if (allDetected.length === 0) return [];

        // 🚀 OPTIMIZATION: Use Map for O(1) deduplication instead of O(n²) filter
        const uniqueMap = new Map<string, DetectedScripture>();
        
        for (const scripture of allDetected) {
            const key = `${scripture.book}:${scripture.chapter}:${scripture.verse ?? 'null'}`;
            if (!uniqueMap.has(key)) {
                uniqueMap.set(key, scripture);
            }
        }

        return Array.from(uniqueMap.values());
    }
}

