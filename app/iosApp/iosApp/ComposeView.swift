import SharedUI
import SwiftUI
import UIKit

struct ComposeView: UIViewControllerRepresentable {
    var onOpenNativeSwiftUI: () -> Void
    var onOpenNativeUIKit: () -> Void

    final class Coordinator {
        var onOpenNativeSwiftUI: () -> Void
        var onOpenNativeUIKit: () -> Void

        init(onOpenNativeSwiftUI: @escaping () -> Void, onOpenNativeUIKit: @escaping () -> Void) {
            self.onOpenNativeSwiftUI = onOpenNativeSwiftUI
            self.onOpenNativeUIKit = onOpenNativeUIKit
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(
            onOpenNativeSwiftUI: onOpenNativeSwiftUI,
            onOpenNativeUIKit: onOpenNativeUIKit
        )
    }

    func makeUIViewController(context: Context) -> UIViewController {
        let coordinator = context.coordinator
        return MainViewControllerKt.MainViewController(
            onOpenNativeSwiftUI: { coordinator.onOpenNativeSwiftUI() },
            onOpenNativeUIKit: { coordinator.onOpenNativeUIKit() }
        )
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        context.coordinator.onOpenNativeSwiftUI = onOpenNativeSwiftUI
        context.coordinator.onOpenNativeUIKit = onOpenNativeUIKit
    }
}
