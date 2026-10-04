# Nhúng widget SwiftUI vào bên trong Compose trên iOS

Ứng dụng iOS hiện mở `App()` của Compose làm màn hình gốc. Ví dụ này đặt **widget điều chỉnh số lượng viết bằng SwiftUI ngay trong cây Compose**, bên cạnh các nút Compose. Đây là chiều nhúng ngược với việc đặt màn hình Compose vào SwiftUI. [Kiến trúc iOS](ios-ui-development.md) và [công thức màn hình](ios-screen-recipes.md) giải thích các trường hợp màn hình Compose/SwiftUI riêng.

## Kết quả hiện có và nơi sửa

| File | Vai trò |
| --- | --- |
| `app/sharedLogic/src/commonMain/kotlin/com/example/fixvietnam_erp/QuantityWidgetState.kt` | `QuantityWidgetState(sku, quantity, availableStock)` và `adjustRequestedQuantity` giới hạn số lượng trong `0..stock`. |
| `app/sharedUI/src/commonMain/kotlin/com/example/fixvietnam_erp/QuantityWidgetDemo.kt` | State Compose, nút `Compose −/+`, đổi sản phẩm mẫu và ẩn/hiện widget native. |
| `app/sharedUI/src/commonMain/kotlin/com/example/fixvietnam_erp/App.kt` | Gọi `QuantityWidgetDemo` qua slot `quantityWidget` tùy chọn. |
| `app/sharedUI/src/iosMain/kotlin/com/example/fixvietnam_erp/MainViewController.kt` | Dùng `UIKitViewController` để đặt `UIViewController` do iOS cung cấp trong Compose. |
| `app/iosApp/iosApp/ComposeView.swift` | Coordinator tạo/cập nhật/giải phóng controller và giữ callback sheet hiện có. |
| `app/iosApp/iosApp/QuantityWidgetView.swift` | Widget SwiftUI và `ObservableObject` phản ánh state Kotlin. |

Luồng dữ liệu là một chiều:

```text
Compose QuantityWidgetDemo (nguồn state)
  ├─ state/closures → UIKitViewController → UIHostingController → QuantityWidgetView
  └─ SwiftUI nhấn +/− → closure → Compose điều chỉnh bằng adjustRequestedQuantity
                            → state mới → update controller/model → SwiftUI vẽ lại
```

`QuantityWidgetDemo` khởi đầu với `SP-001`, số lượng `1`, tồn `5`. Nút đổi sản phẩm chuyển sang `SP-002`, tồn `3`, và chặn số lượng về giới hạn mới. Các nút `Compose −/+` và SwiftUI `−/+` cùng gọi callback do Compose tạo, nên cùng chịu quy tắc Kotlin. Nút **Ẩn widget nền tảng** đưa `UIKitViewController` ra khỏi composition; nút **Hiện widget nền tảng** tạo controller mới với state Compose hiện tại. Việc ẩn chỉ hủy phần UI native, không đặt lại số lượng trong Compose. Đây là dữ liệu mẫu, chưa kết nối kho hoặc đơn hàng thật.

## Cách bridge hoạt động

`App` có tham số cuối `quantityWidget: QuantityWidgetContent? = null`, trong đó slot nhận `QuantityWidgetState`, hai callback không tham số và `Modifier`. Android và Desktop hiện để slot `null`; Web cung cấp renderer React riêng cho cùng slot. `MainViewController` iOS truyền implementation UIKit/SwiftUI của slot:

```kotlin
UIKitViewController(
    factory = { makeQuantityWidget(state, onDecrease, onIncrease) },
    modifier = modifier,
    update = { controller ->
        updateQuantityWidget(controller, state, onDecrease, onIncrease)
    },
    onRelease = releaseQuantityWidget,
    properties = UIKitInteropProperties(isNativeAccessibilityEnabled = true),
)
```

Đây là API `androidx.compose.ui.viewinterop.UIKitViewController` của Compose UI `1.12.1` đang dùng trong dự án. `factory` tạo controller khi widget được gắn; `update` chạy lần đầu và khi state mà lambda đọc thay đổi; `onRelease` chạy khi controller ra khỏi composition vĩnh viễn. Không giữ controller bên ngoài `factory` để tái sử dụng tùy ý. Slot nhận đúng `Modifier.fillMaxWidth().height(160.dp)` từ `QuantityWidgetDemo`; chiều cao này là ranh giới bố cục Compose, còn SwiftUI tự sắp xếp nội dung bên trong. `UIKitInteropProperties(isNativeAccessibilityEnabled = true)` cho VoiceOver đi vào các control native. Tránh bọc widget bằng một Compose node gộp semantics của nhiều phần con; theo đặc tính UIKit interop, điều đó có thể làm phần native khó được VoiceOver duyệt đúng.

`ComposeView` vẫn là `UIViewControllerRepresentable` của toàn app. Hai callback mở sheet `onOpenNativeSwiftUI` và `onOpenNativeUIKit` vẫn đi qua Coordinator như trước. Ba closure bổ sung cho widget được truyền vào `MainViewControllerKt.MainViewController(...)`:

1. `makeQuantityWidget(state, onDecrease, onIncrease)` tạo `QuantityWidgetModel`, rồi `UIHostingController(rootView: QuantityWidgetView(model: model))`.
2. `updateQuantityWidget(controller, state, onDecrease, onIncrease)` lấy model theo identity của controller, ghi **state và callback mới nhất** vào model. `@Published` báo SwiftUI vẽ lại. Vì callback mới được cập nhật, một nút SwiftUI không gọi closure cũ sau khi Compose recomposition.
3. `releaseQuantityWidget(controller)` bỏ model khỏi Coordinator và thay callback bằng closure rỗng. Khi Coordinator bị hủy, nó cũng giải phóng các callback còn giữ.

SwiftUI chỉ hiển thị `sku`, `quantity`, `availableStock` và disable nút ở biên `0` hoặc `availableStock`. Nó không tự cộng trừ số lượng. `QuantityWidgetState` và `adjustRequestedQuantity` trong Kotlin là nguồn đúng cho cả hai phía. `Int` Kotlin xuất qua framework sang Swift và được đổi thành `Int` để hiển thị; callback `+/-` không chuyển số nguyên qua ranh giới, nên chữ ký interop ngắn và ít rủi ro.

## Thêm một widget iOS khác vào Compose

Ví dụ đội dev cần thẻ SwiftUI **Trạng thái giao hàng** trong một màn hình Compose:

1. **Xác định contract dữ liệu và hành động.** Tạo kiểu dữ liệu nhỏ trong `sharedLogic/commonMain`, chẳng hạn `DeliveryStatusState(orderId: String, status: String)`. Đặt nghiệp vụ chuyển trạng thái ở `sharedLogic`; tránh cho SwiftUI quyết định trạng thái đơn hàng. Nếu trạng thái là enum Kotlin xuất sang Swift, kiểm tra header thực tế; `String`/`Boolean`/`Int` đơn giản hơn ở ranh giới đầu tiên.
2. **Tạo slot composable tùy chọn** trong màn hình Compose cần widget, với state, callback hành động và `Modifier`. Host không cung cấp slot vẫn có một UI Compose hoặc trạng thái fallback rõ ràng. Đặt `Modifier.fillMaxWidth().height(...)` tại nơi gọi slot; widget native phải vừa kích thước này.
3. **Tạo SwiftUI View và model** trong `app/iosApp/iosApp`. View nhận model quan sát được, đọc state và gọi callback được cập nhật khi người dùng tương tác. Dùng label/nút có tên accessible, hỗ trợ Dynamic Type và tương phản màu. Không giữ bản sao nghiệp vụ riêng trong `@State` SwiftUI nếu Compose đã sở hữu nó.
4. **Thêm factory/update/release vào bridge iOS.** `MainViewController` dùng `UIKitViewController` với ba callback đó. Coordinator trong `ComposeView` quản lý controller → model và xóa khi `onRelease`. Cập nhật `update` cả state và closures để tránh dữ liệu/callback cũ. Giữ nguyên callback mở sheet hiện có khi thêm tham số mới.
5. **Kiểm tra vòng đời.** Thay đổi state từ Compose phải hiện trong SwiftUI; thao tác SwiftUI phải cập nhật Compose. Ẩn/hiện widget, chuyển route, quay lại, đổi dữ liệu khi widget đang hiện. Đảm bảo state còn đúng và callback của controller đã release không còn hoạt động.

Không cần một framework Kotlin thứ hai: iOS dùng duy nhất `SharedUI`, đã export API public của `sharedLogic`. Nếu muốn nhiều widget, cân nhắc một registry/host có contract rõ ràng thay vì kéo dài một hàm factory với quá nhiều tham số không liên quan. Nếu widget chỉ dành cho một màn hình SwiftUI và không xuất hiện trong Compose, dùng SwiftUI trực tiếp theo [công thức màn hình](ios-screen-recipes.md).

### Dùng UIKit thuần thay cho SwiftUI

`UIKitViewController` nhận bất kỳ `UIViewController` phù hợp. Đoạn dưới là **phương án thay thế đề xuất, chưa áp dụng vào source**. Nó giữ nguyên `QuantityWidgetState` và ba closure của `MainViewController`, nhưng dùng UIKit thuần thay `UIHostingController`. Tạo `app/iosApp/iosApp/QuantityUIKitViewController.swift`:

```swift
import SharedUI
import UIKit

final class QuantityUIKitViewController: UIViewController {
    private var widgetState: QuantityWidgetState
    private var onDecrease: () -> Void
    private var onIncrease: () -> Void

    private let titleLabel = UILabel()
    private let statusLabel = UILabel()
    private let quantityLabel = UILabel()
    private let decreaseButton = UIButton(type: .system)
    private let increaseButton = UIButton(type: .system)

    init(
        state: QuantityWidgetState,
        onDecrease: @escaping () -> Void,
        onIncrease: @escaping () -> Void
    ) {
        widgetState = state
        self.onDecrease = onDecrease
        self.onIncrease = onIncrease
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("Dùng init(state:onDecrease:onIncrease:)")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .secondarySystemBackground

        titleLabel.text = "Điều chỉnh số lượng bằng UIKit"
        titleLabel.font = .preferredFont(forTextStyle: .headline)
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.numberOfLines = 0
        statusLabel.font = .preferredFont(forTextStyle: .subheadline)
        statusLabel.adjustsFontForContentSizeCategory = true
        statusLabel.numberOfLines = 0
        quantityLabel.font = .preferredFont(forTextStyle: .title2)
        quantityLabel.adjustsFontForContentSizeCategory = true

        decreaseButton.setTitle("−", for: .normal)
        decreaseButton.accessibilityLabel = "Giảm số lượng"
        decreaseButton.addTarget(self, action: #selector(decreaseTapped), for: .touchUpInside)
        increaseButton.setTitle("+", for: .normal)
        increaseButton.accessibilityLabel = "Tăng số lượng"
        increaseButton.addTarget(self, action: #selector(increaseTapped), for: .touchUpInside)
        for button in [decreaseButton, increaseButton] {
            button.titleLabel?.font = .preferredFont(forTextStyle: .title2)
            button.titleLabel?.adjustsFontForContentSizeCategory = true
        }

        let controls = UIStackView(arrangedSubviews: [
            decreaseButton, quantityLabel, increaseButton
        ])
        controls.axis = .horizontal
        controls.alignment = .center
        controls.spacing = 12

        let content = UIStackView(arrangedSubviews: [titleLabel, statusLabel, controls])
        content.axis = .vertical
        content.spacing = 8
        content.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(content)
        NSLayoutConstraint.activate([
            content.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            content.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -12),
            content.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            decreaseButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 44),
            decreaseButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44),
            increaseButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 44),
            increaseButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)
        ])
        render()
    }

    func update(
        state: QuantityWidgetState,
        onDecrease: @escaping () -> Void,
        onIncrease: @escaping () -> Void
    ) {
        widgetState = state
        self.onDecrease = onDecrease
        self.onIncrease = onIncrease
        if isViewLoaded { render() }
    }

    func release() {
        onDecrease = {}
        onIncrease = {}
    }

    private func render() {
        let quantity = Int(widgetState.quantity)
        let stock = Int(widgetState.availableStock)
        statusLabel.text = "Mã: \(widgetState.sku) · Còn: \(stock)"
        quantityLabel.text = "\(quantity)"
        quantityLabel.accessibilityLabel = "Số lượng \(quantity)"
        decreaseButton.isEnabled = quantity > 0
        increaseButton.isEnabled = quantity < stock
    }

    @objc private func decreaseTapped() { onDecrease() }
    @objc private func increaseTapped() { onIncrease() }
}
```

Trong `ComposeView.swift`, **chỉ thay ba method sau của `Coordinator`** bằng các method cùng tên/chữ ký dưới đây. Xóa `widgetModels` dictionary và `deinit` đang giải phóng các model SwiftUI; giữ nguyên `onOpenNativeSwiftUI`, `onOpenNativeUIKit`, `makeCoordinator`, các closure truyền vào `MainViewControllerKt.MainViewController(...)` và `updateUIViewController` của root:

```swift
func makeQuantityWidget(
    state: QuantityWidgetState,
    onDecrease: @escaping () -> Void,
    onIncrease: @escaping () -> Void
) -> UIViewController {
    QuantityUIKitViewController(
        state: state,
        onDecrease: onDecrease,
        onIncrease: onIncrease
    )
}

func updateQuantityWidget(
    controller: UIViewController,
    state: QuantityWidgetState,
    onDecrease: @escaping () -> Void,
    onIncrease: @escaping () -> Void
) {
    (controller as? QuantityUIKitViewController)?.update(
        state: state,
        onDecrease: onDecrease,
        onIncrease: onIncrease
    )
}

func releaseQuantityWidget(controller: UIViewController) {
    (controller as? QuantityUIKitViewController)?.release()
}
```

Khi Compose cập nhật state, `render()` đổi text, trạng thái enabled và nhãn accessibility; các action nút luôn gọi callback mới nhất. `release()` cắt callback giữ state Compose khi widget rời cây. `QuantityWidgetView.swift` có thể giữ trong project nhưng sẽ không được dùng khi Coordinator tạo controller UIKit. Kết quả mong đợi giống widget SwiftUI hiện tại: thao tác UIKit `+/-` cập nhật dòng `State Compose`, nút Compose cập nhật nhãn UIKit, đổi SKU/tồn kho và ẩn/hiện vẫn đúng. Build bằng Xcode trên Mac để xác nhận chữ ký Swift do Kotlin/Native sinh ra và bố cục ở cỡ chữ lớn trước khi áp dụng.

## Kích thước, truy cập và vòng đời

Chiều cao slot hiện là `160.dp`; SwiftUI View dùng padding và để nội dung tự sắp xếp bên trong vùng đó. Trên iPhone nhỏ hoặc cỡ chữ lớn, nội dung có thể cần chiều cao hơn; thử Dynamic Type và VoiceOver, rồi điều chỉnh **cả** chiều cao Compose lẫn bố cục SwiftUI. Đừng đặt khung SwiftUI lớn hơn vùng Compose mà mong layout tự nới. Hai nút SwiftUI có vùng chạm tối thiểu `44 × 44 pt`, nhãn tiếng Việt “Giảm số lượng” và “Tăng số lượng”; giá trị được đọc “Số lượng N”. Kiểm tra thứ tự focus giữa nút Compose và widget native trên thiết bị.

Hiện bridge gọi factory/update/release từ vòng đời Compose iOS và cập nhật `ObservableObject` trong các callback đó. Nếu một phiên bản sau đưa dữ liệu từ coroutine hoặc background thread tới widget, chuyển phần cập nhật UI về main thread/main actor. Tác vụ đăng ký notification, timer hoặc observation trong model phải được hủy ở `release`; hàm này cũng cần làm rỗng callback giữ Compose state. `Coordinator` giữ model theo `ObjectIdentifier(controller)` để cập nhật đúng khi nhiều controller tồn tại; key được xóa ở release. Việc `@Published` phát nhiều lần trong một update nhỏ chỉ ảnh hưởng số lần render; có thể gom state thành một snapshot nếu widget phức tạp hơn.

## Build và kiểm tra

Trên Mac cần Xcode với iOS SDK phù hợp, JDK 21 AZUL theo `gradle/gradle-daemon-jvm.properties` và Android SDK để Gradle cấu hình project. App hiện đặt deployment target iOS 18.2. `SharedUI` là framework tĩnh cho `iosArm64` và `iosSimulatorArm64`; Xcode build phase gọi `/bin/sh ./gradlew :app:sharedUI:embedAndSignAppleFrameworkForXcode`. Mở `app/iosApp/iosApp.xcodeproj`, chọn simulator Apple Silicon hoặc thiết bị arm64, rồi Run. `Config.xcconfig` phải trỏ tới `app/sharedUI/build/xcode-frameworks/$(CONFIGURATION)/$(SDK_NAME)` và liên kết `-framework SharedUI`.

Kiểm tra thủ công trên iOS:

1. Root Compose hiện bình thường, hai sheet mẫu SwiftUI/UIKit vẫn mở và đóng được.
2. Nút `Compose +/−` đổi số trong widget SwiftUI; nút SwiftUI `+/-` đổi dòng `State Compose` ngay lập tức.
3. Số lượng không nhỏ hơn `0` hoặc lớn hơn tồn kho; đổi `SP-001` sang `SP-002` tồn `3` làm số lượng được chặn lại nếu trước đó cao hơn `3`.
4. Ẩn rồi hiện widget native: số lượng còn nguyên, controller được tạo lại và nút vẫn gọi callback mới.
5. Thử safe area, Dynamic Type, VoiceOver và vùng chạm trên simulator/thiết bị thật.

Có thể chạy các task Kotlin iOS trên Mac bằng `sh ./gradlew :app:sharedUI:linkDebugFrameworkIosSimulatorArm64` và `sh ./gradlew :app:sharedUI:iosSimulatorArm64Test :app:sharedLogic:iosSimulatorArm64Test`, nhưng **chúng không biên dịch Swift**. Cần build ứng dụng bằng Xcode để xác nhận chữ ký closure Kotlin/Swift và hành vi `UIHostingController`. Máy hiện tại chạy Windows nên phần iOS chưa được build/kiểm tra runtime ở đây. Nếu Swift báo sai tên hàm hoặc kiểu của `QuantityWidgetState`, xem header được tạo trong `SharedUI.framework` rồi sửa lời gọi Swift theo chữ ký thực tế. Nếu widget không cập nhật, kiểm tra `update` có nhận state Compose mới và Coordinator có map đúng controller. Nếu ẩn/hiện làm mất state, kiểm tra state đang nằm trong `QuantityWidgetDemo`, không phải chỉ trong SwiftUI model.
