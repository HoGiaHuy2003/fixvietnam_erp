package com.example.fixvietnam_erp

import androidx.compose.ui.window.ComposeUIViewController
import androidx.compose.ui.viewinterop.UIKitInteropProperties
import androidx.compose.ui.viewinterop.UIKitViewController
import platform.UIKit.UIViewController

fun MainViewController(
    onOpenNativeSwiftUI: () -> Unit,
    onOpenNativeUIKit: () -> Unit,
    makeQuantityWidget: (QuantityWidgetState, () -> Unit, () -> Unit) -> UIViewController,
    updateQuantityWidget: (UIViewController, QuantityWidgetState, () -> Unit, () -> Unit) -> Unit,
    releaseQuantityWidget: (UIViewController) -> Unit,
): UIViewController = ComposeUIViewController {
    App(
        onOpenNativeSwiftUI = onOpenNativeSwiftUI,
        onOpenNativeUIKit = onOpenNativeUIKit,
        quantityWidget = { state, onDecrease, onIncrease, modifier ->
            UIKitViewController(
                factory = { makeQuantityWidget(state, onDecrease, onIncrease) },
                modifier = modifier,
                update = { controller ->
                    updateQuantityWidget(controller, state, onDecrease, onIncrease)
                },
                onRelease = releaseQuantityWidget,
                properties = UIKitInteropProperties(isNativeAccessibilityEnabled = true),
            )
        },
    )
}
