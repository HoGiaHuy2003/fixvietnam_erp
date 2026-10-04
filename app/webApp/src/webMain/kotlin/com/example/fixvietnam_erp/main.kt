package com.example.fixvietnam_erp

import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.window.ComposeViewport

@OptIn(ExperimentalComposeUiApi::class)
fun main() {
    val openCatalog: (() -> Unit)? = if (isHybridWebHost()) ::openReactCatalog else null
    val quantityWidget: QuantityWidgetContent? =
        if (isReactQuantityWidgetAvailable()) ::ReactQuantityWidget else null
    ComposeViewport {
        App(onOpenWebCatalog = openCatalog, quantityWidget = quantityWidget)
    }
}

internal expect fun isHybridWebHost(): Boolean

internal expect fun openReactCatalog()
