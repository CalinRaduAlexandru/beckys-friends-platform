import AppKit
import AVFoundation
import Foundation

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift video_first_frame.swift <input.mp4> <output.png>\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let asset = AVAsset(url: inputURL)
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero

let image = try generator.copyCGImage(at: .zero, actualTime: nil)
let width = image.width
let height = image.height
let bytesPerRow = width * 4
var pixels = [UInt8](repeating: 0, count: bytesPerRow * height)

guard let context = CGContext(
    data: &pixels,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    throw NSError(domain: "VideoPoster", code: 1)
}

context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

// Remove only near-black pixels connected to a frame edge. Dark details enclosed
// by the illustration (especially eyes and pupils) therefore stay intact.
let pixelCount = width * height
var visited = [UInt8](repeating: 0, count: pixelCount)
var queue = [Int](repeating: 0, count: pixelCount)
var head = 0
var tail = 0

func isBackground(_ index: Int) -> Bool {
    let offset = index * 4
    let red = Int(pixels[offset])
    let green = Int(pixels[offset + 1])
    let blue = Int(pixels[offset + 2])
    let brightest = max(red, green, blue)
    let darkest = min(red, green, blue)
    return brightest < 78 && brightest - darkest < 22
}

func enqueue(_ index: Int) {
    guard visited[index] == 0, isBackground(index) else { return }
    visited[index] = 1
    queue[tail] = index
    tail += 1
}

for x in 0..<width {
    enqueue(x)
    enqueue((height - 1) * width + x)
}
for y in 0..<height {
    enqueue(y * width)
    enqueue(y * width + width - 1)
}

while head < tail {
    let index = queue[head]
    head += 1
    let x = index % width
    let y = index / width
    if x > 0 { enqueue(index - 1) }
    if x + 1 < width { enqueue(index + 1) }
    if y > 0 { enqueue(index - width) }
    if y + 1 < height { enqueue(index + width) }
}

for index in 0..<pixelCount where visited[index] == 1 {
    pixels[index * 4 + 3] = 0
}

guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: width,
    pixelsHigh: height,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: bytesPerRow,
    bitsPerPixel: 32
) else {
    throw NSError(domain: "VideoPoster", code: 2)
}

memcpy(bitmap.bitmapData, pixels, pixels.count)
guard let png = bitmap.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "VideoPoster", code: 3)
}
try png.write(to: outputURL, options: .atomic)
