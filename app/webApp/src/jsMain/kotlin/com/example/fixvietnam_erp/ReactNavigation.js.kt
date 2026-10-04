package com.example.fixvietnam_erp

internal actual fun isHybridWebHost(): Boolean = js("window.parent !== window") as Boolean

internal actual fun openReactCatalog() {
    js("window.parent.postMessage({type: 'fixvietnam:open-react-page', path: '/catalog/'}, window.location.origin)")
}
