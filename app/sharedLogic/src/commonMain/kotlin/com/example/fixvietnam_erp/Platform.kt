package com.example.fixvietnam_erp

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform