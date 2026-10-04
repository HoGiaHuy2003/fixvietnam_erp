@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

package com.example.fixvietnam_erp

import org.w3c.dom.HTMLElement

@JsFun("() => window.FixVietnamQuantityWidget?.version === 1")
private external fun hasQuantityWidget(): Boolean

@JsFun("() => document.createElement('div')")
private external fun createWidgetContainer(): HTMLElement

@JsFun("(element, sku, quantity, stock) => window.FixVietnamQuantityWidget.update(element, sku, quantity, stock)")
private external fun updateWidgetContainer(element: HTMLElement, sku: String, quantity: Int, stock: Int)

@JsFun("(element) => window.FixVietnamQuantityWidget.unmount(element)")
private external fun releaseWidgetContainer(element: HTMLElement)

internal actual fun isReactQuantityWidgetAvailable(): Boolean = hasQuantityWidget()
internal actual fun createQuantityWidgetElement(): HTMLElement = createWidgetContainer()
internal actual fun updateQuantityWidget(element: HTMLElement, sku: String, quantity: Int, availableStock: Int) =
    updateWidgetContainer(element, sku, quantity, availableStock)
internal actual fun unmountQuantityWidget(element: HTMLElement) = releaseWidgetContainer(element)
