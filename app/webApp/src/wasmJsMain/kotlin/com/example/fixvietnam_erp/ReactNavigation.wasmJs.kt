@file:OptIn(kotlin.js.ExperimentalWasmJsInterop::class)

package com.example.fixvietnam_erp

@JsFun("() => window.parent !== window")
private external fun hasParentHost(): Boolean

@JsFun("() => { window.parent.postMessage({type: 'fixvietnam:open-react-page', path: '/catalog/'}, window.location.origin); }")
private external fun requestReactCatalog()

internal actual fun isHybridWebHost(): Boolean = hasParentHost()

internal actual fun openReactCatalog() = requestReactCatalog()
