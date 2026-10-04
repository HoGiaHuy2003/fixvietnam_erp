package com.example.fixvietnam_erp

import kotlin.test.Test
import kotlin.test.assertEquals

class QuantityRuleTest {
    @Test
    fun requestedQuantityStaysWithinAvailableStock() {
        assertEquals(2, adjustRequestedQuantity(1, 1, 5))
        assertEquals(0, adjustRequestedQuantity(0, -1, 5))
        assertEquals(5, adjustRequestedQuantity(5, 1, 5))
        assertEquals(3, adjustRequestedQuantity(5, 0, 3))
    }

    @Test
    fun unavailableStockAndLargeRequestsAreHandled() {
        assertEquals(0, adjustRequestedQuantity(1, 1, 0))
        assertEquals(0, adjustRequestedQuantity(1, 1, -3))
        assertEquals(Int.MAX_VALUE, adjustRequestedQuantity(Int.MAX_VALUE, 1, Int.MAX_VALUE))
        assertEquals(0, adjustRequestedQuantity(Int.MIN_VALUE, -1, 5))
    }
}
