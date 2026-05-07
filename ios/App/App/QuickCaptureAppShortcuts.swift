import AppIntents
import Foundation

@available(iOS 16.0, *)
struct QuickCaptureIntent: AppIntent {
    static var title: LocalizedStringResource = "Registrar gasto rápido"
    static var description = IntentDescription("Abre Daniel 15K en captura rápida.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        QuickCaptureShortcutStore.save(paymentSource: nil)
        return .result()
    }
}

@available(iOS 16.0, *)
struct QuickCaptureCreditCardIntent: AppIntent {
    static var title: LocalizedStringResource = "Registrar gasto con tarjeta"
    static var description = IntentDescription("Abre captura rápida con tarjeta de crédito preseleccionada.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        QuickCaptureShortcutStore.save(paymentSource: "credit_card")
        return .result()
    }
}

@available(iOS 16.0, *)
struct QuickCaptureDebitIntent: AppIntent {
    static var title: LocalizedStringResource = "Registrar gasto con débito"
    static var description = IntentDescription("Abre captura rápida con débito preseleccionado.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        QuickCaptureShortcutStore.save(paymentSource: "debit")
        return .result()
    }
}

@available(iOS 16.0, *)
struct QuickCaptureCashIntent: AppIntent {
    static var title: LocalizedStringResource = "Registrar gasto en efectivo"
    static var description = IntentDescription("Abre captura rápida con efectivo preseleccionado.")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        QuickCaptureShortcutStore.save(paymentSource: "cash")
        return .result()
    }
}

@available(iOS 16.0, *)
struct Daniel15KAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: QuickCaptureIntent(),
            phrases: [
                "Registrar gasto en \(.applicationName)",
                "Captura rápida en \(.applicationName)"
            ],
            shortTitle: "Gasto rápido",
            systemImageName: "plus.circle"
        )

        AppShortcut(
            intent: QuickCaptureCreditCardIntent(),
            phrases: [
                "Registrar gasto con tarjeta en \(.applicationName)",
                "Gasto con tarjeta en \(.applicationName)"
            ],
            shortTitle: "Tarjeta",
            systemImageName: "creditcard"
        )

        AppShortcut(
            intent: QuickCaptureDebitIntent(),
            phrases: [
                "Registrar gasto con débito en \(.applicationName)",
                "Gasto con débito en \(.applicationName)"
            ],
            shortTitle: "Débito",
            systemImageName: "rectangle.and.pencil.and.ellipsis"
        )

        AppShortcut(
            intent: QuickCaptureCashIntent(),
            phrases: [
                "Registrar gasto en efectivo en \(.applicationName)",
                "Gasto en efectivo en \(.applicationName)"
            ],
            shortTitle: "Efectivo",
            systemImageName: "banknote"
        )
    }
}
