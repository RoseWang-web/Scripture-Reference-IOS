import { Injectable } from "@nestjs/common";
import { WebSocket } from 'ws';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as querystring from 'querystring';
import { Readable, PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';

interface ConnectionParams {
    sample_rate: number;
    format_turns: boolean;
    encoding: string;
    token: string;
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
        // this.assemblyAiApiKey = process.env.ASSEMBLY_AI_API_KEY ?? '';
        this.assemblyAiApiKey = '37a6ed35c49c439b8dd1354c18e858e3';
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
        // Convert to PCM16 before sending
        const pcm16Buffer = await this.convertToPCM16(data.audioBuffer);
        if (pcm16Buffer) {
            this.sendAudioBuffer(data.userId, pcm16Buffer);
        }
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
            console.log(`WebSocket connection opened to: ${this.endpoint}.`);
        });
        ws.on("message", (message) => {
            try {
            const data = JSON.parse(message.toString());
            const msgType = data.type;
            if (msgType === "Begin") {
                const sessionId = data.id;
                const expiresAt = data.expires_at;
                const session = this.userSession.get(userId);
                if (session) {
                    session.sessionId = sessionId;
                }
                this.eventEmitter.emit('Begin', {'userId': userId, 'sessionId': sessionId, 'expiresAt': expiresAt});
            } else if (msgType === "Turn") {
                const transcript = data.transcript || "";
                const formatted = data.turn_is_formatted;
                const session = this.userSession.get(userId);
                this.eventEmitter.emit('Turn', {'userId': userId, 'data': data});
            } else if (msgType === "Termination") {
                const audioDuration = data.audio_duration_seconds;
                const sessionDuration = data.session_duration_seconds;
                const session = this.userSession.get(userId);
                this.eventEmitter.emit('Termination', {'userId': userId, 'sessionId': session?.sessionId || '', 'audioDuration': audioDuration, 'sessionDuration': sessionDuration});
            }
            } catch (error) {
            this.eventEmitter.emit('Error', {userId: userId, error: error});
            }
        });
        ws.on("error", (error) => {
            this.eventEmitter.emit('WebSocketError', {userId: userId, error:error});
        });
        ws.on("close", (code, reason) => {
            this.eventEmitter.emit('WebSocketDisconnected', {userId: userId, status: code, Msg: reason})
        });
    }

    /**
     * Send audio data to AssemblyAI
     */
    async sendAudioBuffer(userId: string,audioBuffer: Buffer) {
        const session = this.userSession.get(userId);
        if (session && session.ws.readyState === WebSocket.OPEN && !session.stopRequested) {
            session.ws.send(audioBuffer);
        }
    }

    /**
     * Initialize websocket connection to AssemblyAI
     */
    async connect(userId: string, tempToken: string): Promise<void>{
        const userConnectionParams: ConnectionParams = {
            sample_rate: 16000,
            format_turns: true,
            encoding: 'pcm16',
            token: tempToken,
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
                throw new Error(`Failed to generate token: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            throw new Error('Failed to generate temporary token');
        }
    }

    private async convertToPCM16(audioBuffer: Buffer): Promise<Buffer | null> {
        return new Promise((resolve, reject) => {
          const inputStream = new Readable();
          inputStream.push(audioBuffer);
          inputStream.push(null);
    
          const outputStream = new PassThrough();
          const chunks: Buffer[] = [];
    
          outputStream.on('data', (chunk) => {
            chunks.push(chunk);
          });
    
          outputStream.on('end', () => {
            const result = Buffer.concat(chunks);
            resolve(result);
          });
    
          outputStream.on('error', (error) => {
            console.error('Output stream error:', error);
            resolve(null);
          });
    
          ffmpeg(inputStream)
            .inputFormat('auto') // Auto-detect input format
            .audioCodec('pcm_s16le') // PCM 16-bit little-endian
            .audioFrequency(16000) // 16kHz sample rate
            .audioChannels(1) // Mono
            .format('s16le') // Raw PCM format
            .on('error', (error) => {
              console.error('FFmpeg conversion error:', error);
              resolve(null);
            })
            .on('end', () => {
              console.log('Audio conversion completed');
            })
            .pipe(outputStream, { end: true });
        });
      }
}