import Foundation

enum QuickCaptureShortcutStore {
    private static let paymentSourceKey = "quick_capture_payment_source"

    static func save(paymentSource: String?) {
        let defaults = UserDefaults.standard
        if let paymentSource {
            defaults.set(paymentSource, forKey: paymentSourceKey)
        } else {
            defaults.removeObject(forKey: paymentSourceKey)
        }
        defaults.synchronize()
    }

    static func consumePaymentSource() -> String? {
        let defaults = UserDefaults.standard
        let paymentSource = defaults.string(forKey: paymentSourceKey)
        defaults.removeObject(forKey: paymentSourceKey)
        defaults.synchronize()
        return paymentSource
    }
}
