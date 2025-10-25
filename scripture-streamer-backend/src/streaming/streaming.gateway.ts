import { Injectable } from "@nestjs/common";
import { OnEvent } from '@nestjs/event-emitter';
import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from "@nestjs/websockets";
import { Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from "axios";
import { Server } from 'socket.io';

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
    
    private userTranscriptList: UserTranscript[];

    constructor(private readonly eventEmitter: EventEmitter2) {
        this.userTranscriptList = [];
        console.log('StreamingGateway initialized');
    }

    afterInit(server: Server) {
        console.log('🔥 Socket.IO server initialized');
        server.on('connection', (socket) => {
            console.log(`🔥 Manual connection handler: ${socket.id}`);
        });
    }

    handleConnection(client: Socket) {
        // Just log that someone connected
        console.log(`🔥 Client connected: ${client.id}`);
        console.log(`🔥 Client IP: ${client.handshake.address}`);
        console.log(`🔥 Client headers:`, client.handshake.headers);
        console.log(`🔥 Client query:`, client.handshake.query);
        
        // Send a test message to confirm connection
        client.emit('connection', { message: 'Connected to Scripture Streamer Backend' });
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        // Save to database before cleanup
        const userTranscript = this.userTranscriptList.find(ut => ut.socket === client);
        if (userTranscript) {
            console.log(`Saving transcript for user: ${userTranscript.userId}`);
            this.saveUserTranscript(userTranscript);
        }

        // Remove userTranscript from the list
        this.userTranscriptList = this.userTranscriptList.filter(ut => ut.socket !== client);
        console.log(`Remaining connections: ${this.userTranscriptList.length}`);
    }

    // Listen for events from frontend
    @SubscribeMessage('StartStreaming')
    async handleFrontendStart(client: Socket, data: { userId: string }) {
        console.log(`🔥 StartStreaming received for user: ${data.userId}`);
        this.userTranscriptList.push({ userId: data.userId, data: {} as JSON, socket: client, sessionId: undefined });
        this.eventEmitter.emit('StartStreaming', { userId: data.userId });
    }

    @SubscribeMessage('SendAudioBuffer')
    async handleFrontendAudioBuffer(client: Socket, data: string) {
        console.log(`SendAudioBuffer received for user: ${client.id}`);
        // Find the user for this socket
        const userTranscript = this.userTranscriptList.find(ut => ut.socket === client);
        if (userTranscript) {
            // Data comes as base64 string from iOS app - decode it to binary
            const audioBuffer = Buffer.from(data, 'base64');
            console.log(`Audio data received for user: ${userTranscript.userId}, decoded size: ${audioBuffer.length} bytes`);
            this.eventEmitter.emit('SendAudioBuffer', { userId: userTranscript.userId, audioBuffer: audioBuffer });
        } else {
            console.log(`Audio data received but no user found for socket`);
        }
    }

    @SubscribeMessage('StopStreaming')
    async handleStreamingStop(client: Socket, data: { userId: string }) {
        console.log(`🛑 StopStreaming received for user: ${data.userId}`);
        
        // Signal assemblyaiService to stop
        this.eventEmitter.emit('StopStreaming', { userId: data.userId });

        // Find the user and send confirmation
        const userTranscript = this.userTranscriptList.find(ut => ut.userId === data.userId);
        if (userTranscript) {
            // Send final transcript/summary to frontend
            client.emit('StreamingStopped', { 
                message: 'Streaming stopped successfully',
                finalTranscript: userTranscript.data 
            });
        }

        // Remove userTranscript from the list
        this.userTranscriptList = this.userTranscriptList.filter(ut => ut.userId !== data.userId);
    }

    // Listen for events from AssemblyAiService
    @OnEvent('Begin')
    createUserTranscript(data: { userId: string, sessionId: string, expiresAt: string }) {
        const userTranscript = this.userTranscriptList.find(ut => ut.userId === data.userId);
        if (userTranscript) {
            userTranscript.sessionId = data.sessionId;
        }
    }

    @OnEvent('Turn')
    updateUserTranscript(data: { userId: string, data: JSON }) {
        const userTranscript = this.userTranscriptList.find(userTranscript => userTranscript.userId === data.userId);
        if (userTranscript) {
            userTranscript.data = data.data;

            // Send directly to the stored socket
            console.log(`📤 Sending transcript to iOS app:`, data.data);
            userTranscript.socket.emit('Turn', data.data);
        }
    }


    @OnEvent('Termination')
    async saveUserTranscriptToDatabase(data: { userId: string }) {
        const userTranscript = this.userTranscriptList.find(userTranscript => userTranscript.userId === data.userId);
        if (userTranscript && userTranscript.sessionId) {
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
                    authorization: process.env.ASSEMBLY_AI_API_KEY
                }
            }
        );
        return response.data;
    }
}