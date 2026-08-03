import Foundation
import Vision

let args = CommandLine.arguments.dropFirst()
guard !args.isEmpty else {
    fputs("Usage: swift ocr_pages.swift image...\n", stderr)
    exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false

for path in args {
    autoreleasepool {
        let url = URL(fileURLWithPath: String(path))
        let handler = VNImageRequestHandler(url: url, options: [:])
        do {
            try handler.perform([request])
            print("=== \(url.lastPathComponent) ===")
            let observations = (request.results ?? []).sorted {
                let a = $0.boundingBox
                let b = $1.boundingBox
                if abs(a.midY - b.midY) > 0.01 { return a.midY > b.midY }
                return a.minX < b.minX
            }
            for observation in observations {
                if let text = observation.topCandidates(1).first?.string {
                    print(text)
                }
            }
        } catch {
            print("=== \(url.lastPathComponent) ===")
            print("[ocr-error] \(error)")
        }
    }
}
