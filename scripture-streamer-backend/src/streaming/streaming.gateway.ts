import { Injectable } from "@nestjs/common";
import { OnEvent } from '@nestjs/event-emitter';
import { SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Socket } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from "axios";

interface UserTranscript {
    userId: string;
    data: JSON;
    socket: Socket;
}

@WebSocketGateway()
export class StreamingGateway {
    private userTranscriptList: UserTranscript[];

    constructor(private readonly eventEmitter: EventEmitter2) {
        this.userTranscriptList = [];
    }

    handleConnection(client: Socket) {
        // Just log that someone connected
        console.log(`Client connected`);
    }
    
    handleDisconnect(client: Socket) {
        // Store to database
        const userTranscript = this.userTranscriptList.find(ut => ut.socket === client);
        if (userTranscript) {
            this.saveUserTranscript(userTranscript);
        }

        // Remove userTranscript from the list
        this.userTranscriptList = this.userTranscriptList.filter(ut => ut.socket !== client);

        // Just log that someone disconnected  
        console.log(`Client disconnected`);
    }

    // Listen for events from frontend
    @SubscribeMessage('StartStreaming')
    async handleFrontendStart(client: Socket, data: { userId: string}) {
        this.userTranscriptList.push({userId: data.userId, data: {} as JSON, socket: client});
        this.eventEmitter.emit('StartStreaming', {userId: data.userId});
    }

    @SubscribeMessage('SendAudioBuffer')
    async handleFrontendAudioBuffer(data: { userId: string, audioBuffer: Buffer }) {
        this.sendAudioBuffer(data.userId, data.audioBuffer);
    }

    @SubscribeMessage('StopStreaming')
    async handleStreamingStop(data: { userId: string}) {
        // Signal assemblyaiService to stop
        this.eventEmitter.emit('StopStreaming', {userId: data.userId});

        // Save to database
        const userTranscript = this.userTranscriptList.find(ut => ut.userId === data.userId);
        if (userTranscript) {
            this.saveUserTranscript(userTranscript);
        }

        // Remove userTranscript from the list
        this.userTranscriptList = this.userTranscriptList.filter(ut => ut.userId !== data.userId);
    }

    // Listen for events from AssemblyAiService
    @OnEvent('Begin')
    createUserTranscript(data: {userId: string, sessionId: string, expiresAt: string}) {
        // if we end up caring about sessionId, this is where it should be updated
    }
    
    @OnEvent('Turn')
    updateUserTranscript(data: {userId: string, data: JSON}) {
        const userTranscript = this.userTranscriptList.find(userTranscript => userTranscript.userId === data.userId);
        if (userTranscript) {
            userTranscript.data = data.data;

            // Send directly to the stored socket
            userTranscript.socket.emit('Turn', data.data);
        }
    }
    

    @OnEvent('Termination')
    saveUserTranscriptToDatabase(data: {userId: string}) {
        // First save it to database
        const userTranscript = this.userTranscriptList.find(userTranscript => userTranscript.userId === data.userId);
        if (userTranscript) {
            this.saveUserTranscript(userTranscript);
        }
    }

    private sendAudioBuffer(userId: string, audioBuffer: Buffer) {
        this.eventEmitter.emit('SendAudioBuffer', {userId: userId, audioBuffer: audioBuffer});
    }

    private saveUserTranscript(userTranscript: UserTranscript) {
        // This would be calling datbaseService
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