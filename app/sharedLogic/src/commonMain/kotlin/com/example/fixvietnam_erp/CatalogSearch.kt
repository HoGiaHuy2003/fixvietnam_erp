package com.example.fixvietnam_erp

fun matchesCatalogQuery(sku: String, name: String, query: String): Boolean {
    val normalizedQuery = query.trim()
    return normalizedQuery.isEmpty() ||
        sku.contains(normalizedQuery, ignoreCase = true) ||
        name.contains(normalizedQuery, ignoreCase = true)
}
