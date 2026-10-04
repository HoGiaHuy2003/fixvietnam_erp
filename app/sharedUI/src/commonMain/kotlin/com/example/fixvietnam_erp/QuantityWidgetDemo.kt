package com.example.fixvietnam_erp

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

typealias QuantityWidgetContent = @Composable (
    state: QuantityWidgetState,
    onDecrease: () -> Unit,
    onIncrease: () -> Unit,
    modifier: Modifier,
) -> Unit

/** A working interop sample, with Kotlin as the only owner of business state. */
@Composable
fun QuantityWidgetDemo(quantityWidget: QuantityWidgetContent? = null) {
    var state by remember { mutableStateOf(QuantityWidgetState("SP-001", 1, 5)) }
    var showPlatformWidget by remember { mutableStateOf(true) }
    val decrease = { state = state.copy(quantity = adjustRequestedQuantity(state.quantity, -1, state.availableStock)) }
    val increase = { state = state.copy(quantity = adjustRequestedQuantity(state.quantity, 1, state.availableStock)) }

    Card(Modifier.widthIn(max = 480.dp).fillMaxWidth().padding(12.dp)) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Widget số lượng đặt hàng", style = MaterialTheme.typography.titleMedium)
            Text("State Compose: ${state.sku} · ${state.quantity}/${state.availableStock}")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = decrease, enabled = state.quantity > 0) { Text("Compose −") }
                Button(onClick = increase, enabled = state.quantity < state.availableStock) { Text("Compose +") }
            }
            TextButton(onClick = {
                val stock = if (state.sku == "SP-001") 3 else 5
                val sku = if (state.sku == "SP-001") "SP-002" else "SP-001"
                state = QuantityWidgetState(sku, adjustRequestedQuantity(state.quantity, 0, stock), stock)
            }) { Text("Đổi sản phẩm mẫu") }

            if (quantityWidget != null) {
                TextButton(onClick = { showPlatformWidget = !showPlatformWidget }) {
                    Text(if (showPlatformWidget) "Ẩn widget nền tảng" else "Hiện widget nền tảng")
                }
                if (showPlatformWidget) {
                    quantityWidget(state, decrease, increase, Modifier.fillMaxWidth().height(160.dp))
                }
            } else {
                Text("Giao diện Compose dùng chung; host chưa cung cấp widget nền tảng.")
            }
        }
    }
}
