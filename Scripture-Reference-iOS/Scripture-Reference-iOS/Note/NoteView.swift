//
//  NoteView.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//

import SwiftUI

struct NoteView: View {
    @ObservedObject var viewModel: NoteViewModel
    @EnvironmentObject var audioStreamer: AudioStreamer
    @State var note: Note
    
    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 8) {
                if viewModel.isEditing {
                    TextField("", text: $note.title)
                    .font(.title)
                    .bold()
                    .frame(height: 40)
                } else {
                    Text(note.title)
                        .font(.title)
                        .bold()
                        .frame(height: 40)
                        .onTapGesture {
                            viewModel.isEditing = true
                        }
                }
                Text(note.content)
                
                // Real-time transcript display
                if !audioStreamer.transcript.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Live Transcript:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(audioStreamer.transcript)
                            .font(.body)
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
                
                // Scripture references display
                if !audioStreamer.scriptureReferences.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Scripture References:")
                            .font(.headline)
                            .foregroundColor(.blue)
                        
                        ForEach(audioStreamer.scriptureReferences) { reference in
                            Link(destination: URL(string: reference.url)!) {
                                HStack {
                                    Image(systemName: "book.fill")
                                        .foregroundColor(.blue)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("\(reference.book) \(reference.chapter)\(reference.verse.map { ":\($0)" } ?? "")")
                                            .font(.body)
                                            .fontWeight(.semibold)
                                        Text("Tap to open in browser")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "arrow.up.right.square")
                                        .foregroundColor(.blue)
                                }
                                .padding()
                                .background(Color.blue.opacity(0.1))
                                .cornerRadius(8)
                            }
                        }
                    }
                    .padding(.top, 8)
                }
                
                // Connection status
                HStack {
                    if audioStreamer.isConnected {
                        Image(systemName: "wifi")
                            .foregroundColor(.green)
                        Text("Connected")
                            .font(.caption)
                            .foregroundColor(.green)
                    } else {
                        Image(systemName: "wifi.slash")
                            .foregroundColor(.red)
                        Text("Disconnected")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                    
                    if audioStreamer.isRecordingAudio {
                        Image(systemName: "mic.fill")
                            .foregroundColor(.blue)
                        Text("Recording")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .toolbar {
                if viewModel.isEditing {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(action: {
                            viewModel.update(note: note)
                            viewModel.isEditing = false
                        }) {
                            Image(systemName: "checkmark")
                        }
                    }
                }
                
                ToolbarItemGroup(placement: .bottomBar) {
                    Spacer()
                    Button(action: {
                        if viewModel.isDetecting {
                            viewModel.isDetecting = false
                            audioStreamer.stop()
                        } else {
                            viewModel.isDetecting = true
                            audioStreamer.startWithAudio()
                        }
                    }) {
                        Image(systemName: viewModel.isDetecting ? "stop.circle" : "person.wave.2")
                            .foregroundStyle(viewModel.isDetecting ? .red : .black)
                    }
                }
            }
        }
        .onDisappear {
            // Clear transcript when leaving the view
            audioStreamer.clearTranscript()
        }
    }
}

