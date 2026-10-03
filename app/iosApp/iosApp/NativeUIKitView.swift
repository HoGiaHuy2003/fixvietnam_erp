import SharedUI
import SwiftUI
import UIKit

struct NativeUIKitView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        NativeGreetingViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

final class NativeGreetingViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        let greetingLabel = UILabel()
        greetingLabel.text = "UIKit: \(Greeting().greet())"
        greetingLabel.font = .preferredFont(forTextStyle: .title2)
        greetingLabel.adjustsFontForContentSizeCategory = true
        greetingLabel.numberOfLines = 0
        greetingLabel.textAlignment = .center
        greetingLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(greetingLabel)

        NSLayoutConstraint.activate([
            greetingLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),
            greetingLabel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            greetingLabel.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
        ])
    }
}
