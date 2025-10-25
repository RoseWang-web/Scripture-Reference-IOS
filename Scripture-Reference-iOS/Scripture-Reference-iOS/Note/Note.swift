//
//  Note.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//

import Foundation

struct Note: Identifiable {
    let id = UUID()
    var title: String
    var content: String
    var createdDate = Date()
    var modifiedDate = Date()
}
