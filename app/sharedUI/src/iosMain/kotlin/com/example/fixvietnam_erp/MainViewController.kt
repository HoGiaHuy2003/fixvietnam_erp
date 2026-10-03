package com.example.fixvietnam_erp

import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController

fun MainViewController(
    onOpenNativeSwiftUI: () -> Unit,
    onOpenNativeUIKit: () -> Unit,
): UIViewController = ComposeUIViewController {
    App(
        onOpenNativeSwiftUI = onOpenNativeSwiftUI,
        onOpenNativeUIKit = onOpenNativeUIKit,
    )
}
