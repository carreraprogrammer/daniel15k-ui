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
        let launch = QuickCaptureShortcutStore.consumeLaunch()
        guard launch.shouldOpen else {
            call.resolve([:])
            return
        }

        var payload: [String: Any] = ["shouldOpen": true]
        if let paymentSource = launch.paymentSource {
            payload["paymentSource"] = paymentSource
        }
        call.resolve(payload)
    }
}
