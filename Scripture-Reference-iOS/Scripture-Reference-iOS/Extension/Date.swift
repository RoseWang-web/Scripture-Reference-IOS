//
//  Date.swift
//  Scripture-Reference-iOS
//
//  Created by Simon Sung on 10/24/25.
//

import Foundation

extension Date {
    var toMonth: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        return formatter.string(from: self)
    }
    
    var toYear: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "YYYY"
        return formatter.string(from: self)
    }
}
