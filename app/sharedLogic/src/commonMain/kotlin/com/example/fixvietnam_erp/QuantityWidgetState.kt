package com.example.fixvietnam_erp

/** Sample UI contract. Stock must come from a repository/backend in a real order. */
data class QuantityWidgetState(
    val sku: String,
    val quantity: Int,
    val availableStock: Int,
)

/** Shared rule used by Compose and by events from platform widgets. */
fun adjustRequestedQuantity(quantity: Int, delta: Int, availableStock: Int): Int =
    (quantity.toLong() + delta.toLong())
        .coerceIn(0L, availableStock.coerceAtLeast(0).toLong())
        .toInt()
