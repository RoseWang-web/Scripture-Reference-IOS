//
//  Scripture_Reference_iOSApp.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//

import SwiftUI

@main
struct Scripture_Reference_iOSApp: App {
    @StateObject private var audioStreamer = AudioStreamer()
    init() {
        let _ = UserManager.shared.userId
    }
    
    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(audioStreamer)
        }
    }
}
