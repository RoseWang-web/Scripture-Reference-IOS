//
//  UserManager.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/25/25.
//

import Foundation

class UserManager {
    static let shared = UserManager()
    private let userIdKey = "userId"
    
    var userId: String {
        if let existingId = UserDefaults.standard.string(forKey: userIdKey) {
            return existingId
        } else {
            let newId = UUID().uuidString
            UserDefaults.standard.set(newId, forKey: userIdKey)
            return newId
        }
    }
}
