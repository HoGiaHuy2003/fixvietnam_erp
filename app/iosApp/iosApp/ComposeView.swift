import SharedUI
import SwiftUI
import UIKit

struct ComposeView: UIViewControllerRepresentable {
    var onOpenNativeSwiftUI: () -> Void
    var onOpenNativeUIKit: () -> Void

    final class Coordinator {
        var onOpenNativeSwiftUI: () -> Void
        var onOpenNativeUIKit: () -> Void
        private var widgetModels: [ObjectIdentifier: QuantityWidgetModel] = [:]

        init(onOpenNativeSwiftUI: @escaping () -> Void, onOpenNativeUIKit: @escaping () -> Void) {
            self.onOpenNativeSwiftUI = onOpenNativeSwiftUI
            self.onOpenNativeUIKit = onOpenNativeUIKit
        }

        deinit {
            widgetModels.values.forEach { $0.release() }
        }

        func makeQuantityWidget(
            state: QuantityWidgetState,
            onDecrease: @escaping () -> Void,
            onIncrease: @escaping () -> Void
        ) -> UIViewController {
            let model = QuantityWidgetModel(
                state: state,
                onDecrease: onDecrease,
                onIncrease: onIncrease
            )
            let controller = UIHostingController(rootView: QuantityWidgetView(model: model))
            controller.view.backgroundColor = .clear
            widgetModels[ObjectIdentifier(controller)] = model
            return controller
        }

        func updateQuantityWidget(
            controller: UIViewController,
            state: QuantityWidgetState,
            onDecrease: @escaping () -> Void,
            onIncrease: @escaping () -> Void
        ) {
            widgetModels[ObjectIdentifier(controller)]?.update(
                state: state,
                onDecrease: onDecrease,
                onIncrease: onIncrease
            )
        }

        func releaseQuantityWidget(controller: UIViewController) {
            let model = widgetModels.removeValue(forKey: ObjectIdentifier(controller))
            model?.release()
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
            onOpenNativeUIKit: { coordinator.onOpenNativeUIKit() },
            makeQuantityWidget: { state, onDecrease, onIncrease in
                coordinator.makeQuantityWidget(
                    state: state,
                    onDecrease: onDecrease,
                    onIncrease: onIncrease
                )
            },
            updateQuantityWidget: { controller, state, onDecrease, onIncrease in
                coordinator.updateQuantityWidget(
                    controller: controller,
                    state: state,
                    onDecrease: onDecrease,
                    onIncrease: onIncrease
                )
            },
            releaseQuantityWidget: { controller in
                coordinator.releaseQuantityWidget(controller: controller)
            }
        )
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        context.coordinator.onOpenNativeSwiftUI = onOpenNativeSwiftUI
        context.coordinator.onOpenNativeUIKit = onOpenNativeUIKit
    }
}
