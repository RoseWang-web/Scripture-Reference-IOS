import { Injectable } from "@nestjs/common";
import { WebSocket } from 'ws';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import * as querystring from 'querystring';

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
            console.log(`✅ WebSocket connection opened to AssemblyAI: ${this.endpoint}`);
        });
        ws.on("message", (message) => {
            try {
            const data = JSON.parse(message.toString());
            const msgType = data.type;
            console.log(`📨 AssemblyAI message type: ${msgType}`);
            if (msgType === "Begin") {
                const sessionId = data.id;
                const expiresAt = data.expires_at;
                const session = this.userSession.get(userId);
                if (session) {
                    session.sessionId = sessionId;
                }
                console.log(`✅ AssemblyAI session started: ${sessionId}`);
                this.eventEmitter.emit('Begin', {'userId': userId, 'sessionId': sessionId, 'expiresAt': expiresAt});
            } else if (msgType === "Turn") {
                const transcript = data.transcript || "";
                const formatted = data.turn_is_formatted;
                const session = this.userSession.get(userId);
                console.log(`📝 Transcript received: ${transcript}`);
                this.eventEmitter.emit('Turn', {'userId': userId, 'data': data});
            } else if (msgType === "Termination") {
                const audioDuration = data.audio_duration_seconds;
                const sessionDuration = data.session_duration_seconds;
                const session = this.userSession.get(userId);
                this.eventEmitter.emit('Termination', {'userId': userId, 'sessionId': session?.sessionId || '', 'audioDuration': audioDuration, 'sessionDuration': sessionDuration});
            } else if (msgType === "Error") {
                console.error(`❌ AssemblyAI Error:`, data);
            }
            } catch (error) {
            console.error(`❌ Error parsing AssemblyAI message:`, error);
            this.eventEmitter.emit('Error', {userId: userId, error: error});
            }
        });
        ws.on("error", (error) => {
            console.error(`❌ AssemblyAI WebSocket error for user ${userId}:`, error);
            this.eventEmitter.emit('WebSocketError', {userId: userId, error:error});
        });
        ws.on("close", (code, reason) => {
            console.log(`🔌 AssemblyAI WebSocket closed for user ${userId}. Code: ${code}, Reason: ${reason.toString()}`);
            this.eventEmitter.emit('WebSocketDisconnected', {userId: userId, status: code, Msg: reason})
        });
    }

    /**
     * Send audio data to AssemblyAI
     */
    async sendAudioBuffer(userId: string,audioBuffer: Buffer) {
        const session = this.userSession.get(userId);
        console.log('📊 Session exists:', !!session);
        if (session) {
            console.log('📊 WS exists:', !!session.ws);
            console.log('📊 WS readyState:', session.ws?.readyState);
            console.log('📊 WS OPEN constant:', WebSocket.OPEN);
            console.log('📊 stopRequested:', session.stopRequested);
        }
        if (session && session.ws.readyState === WebSocket.OPEN && !session.stopRequested) {
            session.ws.send(audioBuffer);
            console.log('✅ 真的发送了音频数据到AssemblyAI! Buffer size:', audioBuffer.length);
        } else {
            console.log('❌ Cannot send audio - connection not ready');
        }
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
                console.log(`✅ AssemblyAI WebSocket ready for user: ${userId}`);
                resolve();
            });

            userWs.on('error', (error) => {
                clearTimeout(timeout);
                console.error(`❌ AssemblyAI WebSocket error for user ${userId}:`, error);
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
                throw new Error(`Failed to generate token: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            throw new Error('Failed to generate temporary token');
        }
    }

}