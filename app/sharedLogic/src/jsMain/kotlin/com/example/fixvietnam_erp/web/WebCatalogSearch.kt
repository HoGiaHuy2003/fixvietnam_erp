package com.example.fixvietnam_erp.web

import com.example.fixvietnam_erp.matchesCatalogQuery
import kotlin.js.ExperimentalJsExport
import kotlin.js.JsExport

@OptIn(ExperimentalJsExport::class)
@JsExport
class WebCatalogSearch {
    fun matches(sku: String, name: String, query: String): Boolean =
        matchesCatalogQuery(sku, name, query)
}
