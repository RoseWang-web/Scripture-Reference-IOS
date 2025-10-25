import { Injectable } from "@nestjs/common";
import { WebSocket } from 'ws';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as querystring from 'querystring';

// Custom Vocabulary for scripture names and terms
const SCRIPTURE_VOCABULARY: string[] = [
    // Book of Mormon
    "Book of Mormon", "1 Nephi", "First Nephi", "2 Nephi", "Second Nephi",
    "Jacob", "Enos", "Jarom", "Omni", "Words of Mormon",
    "Mosiah", "Alma", "Helaman", 
    "3 Nephi", "Third Nephi", "4 Nephi", "Fourth Nephi",
    "Mormon", "Ether", "Moroni",
    // Doctrine and Covenants
    "Doctrine and Covenants", "D and C",
    // Pearl of Great Price
    "Pearl of Great Price", "Book of Moses", "Book of Abraham",
    "Joseph Smith Matthew", "Joseph Smith History", "Articles of Faith",
    // Bible books
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "Samuel", "Kings", "Chronicles",
    "Psalms", "Proverbs", "Isaiah", "Jeremiah", "Ezekiel", "Daniel",
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
    "Corinthians", "Galatians", "Ephesians", "Philippians",
    "Colossians", "Thessalonians", "Timothy", "Titus",
    "Hebrews", "James", "Peter", "Jude", "Revelation",
    // Common terms
    "Chapter", "Verse", "Section", "Testament",
    // Names and places
    "Nephi", "Lehi", "Laman", "Lemuel", "Zarahemla"
];

interface ConnectionParams {
    sample_rate: number;
    format_turns: boolean;
    encoding: string;
    token: string;
    word_boost?: string[];
}

@Injectable()
export class AssemblyAiService {
    private readonly assemblyAiApiKey: string;
    private readonly endpoint: string;
    private userSession: Map<string, {
        ws: WebSocket;
        tempToken: string;
        sessionId?: string;
        stopRequested: boolean;
        connectionParams: ConnectionParams;
    }>;

    constructor(private readonly eventEmitter: EventEmitter2) {
        // Support both ASSEMBLYAI_API_KEY and ASSEMBLY_AI_API_KEY
        this.assemblyAiApiKey = process.env.ASSEMBLYAI_API_KEY || process.env.ASSEMBLY_AI_API_KEY || '';
        if (!this.assemblyAiApiKey) {
            console.error('❌ ASSEMBLYAI_API_KEY not set - streaming will not work!');
        } else {
            console.log('✅ AssemblyAI API key loaded:', this.assemblyAiApiKey.substring(0, 10) + '...');
        }
        // this.endpoint = process.env.ASSEMBLY_AI_ENDPOINT ?? '';
        this.endpoint = 'wss://streaming.assemblyai.com/v3/ws';
        this.userSession = new Map();
    }

    // Listen for events from Gateway
    @OnEvent('StartStreaming')
    async handleStreamingStart(data: { userId: string}) {
        const tempToken = await this.generateTemporaryToken();
        await this.connect(data.userId, tempToken);
    }

    @OnEvent('SendAudioBuffer')
    async handleAudioFromGateway(data: { userId: string, audioBuffer: Buffer }) {
        // iOS app already sends PCM16 mono 16kHz - no conversion needed!
        this.sendAudioBuffer(data.userId, data.audioBuffer);
    }

    @OnEvent('StopStreaming')
    async handleStreamingStop(data: { userId: string}) {
        this.disconnect(data.userId);
    }

    /**
     * Set up event handler
     */
    private setupEventHandlers(userId: string, ws: WebSocket) {
        // Setup WebSocket event handlers
        ws.on("open", () => {
            console.log(`Connected to AssemblyAI`);
        });
        ws.on("message", (message) => {
            try {
                const data = JSON.parse(message.toString());
                const msgType = data.type;
                
                // 🚀 OPTIMIZATION: Use switch for faster branching + reduced logging
                switch (msgType) {
                    case "Begin":
                        const session = this.userSession.get(userId);
                        if (session) {
                            session.sessionId = data.id;
                        }
                        this.eventEmitter.emit('Begin', {
                            userId, 
                            sessionId: data.id, 
                            expiresAt: data.expires_at
                        });
                        break;
                        
                    case "Turn":
                        // Only log formatted transcripts
                        if (data.turn_is_formatted && data.transcript) {
                            console.log(`Transcript: "${data.transcript}"`);
                        }
                        this.eventEmitter.emit('Turn', { userId, data });
                        break;
                        
                    case "Termination":
                        const userSession = this.userSession.get(userId);
                        this.eventEmitter.emit('Termination', {
                            userId,
                            sessionId: userSession?.sessionId || '',
                            audioDuration: data.audio_duration_seconds,
                            sessionDuration: data.session_duration_seconds
                        });
                        break;
                        
                    case "Error":
                        console.error(`AssemblyAI Error:`, data);
                        break;
                }
            } catch (error) {
                console.error(`Error parsing message:`, error);
                this.eventEmitter.emit('Error', { userId, error });
            }
        });
        ws.on("error", (error) => {
            console.error(`AssemblyAI error:`, error);
            this.eventEmitter.emit('WebSocketError', {userId: userId, error:error});
        });
        ws.on("close", (code, reason) => {
            console.log(`AssemblyAI closed. Code: ${code}`);
            this.eventEmitter.emit('WebSocketDisconnected', {userId: userId, status: code, Msg: reason})
        });
    }

    /**
     * 🚀 OPTIMIZED: Send audio data to AssemblyAI with minimal logging
     */
    async sendAudioBuffer(userId: string, audioBuffer: Buffer) {
        const session = this.userSession.get(userId);
        
        // 🚀 OPTIMIZATION: Fast path - check conditions in order of likelihood
        if (session?.ws?.readyState === WebSocket.OPEN && !session.stopRequested) {
            session.ws.send(audioBuffer);
            // Removed excessive logging for performance
        }
        // Only log errors, not every send
    }

    /**
     * Initialize websocket connection to AssemblyAI
     */
    async connect(userId: string, tempToken: string): Promise<void>{
        const userConnectionParams: ConnectionParams = {
            sample_rate: 16000,
            format_turns: true,
            encoding: 'pcm_s16le', // PCM signed 16-bit little-endian
            token: tempToken,
            word_boost: SCRIPTURE_VOCABULARY, // Custom vocabulary for scripture names
        };

        const userWs = new WebSocket(`${this.endpoint}?${querystring.stringify(userConnectionParams as any)}`);
        
        this.userSession.set(userId, {
            ws: userWs,
            tempToken: tempToken,
            sessionId: '',
            stopRequested: false,
            connectionParams: userConnectionParams,
        });

        this.setupEventHandlers(userId, userWs);

        // Wait for WebSocket to be ready before resolving
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 10000); // 10 second timeout

            userWs.on('open', () => {
                clearTimeout(timeout);
                resolve();
            });

            userWs.on('error', (error) => {
                clearTimeout(timeout);
                console.error(`AssemblyAI connection error:`, error);
                reject(error);
            });
        });
    }

    /**
     * Disconnect
     */
    async disconnect(userId: string): Promise<void> {
        const session = this.userSession.get(userId);
        if (session) {
            session.ws.close();
            this.userSession.delete(userId);
        }
    }
    
    /**
     * Generate temporary token using AssemblyAI's API
     */
    async generateTemporaryToken(expiresInSeconds: number = 600): Promise<string> {
        try {
            // Build URL with query parameters
            const url = new URL('https://streaming.assemblyai.com/v3/token');
            url.searchParams.set('expires_in_seconds', expiresInSeconds.toString());
            url.searchParams.set('max_session_duration_seconds', '10800'); // 3 hour max session

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': this.assemblyAiApiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ AssemblyAI token generation failed: ${response.status} ${response.statusText}`);
                console.error(`❌ Response body:`, errorText);
                throw new Error(`Failed to generate token: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error(`❌ Error in generateTemporaryToken:`, error);
            throw new Error('Failed to generate temporary token');
        }
    }

}