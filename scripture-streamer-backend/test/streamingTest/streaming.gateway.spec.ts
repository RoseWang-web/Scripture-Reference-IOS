import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamingGateway } from '../../src/streaming/streaming.gateway';
import { Socket } from 'socket.io';

// Mock Socket
const mockSocket = {
  emit: jest.fn(),
  id: 'socket-123',
  handshake: {
    query: {},
  },
} as unknown as Socket;

describe('StreamingGateway', () => {
  let gateway: StreamingGateway;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingGateway,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<StreamingGateway>(StreamingGateway);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Gateway Initialization', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });

    it('should initialize with empty userTranscriptList', () => {
      expect(gateway['userTranscriptList']).toEqual([]);
    });
  });

  describe('Connection Handling', () => {
    it('should handle client connection', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      gateway.handleConnection(mockSocket);
      
      expect(consoleSpy).toHaveBeenCalledWith('Client connected');
      consoleSpy.mockRestore();
    });

    it('should handle client disconnection with cleanup', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Add a user transcript first
      const userId = 'user-123';
      gateway['userTranscriptList'].push({
        userId,
        data: { transcript: 'test' } as unknown as JSON,
        socket: mockSocket,
      });
      
      expect(gateway['userTranscriptList'].length).toBe(1);
      
      gateway.handleDisconnect(mockSocket);
      
      expect(consoleSpy).toHaveBeenCalledWith('Client disconnected');
      expect(gateway['userTranscriptList'].length).toBe(0);
      consoleSpy.mockRestore();
    });

    it('should handle disconnection when no user transcript exists', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      gateway.handleDisconnect(mockSocket);
      
      expect(consoleSpy).toHaveBeenCalledWith('Client disconnected');
      expect(gateway['userTranscriptList'].length).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe('Frontend Message Handlers', () => {
    describe('StartStreaming', () => {
      it('should handle StartStreaming message', async () => {
        const userId = 'user-123';
        const data = { userId };
        
        await gateway.handleFrontendStart(mockSocket, data);
        
        expect(gateway['userTranscriptList'].length).toBe(1);
        expect(gateway['userTranscriptList'][0].userId).toBe(userId);
        expect(gateway['userTranscriptList'][0].socket).toBe(mockSocket);
        expect(eventEmitter.emit).toHaveBeenCalledWith('StartStreaming', { userId });
      });

      it('should handle multiple users starting streaming', async () => {
        const mockSocket2 = { ...mockSocket, id: 'socket-456' } as Socket;
        const user1 = 'user-1';
        const user2 = 'user-2';
        
        await gateway.handleFrontendStart(mockSocket, { userId: user1 });
        await gateway.handleFrontendStart(mockSocket2, { userId: user2 });
        
        expect(gateway['userTranscriptList'].length).toBe(2);
        expect(gateway['userTranscriptList'][0].userId).toBe(user1);
        expect(gateway['userTranscriptList'][1].userId).toBe(user2);
      });
    });

    describe('SendAudioBuffer', () => {
      it('should handle SendAudioBuffer message', async () => {
        const userId = 'user-123';
        const audioBuffer = Buffer.from('test-audio-data');
        const data = { userId, audioBuffer };
        
        await gateway.handleFrontendAudioBuffer(data);
        
        expect(eventEmitter.emit).toHaveBeenCalledWith('SendAudioBuffer', { userId, audioBuffer });
      });
    });

    describe('StopStreaming', () => {
      it('should handle StopStreaming message', async () => {
        const userId = 'user-123';
        const data = { userId };
        
        // Add user transcript first
        gateway['userTranscriptList'].push({
          userId,
          data: { transcript: 'test' } as unknown as JSON,
          socket: mockSocket,
        });
        
        await gateway.handleStreamingStop(data);
        
        expect(eventEmitter.emit).toHaveBeenCalledWith('StopStreaming', { userId });
        expect(gateway['userTranscriptList'].length).toBe(0);
      });

      it('should handle StopStreaming for non-existent user', async () => {
        const userId = 'non-existent-user';
        const data = { userId };
        
        await gateway.handleStreamingStop(data);
        
        expect(eventEmitter.emit).toHaveBeenCalledWith('StopStreaming', { userId });
        expect(gateway['userTranscriptList'].length).toBe(0);
      });
    });
  });

  describe('AssemblyAI Event Handlers', () => {
    describe('Begin Event', () => {
      it('should handle Begin event', () => {
        const data = {
          userId: 'user-123',
          sessionId: 'session-456',
          expiresAt: '2024-01-01T00:00:00Z',
        };
        
        gateway.createUserTranscript(data);
        
        // Currently empty implementation, so just verify it doesn't throw
        expect(() => gateway.createUserTranscript(data)).not.toThrow();
      });
    });

    describe('Turn Event', () => {
      it('should handle Turn event and send to frontend', () => {
        const userId = 'user-123';
        const transcriptData = {
          transcript: 'Hello world',
          confidence: 0.95,
        };
        const data = { userId, data: transcriptData as unknown as JSON };
        
        // Add user transcript first
        gateway['userTranscriptList'].push({
          userId,
          data: {} as JSON,
          socket: mockSocket,
        });
        
        gateway.updateUserTranscript(data);
        
        expect(gateway['userTranscriptList'][0].data).toEqual(transcriptData);
        expect(mockSocket.emit).toHaveBeenCalledWith('Turn', transcriptData);
      });

      it('should handle Turn event for non-existent user', () => {
        const userId = 'non-existent-user';
        const transcriptData = { transcript: 'Hello world' };
        const data = { userId, data: transcriptData as unknown as JSON };
        
        gateway.updateUserTranscript(data);
        
        expect(mockSocket.emit).not.toHaveBeenCalled();
      });

      it('should handle multiple users receiving Turn events', () => {
        const mockSocket2 = { ...mockSocket, id: 'socket-456' } as Socket;
        const user1 = 'user-1';
        const user2 = 'user-2';
        const transcriptData1 = { transcript: 'Hello from user 1' };
        const transcriptData2 = { transcript: 'Hello from user 2' };
        
        // Add both users
        gateway['userTranscriptList'].push({
          userId: user1,
          data: {} as JSON,
          socket: mockSocket,
        });
        gateway['userTranscriptList'].push({
          userId: user2,
          data: {} as JSON,
          socket: mockSocket2,
        });
        
        // Send Turn events
        gateway.updateUserTranscript({ userId: user1, data: transcriptData1 as unknown as JSON });
        gateway.updateUserTranscript({ userId: user2, data: transcriptData2 as unknown as JSON });
        
        expect(mockSocket.emit).toHaveBeenCalledWith('Turn', transcriptData1);
        expect(mockSocket2.emit).toHaveBeenCalledWith('Turn', transcriptData2);
        expect(gateway['userTranscriptList'][0].data).toEqual(transcriptData1);
        expect(gateway['userTranscriptList'][1].data).toEqual(transcriptData2);
      });
    });

    describe('Termination Event', () => {
      it('should handle Termination event', () => {
        const userId = 'user-123';
        const data = { userId };
        
        // Add user transcript first
        gateway['userTranscriptList'].push({
          userId,
          data: { transcript: 'final transcript' } as unknown as JSON,
          socket: mockSocket,
        });
        
        gateway.saveUserTranscriptToDatabase(data);
        
        // Verify the method was called (currently empty implementation)
        expect(() => gateway.saveUserTranscriptToDatabase(data)).not.toThrow();
      });

      it('should handle Termination event for non-existent user', () => {
        const userId = 'non-existent-user';
        const data = { userId };
        
        gateway.saveUserTranscriptToDatabase(data);
        
        // Should not throw
        expect(() => gateway.saveUserTranscriptToDatabase(data)).not.toThrow();
      });
    });
  });

  describe('Private Methods', () => {
    describe('sendAudioBuffer', () => {
      it('should emit SendAudioBuffer event', () => {
        const userId = 'user-123';
        const audioBuffer = Buffer.from('test-audio');
        
        gateway['sendAudioBuffer'](userId, audioBuffer);
        
        expect(eventEmitter.emit).toHaveBeenCalledWith('SendAudioBuffer', { userId, audioBuffer });
      });
    });

    describe('saveUserTranscript', () => {
      it('should handle saving user transcript', () => {
        const userTranscript = {
          userId: 'user-123',
          data: { transcript: 'test transcript' } as unknown as JSON,
          socket: mockSocket,
        };
        
        // Currently empty implementation, so just verify it doesn't throw
        expect(() => gateway['saveUserTranscript'](userTranscript)).not.toThrow();
      });
    });
  });

  describe('Multiple User Scenarios', () => {
    it('should handle multiple concurrent users', async () => {
      const mockSocket2 = { ...mockSocket, id: 'socket-456' } as Socket;
      const user1 = 'user-1';
      const user2 = 'user-2';
      
      // Both users start streaming
      await gateway.handleFrontendStart(mockSocket, { userId: user1 });
      await gateway.handleFrontendStart(mockSocket2, { userId: user2 });
      
      expect(gateway['userTranscriptList'].length).toBe(2);
      
      // Send audio from both users
      const audioBuffer1 = Buffer.from('audio1');
      const audioBuffer2 = Buffer.from('audio2');
      
      await gateway.handleFrontendAudioBuffer({ userId: user1, audioBuffer: audioBuffer1 });
      await gateway.handleFrontendAudioBuffer({ userId: user2, audioBuffer: audioBuffer2 });
      
      expect(eventEmitter.emit).toHaveBeenCalledWith('SendAudioBuffer', { userId: user1, audioBuffer: audioBuffer1 });
      expect(eventEmitter.emit).toHaveBeenCalledWith('SendAudioBuffer', { userId: user2, audioBuffer: audioBuffer2 });
      
      // Both users stop streaming
      await gateway.handleStreamingStop({ userId: user1 });
      await gateway.handleStreamingStop({ userId: user2 });
      
      expect(gateway['userTranscriptList'].length).toBe(0);
    });

    it('should handle user disconnection cleanup', () => {
      const mockSocket2 = { ...mockSocket, id: 'socket-456' } as Socket;
      const user1 = 'user-1';
      const user2 = 'user-2';
      
      // Add both users
      gateway['userTranscriptList'].push({
        userId: user1,
        data: {} as JSON,
        socket: mockSocket,
      });
      gateway['userTranscriptList'].push({
        userId: user2,
        data: {} as JSON,
        socket: mockSocket2,
      });
      
      expect(gateway['userTranscriptList'].length).toBe(2);
      
      // Disconnect user1
      gateway.handleDisconnect(mockSocket);
      
      expect(gateway['userTranscriptList'].length).toBe(1);
      expect(gateway['userTranscriptList'][0].userId).toBe(user2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user in Turn event gracefully', () => {
        const data = { userId: 'non-existent-user', data: { transcript: 'test' } as unknown as JSON };
      
      expect(() => gateway.updateUserTranscript(data)).not.toThrow();
    });

    it('should handle missing user in Termination event gracefully', () => {
      const data = { userId: 'non-existent-user' };
      
      expect(() => gateway.saveUserTranscriptToDatabase(data)).not.toThrow();
    });
  });
});
