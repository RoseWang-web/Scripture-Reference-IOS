//
//  AudioStreamer.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//

import Foundation
import Combine
import AVFoundation

class AudioStreamer: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private var reconnectTimer: Timer?
    private var connectionAttempts = 0
    private let maxConnectionAttempts = 5
    private let reconnectDelay: TimeInterval = 2.0
    private var sessionId: String?
    
    // Audio recording properties - beautiful streaming audio like your friend's code
    private var audioEngine: AVAudioEngine?
    private var audioFormat: AVAudioFormat?
    private var inputNode: AVAudioInputNode?
    private var isRecording = false
    
    var userId: String = UserManager.shared.userId
    @Published var isConnected = false
    @Published var transcript = ""
    @Published var summary = ""
    @Published var connectionError: String?
    @Published var isRecordingAudio = false
    
    // Socket.IO protocol constants
    private let socketIOVersion = "4"
    private let transport = "websocket"
    
    func start() {
        print("Starting WebSocket connection...")
        print("💡 If connection fails, try using your computer's IP address instead of localhost")
        print("💡 Find your IP with: ifconfig | grep 'inet ' | grep -v 127.0.0.1")
        print("💡 Current host: 127.0.0.1:3000")
        connectWebSocket()
    }
    
    func startWithAudio() {
        print("🎤 Starting WebSocket connection with audio recording...")
        
        // Don't clear transcript - keep building across sessions
        
        connectWebSocket()
        
        // Start audio recording after connection is established
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            print("🎤 Starting audio recording...")
            self.startAudioRecording()
        }
    }
    
    func clearTranscript() {
        DispatchQueue.main.async {
            self.transcript = ""
        }
    }
    
    private func connectWebSocket() {
        print("Connecting to WebSocket... (attempt \(connectionAttempts + 1))")
        
        // Cancel any existing connection
        webSocket?.cancel(with: .goingAway, reason: nil)
        
        // For iOS Simulator, try different host options
        // Option 1: Try 127.0.0.1 instead of localhost
        // Option 2: Use your computer's actual IP address
        let host = "127.0.0.1" // Try this first, then your computer's IP if it doesn't work
        let port = "3000"
        
        // Try a simple WebSocket connection without Socket.IO protocol
        if let url = URL(string: "ws://\(host):\(port)/socket.io/?EIO=\(socketIOVersion)&transport=websocket") {
            print("WebSocket URL: \(url)")
            webSocket = URLSession.shared.webSocketTask(with: url)
            webSocket?.resume()
            
            // Start receiving messages
            receiveMessages()
            
            // The handshake will be handled automatically when we receive the initial response
        } else {
            DispatchQueue.main.async {
                self.connectionError = "Invalid WebSocket URL"
            }
        }
    }
    
    private func handleSocketIOHandshake() {
        // Socket.IO handshake: send "40" to join default namespace
        print("🔌 Sending Socket.IO handshake...")
        sendSocketIOMessage("40")
    }
    
    private func startStreaming() {
        let startMessage: [Any] = ["StartStreaming", ["userId": userId]]
        sendSocketIOEvent(startMessage)
    }
    
    private func sendSocketIOMessage(_ message: String) {
        guard let webSocket = webSocket else {
            print("❌ Cannot send message: WebSocket is nil")
            return
        }
        
        // Send message - WebSocket will handle connection state internally
        webSocket.send(.string(message)) { error in
            if let error = error {
                print("❌ WebSocket send error: \(error)")
                DispatchQueue.main.async {
                    self.connectionError = "Send failed: \(error.localizedDescription)"
                }
            } else {
                // Only log non-audio messages to reduce spam
                if !message.contains("SendAudioBuffer") {
                    print("✅ Socket.IO message sent: \(message)")
                }
            }
        }
    }
    
    private func sendSocketIOEvent(_ event: [Any]) {
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: event)
            let jsonString = String(data: jsonData, encoding: .utf8) ?? ""
            let socketIOMessage = "42\(jsonString)"
            sendSocketIOMessage(socketIOMessage)
        } catch {
            print("Error serializing Socket.IO event: \(error)")
        }
    }
    
    func sendAudioBuffer(_ audioData: Data) {
        // Convert audio data to base64 for transmission
        let base64Audio = audioData.base64EncodedString()
        
        // Simple WebSocket emit: just send the event name and data
        let message = "42[\"SendAudioBuffer\",\"\(base64Audio)\"]"
        sendSocketIOMessage(message)
        
        print("📤 Sent SendAudioBuffer: \(base64Audio.count) base64 characters")
    }
    
    func stopStreaming() {
        let stopMessage: [Any] = ["StopStreaming", ["userId": userId]]
        sendSocketIOEvent(stopMessage)
    }
    
    func stop() {
        // Cancel reconnection timer
        reconnectTimer?.invalidate()
        reconnectTimer = nil
        
        stopStreaming()
        stopAudioRecording()
        webSocket?.cancel(with: .goingAway, reason: nil)
        
        DispatchQueue.main.async {
            self.isConnected = false
        }
    }
    
    // MARK: - Audio Recording Methods (Beautiful streaming like your friend's code!)
    
    func startAudioRecording() {
        print("🎤 startAudioRecording - beautiful streaming audio!")
        stopAudioRecording() // Clean stop first
        
        // Set up audio session
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .default)
            try session.setActive(true)
        } catch {
            print("❌ Failed to set up AVAudioSession: \(error)")
            DispatchQueue.main.async {
                self.connectionError = "Audio session failed: \(error.localizedDescription)"
            }
            return
        }
        
        // Create audio engine
        let engine = AVAudioEngine()
        let input = engine.inputNode
        let format = input.inputFormat(forBus: 0)
        
        print("📊 Input format: \(format)")
        
        // Start the engine
        do {
            try engine.start()
            print("✅ AVAudioEngine started for streaming!")
        } catch {
            print("❌ Failed to start AVAudioEngine: \(error)")
            DispatchQueue.main.async {
                self.connectionError = "Audio engine failed: \(error.localizedDescription)"
            }
            return
        }
        
        // Install tap to capture audio buffers
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            guard let self = self else { return }
            
            print("🎤 Captured buffer with \(buffer.frameLength) frames")
            
            // Convert buffer to PCM16 mono 16kHz (what AssemblyAI needs)
            if let audioData = self.convertBufferToPCM16Mono16k(buffer: buffer, inputFormat: format) {
                print("📤 Sending \(audioData.count) bytes to backend")
                self.sendAudioBuffer(audioData)
            }
        }
        
        // Store references
        self.audioEngine = engine
        self.inputNode = input
        self.audioFormat = format
        self.isRecording = true
        
        DispatchQueue.main.async {
            self.isRecordingAudio = true
        }
        
        print("✅ Audio recording started successfully!")
    }
    
    func stopAudioRecording() {
        print("🎤 Stopping audio recording...")
        
        if let input = inputNode {
            input.removeTap(onBus: 0)
        }
        
        audioEngine?.stop()
        
        audioEngine = nil
        inputNode = nil
        audioFormat = nil
        isRecording = false
        
        DispatchQueue.main.async {
            self.isRecordingAudio = false
        }
        
        print("✅ Audio recording stopped")
    }
    
    // Convert audio buffer to PCM16 mono 16kHz (what AssemblyAI needs)
    private func convertBufferToPCM16Mono16k(buffer: AVAudioPCMBuffer, inputFormat: AVAudioFormat) -> Data? {
        // Define the target format: PCM16, 16kHz, mono
        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: 16000,
            channels: 1,
            interleaved: true
        ) else {
            print("❌ Failed to create target format")
            return nil
        }
        
        // Create converter
        guard let converter = AVAudioConverter(from: inputFormat, to: targetFormat) else {
            print("❌ Failed to create audio converter")
            return nil
        }
        
        // Calculate output buffer size
        let outputFrameCapacity = AVAudioFrameCount(
            CGFloat(buffer.frameLength) * 16000.0 / inputFormat.sampleRate
        )
        
        guard let outBuffer = AVAudioPCMBuffer(
            pcmFormat: targetFormat,
            frameCapacity: outputFrameCapacity
        ) else {
            print("❌ Failed to create output buffer")
            return nil
        }
        
        // Convert the buffer
        var error: NSError?
        let status = converter.convert(to: outBuffer, error: &error) { inNumPackets, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }
        
        guard status == .haveData || status == .inputRanDry else {
            print("❌ Conversion failed: \(status)")
            return nil
        }
        
        // Extract raw PCM bytes as Data
        guard let audioBuffer = outBuffer.int16ChannelData?[0] else {
            print("❌ No audio data in output buffer")
            return nil
        }
        
        let audioData = Data(
            bytes: audioBuffer,
            count: Int(outBuffer.frameLength) * 2 // 2 bytes per sample (Int16)
        )
        
        return audioData
    }
    
    private func scheduleReconnect() {
        guard connectionAttempts < maxConnectionAttempts else {
            DispatchQueue.main.async {
                self.connectionError = "Max connection attempts reached. Please check if the backend is running."
            }
            return
        }
        
        connectionAttempts += 1
        print("Scheduling reconnect in \(reconnectDelay) seconds (attempt \(connectionAttempts))")
        
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: reconnectDelay, repeats: false) { [weak self] _ in
            self?.connectWebSocket()
        }
    }
    
    private func receiveMessages() {
        webSocket?.receive { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(.string(let text)):
                print("WebSocket received: \(text)")
                self.handleSocketIOMessage(text)
            case .success(.data(let data)):
                print("WebSocket received data: \(data.count) bytes")
            case .failure(let error):
                print("WebSocket receive error: \(error)")
                DispatchQueue.main.async {
                    self.isConnected = false
                    self.connectionError = "Connection lost: \(error.localizedDescription)"
                }
                self.scheduleReconnect()
                return // Don't continue receiving messages
            default:
                break
            }
            self.receiveMessages()
        }
    }
    
    private func handleSocketIOMessage(_ message: String) {
        print("📨 Processing Socket.IO message: \(message)")
        
        // Handle Socket.IO protocol messages
        if message.hasPrefix("40") {
            // Connection acknowledged
            print("✅ Socket.IO connection acknowledged")
            DispatchQueue.main.async {
                self.isConnected = true
                self.connectionError = nil
                self.connectionAttempts = 0 // Reset connection attempts on successful connection
            }
            
            // Start streaming after connection is established
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.startStreaming()
            }
        } else if message.hasPrefix("42") {
            // Event message
            let eventData = String(message.dropFirst(2))
            print("📨 Received event: \(eventData)")
            handleSocketIOEvent(eventData)
        } else if message == "3" {
            // Ping response
            print("🏓 Responding to ping")
            sendSocketIOMessage("3")
        } else if message == "2" {
            // Server ping - respond with pong
            print("🏓 Server ping received, sending pong")
            sendSocketIOMessage("3")
        } else if message.hasPrefix("0") {
            // Initial handshake response
            print("🤝 Initial handshake received")
            // Extract session ID from the response
            if let data = message.dropFirst().data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let sid = json["sid"] as? String {
                self.sessionId = sid
                print("📋 Session ID: \(sid)")
                
                // Set connected state after receiving initial handshake
                DispatchQueue.main.async {
                    self.isConnected = true
                    self.connectionError = nil
                    self.connectionAttempts = 0
                }
                
                // Now send the namespace join message with a longer delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    self.sendSocketIOMessage("40")
                }
            }
        } else {
            print("❓ Unknown Socket.IO message: \(message)")
        }
    }
    
    private func handleSocketIOEvent(_ eventData: String) {
        guard let data = eventData.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [Any],
              json.count >= 2,
              let eventName = json[0] as? String else {
            print("Invalid Socket.IO event format: \(eventData)")
            return
        }
        
        let eventPayload = json[1]
        
        switch eventName {
        case "connection":
            // Handle connection confirmation
            if let connectionData = eventPayload as? [String: Any],
               let message = connectionData["message"] as? String {
                print("✅ Backend connection confirmed: \(message)")
            }
        case "Turn":
            // Handle transcript update
            print("📨 Turn event received, payload: \(eventPayload)")
            if let transcriptData = eventPayload as? [String: Any],
               let text = transcriptData["transcript"] as? String,
               let isFormatted = transcriptData["turn_is_formatted"] as? Bool {
                
                // Only append when turn is formatted (completed sentence)
                if isFormatted && !text.isEmpty {
                    DispatchQueue.main.async {
                        // Always append with space separator
                        if !self.transcript.isEmpty {
                            self.transcript += " " + text
                        } else {
                            self.transcript = text
                        }
                    }
                    print("✅ Appended formatted transcript: \(text)")
                } else {
                    print("🔄 Skipping unformatted transcript: \(text)")
                }
            } else {
                print("❌ Failed to parse Turn event payload")
            }
        case "Summary":
            // Handle summary
            if let summaryText = eventPayload as? String {
                DispatchQueue.main.async {
                    self.summary = summaryText
                }
                print("Summary received: \(summaryText)")
            }
        case "StreamingStopped":
            // Handle streaming stopped confirmation
            if let stoppedData = eventPayload as? [String: Any],
               let message = stoppedData["message"] as? String {
                print("✅ Streaming stopped: \(message)")
                if let finalTranscript = stoppedData["finalTranscript"] as? [String: Any],
                   let text = finalTranscript["transcript"] as? String {
                    print("📝 Final transcript: \(text)")
                }
            }
        default:
            print("❓ Unknown Socket.IO event: \(eventName), payload: \(eventPayload)")
        }
    }
}
