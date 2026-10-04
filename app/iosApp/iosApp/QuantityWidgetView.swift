import Combine
import SharedUI
import SwiftUI

/// SwiftUI renders this widget; Kotlin/Compose owns its business state and limits.
final class QuantityWidgetModel: ObservableObject {
    @Published var sku: String
    @Published var quantity: Int
    @Published var availableStock: Int

    var onDecrease: () -> Void
    var onIncrease: () -> Void

    init(
        state: QuantityWidgetState,
        onDecrease: @escaping () -> Void,
        onIncrease: @escaping () -> Void
    ) {
        sku = state.sku
        quantity = Int(state.quantity)
        availableStock = Int(state.availableStock)
        self.onDecrease = onDecrease
        self.onIncrease = onIncrease
    }

    func update(
        state: QuantityWidgetState,
        onDecrease: @escaping () -> Void,
        onIncrease: @escaping () -> Void
    ) {
        sku = state.sku
        quantity = Int(state.quantity)
        availableStock = Int(state.availableStock)
        self.onDecrease = onDecrease
        self.onIncrease = onIncrease
    }

    func release() {
        onDecrease = {}
        onIncrease = {}
    }
}

struct QuantityWidgetView: View {
    @ObservedObject var model: QuantityWidgetModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Điều chỉnh số lượng bằng SwiftUI")
                .font(.headline)
            Text("Mã: \(model.sku) · Còn: \(model.availableStock)")
                .font(.subheadline)
            HStack(spacing: 16) {
                Button(action: { model.onDecrease() }) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                        .frame(minWidth: 44, minHeight: 44)
                }
                .disabled(model.quantity <= 0)
                .accessibilityLabel("Giảm số lượng")

                Text("\(model.quantity)")
                    .font(.title2.monospacedDigit())
                    .accessibilityLabel("Số lượng \(model.quantity)")

                Button(action: { model.onIncrease() }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .frame(minWidth: 44, minHeight: 44)
                }
                .disabled(model.quantity >= model.availableStock)
                .accessibilityLabel("Tăng số lượng")
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
    }
}
