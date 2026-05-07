import Foundation
import Capacitor

@objc(QuickCaptureShortcutPlugin)
public class QuickCaptureShortcutPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "QuickCaptureShortcutPlugin"
    public let jsName = "QuickCaptureShortcut"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPendingLaunch", returnType: CAPPluginReturnPromise)
    ]

    @objc func getPendingLaunch(_ call: CAPPluginCall) {
        if let paymentSource = QuickCaptureShortcutStore.consumePaymentSource() {
            call.resolve([
                "paymentSource": paymentSource
            ])
        } else {
            call.resolve([:])
        }
    }
}
