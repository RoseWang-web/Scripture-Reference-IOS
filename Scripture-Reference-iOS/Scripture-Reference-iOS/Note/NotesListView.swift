//
//  NotesListView.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//

import SwiftUI

struct NotesListView: View {
    @StateObject var viewModel = NoteViewModel()

    var body: some View {
        NavigationStack {
            List {
                ForEach(SectionHeader.allCases, id: \.self) { section in
                    let notesInSection = viewModel.hardcodedNote.filter { viewModel.section(note: $0).rawValue == section.rawValue }
                    if !notesInSection.isEmpty {
                        Section(header: Text(section.rawValue)) {
                            ForEach(notesInSection, id: \.id) { note in
                                NavigationLink(destination: NoteView(viewModel: viewModel, note: note)) {
                                    VStack(alignment: .leading) {
                                        Text(note.title)
                                            .font(.headline)
                                        Text(note.content)
                                            .font(.caption)
                                    }
                                }
                            }
                            .onDelete { indexSet in
                                let idsToDelete = indexSet.map { notesInSection[$0].id }
                                viewModel.hardcodedNote.removeAll { idsToDelete.contains($0.id) }
                            }
                        }
                    }
                }
            }
            .toolbar {
                ToolbarItemGroup(placement: .bottomBar) {
                    Spacer()
                    NavigationLink {
                        NoteView(viewModel: viewModel, note: Note(title: "Enter title", content: ""))
                    } label: {
                        Image(systemName: "microphone.badge.plus")
                    }
                }
            }
            .navigationTitle("Speech Records")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview {
    NotesListView()
}
 
