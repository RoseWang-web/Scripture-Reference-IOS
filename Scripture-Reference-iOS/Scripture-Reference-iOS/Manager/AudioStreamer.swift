//
//  AudioStreamer.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//
import Foundation
import Combine
import AVFoundation

// Scripture reference model matching backend structure
struct ScriptureReference: Codable, Identifiable {
    let id = UUID()
    let book: String
    let chapter: Int
    let verse: Int?
    let endVerse: Int?
    let endChapter: Int?
    let url: String
    let originalText: String
    
    enum CodingKeys: String, CodingKey {
        case book, chapter, verse, endVerse, endChapter, url, originalText
    }
}

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
    @Published var scriptureReferences: [ScriptureReference] = []
    @Published var isRecordingAudio = false
    
    // Socket.IO protocol constants
    private let socketIOVersion = "4"
    private let transport = "websocket"
    
    func start() {
        print("Starting WebSocket connection...")
        print("If connection fails, try using your computer's IP address instead of localhost")
        print("Find your IP with: ifconfig | grep 'inet ' | grep -v 127.0.0.1")
        print("Current host: 127.0.0.1:3000")
        connectWebSocket()
    }
    
    func startWithAudio() {
        print("Starting WebSocket connection with audio recording...")
        
        // Don't clear transcript - keep building across sessions
        
        connectWebSocket()
        
        // Start audio recording after connection is established
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            print("Starting audio recording...")
            self.startAudioRecording()
        }
    }
    
    func clearTranscript() {
        DispatchQueue.main.async {
            self.transcript = ""
            self.scriptureReferences = []
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
//		let host = "10.244.48.190"
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
        sendSocketIOMessage("40")
    }
    
    private func startStreaming() {
        let startMessage: [Any] = ["StartStreaming", ["userId": userId]]
        sendSocketIOEvent(startMessage)
    }
    
    private func sendSocketIOMessage(_ message: String) {
        guard let webSocket = webSocket else {
            print("Cannot send message: WebSocket is nil")
            return
        }
        
        // Send message - WebSocket will handle connection state internally
        webSocket.send(.string(message)) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
                DispatchQueue.main.async {
                    self.connectionError = "Send failed: \(error.localizedDescription)"
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
        stopAudioRecording() // Clean stop first
        
        // Set up audio session
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.record, mode: .default)
            try session.setActive(true)
        } catch {
            print("Failed to set up AVAudioSession: \(error)")
            return
        }
        
        // Create audio engine
        let engine = AVAudioEngine()
        let input = engine.inputNode
        let format = input.inputFormat(forBus: 0)
        
        print("Input format: \(format)")
        
        // Start the engine
        do {
            try engine.start()
        } catch {
            print("Failed to start AVAudioEngine: \(error)")
            return
        }
        
        // Install tap to capture audio buffers
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            guard let self = self else { return }
            
            // Convert buffer to PCM16 mono 16kHz (what AssemblyAI needs)
            if let audioData = self.convertBufferToPCM16Mono16k(buffer: buffer, inputFormat: format) {
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
    }
    
    func stopAudioRecording() {
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
            break
        case "Turn":
            // Handle transcript update
            if let transcriptData = eventPayload as? [String: Any],
               let text = transcriptData["transcript"] as? String,
               let isFormatted = transcriptData["turn_is_formatted"] as? Bool {
                
                // Parse scripture references if present
                if let scriptureRefsData = transcriptData["scriptureReferences"] as? [[String: Any]] {
                    let refs = scriptureRefsData.compactMap { refDict -> ScriptureReference? in
                        guard let book = refDict["book"] as? String,
                              let chapter = refDict["chapter"] as? Int,
                              let originalText = refDict["originalText"] as? String else {
                            return nil
                        }
                        
                        // Build URL on frontend
                        let url = self.buildScriptureURL(
                            book: book,
                            chapter: chapter,
                            verse: refDict["verse"] as? Int,
                            endVerse: refDict["endVerse"] as? Int
                        )
                        
                        return ScriptureReference(
                            book: book,
                            chapter: chapter,
                            verse: refDict["verse"] as? Int,
                            endVerse: refDict["endVerse"] as? Int,
                            endChapter: refDict["endChapter"] as? Int,
                            url: url,
                            originalText: originalText
                        )
                    }
                    
                    if !refs.isEmpty {
                        DispatchQueue.main.async {
                            // Deduplicate by URL to avoid showing same scripture multiple times
                            let existingURLs = Set(self.scriptureReferences.map { $0.url })
                            let newRefs = refs.filter { !existingURLs.contains($0.url) }
                            
                            if !newRefs.isEmpty {
                                self.scriptureReferences.append(contentsOf: newRefs)
                            }
                        }
                    }
                }
                
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
                }
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
            break
        default:
            break
        }
    }
    
    // Build Church of Jesus Christ scripture URL
    private func buildScriptureURL(book: String, chapter: Int, verse: Int?, endVerse: Int?) -> String {
        // Map book names to URL paths
        let bookPath: String
        switch book.lowercased() {
        // Book of Mormon
        case "1 nephi": bookPath = "bofm/1-ne"
        case "2 nephi": bookPath = "bofm/2-ne"
        case "jacob": bookPath = "bofm/jacob"
        case "enos": bookPath = "bofm/enos"
        case "jarom": bookPath = "bofm/jarom"
        case "omni": bookPath = "bofm/omni"
        case "words of mormon": bookPath = "bofm/w-of-m"
        case "mosiah": bookPath = "bofm/mosiah"
        case "alma": bookPath = "bofm/alma"
        case "helaman": bookPath = "bofm/hel"
        case "3 nephi": bookPath = "bofm/3-ne"
        case "4 nephi": bookPath = "bofm/4-ne"
        case "mormon": bookPath = "bofm/morm"
        case "ether": bookPath = "bofm/ether"
        case "moroni": bookPath = "bofm/moro"
        // Doctrine and Covenants
        case "doctrine and covenants", "d&c", "d and c": bookPath = "dc-testament/dc"
        // Pearl of Great Price
        case "moses": bookPath = "pgp/moses"
        case "abraham": bookPath = "pgp/abr"
        case "joseph smith—matthew": bookPath = "pgp/js-m"
        case "joseph smith—history": bookPath = "pgp/js-h"
        case "articles of faith": bookPath = "pgp/a-of-f"
        default:
            // Fallback: convert to lowercase and replace spaces with hyphens
            bookPath = "bofm/" + book.lowercased().replacingOccurrences(of: " ", with: "-")
        }
        
        // Build URL fragment
        var urlFragment = "\(chapter)"
        if let verse = verse {
            urlFragment += ".\(verse)"
            if let endVerse = endVerse, endVerse != verse {
                urlFragment += "-\(endVerse)"
            }
        }
        
        return "https://www.churchofjesuschrist.org/study/scriptures/\(bookPath)/\(urlFragment)?lang=eng"
    }
}
