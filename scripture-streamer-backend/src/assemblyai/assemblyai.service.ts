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
        this.assemblyAiApiKey = process.env.ASSEMBLY_AI_API_KEY ?? '';
        this.endpoint = process.env.ASSEMBLY_AI_ENDPOINT ?? '';
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
}