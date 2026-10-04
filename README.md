This is a Kotlin Multiplatform project targeting Android, iOS, Web, Desktop (JVM), Server.

* [/app/iosApp](./app/iosApp/iosApp) contains the iOS entry point. It starts in the shared Compose UI.
  Compose can request native SwiftUI or UIKit screens, which the iOS host presents as sheets.
  All three use the `SharedUI` framework, which also exports the public API of `sharedLogic`.
  See the [iOS UI development guide (Vietnamese)](docs/ios-ui-development.md) for setup and screen recipes.
  Follow the [iOS screen implementation playbook (Vietnamese)](docs/ios-screen-recipes.md)
  for complete examples of shared Compose screens, SwiftUI/UIKit screens, callbacks and native features.
  The [iOS widget interop guide (Vietnamese)](docs/ios-widget-interop.md) explains the working
  SwiftUI quantity widget embedded inside Compose, and how to add SwiftUI/UIKit widgets.

* [/app/sharedLogic](./app/sharedLogic/src) is for the code that will be shared between app targets in the project.
  The most important subfolder is [commonMain](./app/sharedLogic/src/commonMain/kotlin). If preferred, you
  can add code to the platform-specific folders here too.

* [/app/sharedUI](./app/sharedUI/src) is for code that will be shared across your Compose Multiplatform applications.
  It contains several subfolders:
  - [commonMain](./app/sharedUI/src/commonMain/kotlin) is for code that’s common for all targets.
  - Other folders are for Kotlin code that will be compiled for only the platform indicated in the folder name.
    For example, if you want to use Apple’s CoreCrypto for the iOS part of your Kotlin app,
    the [iosMain](./app/sharedUI/src/iosMain/kotlin) folder would be the right place for such calls.
    Similarly, if you want to edit the Desktop (JVM) specific part, the [jvmMain](./app/sharedUI/src/jvmMain/kotlin)
    folder is the appropriate location.

* [/core](./core/src) is for the code that will be shared between all targets in the project.
  The most important subfolder is [commonMain](./core/src/commonMain/kotlin). If preferred, you
  can add code to the platform-specific folders here too.

* [/app/webApp](./app/webApp) contains the shared Compose Web application (JS and Wasm).
* [/app/webReact](./app/webReact) hosts Compose at `/` and prerenders React pages such as `/catalog/`.
  React uses the Kotlin/JS API exported from `sharedLogic`. See the
  [Web UI development guide (Vietnamese)](docs/web-ui-development.md) for routing, SEO and accessibility.
  Follow the [Web screen implementation playbook (Vietnamese)](docs/web-screen-recipes.md)
  for step-by-step Compose/React examples and the optional React/Vite approach.
  The [Web widget interop guide (Vietnamese)](docs/web-widget-interop.md) explains the working
  React quantity widget embedded inside Compose for both JS and Wasm, including its separate bundle.

* [/server](./server/src/main/kotlin) is for the Ktor server application.

### Running the apps

Use the run configurations provided by the run widget in your IDE's toolbar. You can also use these commands and options:

- Android app: `./gradlew :app:androidApp:assembleDebug`
- Desktop app:
  - Hot reload: `./gradlew :app:desktopApp:hotRun --auto`
  - Standard run: `./gradlew :app:desktopApp:run`
- Server: `./gradlew :server:run`
- Hybrid Web app (Node.js 20.9+ or a supported newer version, JDK 21 and Android SDK):
  - First install: `npm run web:install`
  - Development: `npm run web:dev`
  - Production build and local preview: `npm run web:build`, then `npm run web:preview`
  - Compose is shown at `/`; the React catalog is at `/catalog/`. Use `/?engine=js` for compatibility mode.
- Compose Web only:
  - Wasm target (faster, modern browsers): `./gradlew :app:webApp:wasmJsBrowserDevelopmentRun`
  - JS target (slower, supports older browsers): `./gradlew :app:webApp:jsBrowserDevelopmentRun`
- iOS app: open the [/app/iosApp](./app/iosApp) directory in Xcode and run it from there.

### Running tests

Use the run button in your IDE's editor gutter, or run tests using Gradle tasks:

- Android tests: `./gradlew :app:sharedUI:testAndroidHostTest :app:sharedLogic:testAndroidHostTest`
- Desktop tests: `./gradlew :app:sharedUI:jvmTest :app:sharedLogic:jvmTest`
- Server tests: `./gradlew :server:test`
- Web tests:
  - Wasm target: `./gradlew :app:sharedUI:wasmJsTest :app:sharedLogic:wasmJsTest`
  - JS target: `./gradlew :app:sharedUI:jsTest :app:sharedLogic:jsTest`
- iOS tests (macOS): `./gradlew :app:sharedUI:iosSimulatorArm64Test :app:sharedLogic:iosSimulatorArm64Test`
- Hybrid Web build checks: `npm run web:check` after `npm run web:build`

---

Learn more about [Kotlin Multiplatform](https://www.jetbrains.com/help/kotlin-multiplatform-dev/get-started.html),
[Compose Multiplatform](https://kotlinlang.org/compose-multiplatform/),
[Kotlin/Wasm](https://kotl.in/wasm/)…

We would appreciate your feedback on Compose/Web and Kotlin/Wasm in the public Slack channel [#compose-web](https://slack-chats.kotlinlang.org/c/compose-web).
If you face any issues, please report them on [YouTrack](https://youtrack.jetbrains.com/newIssue?project=CMP).
