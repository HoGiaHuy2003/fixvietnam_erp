package com.example.fixvietnam_erp

import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "Fixvietnam_erp",
    ) {
        App()
    }
}