package com.example.fixvietnam_erp

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.HtmlElementView
import org.w3c.dom.HTMLElement
import org.w3c.dom.events.Event

private const val DECREASE_EVENT = "fixvietnam:quantity-decrease"
private const val INCREASE_EVENT = "fixvietnam:quantity-increase"

/** A DOM island inside the Compose iframe; Kotlin remains the owner of quantity state. */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun ReactQuantityWidget(
    state: QuantityWidgetState,
    onDecrease: () -> Unit,
    onIncrease: () -> Unit,
    modifier: Modifier,
) {
    val currentDecrease = rememberUpdatedState(onDecrease)
    val currentIncrease = rememberUpdatedState(onIncrease)
    val decreaseListener: (Event) -> Unit = remember { { currentDecrease.value() } }
    val increaseListener: (Event) -> Unit = remember { { currentIncrease.value() } }

    HtmlElementView(
        factory = {
            createQuantityWidgetElement().also { element ->
                element.addEventListener(DECREASE_EVENT, decreaseListener)
                element.addEventListener(INCREASE_EVENT, increaseListener)
            }
        },
        modifier = modifier,
        update = { element ->
            updateQuantityWidget(element, state.sku, state.quantity, state.availableStock)
        },
        onRelease = { element ->
            element.removeEventListener(DECREASE_EVENT, decreaseListener)
            element.removeEventListener(INCREASE_EVENT, increaseListener)
            unmountQuantityWidget(element)
        },
    )
}

internal expect fun isReactQuantityWidgetAvailable(): Boolean
internal expect fun createQuantityWidgetElement(): HTMLElement
internal expect fun updateQuantityWidget(element: HTMLElement, sku: String, quantity: Int, availableStock: Int)
internal expect fun unmountQuantityWidget(element: HTMLElement)
