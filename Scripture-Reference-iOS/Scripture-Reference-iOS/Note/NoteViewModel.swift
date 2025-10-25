//
//  NoteViewModel.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//

import Foundation
import Combine
import SwiftUI
import CoreData

enum SectionHeader: String, CaseIterable {
    case today = "Today"
    case prev7days = "Previous 7 Days"
    case prev30days = "Previouse 30 Days"
    case others = "Others"
}

class NoteViewModel: ObservableObject {

    @Published var hardcodedNote: [Note] = [
        Note(title: "Note 1", content: "Test content 1", createdDate: Date(), modifiedDate: Date()),
        Note(title: "Note 2", content: "Test content 2", createdDate: Date().addingTimeInterval(-3600), modifiedDate: Date().addingTimeInterval(-3600)),
        Note(title: "Note 3", content: "Test content 3", createdDate: Date().addingTimeInterval(-3600*24), modifiedDate: Date().addingTimeInterval(-3600*24)),
        Note(title: "Note 4", content: "Test content 4", createdDate: Date().addingTimeInterval(-3600*24*3), modifiedDate: Date().addingTimeInterval(-3600*24*3)),
        Note(title: "Note 5", content: "Test content 5", createdDate: Date().addingTimeInterval(-3600*24*10), modifiedDate: Date().addingTimeInterval(-3600*24*10)),
        Note(title: "Note 6", content: "Test content 6", createdDate: Date().addingTimeInterval(-3600*24*20), modifiedDate: Date().addingTimeInterval(-3600*24*20)),
        Note(title: "Note 7", content: "Test content 7", createdDate: Date().addingTimeInterval(-3600*24*35), modifiedDate: Date().addingTimeInterval(-3600*24*35)),
        Note(title: "Note 8", content: "Test content 8", createdDate: Date().addingTimeInterval(-3600*24*60), modifiedDate: Date().addingTimeInterval(-3600*24*60)),
        Note(title: "Note 9", content: "Test content 9", createdDate: Date().addingTimeInterval(-3600*24*100), modifiedDate: Date().addingTimeInterval(-3600*24*100)),
        Note(title: "Note 10", content: "Test content 10", createdDate: Date().addingTimeInterval(-3600*24*200), modifiedDate: Date().addingTimeInterval(-3600*24*200))
    ]

    @Published var isDetecting = false
    @Published var isEditing = false


    func delete(at offset: IndexSet) {
        hardcodedNote.remove(atOffsets: offset)
    }

    func update(note: Note) {
        if let index = hardcodedNote.firstIndex(where: { $0.id == note.id }) {
            hardcodedNote[index] = note
            hardcodedNote[index].modifiedDate = Date()
        } else {
            hardcodedNote.append(note)
        }
    }

    func section(note: Note) -> SectionHeader {
        let calendar = Calendar.current
        let now = Date()
        let modifiedDate = note.modifiedDate
        if let dayAgo = calendar.date(byAdding: .day, value: -1, to: now),
           modifiedDate >= dayAgo {
            return .today
        } else if let weekAge = calendar.date(byAdding: .day, value: -7, to: now),
                modifiedDate >= weekAge {
            return .prev7days
        } else if let monthAge = calendar.date(byAdding: .day, value: -30, to: now),
                  modifiedDate >= monthAge {
            return .prev30days
        } else {
            return .others
        }
    }
}

 
