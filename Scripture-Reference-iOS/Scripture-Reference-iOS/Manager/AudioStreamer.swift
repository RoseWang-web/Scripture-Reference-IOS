//
//  AudioStreamer.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//

import Foundation
import AVFoundation
import Combine

class AudioStreamer: ObservableObject {
    private var webSocket: URLSessionWebSocketTask?
    private let audioEngine = AVAudioEngine()
    var userId: String = UserManager.shared.userId
    
    func start() {
        if let url = URL(string: "") {
            webSocket = URLSession.shared.webSocketTask(with: url)
            webSocket?.resume()
            
            receiveMessages()
            startStreaming()
            
        }
    }
    
    func startStreaming() {
        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            let audioBuffer = buffer.audioBufferList.pointee.mBuffers
            if let data = audioBuffer.mData {
                let audioData = Data(bytes: data, count: Int(audioBuffer.mDataByteSize))
                let base64 = audioData.base64EncodedString()
                
                let messageDict: [String: String] = [
                    "userId": self.userId,
                    "audioBase64": base64
                ]
                
                if let jsonData = try? JSONSerialization.data(withJSONObject: messageDict),
                   let jsonString = String(data: jsonData, encoding: .utf8) {
                    let message = URLSessionWebSocketTask.Message.string(jsonString)
                    self.webSocket?.send(message) { error in
                        if let error = error {
                            print("WebSocket send error: \(error)")
                        }
                    }
                }
            }
            
        }
        
        do {
            try audioEngine.start()
            print("Audio streaming started")
        } catch {
            print("Audio engine error:", error)
        }
    }
    
    func receiveMessages() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(.string(let text)):
                print("WebSocket received text: \(text)")
            case .failure(let error):
                print("WebSocket receive error: \(error)")
            default:
                break
            }
            
            self?.receiveMessages()
            
        }
    }
    
    func stop() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        webSocket?.cancel(with: .goingAway, reason: nil)
    }
}
