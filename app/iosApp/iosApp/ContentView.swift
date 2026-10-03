import SwiftUI

struct ContentView: View {
    private enum NativeScreen: String, Identifiable {
        case swiftUI
        case uiKit

        var id: String { rawValue }

        var title: String {
            switch self {
            case .swiftUI: return "SwiftUI screen"
            case .uiKit: return "UIKit screen"
            }
        }
    }

    @State private var nativeScreen: NativeScreen?

    var body: some View {
        ComposeView(
            onOpenNativeSwiftUI: { nativeScreen = .swiftUI },
            onOpenNativeUIKit: { nativeScreen = .uiKit }
        )
        .ignoresSafeArea()
        .sheet(item: $nativeScreen) { screen in
            NavigationStack {
                Group {
                    switch screen {
                    case .swiftUI:
                        NativeGreetingView()
                    case .uiKit:
                        NativeUIKitView()
                    }
                }
                .navigationTitle(screen.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { nativeScreen = nil }
                    }
                }
            }
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
