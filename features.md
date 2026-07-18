# features

## core recoloring engine

- **oklch hue rotation** — rotate any color family to any target hue while preserving exact lightness and chroma. dark shades stay dark, highlights stay bright, gradients stay smooth.
- **shade detection** — automatically groups colors into shade families based on oklch hue proximity. understands that a light pink and a dark maroon are both "reds."
- **5-bit bucket quantization** — scans every pixel using 15-bit packed color keys (32³ buckets) for fast frequency counting without expensive k-means clustering.
- **soft-blend pixel remapping** — euclidean rgb distance with `t = 1 - dist/threshold` blending preserves anti-aliased edges, gradients, and subtle color transitions.
- **transparent pixel handling** — skips pixels with alpha < 10 to preserve transparency and avoid artifacts at edges.
- **dual recoloring modes**:
  - *hue rotation* — perceptual, shade-preserving, works on entire color families
  - *color swap* — direct hex-to-hex replacement with distance-based soft blending

## standalone web app (`web/index.html`)

- **drag-and-drop** — drop any png, jpg, svg, or webp image to get started
- **live color detection** — instantly scans and displays all detected colors with percentage badges
- **shade group visualization** — shows color families sorted by lightness
- **source hue auto-detection** — automatically identifies the dominant chromatic hue
- **interactive hue sliders** — real-time source/target hue selection with named color labels and previews
- **side-by-side preview** — original and result displayed together for comparison
- **direct color swap mode** — add unlimited from→to hex pairs for precise control
- **one-click download** — export the recolored image as png
- **zero dependencies** — no npm, no build step, no frameworks. just html + vanilla js modules.
- **dark mode ui** — clean, minimal dark interface

## developer sdk (`web/sdk.js`)

- **class-based api** — `new SwatchSwap(options)` or `await swatchswap(source)` factory
- **flexible input** — accepts urls, files, blobs, img elements, or canvas elements
- **detection api** — `.detect()` returns colors with hex, rgb, oklch, count, and percentage
- **shade grouping** — `.shades()` clusters colors into families with anchor + variants
- **named hue support** — use `'red'`, `'blue'`, `'teal'` etc. instead of degree values
- **auto-recolor** — `.autoRecolor('blue')` detects the dominant hue and rotates automatically
- **multiple export formats** — `.toDataURL()`, `.toBlob()`, `.download(filename)`
- **canvas access** — direct access to the underlying canvas element for custom processing
- **zero dependencies** — no external packages, works in any browser with es module support

## figma plugin

- **multi-node selection** — select multiple layers and recolor them all at once
- **bulk processing** — scans all selected nodes, builds a shared color hash remap, applies to all
- **brand palette management** — save, load, delete, import, and export named color palettes
- **palette persistence** — stored via `figma.clientStorage` across sessions and files
- **json import/export** — share palettes between team members or across projects
- **pure js png codec** — complete png decoder/encoder in pure javascript for the figma plugin sandbox (no browser apis needed)
  - deflate inflate with fixed + dynamic huffman support
  - png unfilter (none, sub, up, average, paeth)
  - stored deflate encoding
  - crc32 chunk validation
- **image fill detection** — finds image fills deep in nested node hierarchies

## v2 features (pairings)

- **color pairings** — define relational color groups where changing one color automatically adjusts the others
- **pairing types**:
  - *contrast* — maintain wcag contrast ratio between paired colors
  - *tint-shade* — lighter/darker variants follow the base color's oklch delta
  - *complementary* — 180° hue offset with matched lightness
  - *analogous* — neighboring hues (±30°) with preserved chroma relationships
- **wcag contrast badges** — real-time contrast ratio display with green (≥4.5) / red (<4.5) indicators
- **target contrast ratio** — configurable target ratio (3.0, 4.5, 7.0) with binary search in oklch L
- **pairing persistence** — saved via figma.clientStorage in the plugin, localstorage in the web app
- **export/import** — json serialization for sharing pairings across projects
