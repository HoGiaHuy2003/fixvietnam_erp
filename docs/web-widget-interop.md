# Nhúng widget React trong Compose Web

Repository có **hai cách dùng React trên Web**. `/catalog/` là route Next.js xuất HTML tĩnh để phục vụ nội dung công khai. Widget số lượng ở hướng dẫn này là một **React DOM island nằm bên trong màn Compose** tại `/`: `HtmlElementView` cấp một phần tử DOM trong iframe Compose, React mount vào phần tử đó. Nó chỉ là một vùng UI tương tác trong ERP, không tạo URL hoặc HTML SEO riêng. [Kiến trúc Web](web-ui-development.md) giải thích host/iframe; [công thức thêm màn hình](web-screen-recipes.md) giải thích cách tạo route React riêng.

## Những file đang tham gia

| File | Vai trò |
| --- | --- |
| `app/sharedLogic/src/commonMain/kotlin/com/example/fixvietnam_erp/QuantityWidgetState.kt` | `QuantityWidgetState(sku, quantity, availableStock)` và `adjustRequestedQuantity()` chặn giá trị trong `0..stock`. |
| `app/sharedUI/src/commonMain/kotlin/com/example/fixvietnam_erp/QuantityWidgetDemo.kt` | Màn Compose giữ state, nút Compose ±, đổi sản phẩm, ẩn/hiện widget và slot `QuantityWidgetContent`. |
| `app/sharedUI/src/commonMain/kotlin/com/example/fixvietnam_erp/App.kt` | Gọi demo, nhận slot widget tùy chọn; các callback iOS/catalog khác vẫn độc lập. |
| `app/webApp/src/webMain/kotlin/com/example/fixvietnam_erp/main.kt` | Chỉ truyền `::ReactQuantityWidget` vào `App()` nếu bridge JS phiên bản 1 đã tải. |
| `app/webApp/src/webMain/kotlin/com/example/fixvietnam_erp/ReactQuantityWidget.kt` | `HtmlElementView`: tạo phần tử, gắn event, cập nhật React, tháo event và unmount. |
| `app/webApp/src/jsMain/.../ReactQuantityWidget.js.kt` và `wasmJsMain/.../ReactQuantityWidget.wasmJs.kt` | Hai adapter platform gọi cùng API JS qua `js()` và `@JsFun`. |
| `app/webReact/widget/quantity-widget.js` | Component React và root registry theo từng container. |
| `app/webReact/scripts/build-widget.mjs`, `scripts/web.mjs` | Bundle React/ReactDOM một lần, đưa JS + license vào cả hai Compose engine. |
| `app/webApp/src/webMain/resources/index.html` | Tải `quantity-widget.js` **trước** `webApp.js` bên trong tài liệu iframe. |

## Dòng dữ liệu và vòng đời

`QuantityWidgetDemo` khởi tạo SKU `SP-001`, số lượng 1, tồn 5. Nút Compose ± và nút React ± cùng gọi callback của màn Compose; callback gọi `adjustRequestedQuantity()` ở `sharedLogic`. React nhận `sku`, `quantity`, `availableStock` và chỉ hiển thị, bật/tắt nút ở biên. React không cập nhật số lượng bằng state riêng, nên màn Compose và widget không lệch nhau sau một lần bấm. Nút “Đổi sản phẩm mẫu” chuyển sang `SP-002` với tồn 3; giá trị được Kotlin điều chỉnh về giới hạn mới.

Widget phát hai DOM event từ container: `fixvietnam:quantity-decrease` và `fixvietnam:quantity-increase`. Kotlin lắng nghe event bằng callback được cập nhật qua `rememberUpdatedState`. Dữ liệu đi vào React là ba trường đơn giản; không truyền trực tiếp đối tượng state Kotlin, Compose `Modifier`, hay React element qua ranh giới. Với widget phức tạp hơn, định nghĩa hợp đồng DTO/event có phiên bản rõ ràng và kiểm tra dữ liệu ở đầu vào.

`HtmlElementView` từ Compose UI 1.12.1 là API experimental. Trong `factory`, adapter tạo `HTMLElement` và gắn listener. Trong `update`, Kotlin gọi global JS:

```js
window.FixVietnamQuantityWidget.update(container, sku, quantity, availableStock)
```

`quantity-widget.js` giữ `WeakMap<HTMLElement, Root>` và `createRoot(container)` đúng một lần cho mỗi container; các lần `update` tiếp theo dùng `root.render`. Khi `onRelease` chạy vì widget bị ẩn hoặc màn hình rời cây Compose, adapter gỡ listener Kotlin và gọi `root.unmount()`; JS xóa entry registry. `onReset` không dùng nên Compose tạo container mới nếu node được tái sử dụng. Kiểm tra ẩn/hiện nhằm phát hiện root/lắng nghe event còn sót và callback bị nhân đôi.

`HtmlElementView` đặt phần tử HTML phủ lên vùng canvas theo `Modifier.fillMaxWidth().height(160.dp)` mà demo truyền vào. Vùng HTML tự nhận chuột và bàn phím; sự kiện trong vùng đó không đi vào cây pointer input của Compose. Đây là DOM thật: button có tên tiếng Việt, trạng thái `disabled`, output có `aria-live`. Kiểm tra focus qua ranh giới Compose canvas ↔ DOM và trình đọc màn hình; semantics Compose không tự áp lên nội dung React.

## Tại sao phải bundle trong iframe

`app/webReact` là host Next, nhưng `<iframe src="/compose/wasm/index.html">` hoặc `/compose/js/index.html` là **document riêng**. Một React component/chunk chỉ được Next tải ở parent không thể tự mount vào phần tử bên trong iframe. `quantity-widget.js` của cả hai engine phải có trong `app/webReact/public/compose/<engine>/` và được `<script>` của chính `index.html` Compose tải trước `webApp.js`.

Để tránh thêm toolchain mới, `build-widget.mjs` dùng Webpack 5 mà Kotlin/JS Gradle đã cài tại `build/js/node_modules/webpack`. Nguồn widget dùng `React.createElement` và style inline, nên không cần JSX loader hoặc stylesheet bên ngoài. Bundle gồm React và ReactDOM độc lập với bundle Next parent; Webpack tạo `quantity-widget.js` và `quantity-widget.js.LICENSE.txt`, root script chép cả hai sang bản JS và Wasm. Vì style nằm trong React element, `root.unmount()` dọn cùng DOM widget; không còn style tag/subscription toàn cục cần tháo.

`app/webApp/src/webMain/resources/quantity-widget.js` là placeholder rỗng của bản Compose chạy **độc lập qua Gradle**. Nó cho `index.html` tải được script mà không có React; `isReactQuantityWidgetAvailable()` trả false, `App()` dùng giao diện Compose fallback. Root `web:install` hoặc `web:build` ghi đè placeholder **trong bản được chép**, không sửa resource nguồn. `window.FixVietnamQuantityWidget.version === 1` là dấu hiệu bridge đã sẵn sàng; các hàm của API là `mount`, `update`, `unmount`. Nếu đổi chữ ký API, tăng `version` và cập nhật cả hai adapter trước khi build.

## Chạy trên cả JS và Wasm

Tại root repository, lần đầu cần cài host sau khi Gradle tạo Kotlin/JS package và Compose distributions:

```powershell
npm run web:install
npm run web:dev
```

`web:install` chạy Gradle, chép Compose output, cài npm của `app/webReact` rồi bundle widget. `web:dev` chạy lại Gradle/copy/bundle, sau đó khởi động Next ở `127.0.0.1:3000`. Trình duyệt vào `/` để dùng Wasm, hoặc `/?engine=js` để dùng JS. Sau khi thay mã Kotlin, React widget hoặc script tài nguyên, khởi động lại `web:dev` để các file trong `public/compose` được làm mới.

Kiểm tra bản xuất tĩnh:

```powershell
npm run web:build
npm run web:check
npm run web:preview
```

`web:build` xuất site ở `app/webReact/out/`; `web:check` xác nhận cả `out/compose/js` và `out/compose/wasm` có `quantity-widget.js`, license, `webApp.js`, `.wasm` cần thiết và `index.html` nạp widget. Nếu `web:dev` đang chiếm cổng 3000, dừng nó trước `web:preview` hoặc đặt `WEB_PREVIEW_PORT` khác. `web:prepare` tạo Gradle/copy asset và bundle widget khi dependency host đã có; nếu dependency host chưa cài, placeholder vẫn được giữ và Compose vẫn chạy. Để tự bundle widget sau khi đã chuẩn bị/cài dependency, có thể chạy `npm run build:widget --prefix app/webReact`, nhưng lệnh này chỉ ghi file cho bản JS; quy trình root là lệnh chuẩn để chép sang cả JS/Wasm.

Chạy Compose độc lập để xem fallback:

```powershell
./gradlew.bat :app:webApp:wasmJsBrowserDevelopmentRun
# Hoặc: ./gradlew.bat :app:webApp:jsBrowserDevelopmentRun
```

Khi chạy độc lập, màn demo vẫn có nút Compose ± và dòng báo host chưa cung cấp widget nền tảng. Không cần script React trong Next parent cho chế độ này.

## Kiểm tra tương tác

1. Ở `/` và `/?engine=js`, tìm “Widget số lượng đặt hàng”. Bấm React `+`/`−`: giá trị “State Compose” và số trong React phải thay đổi cùng nhau, luôn trong `0..stock`. Ở biên, nút React tương ứng bị vô hiệu hóa. Bấm nút Compose ± cũng phải làm React cập nhật.
2. Bấm “Đổi sản phẩm mẫu”: SKU React đổi sang `SP-002`, tồn 3 và số lượng không vượt 3. Đổi lại `SP-001` để thấy state tiếp tục do Kotlin quản lý.
3. Bấm “Ẩn widget nền tảng”, rồi “Hiện widget nền tảng” vài lần. Mỗi lần chỉ có một vùng React; một cú bấm React tăng hoặc giảm đúng **một** đơn vị. Trong DevTools không có lỗi `createRoot` lặp trên cùng container hoặc cập nhật root đã unmount.
4. Dùng Tab/Shift+Tab vào hai nút React; kiểm tra tên accessible, focus nhìn thấy, output được thông báo hợp lý. Thử NVDA/VoiceOver khi có môi trường. Trên màn hình hẹp, vùng 160dp phải đủ chỗ cho chữ/nút; điều chỉnh kích thước Compose và CSS inline cùng nhau nếu thiết kế thay đổi.
5. Đi `/` → `/catalog/` → `/` qua navigation trong host. Iframe được giữ sau lần mount, nên state widget Compose còn trong phiên đó. Refresh, tab mới hoặc vào trực tiếp catalog rồi quay về sẽ tạo state mới. `/catalog/` vẫn có HTML tĩnh riêng; widget trong iframe không bổ sung SEO cho route đó.

Nếu không thấy widget ở host, kiểm tra thứ tự script trong `/compose/<engine>/index.html`, kích thước `quantity-widget.js` (placeholder rất nhỏ, bundle React lớn hơn), `window.FixVietnamQuantityWidget?.version` trong **console của iframe**, và các asset được phục vụ cùng origin. Nếu một engine hoạt động và engine kia không, xác nhận cả hai thư mục nhận cùng bundle và xem console của chính iframe tương ứng. Nếu HTML của catalog mất nội dung khi tắt JavaScript, đó là lỗi route Next/SSG riêng, không liên quan widget.

Mẫu hiện tại đã được kiểm tra trên Windows ngày 04/10/2026: production build Kotlin JS/Wasm và Next.js, bốn kiểm tra artifact/API, test JVM cho giới hạn số lượng, build Android; trên trình duyệt đã kiểm tra cập nhật hai chiều và ẩn/hiện widget ở cả hai engine. Bản Wasm còn được kiểm tra đổi SKU/tồn kho, chặn số lượng, điều hướng Compose → catalog → Compose giữ state và Tab giữa các nút React. Đây chưa phải kiểm định accessibility bằng NVDA/VoiceOver; đội dev cần chạy các kiểm tra đó trước khi phát hành tính năng thật.

## Tạo một widget khác từ mẫu này

Nếu chỉ muốn **đổi giao diện** widget số lượng nhưng giữ nguyên `sku/quantity/availableStock` và hai hành động tăng/giảm, không cần sửa Kotlin. Ví dụ sau là file **đề xuất, chưa được thêm vào source**: tạo `app/webReact/widget/compact-quantity-view.js` với toàn bộ nội dung:

```js
import React from 'react';

export function CompactQuantityView({ container, sku, quantity, availableStock }) {
  const send = (type) => container.dispatchEvent(new Event(type));
  const button = (label, disabled, eventType) => React.createElement('button', {
    type: 'button',
    disabled,
    'aria-label': `${label} ${sku}`,
    onClick: () => send(eventType),
    style: {
      minWidth: 44, minHeight: 44, border: '1px solid #075a9e',
      borderRadius: 6, background: '#fff', color: '#075a9e',
      font: '700 1.25rem system-ui, sans-serif',
    },
  }, label === 'Giảm số lượng' ? '−' : '+');

  return React.createElement('section', {
    'aria-label': `Số lượng đặt hàng cho ${sku}`,
    style: {
      boxSizing: 'border-box', height: '100%', padding: 12,
      border: '1px solid #9eb5c6', borderRadius: 8,
      font: '1rem/1.4 system-ui, sans-serif',
    },
  },
    React.createElement('strong', null, sku),
    React.createElement('div', { style: { display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 } },
      button('Giảm số lượng', quantity <= 0, 'fixvietnam:quantity-decrease'),
      React.createElement('output', { 'aria-live': 'polite' }, String(quantity)),
      button('Tăng số lượng', quantity >= availableStock, 'fixvietnam:quantity-increase'),
    ),
    React.createElement('small', null, `Tối đa ${availableStock}`),
  );
}
```

Trong `app/webReact/widget/quantity-widget.js`, thêm `import { CompactQuantityView } from './compact-quantity-view.js';` cạnh hai import đầu file, rồi **chỉ thay lời gọi render** trong `update`:

```js
function update(container, sku, quantity, availableStock) {
  mount(container).render(React.createElement(CompactQuantityView, {
    container, sku, quantity, availableStock,
  }));
}
```

Giữ `WeakMap`, `mount`, `unmount`, global `window.FixVietnamQuantityWidget.version = 1` và tên hai DOM event như cũ. Có thể xóa hàm trình bày `QuantityWidget`/`buttonStyle` cũ nếu không còn dùng. Chạy `npm run web:build`, `npm run web:check`, rồi thử cả JS/Wasm và ẩn/hiện. Đây là thay giao diện React của **cùng hợp đồng**, nên bridge Kotlin và `QuantityWidgetState` không đổi. Nếu đổi tên event hoặc props, phải cập nhật hợp đồng và adapter như các bước tổng quát dưới đây.

1. Đặt state/quy tắc dùng chung trong Kotlin `sharedLogic`, để Compose sở hữu cập nhật và ranh giới giá trị.
2. Thêm slot composable tùy chọn trong `sharedUI` nếu widget chỉ có ở Web; giữ fallback Compose cho Android/iOS/Desktop và standalone Web. Nếu iOS cũng cần widget tương tự, tạo adapter native riêng cho cùng slot/state.
3. Tạo component React nhỏ trong `app/webReact/widget/`, mount vào container do `HtmlElementView` tạo. Định nghĩa props đơn giản và DOM event có tên, tránh truyền state UI hoặc instance React qua Kotlin.
4. Thêm entry bundle/asset vào quy trình `scripts/web.mjs` cho cả JS và Wasm. Tải bundle bên trong `app/webApp` iframe trước `webApp.js`, thêm kiểm tra availability/version và fallback khi bundle chưa có.
5. Gắn callback bằng listener có thể tháo; `update` phải thay props, `onRelease` phải gỡ listener/unmount. Thử đổi props, ẩn/hiện, đổi route, cả hai engine và truy cập bàn phím/screen reader.

Đối với trang công khai cần SEO hoặc metadata riêng, tạo route Next như `/catalog/` thay vì nhét cả trang vào `HtmlElementView`. React DOM island chủ yếu giúp dùng widget Web có sẵn trong workflow Compose; nó không thay thế SSG/SSR.
