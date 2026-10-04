package com.example.fixvietnam_erp

import org.w3c.dom.HTMLElement

internal actual fun isReactQuantityWidgetAvailable(): Boolean =
    js("!!(window.FixVietnamQuantityWidget && window.FixVietnamQuantityWidget.version === 1)") as Boolean

internal actual fun createQuantityWidgetElement(): HTMLElement =
    js("document.createElement('div')") as HTMLElement

internal actual fun updateQuantityWidget(element: HTMLElement, sku: String, quantity: Int, availableStock: Int) {
    js("window.FixVietnamQuantityWidget.update(element, sku, quantity, availableStock)")
}

internal actual fun unmountQuantityWidget(element: HTMLElement) {
    js("window.FixVietnamQuantityWidget.unmount(element)")
}
