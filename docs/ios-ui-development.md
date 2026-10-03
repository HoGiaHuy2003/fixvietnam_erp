# Phát triển giao diện iOS cùng Compose Multiplatform

Dự án mở thẳng **giao diện Compose dùng chung** khi khởi động iOS. `iOSApp.swift` tạo `ContentView`, còn `ContentView` đặt `ComposeView` làm màn hình gốc. Những màn hình chỉ dành cho iOS được viết bằng SwiftUI hoặc UIKit trong `app/iosApp` và được mở khi Compose gọi callback do iOS host cung cấp. Cách này cho phép Compose giữ state và điều hướng dùng chung, đồng thời vẫn dùng giao diện native ở những chỗ cần thiết.

## Bản đồ dự án

| Vị trí | Trách nhiệm |
| --- | --- |
| `app/iosApp/iosApp/iOSApp.swift` | Điểm vào của ứng dụng iOS. |
| `app/iosApp/iosApp/ContentView.swift` | Gắn Compose làm root; trình bày màn hình native bằng SwiftUI sheet. |
| `app/iosApp/iosApp/ComposeView.swift` | Cầu nối `UIViewControllerRepresentable` và callback từ Compose về iOS host. |
| `app/iosApp/iosApp/NativeGreetingView.swift` | Ví dụ màn hình SwiftUI riêng cho iOS. |
| `app/iosApp/iosApp/NativeUIKitView.swift` | Ví dụ bridge SwiftUI tới `NativeGreetingViewController` thuần UIKit dùng logic chung; cả hai kiểu hiện ở cùng file. |
| `app/sharedUI/src/commonMain` | Giao diện Compose và thành phần UI dùng chung. `App()` hiện là ví dụ. |
| `app/sharedUI/src/iosMain` | Mã giao tiếp iOS của shared UI, gồm factory `MainViewController(...)`. |
| `app/sharedLogic/src/commonMain` | Logic, mô hình dữ liệu và quy tắc có thể dùng lại giữa các nền tảng. |
| `app/sharedLogic/src/iosMain` | Phần hiện thực riêng iOS của logic dùng chung. |
| `core/src/commonMain` | Tiện ích dùng chung ở tầng thấp hơn. |

`sharedUI` tạo framework iOS tên **`SharedUI`** cho thiết bị `iosArm64` và simulator Apple Silicon `iosSimulatorArm64`. Swift chỉ cần `import SharedUI` để gọi cả UI và API logic đã được export. Cấu hình hiện có trong `app/sharedUI/build.gradle.kts` gồm hai phần liên quan nhưng có vai trò khác nhau:

```kotlin
iosTarget.binaries.framework {
    baseName = "SharedUI"
    isStatic = true
    export(project(":app:sharedLogic")) // Xuất API Kotlin sang Swift.
}

sourceSets {
    commonMain.dependencies {
        api(project(":app:sharedLogic")) // sharedUI dùng API logic trong Kotlin.
    }
}
```

`api(...)` khai báo phụ thuộc Kotlin có thể được dùng trong API công khai của `sharedUI`; `export(...)` đưa API của phụ thuộc đó vào header/framework nhìn thấy từ Swift. `implementation(...)` tự nó không xuất kiểu sang Swift. `sharedLogic` vẫn có iOS target để được biên dịch nhưng **không tạo framework `SharedLogic` độc lập** trong cấu hình hiện tại. Nếu chữ ký public cần kiểu từ `core`, kiểm tra header được sinh và xuất `core` một cách tường minh khi cần.

Khi Swift cần gọi trực tiếp một kiểu trong `core`, thêm `api(project(":core"))` vào `commonMain.dependencies` của `sharedUI` và `export(project(":core"))` vào mỗi cấu hình framework của `sharedUI`. Chỉ export các module cần thiết; cấu hình hiện tại không bật `transitiveExport`. Thư viện Compose và chi tiết lưu trữ/network tiếp tục là phần hiện thực, không cần xuất toàn bộ sang Swift.

Dự án tham khảo `fixvietnamerp` được dùng làm mẫu tích hợp iOS. Dự án hiện tại `fixvietnam_erp` vẫn dùng Compose cho Web với cả JS và Wasm; phần React của dự án tham khảo không được chuyển sang đây.

## Màn hình dùng chung: Compose làm root

`App()` trong `sharedUI/src/commonMain/kotlin/com/example/fixvietnam_erp/App.kt` là giao diện Compose gốc. Nó nhận hai callback tùy chọn:

```kotlin
@Composable
fun App(
    onOpenNativeSwiftUI: (() -> Unit)? = null,
    onOpenNativeUIKit: (() -> Unit)? = null,
) {
    // Các nút mở màn hình native chỉ xuất hiện khi callback tương ứng khác null.
}
```

Android, Desktop và Web tiếp tục gọi `App()` không tham số nên không thấy nút iOS. `sharedUI/src/iosMain/kotlin/com/example/fixvietnam_erp/MainViewController.kt` tạo `UIViewController` cho SwiftUI và truyền hai callback vào `App`:

```kotlin
package com.example.fixvietnam_erp

import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController

fun MainViewController(
    onOpenNativeSwiftUI: () -> Unit,
    onOpenNativeUIKit: () -> Unit,
): UIViewController = ComposeUIViewController {
    App(
        onOpenNativeSwiftUI = onOpenNativeSwiftUI,
        onOpenNativeUIKit = onOpenNativeUIKit,
    )
}
```

Kotlin/Native xuất hàm top-level dưới tên `MainViewControllerKt.MainViewController(...)` trong module Swift `SharedUI`. `ComposeView.swift` hiện thực bridge bằng `UIViewControllerRepresentable`: nó tạo controller Compose ở `makeUIViewController`, giữ các closure Swift mới nhất trong `Coordinator`, và cập nhật closure ở `updateUIViewController`. Điều này ngăn Compose gọi một closure cũ khi SwiftUI render lại root. Nếu callback sau này đến từ công việc nền, chuyển việc cập nhật state SwiftUI về main actor.

```swift
import SharedUI
import SwiftUI
import UIKit

struct ComposeView: UIViewControllerRepresentable {
    var onOpenNativeSwiftUI: () -> Void
    var onOpenNativeUIKit: () -> Void

    final class Coordinator {
        var onOpenNativeSwiftUI: () -> Void
        var onOpenNativeUIKit: () -> Void

        init(onOpenNativeSwiftUI: @escaping () -> Void, onOpenNativeUIKit: @escaping () -> Void) {
            self.onOpenNativeSwiftUI = onOpenNativeSwiftUI
            self.onOpenNativeUIKit = onOpenNativeUIKit
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(
            onOpenNativeSwiftUI: onOpenNativeSwiftUI,
            onOpenNativeUIKit: onOpenNativeUIKit
        )
    }

    func makeUIViewController(context: Context) -> UIViewController {
        let coordinator = context.coordinator
        return MainViewControllerKt.MainViewController(
            onOpenNativeSwiftUI: { coordinator.onOpenNativeSwiftUI() },
            onOpenNativeUIKit: { coordinator.onOpenNativeUIKit() }
        )
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        context.coordinator.onOpenNativeSwiftUI = onOpenNativeSwiftUI
        context.coordinator.onOpenNativeUIKit = onOpenNativeUIKit
    }
}
```

`ContentView` đặt `ComposeView(...).ignoresSafeArea()` ở root, không có menu hoặc `NavigationStack` phía trên Compose. Hai closure của nó đặt `@State nativeScreen` thành `.swiftUI` hoặc `.uiKit`. `.sheet(item: $nativeScreen)` chọn `NativeGreetingView()` hay `NativeUIKitView()`, bọc màn hình được chọn trong `NavigationStack`, và thêm nút **Done** đặt `nativeScreen = nil`. Đóng sheet bằng Done hoặc vuốt xuống sẽ đưa người dùng về cùng root Compose, với state Compose còn giữ nguyên khi controller root vẫn sống. `App()` hiện dùng `safeContentPadding()` để xử lý nội dung ở safe area; màn hình nhập liệu mới cần kiểm tra thêm bàn phím và insets trên thiết bị.

Khi phát triển một màn hình Compose mới:

1. Đặt UI và state có thể dùng chung trong `app/sharedUI/src/commonMain`. Đặt mô hình và nghiệp vụ ở `app/sharedLogic/src/commonMain` nếu chúng không phụ thuộc Compose.
2. Nếu UI cần mã nền tảng, dùng source set tương ứng (`iosMain`, `androidMain`, `jvmMain`, `jsMain`, `wasmJsMain`), hoặc giao diện `expect`/`actual` khi có cùng một hợp đồng đa nền tảng. Không đưa `UIKit` hay API Android vào `commonMain`.
3. Đăng ký màn hình vào điều hướng Compose ở `sharedUI/commonMain` khi dự án thêm bộ điều hướng. Các màn hình Compose dùng chung nằm trong cây Compose gốc; không cần tạo một Swift wrapper cho từng màn hình.
4. Nếu màn hình cần mở giao diện native, thêm callback hành động ở ranh giới host, rồi chuyển callback từ `MainViewController` qua `ComposeView` về `ContentView`. Android, Desktop và Web có thể cung cấp hành vi nền tảng tương ứng hoặc để callback tùy chọn vắng mặt. `App()` hiện chỉ hiện nút native khi callback được cung cấp.

Ví dụ **mẫu để mở rộng**, chưa phải API có sẵn trong dự án:

```kotlin
// sharedUI/src/commonMain/.../OrdersScreen.kt
package com.example.fixvietnam_erp

import androidx.compose.runtime.Composable

@Composable
fun OrdersScreen() {
    // UI chung; dùng sharedLogic để lấy dữ liệu.
}
```

Gắn `OrdersScreen()` vào nhánh route Compose trong `App()` hoặc navigation graph chung. iOS không cần `OrdersViewController` hay `OrdersComposeView` riêng cho route này. Khi muốn dùng Compose như một đảo UI độc lập trong một màn hình SwiftUI khác, lúc đó mới tạo factory `UIViewController` và wrapper SwiftUI riêng.

Nếu màn hình Compose nhận dữ liệu **thay đổi sau khi tạo controller**, cần truyền thay đổi qua một đối tượng state/holder do Kotlin sở hữu; Compose quan sát state đó để vẽ lại. `Coordinator` hiện giải quyết việc cập nhật callback, không tự đồng bộ dữ liệu nghiệp vụ. Tránh tạo lại `UIViewController` theo mỗi lần SwiftUI render. Nếu dùng `Flow`, cần thiết kế cầu nối quan sát và hủy subscription theo vòng đời màn hình; repo hiện không có bộ chuyển `Flow` sang Swift tự động. Đưa các thay đổi ảnh hưởng UI về luồng chính và hủy công việc khi màn hình rời cây giao diện.

Cho mỗi luồng điều hướng, chọn một bên làm chủ: Compose sở hữu luồng màn hình dùng chung; iOS host sở hữu việc mở/đóng sheet native. Callback chỉ mang ý định mở màn hình native qua ranh giới này. Tránh để SwiftUI và Compose cùng tự push một route dùng chung.

Hai tên callback `onOpenNativeSwiftUI` và `onOpenNativeUIKit` chỉ phục vụ demo cách nối hai công nghệ. Trong tính năng thật, đặt tên theo **hành động sản phẩm** như `onScanBarcode` hoặc `onOpenDeviceSettings`, rồi để iOS host quyết định dùng SwiftUI hay UIKit để thực hiện. Không đưa tên framework hoặc mã iOS vào nghiệp vụ `commonMain` chỉ vì iOS hiện dùng framework đó. Khi số lượng hành động tăng, gom chúng vào một hợp đồng điều hướng rõ ràng thay vì thêm một callback cho từng màn hình.

SwiftUI host và Compose đều có thể áp dụng safe area, bàn phím và thanh điều hướng. Root SwiftUI dùng `.ignoresSafeArea()`, còn `App()` hiện dùng `safeContentPadding()`. Khi thay đổi cách hiển thị toàn màn hình, thử trên simulator với notch, home indicator và bàn phím để tránh padding hai lần hoặc nội dung bị che. Sheet native tự quản lý navigation bar và layout bên trong nó.

## Màn hình riêng cho iOS: SwiftUI hoặc UIKit

`NativeGreetingView.swift` là ví dụ SwiftUI dùng `Greeting` từ `sharedLogic` thông qua `import SharedUI`. Trong `NativeUIKitView.swift`, `NativeGreetingViewController` là ví dụ UIKit tạo `UILabel` và cũng dùng `Greeting`; `NativeUIKitView` bọc controller này bằng `UIViewControllerRepresentable` để SwiftUI có thể đặt nó trong sheet. Cả hai màn hình đều được mở theo yêu cầu từ root Compose; phần nội dung native không render Compose.

Khi thêm một màn hình iOS riêng, tạo file SwiftUI trong `app/iosApp/iosApp`, khai báo một trường hợp mới của enum màn hình native ở `ContentView`, và thêm nhánh tương ứng trong `.sheet(item:)`. Nếu Compose cần mở màn hình đó, thêm callback/hành động qua `App` → `MainViewController` → `ComposeView` → `ContentView`. Giữ state hiển thị của màn hình native trong SwiftUI. Ví dụ một màn hình SwiftUI riêng đơn giản:

```swift
import SwiftUI

struct DeviceSettingsView: View {
    var body: some View {
        Form {
            Text("Cài đặt thiết bị")
        }
        .navigationTitle("Cài đặt iOS")
    }
}
```

Với màn hình UIKit riêng, tạo `UIViewController` trong `iosApp/iosApp`, rồi bọc bằng `UIViewControllerRepresentable` như `NativeUIKitView` để đưa vào sheet. Cả hai loại màn hình được đóng bằng nút **Done** hoặc vuốt sheet. Xcode project này dùng nhóm file được đồng bộ với thư mục nên file Swift mới trong `iosApp/iosApp` được nhận tự động. Nếu cần nghiệp vụ dùng chung, thêm `import SharedUI` rồi gọi API public đã export từ `sharedLogic`, như hai màn hình greeting hiện tại. Với tính năng chỉ có trên iOS (ví dụ tích hợp API UIKit/SwiftUI cụ thể), đặt mã giao diện và tích hợp đó ở iOS. Nếu quy tắc nghiệp vụ sau này cần chia sẻ, chuyển phần quy tắc sang `sharedLogic`; không cần chuyển cả giao diện.

Nếu tương lai cần **một ứng dụng iOS hoàn toàn native, không liên kết Compose**, đó là một cấu hình build khác với một màn hình SwiftUI riêng trong ứng dụng hiện tại. Khi đó cần khôi phục việc xuất framework `SharedLogic` tại `app/sharedLogic/build.gradle.kts`, đổi Xcode build phase sang `:app:sharedLogic:embedAndSignAppleFrameworkForXcode`, và cập nhật `FRAMEWORK_SEARCH_PATHS` cùng `OTHER_LDFLAGS` để liên kết `SharedLogic`. Tránh liên kết cả `SharedUI` và `SharedLogic` vào cùng một app vì `SharedUI` hiện đã chứa phần logic được export.

Trong cấu hình ứng dụng hoàn toàn native đó, bỏ các route và wrapper Compose khỏi target Swift, thay `import SharedUI` bằng `import SharedLogic` ở các màn hình còn dùng Kotlin. Android/Desktop/Web vẫn có thể dùng `sharedUI` như trước. Đây là hướng chuyển đổi sau này; ứng dụng hiện tại tiếp tục là ứng dụng phối hợp SwiftUI và Compose.

| Tình huống | Nơi đặt UI | Nơi đặt logic có thể chia sẻ |
| --- | --- | --- |
| Cùng trải nghiệm và luồng trên iOS, Android, Desktop | `sharedUI/commonMain`, route trong Compose | `sharedLogic/commonMain` |
| iOS cần bố cục/tương tác riêng, dữ liệu và quy tắc giống các nền tảng khác | `iosApp` bằng SwiftUI hoặc UIKit; mở qua callback | `sharedLogic/commonMain` |
| Chỉ iOS có tính năng đó | `iosApp` bằng SwiftUI hoặc UIKit | iOS, trừ phần có thể tái dùng thực sự |
| Chỉ một phần màn hình cần chung | Composable nhỏ trong `sharedUI`; host iOS có thể bọc vùng UI đó khi thật sự cần | `sharedLogic/commonMain` nếu phù hợp |

Việc một màn hình dùng logic chung không buộc nó dùng Compose. Ngược lại, một composable chung vẫn có thể nhận dữ liệu và callback do host iOS cung cấp. Giữ hợp đồng giữa các bên ở mức dữ liệu và hành động, thay vì truyền đối tượng SwiftUI/UIKit sâu vào `commonMain`.

## Chạy và kiểm tra iOS

Trên macOS, cài Xcode có iOS SDK phù hợp với project, JDK **21** cho Gradle daemon, và Android SDK theo cấu hình Gradle (các project Android vẫn được cấu hình khi chạy build). `IPHONEOS_DEPLOYMENT_TARGET = 18.2` là giá trị **hiện được chọn cho ứng dụng này**, không phải mức tối thiểu bắt buộc của Compose Multiplatform. Cấu hình hiện có chỉ khai báo `iosArm64` và `iosSimulatorArm64`; để build simulator Intel (`x64`) cần bổ sung target và kiểm tra lại tương thích. Mở `app/iosApp/iosApp.xcodeproj` trong Xcode, chọn simulator Apple Silicon hoặc thiết bị iOS, rồi Run.

Gradle daemon hiện yêu cầu JDK 21 từ vendor AZUL theo `gradle/gradle-daemon-jvm.properties`; dùng JDK phù hợp hoặc để Gradle tải toolchain đã cấu hình khi có mạng. Cập nhật `local.properties` với đường dẫn Android SDK trên máy Mac. Để chạy thiết bị thật, điền Apple Development Team trong `app/iosApp/Configuration/Config.xcconfig` và kiểm tra bundle identifier/signing trong Xcode.

Build phase của Xcode gọi:

```sh
/bin/sh ./gradlew :app:sharedUI:embedAndSignAppleFrameworkForXcode
```

`app/iosApp/Configuration/Config.xcconfig` trỏ đến framework do task trên tạo và yêu cầu linker dùng `SharedUI`:

```xcconfig
FRAMEWORK_SEARCH_PATHS = $(inherited) "$(SRCROOT)/../sharedUI/build/xcode-frameworks/$(CONFIGURATION)/$(SDK_NAME)"
OTHER_LDFLAGS = $(inherited) -framework SharedUI
```

Nếu build từ terminal để kiểm tra framework trên simulator Apple Silicon:

```sh
sh ./gradlew :app:sharedUI:linkDebugFrameworkIosSimulatorArm64
sh ./gradlew :app:sharedUI:iosSimulatorArm64Test :app:sharedLogic:iosSimulatorArm64Test
```

Chạy các kiểm tra hồi quy trên những nền tảng đã sửa. Ví dụ:

```sh
sh ./gradlew :app:androidApp:assembleDebug
sh ./gradlew :app:sharedUI:jvmTest :app:sharedLogic:jvmTest
sh ./gradlew :app:desktopApp:compileKotlin
sh ./gradlew :app:webApp:compileKotlinJs :app:webApp:compileKotlinWasmJs
```

Các lệnh trên dùng `sh ./gradlew` vì file `gradlew` hiện không được đánh dấu executable trong Git. Trên Windows, dùng `./gradlew.bat` trong PowerShell cho các task Android/Desktop/Web; iOS cần macOS/Xcode.

Kiểm tra thủ công trên iOS sau khi build: xác nhận Compose hiện ngay khi mở app; mở sheet SwiftUI và UIKit từ hai nút Compose; đóng từng sheet bằng Done và vuốt xuống; xác nhận state trên root Compose vẫn còn; xoay màn hình nếu sản phẩm hỗ trợ; thử bàn phím và vùng safe area; kiểm tra giá trị `Greeting`; rồi chạy lại sau khi sửa Kotlin để xác nhận framework đã được build lại. Đây là danh sách cần thử trên Mac/simulator; build từ Windows không xác nhận hành vi iOS.

Kiểm tra VoiceOver, cỡ chữ lớn và thứ tự focus cho cả hai loại màn hình. Với Android, kiểm tra TalkBack và nút Back; với Desktop/Web, kiểm tra bàn phím, focus và bố cục màn hình lớn. Test Kotlin dùng chung hiện là test mẫu, không thay thế cho kiểm tra cầu nối SwiftUI/Compose hoặc kiểm tra giao diện trên từng nền tảng.

`linkDebugFrameworkIosSimulatorArm64` kiểm tra framework Kotlin, chưa biên dịch các file Swift. Cần build ứng dụng bằng Xcode để kiểm tra cả hai phía. Task `embedAndSignAppleFrameworkForXcode` cần các biến môi trường do Xcode cung cấp; hãy để build phase gọi task này thay vì chạy trực tiếp từ terminal thông thường.

Nếu Swift báo `No such module 'SharedUI'`, kiểm tra build phase Gradle, đường tìm framework trong `Configuration/Config.xcconfig`, scheme và kiến trúc đích. Nếu Swift không thấy một kiểu từ `sharedLogic`, kiểm tra kiểu đó là public và đã được export qua framework. Nếu một hàm Kotlin top-level không hiện với tên mong đợi, xem header/framework được tạo cho target đang build; tên Swift thường mang hậu tố `Kt` theo tên file Kotlin. Nếu build iOS lỗi trên Windows, chuyển bước build và chạy iOS sang macOS/Xcode; Android, Desktop và phần Kotlin chung vẫn có thể được kiểm tra trên Windows.
