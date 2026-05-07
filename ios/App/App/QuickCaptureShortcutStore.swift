import Foundation

enum QuickCaptureShortcutStore {
    private static let shouldOpenKey = "quick_capture_should_open"
    private static let paymentSourceKey = "quick_capture_payment_source"

    static func save(paymentSource: String?) {
        let defaults = UserDefaults.standard
        defaults.set(true, forKey: shouldOpenKey)
        if let paymentSource {
            defaults.set(paymentSource, forKey: paymentSourceKey)
        } else {
            defaults.removeObject(forKey: paymentSourceKey)
        }
        defaults.synchronize()
    }

    static func consumeLaunch() -> (shouldOpen: Bool, paymentSource: String?) {
        let defaults = UserDefaults.standard
        let shouldOpen = defaults.bool(forKey: shouldOpenKey)
        let paymentSource = defaults.string(forKey: paymentSourceKey)
        defaults.removeObject(forKey: shouldOpenKey)
        defaults.removeObject(forKey: paymentSourceKey)
        defaults.synchronize()
        return (shouldOpen, paymentSource)
    }
}
