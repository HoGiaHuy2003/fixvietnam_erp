# Phát triển Web với Compose và React

Để thêm màn hình theo từng bước với ví dụ mã đầy đủ, xem [sổ tay triển khai màn hình Web](web-screen-recipes.md). Tài liệu hiện tại giải thích kiến trúc, routing và quá trình build.

Để nhúng **widget React bên trong màn hình Compose**, xem [hướng dẫn widget Web](web-widget-interop.md). Mẫu số lượng đặt hàng đã được tích hợp cho cả JS và Wasm; đây là luồng khác với mở route React riêng.

Ứng dụng Web có hai vùng giao diện. **Compose Multiplatform** là màn hình mặc định ở `/`; host Next.js đặt ứng dụng Compose trong một `iframe` cùng origin. **React/Next.js** dành cho những trang cần HTML có sẵn để công cụ tìm kiếm đọc, ví dụ `/catalog/`. Mẫu hiện tại dùng Next.js App Router và xuất trang tĩnh (SSG); không thay thế ứng dụng Compose Web JS/Wasm trong `app/webApp`.

## Bản đồ và trách nhiệm

| Vị trí | Vai trò |
| --- | --- |
| `app/webReact` | Host Next.js, shell điều hướng, route React, metadata và HTML xuất tĩnh. |
| `app/webReact/app/layout.tsx` và `hybrid-web-shell.tsx` | Shell chung; route `/` hiển thị iframe Compose. |
| `app/webReact/app/page.tsx` | Route `/` và metadata `noindex` của trang làm việc. |
| `app/webReact/app/catalog/page.tsx` | Ví dụ trang catalog React được prerender tại `/catalog/`. |
| `app/webReact/public/compose` | Tài nguyên Compose JS/Wasm được chuẩn bị từ Gradle để host phục vụ cùng origin. |
| `app/webApp` | Entry point và bản phân phối Compose Web JS/Wasm hiện có. |
| `app/sharedUI/src/commonMain` | Giao diện Compose dùng chung trên các nền tảng. |
| `app/sharedLogic/src/commonMain` | Quy tắc nghiệp vụ thuần Kotlin dùng chung. |
| `app/sharedLogic/src/jsMain` | API Kotlin/JS export cho React khi thực sự cần dùng logic chung. |

Nguồn của mỗi route phải rõ ràng. Một màn hình Compose dùng chung được thêm vào cây điều hướng Compose; một trang cần SEO được đăng ký thành route trong `app/webReact/app`. Tạo file composable hoặc component riêng lẻ chưa tự làm nó xuất hiện trong điều hướng. Android, iOS và Desktop tiếp tục dùng Compose chung; route React chỉ tồn tại trên Web.

## Luồng chạy và điều hướng

Khi vào `/`, host tải Compose trong iframe cùng origin. Bản Wasm là mặc định; thêm `?engine=js` vào URL host để dùng bản JS tương thích. Khi vào trực tiếp `/catalog/`, Next.js phục vụ HTML đã prerender của catalog và **không cần tải bundle Compose**. Các đường dẫn trong nội bộ host dùng `next/link` và router của Next.js.

Engine được chọn khi iframe khởi tạo. Muốn đổi engine trong phiên đang chạy, tải lại URL mới bằng liên kết thông thường như nút “Thử chế độ tương thích”; thay riêng query bằng `router.push` không khởi tạo lại iframe đã được giữ trong shell.

Sau khi người dùng đã vào `/`, shell giữ iframe Compose được mount nhưng ẩn khi chuyển sang `/catalog/` bằng điều hướng nội bộ. Quay về `/` sẽ hiện lại cùng iframe nên state đang nằm trong bộ nhớ Compose còn được giữ. Đây chỉ là state trong phiên trang hiện tại: tải lại trang, mở tab mới, hoặc vào thẳng `/catalog/` rồi chuyển sang `/` tạo lại iframe và state. Dữ liệu cần tồn tại qua các trường hợp đó phải được lưu bằng cơ chế rõ ràng (ví dụ URL, local storage phù hợp hoặc backend), không dựa vào việc ẩn iframe.

Dùng cùng một hàm Kotlin trong Compose và React **không đồng nghĩa chia sẻ state trong bộ nhớ**: iframe JS/Wasm và trang React có runtime riêng. Muốn đồng bộ lựa chọn, giỏ hàng hoặc phiên đăng nhập giữa hai vùng UI, thiết kế hợp đồng dữ liệu rõ ràng qua URL, `postMessage` có kiểm tra nguồn, hoặc backend/storage phù hợp. Quy tắc nghiệp vụ chung giúp hai bên tính toán giống nhau; nó không tự đồng bộ dữ liệu đang thay đổi.

Từ Compose, nút mở catalog gọi callback tùy chọn `onOpenWebCatalog` của `App()`. Entry point Web JS/Wasm gửi `window.parent.postMessage` với thông điệp:

```json
{"type":"fixvietnam:open-react-page","path":"/catalog/"}
```

Host chỉ xử lý thông điệp khi `origin` đúng origin của host, `source` là iframe Compose đang dùng và `path` nằm trong danh sách route cho phép; sau đó gọi `router.push('/catalog/')`. Giữ danh sách path tường minh thay vì nhận URL bất kỳ từ iframe. Khi Compose chạy độc lập bằng Gradle, `isHybridWebHost()` trả về false và không cung cấp callback mở catalog; nút catalog chỉ hiện khi chạy trong host. Callback Web là phần nối nền tảng: code Compose trong `commonMain` chỉ biểu đạt hành động mở catalog, còn `webMain` khai báo hợp đồng và `jsMain`/`wasmJsMain` thực hiện `postMessage`.

### Chọn nơi viết một màn hình

| Nhu cầu | Giao diện | Điều hướng |
| --- | --- | --- |
| Màn hình sản phẩm chung cho Android, iOS, Desktop và Web | Compose trong `sharedUI/commonMain` | Cây Compose; host Web giữ một iframe gốc. |
| Trang Web công khai cần xuất HTML để lập chỉ mục | React trong `app/webReact/app` | Next.js App Router, route riêng có URL. |
| Trang Web chỉ dành cho người dùng đã đăng nhập | Chọn Compose hoặc React theo trải nghiệm và yêu cầu tải trang | Cần xác thực thực sự; `noindex` chỉ là chỉ dẫn cho crawler. |
| Cùng một quy tắc nghiệp vụ cho React và các nền tảng khác | Kotlin thuần trong `sharedLogic/commonMain` | React dùng API JS được export; UI vẫn theo nền tảng. |

### Thêm một màn hình Compose thông thường

1. Tạo composable, ví dụ `OrdersScreen`, trong `app/sharedUI/src/commonMain`. Đặt logic có thể dùng chung ở `app/sharedLogic/src/commonMain`; gọi từ composable hoặc state holder theo vòng đời màn hình.
2. Đăng ký `OrdersScreen` trong điều hướng Compose gốc ở `App()`. Mẫu hiện tại chưa có thư viện navigation: có thể bắt đầu bằng state route rõ ràng, rồi dùng cùng navigation graph khi dự án bổ sung thư viện điều hướng. Chỉ tạo file `OrdersScreen.kt` chưa làm màn hình xuất hiện.
3. Cho Android/iOS/Desktop và `app/webApp` đi qua route Compose mới. Host Next.js vẫn giữ **một** iframe ở `/`; không cần thêm `app/webReact/app/orders/page.tsx` hoặc Swift wrapper cho từng màn hình Compose.
4. Nếu route Compose cần mở một trang React, thêm một hành động ở `App`, nối qua entry point `app/webApp` để gửi `postMessage` với path cụ thể, rồi thêm path đó vào `REACT_ROUTES` trong `app/webReact/app/hybrid-web-shell.tsx`. Ví dụ hiện tại là `onOpenWebCatalog` → `/catalog/`. Chỉ thêm path thuộc host; không nhận URL tùy ý từ Compose.

### Thêm một trang React cần SEO hoặc giao diện Web riêng

1. Tạo `app/webReact/app/<route>/page.tsx`, ví dụ `app/webReact/app/offers/page.tsx` cho `/offers/`. Trang khai báo `metadata` gồm title, description và canonical lấy từ `SITE_URL` khi có origin sản xuất. `next.config.ts` hiện đặt `trailingSlash: true`, nên route xuất ra `out/offers/index.html`.
2. Đưa nội dung chính, heading và dữ liệu công khai cần lập chỉ mục vào HTML được prerender. Dùng cấu trúc semantic (`h1`, `section`, bảng với `caption`/`th` nếu có bảng), label cho form, trạng thái focus rõ ràng. Xem `app/webReact/app/catalog/page.tsx` và `search.tsx` làm mẫu. Thêm `Link` của Next.js ở shell hoặc trang liên quan để người dùng và crawler tìm được route.
3. Nếu Compose cần mở route này, thêm callback hành động ở Compose/Web bridge, thêm `'/offers/'` vào `REACT_ROUTES`, rồi xử lý route bằng `router.push`. Nếu route chỉ được đi tới từ liên kết React, không cần sửa bridge Compose.
4. Chạy `npm run web:build`, `npm run web:check` và xem `out/offers/index.html` để xác nhận nội dung/metadata có trong HTML. Mở trực tiếp `/offers/` trên preview và thử bàn phím/trình đọc màn hình khi có môi trường.

`"use client"` **không tự làm mất prerender**: Client Component như `catalog/search.tsx` vẫn có thể xuất nội dung ban đầu vào HTML ở lúc build. SEO suy giảm khi nội dung chính chỉ được fetch/render sau khi component mount trong trình duyệt, ví dụ chỉ điền danh sách trong `useEffect`. Dùng SSG cho dữ liệu công khai ổn định; nếu cần dữ liệu cập nhật ở mỗi request, phải chọn kiến trúc SSR và máy chủ phù hợp.

SEO không đến từ việc dùng React đơn thuần. Trang cần nội dung và metadata có sẵn trong HTML trả về từ SSG hoặc SSR, URL ổn định và nội dung mà crawler được phép truy cập. Mẫu `/catalog/` hiện dùng dữ liệu công khai tĩnh. Với dữ liệu thay đổi thường xuyên, cần thiết kế nguồn dữ liệu/backend và chính sách cập nhật bản build; với nội dung theo người dùng hoặc yêu cầu đăng nhập, quyết định SSR/dữ liệu động và xác thực trước khi công bố. Đừng đặt dữ liệu riêng tư vào HTML xuất tĩnh. Đường dẫn nội bộ của ứng dụng có thể dùng `noindex` khi phù hợp, nhưng `noindex` không thay thế kiểm soát truy cập.

`SITE_URL` là origin sản xuất tùy chọn khi build metadata/canonical. Đặt nó thành URL thật lúc phát hành; đừng xuất canonical trỏ tới `localhost` vào bản production. Với trang SEO mới, khai báo title, description và canonical phù hợp, dùng thẻ HTML có nghĩa (`main`, heading theo cấp, list/link/button đúng vai trò), và đảm bảo nội dung chính hiện trong HTML xuất ra, không chỉ sau khi JavaScript chạy.

## Dùng logic Kotlin chung trong React

React dùng bản JS của `sharedLogic` dưới dạng npm package do Gradle `productionLibrary` tạo ra; package được khai báo bằng alias `shared-logic` trong host. Ví dụ API được export là `@JsExport class WebCatalogSearch` với hàm `matches(sku, name, query)`. Bên trong lớp này, quy tắc tìm kiếm thuần `matchesCatalogQuery` nằm ở `sharedLogic/commonMain`, nên cùng hành vi có thể được dùng trên Android, iOS, Desktop và Web.

Chỉ export hợp đồng nhỏ, ổn định và có kiểu dễ dùng ở ranh giới JS, như `String`, `Boolean` hoặc DTO đơn giản. Tránh đưa đối tượng UI, platform API, coroutine `Flow` hoặc kiểu Kotlin phức tạp trực tiếp vào React. Nếu cần dữ liệu bất đồng bộ, tạo adapter rõ ràng ở JS và quy định hủy subscription/vòng đời. `Greeting` hiện dùng thông tin nền tảng, nên không dùng nó trong quá trình prerender/SSR của Next.js; trang catalog dùng quy tắc Kotlin thuần không phụ thuộc `window` hay `navigator`.

Khi sửa quy tắc tìm kiếm, sửa `matchesCatalogQuery` trong `commonMain` rồi cập nhật bridge `jsMain` nếu hợp đồng Web thay đổi. Chạy lại bước chuẩn bị Web để tạo npm package mới. Không chép riêng cùng một quy tắc sang TypeScript vì hai bản có thể lệch kết quả.

## Chạy và build

Ở thư mục gốc repository, dùng Node.js/npm được phiên bản Next.js trong `app/webReact/package.json` hỗ trợ, JDK 21 cho Gradle và Android SDK vì Gradle cấu hình các module Android khi build. Trên Windows, dùng các lệnh npm sau; script root tự gọi Gradle wrapper của nền tảng:

```sh
npm run web:install
npm run web:dev
```

`web:install` chuẩn bị thư viện Kotlin/JS, bản phân phối Compose JS và Wasm, copy vào `app/webReact/public/compose`, rồi cài dependency npm của host. `web:dev` chuẩn bị lại các artifact đó và chạy Next.js dev server. Sau khi sửa Kotlin hoặc Compose, chạy lại bước chuẩn bị hoặc khởi động lại dev server để thấy bundle mới. `web:prepare` chỉ chuẩn bị artifact; `web:build` chuẩn bị artifact rồi chạy build Next.js và xuất trang tĩnh. `web:preview` phục vụ thư mục `out` trên `127.0.0.1:3000` để kiểm tra bản build:

```sh
npm run web:prepare
npm run web:build
npm run web:preview
```

Các script chuẩn bị artifact (`web:prepare`, `web:install`, `web:build`, `web:dev`) nhận tùy chọn `--gradle-user-home` nếu cần dùng cache Gradle riêng, ví dụ `npm run web:build -- --gradle-user-home /path/to/gradle-cache`. Có thể thêm `--offline` khi cache Gradle đã đầy đủ. Script gọi Java với `gradle-wrapper.jar` trên cả Windows, macOS và Linux nên không phụ thuộc quyền executable của `gradlew`. Không sửa trực tiếp file trong `public/compose`: chúng là output được chép từ Gradle.

Giữ các lockfile trong Git: `kotlin-js-store/yarn.lock` cho JS, `kotlin-js-store/wasm/yarn.lock` cho Wasm và `app/webReact/package-lock.json` cho host React. Kotlin Gradle Plugin hiện tự dùng vị trí lockfile JS/Wasm tương ứng; repository không đặt thêm override ở root Gradle. Sau khi đổi dependency, kiểm tra và commit thay đổi lockfile do công cụ tạo ra.

Khi build bản phát hành trên Windows PowerShell, đặt origin thật để canonical của các trang SEO trỏ đúng môi trường:

```powershell
$env:SITE_URL = "https://erp.example.com"
npm run web:build
npm run web:check
```

`https://erp.example.com` là địa chỉ minh họa; thay bằng domain sản xuất của dự án. Nếu chưa có domain, bỏ `SITE_URL` để không phát hành canonical trỏ tới localhost.

## Triển khai bản xuất tĩnh

Đưa **toàn bộ** `app/webReact/out/` lên static host, gồm `index.html`, `catalog/index.html`, `_next/` và `compose/` cho cả JS/Wasm. Cấu hình host phục vụ `/catalog/` bằng `/catalog/index.html` (và tương tự cho các route mới); file `out/catalog/index.html` phải truy cập được khi nhập URL trực tiếp hoặc refresh. Giữ mọi asset Compose ở cùng origin với host vì bridge `postMessage` kiểm tra origin và source của iframe. Máy chủ cần trả `.wasm` với `Content-Type: application/wasm`; preview `scripts/preview-web.mjs` đã cấu hình MIME này. Kiểm tra cả URL `/compose/wasm/index.html` và `/compose/js/index.html` sau khi triển khai.

`output: "export"` trong `app/webReact/next.config.ts` tạo site tĩnh, không xử lý SSR theo từng request. Nếu sau này cần SSR/dữ liệu riêng từng người dùng, bỏ chế độ `output: "export"`, chuyển sang host chạy Next.js server và thiết kế lại cache, xác thực cùng quá trình lấy dữ liệu. Không thể chỉ thêm server component động rồi tiếp tục phát `out/` như trước.

Sau khi build, chạy `npm run web:check` để xác nhận nội dung catalog tồn tại ngoài thẻ script trong HTML xuất tĩnh, workspace có metadata riêng, cả hai engine có tài nguyên runtime và API Kotlin có thể chạy trong Node không có DOM. Những kiểm tra này bổ sung cho kiểm tra trên trình duyệt, không thay thế kiểm tra trình đọc màn hình.

Kiểm tra `/` với bản Wasm, `/?engine=js`, `/catalog/` vào thẳng từ tab mới, và đường đi Compose → catalog → Compose. Thử refresh ở từng route để hiểu giới hạn state. Mở HTML build của `/catalog/` hoặc tắt JavaScript để xác nhận nội dung catalog, heading và metadata đã được xuất trước khi hydrate. Kiểm tra bàn phím, focus, tên accessible, liên kết và layout responsive; thử với NVDA hoặc VoiceOver khi có môi trường. Các bước này là kiểm tra thủ công cần thực hiện, chưa phải chứng nhận mức tuân thủ accessibility.

Chạy các kiểm tra Kotlin/Web liên quan khi thay đổi logic hoặc bridge:

```sh
# Windows PowerShell
./gradlew.bat :app:sharedLogic:jsTest :app:sharedLogic:wasmJsTest
./gradlew.bat :app:webApp:compileKotlinJs :app:webApp:compileKotlinWasmJs
```

Các test trên không thay thế việc build host React và kiểm tra HTML SEO. Nếu chỉ thay đổi giao diện React, chạy build/lint/test tương ứng trong `app/webReact` theo scripts hiện có. Khi lỗi package `shared-logic` hoặc asset Compose không tìm thấy, chạy lại `web:prepare` và kiểm tra các đường dẫn output thực tế trước khi sửa import. Khi trang `/catalog/` chỉ có nội dung sau hydration, kiểm tra có lấy dữ liệu chính trong `useEffect` hoặc phụ thuộc API browser (`window`, `navigator`) trong lúc prerender hay không.
