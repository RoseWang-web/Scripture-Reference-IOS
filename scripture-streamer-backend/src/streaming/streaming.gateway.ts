import { Injectable } from "@nestjs/common";
import { OnEvent } from '@nestjs/event-emitter';
import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from "@nestjs/websockets";
import { Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from "axios";
import { Server } from 'socket.io';
import { LlmScriptureDetectorService, DetectedScripture } from '../scriptures/llm-scripture-detector.service';

interface UserTranscript {
    userId: string;
    data: JSON;
    socket: Socket;
    sessionId?: string;
}

const PLACEHOLDER_SUMMARY = "This is a placeholder summary";

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
})
export class StreamingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
    
    // 🚀 OPTIMIZATION: Use Map for O(1) lookups instead of Array.find() O(n)
    private userTranscripts: Map<string, UserTranscript> = new Map();
    private socketToUserId: Map<Socket, string> = new Map();

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly llmDetector: LlmScriptureDetectorService
    ) {
        console.log('StreamingGateway initialized');
    }

    afterInit(server: Server) {
        console.log('Socket.IO server initialized');
    }

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
        client.emit('connection', { message: 'Connected to Scripture Streamer Backend' });
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        
        // 🚀 OPTIMIZED: O(1) lookup instead of O(n) find
        const userId = this.socketToUserId.get(client);
        if (userId) {
            const userTranscript = this.userTranscripts.get(userId);
            if (userTranscript) {
                console.log(`Saving transcript for user: ${userId}`);
                this.saveUserTranscript(userTranscript);
            }
            
            // Clean up both maps
            this.userTranscripts.delete(userId);
            this.socketToUserId.delete(client);
        }
        
        console.log(`Remaining connections: ${this.userTranscripts.size}`);
    }

    // Listen for events from frontend
    @SubscribeMessage('StartStreaming')
    async handleFrontendStart(client: Socket, data: { userId: string }) {
        const userTranscript: UserTranscript = { 
            userId: data.userId, 
            data: {} as JSON, 
            socket: client, 
            sessionId: undefined 
        };
        this.userTranscripts.set(data.userId, userTranscript);
        this.socketToUserId.set(client, data.userId);
        
        this.eventEmitter.emit('StartStreaming', { userId: data.userId });
    }

    @SubscribeMessage('SendAudioBuffer')
    async handleFrontendAudioBuffer(client: Socket, data: string) {
        // 🚀 OPTIMIZED: O(1) lookup instead of O(n) find
        const userId = this.socketToUserId.get(client);
        if (userId) {
            // Data comes as base64 string from iOS app - decode it to binary
            const audioBuffer = Buffer.from(data, 'base64');
            // Reduced logging to avoid spam
            this.eventEmitter.emit('SendAudioBuffer', { userId, audioBuffer });
        }
    }

    @SubscribeMessage('StopStreaming')
    async handleStreamingStop(client: Socket, data: { userId: string }) {
        this.eventEmitter.emit('StopStreaming', { userId: data.userId });

        const userTranscript = this.userTranscripts.get(data.userId);
        if (userTranscript) {
            client.emit('StreamingStopped', { 
                message: 'Streaming stopped successfully',
                finalTranscript: userTranscript.data 
            });
        }

        this.userTranscripts.delete(data.userId);
        this.socketToUserId.delete(client);
    }

    // Listen for events from AssemblyAiService
    @OnEvent('Begin')
    createUserTranscript(data: { userId: string, sessionId: string, expiresAt: string }) {
        // 🚀 OPTIMIZED: O(1) lookup
        const userTranscript = this.userTranscripts.get(data.userId);
        if (userTranscript) {
            userTranscript.sessionId = data.sessionId;
        }
    }

    @OnEvent('Turn')
    async updateUserTranscript(data: { userId: string, data: any }) {
        // 🚀 OPTIMIZED: O(1) lookup
        const userTranscript = this.userTranscripts.get(data.userId);
        if (!userTranscript) return;
        
        userTranscript.data = data.data;
        const transcript = data.data.transcript || '';
        
        // 🚀 OPTIMIZATION: Only detect scriptures in formatted (final) transcripts
        if (!transcript?.trim() || !data.data.turn_is_formatted) {
            // Send unformatted/empty transcripts immediately
            userTranscript.socket.emit('Turn', { ...data.data, scriptureReferences: [] });
            return;
        }

        // 🚀 OPTIMIZATION: Non-blocking scripture detection
        this.detectAndSendScriptures(userTranscript, transcript, data.data);
    }
    
    // LLM-based scripture detection (async, non-blocking)
    private async detectAndSendScriptures(userTranscript: UserTranscript, transcript: string, turnData: any) {
        const scriptureReferences: DetectedScripture[] = [];
        
        try {
            const detected = await this.llmDetector.detectScriptures(transcript);
            
            if (detected.length > 0) {
                scriptureReferences.push(...detected);
                console.log(`Found ${detected.length} scripture(s) in: "${transcript}"`);
            }
        } catch (error) {
            console.error(`Scripture detection failed:`, error);
        }

        // Send enriched data to client
        userTranscript.socket.emit('Turn', { 
            ...turnData, 
            scriptureReferences 
        });
    }


    @OnEvent('Termination')
    async saveUserTranscriptToDatabase(data: { userId: string }) {
        // 🚀 OPTIMIZED: O(1) lookup
        const userTranscript = this.userTranscripts.get(data.userId);
        if (userTranscript?.sessionId) {
            // Get the complete, final transcript
            const finalTranscript = await this.getFinalTranscript(userTranscript.sessionId);

            // Send to LLM Gateway for processing
            // should call the function that sends the transcript to the LLM Gateway

            // Send summary to frontend (REMEBER TO REPLACE WITH THE ACTUAL SUMMARY)
            userTranscript.socket.emit('Summary', PLACEHOLDER_SUMMARY);
        }
    }

    private sendAudioBuffer(userId: string, audioBuffer: Buffer) {
        this.eventEmitter.emit('SendAudioBuffer', { userId: userId, audioBuffer: audioBuffer });
    }

    private saveUserTranscript(userTranscript: UserTranscript) {
        console.log(userTranscript);
    }

    private async getFinalTranscript(sessionId: string) {
        const response = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${sessionId}`,
            {
                headers: {
                    authorization: process.env.ASSEMBLYAI_API_KEY || process.env.ASSEMBLY_AI_API_KEY
                }
            }
        );
        return response.data;
    }
}