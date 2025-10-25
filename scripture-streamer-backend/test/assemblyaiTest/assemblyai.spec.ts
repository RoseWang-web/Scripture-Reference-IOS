import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssemblyAiService } from '../../src/assemblyai/assemblyai.service';
import { WebSocket } from 'ws';

// Mock WebSocket
const mockWebSocketInstance = {
  on: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
};

jest.mock('ws', () => {
  const WebSocket = jest.fn().mockImplementation(() => mockWebSocketInstance);
  Object.assign(WebSocket, {
    OPEN: 1,
    CLOSED: 3,
    CLOSING: 2,
    CONNECTING: 0,
  });
  
  return {
    WebSocket,
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables
process.env.ASSEMBLY_AI_API_KEY = 'test-api-key';
process.env.ASSEMBLY_AI_ENDPOINT = 'wss://test-endpoint.com';

describe('AssemblyAiService', () => {
  let service: AssemblyAiService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssemblyAiService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AssemblyAiService>(AssemblyAiService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with empty userSession Map', () => {
      expect(service['userSession']).toBeInstanceOf(Map);
      expect(service['userSession'].size).toBe(0);
    });
  });

  describe('generateTemporaryToken', () => {
    it('should generate a token successfully', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ token: 'test-token-123' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.generateTemporaryToken();

      expect(result).toBe('test-token-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://streaming.assemblyai.com/v3/token'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'test-api-key',
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should handle token generation failure', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.generateTemporaryToken()).rejects.toThrow('Failed to generate temporary token');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.generateTemporaryToken()).rejects.toThrow('Failed to generate temporary token');
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      // Mock successful token generation
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ token: 'test-token-123' }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    });

    it('should create a WebSocket connection for a user', async () => {
      const userId = 'user-123';
      const tempToken = 'test-token-123';

      await service.connect(userId, tempToken);

      expect(WebSocket).toHaveBeenCalledWith(
        expect.stringContaining('test-token-123')
      );
      expect(service['userSession'].has(userId)).toBe(true);
      
      const session = service['userSession'].get(userId);
      expect(session).toBeDefined();
      expect(session?.tempToken).toBe(tempToken);
      expect(session?.stopRequested).toBe(false);
      expect(session?.connectionParams.token).toBe(tempToken);
    });

    it('should set up event handlers for the WebSocket', async () => {
      const userId = 'user-123';
      const tempToken = 'test-token-123';

      await service.connect(userId, tempToken);

      expect(mockWebSocketInstance.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockWebSocketInstance.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocketInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockWebSocketInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('sendAudioBuffer', () => {
    beforeEach(async () => {
      // Setup a user session
      const userId = 'user-123';
      const tempToken = 'test-token-123';
      await service.connect(userId, tempToken);
    });

    it('should send audio buffer when session exists and WebSocket is open', async () => {
      const userId = 'user-123';
      const audioBuffer = Buffer.from('test-audio-data');


      await service.sendAudioBuffer(userId, audioBuffer);

      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(audioBuffer);
    });

    it('should not send audio buffer when session does not exist', async () => {
      const userId = 'non-existent-user';
      const audioBuffer = Buffer.from('test-audio-data');

      await service.sendAudioBuffer(userId, audioBuffer);

      expect(mockWebSocketInstance.send).not.toHaveBeenCalled();
    });

    it('should not send audio buffer when stopRequested is true', async () => {
      const userId = 'user-123';
      const audioBuffer = Buffer.from('test-audio-data');
      
      // Set stopRequested to true
      const session = service['userSession'].get(userId);
      if (session) {
        session.stopRequested = true;
      }

      await service.sendAudioBuffer(userId, audioBuffer);

      expect(mockWebSocketInstance.send).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      // Setup a user session
      const userId = 'user-123';
      const tempToken = 'test-token-123';
      await service.connect(userId, tempToken);
    });

    it('should close WebSocket and remove session', async () => {
      const userId = 'user-123';

      await service.disconnect(userId);

      expect(mockWebSocketInstance.close).toHaveBeenCalled();
      expect(service['userSession'].has(userId)).toBe(false);
    });

    it('should handle disconnect for non-existent user gracefully', async () => {
      const userId = 'non-existent-user';

      await expect(service.disconnect(userId)).resolves.not.toThrow();
    });
  });

  describe('Event Handlers', () => {
    let setupEventHandlers: any;

    beforeEach(async () => {
      const userId = 'user-123';
      const tempToken = 'test-token-123';
      await service.connect(userId, tempToken);
      
      // Get the setupEventHandlers function
      setupEventHandlers = service['setupEventHandlers'];
    });

    it('should handle Begin message and emit Begin event', () => {
      const userId = 'user-123';
      const mockData = {
        type: 'Begin',
        id: 'session-123',
        expires_at: '2024-01-01T00:00:00Z',
      };

      // Simulate message event
      const messageHandler = mockWebSocketInstance.on.mock.calls.find(call => call[0] === 'message')?.[1];
      expect(messageHandler).toBeDefined();
      if (messageHandler) {
        messageHandler.call(mockWebSocketInstance, JSON.stringify(mockData));
      }

      expect(eventEmitter.emit).toHaveBeenCalledWith('Begin', {
        userId: userId,
        sessionId: 'session-123',
        expiresAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle Turn message and emit Turn event', () => {
      const userId = 'user-123';
      const mockData = {
        type: 'Turn',
        transcript: 'Hello world',
        turn_is_formatted: true,
      };

      // Simulate message event
      const messageHandler = mockWebSocketInstance.on.mock.calls.find(call => call[0] === 'message')?.[1];
      expect(messageHandler).toBeDefined();
      if (messageHandler) {
        messageHandler.call(mockWebSocketInstance, JSON.stringify(mockData));
      }

      expect(eventEmitter.emit).toHaveBeenCalledWith('Turn', {
        userId: userId,
        sessionId: '',
        transcript: 'Hello world',
        formatted: true,
      });
    });

    it('should handle Termination message and emit Termination event', () => {
      const userId = 'user-123';
      const mockData = {
        type: 'Termination',
        audio_duration_seconds: 10.5,
        session_duration_seconds: 15.2,
      };

      // Simulate message event
      const messageHandler = mockWebSocketInstance.on.mock.calls.find(call => call[0] === 'message')?.[1];
      expect(messageHandler).toBeDefined();
      if (messageHandler) {
        messageHandler.call(mockWebSocketInstance, JSON.stringify(mockData));
      }

      expect(eventEmitter.emit).toHaveBeenCalledWith('Termination', {
        userId: userId,
        sessionId: '',
        audioDuration: 10.5,
        sessionDuration: 15.2,
      });
    });

    it('should handle WebSocket error and emit WebSocketError event', () => {
      const userId = 'user-123';
      const error = new Error('WebSocket error');

      // Simulate error event
      const errorHandler = mockWebSocketInstance.on.mock.calls.find(call => call[0] === 'error')?.[1];
      expect(errorHandler).toBeDefined();
      if (errorHandler) {
        errorHandler.call(mockWebSocketInstance, error);
      }

      expect(eventEmitter.emit).toHaveBeenCalledWith('WebSocketError', {
        userId: userId,
        error: error,
      });
    });

    it('should handle WebSocket close and emit WebSocketDisconnected event', () => {
      const userId = 'user-123';
      const code = 1000;
      const reason = 'Normal closure';

      // Simulate close event
      const closeHandler = mockWebSocketInstance.on.mock.calls.find(call => call[0] === 'close')?.[1];
      expect(closeHandler).toBeDefined();
      if (closeHandler) {
        closeHandler.call(mockWebSocketInstance, code, reason);
      }

      expect(eventEmitter.emit).toHaveBeenCalledWith('WebSocketDisconnected', {
        userId: userId,
        status: code,
        Msg: reason,
      });
    });

    it('should handle JSON parse errors gracefully', () => {
      const userId = 'user-123';
      const invalidJson = 'invalid json';

      // Simulate message event with invalid JSON
      const messageHandler = mockWebSocketInstance.on.mock.calls.find(call => call[0] === 'message')?.[1];
      expect(messageHandler).toBeDefined();
      if (messageHandler) {
        messageHandler.call(mockWebSocketInstance, invalidJson);
      }

      expect(eventEmitter.emit).toHaveBeenCalledWith('Error', {
        userId: userId,
        error: expect.any(Error),
      });
    });
  });

  describe('Multiple Users', () => {
    it('should handle multiple users independently', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const token1 = 'token-1';
      const token2 = 'token-2';

      // Mock token generation
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: token1 }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ token: token2 }) });

      await service.connect(user1, token1);
      await service.connect(user2, token2);

      expect(service['userSession'].size).toBe(2);
      expect(service['userSession'].has(user1)).toBe(true);
      expect(service['userSession'].has(user2)).toBe(true);

      // Test sending audio to specific user
      const audioBuffer = Buffer.from('test-audio');
      await service.sendAudioBuffer(user1, audioBuffer);

      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(audioBuffer);
    });
  });

  describe('Event Listeners', () => {
    it('should listen for StartStreaming events', () => {
      const userId = 'user-123';
      
      // Mock token generation
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      });

      service.handleStreamingStart({ userId });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should listen for SendAudioBuffer events', async () => {
      const userId = 'user-123';
      const audioBuffer = Buffer.from('test-audio');
      
      // Setup user session first
      await service.connect(userId, 'test-token');
      
      service.handleAudioFromGateway({ userId, audioBuffer });

      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(audioBuffer);
    });

    it('should listen for StopStreaming events', async () => {
      const userId = 'user-123';
      
      // Setup user session first
      await service.connect(userId, 'test-token');
      
      service.handleStreamingStop({ userId });

      expect(mockWebSocketInstance.close).toHaveBeenCalled();
      expect(service['userSession'].has(userId)).toBe(false);
    });
  });
});
