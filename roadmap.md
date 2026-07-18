# roadmap

phased development plan for swatchswap pro. each phase builds on the previous, with the core engine improvements benefiting all surfaces (web, sdk, figma plugin).

---

## phase 1: foundation (current — v2)

### done
- [x] oklch hue rotation engine with shade preservation
- [x] 5-bit bucket quantization for color detection
- [x] soft-blend pixel remapping with euclidean distance
- [x] shade grouping by oklch hue proximity
- [x] standalone web app with drag-drop, dual preview, download
- [x] developer sdk with class-based api
- [x] figma plugin with multi-node bulk processing
- [x] brand palette save/load/import/export
- [x] color pairings (contrast, tint-shade, complementary, analogous)
- [x] wcag contrast ratio badges
- [x] pure js png codec for figma plugin sandbox
- [x] full documentation suite

---

## phase 2: batch processing and performance

### bulk file operations
- [ ] **multi-file upload** — drag a folder or select multiple files, recolor all with the same settings
- [ ] **web worker processing** — offload pixel manipulation to a worker thread for non-blocking ui
- [ ] **zip download** — batch results exported as a zip file using fflate (zero-dependency compression)
- [ ] **progress tracking** — per-file progress bars with cancel support

### performance optimizations
- [ ] **wasm oklch module** — port the oklch conversion math to webassembly for ~5-10x speedup on large images
- [ ] **simd pixel processing** — use wasm simd for parallel per-pixel operations
- [ ] **streaming decode** — process png scanlines incrementally instead of buffering the entire image
- [ ] **webgpu compute shader** — gpu-accelerated hue rotation for real-time preview on 4k+ images

---

## phase 3: smart detection

### ai-assisted color detection
- [ ] **semantic color roles** — detect which colors serve as "primary", "accent", "shadow", "background" etc.
- [ ] **foreground/background separation** — distinguish subject colors from background colors
- [ ] **gradient detection** — identify linear/radial gradients and preserve their structure during recoloring
- [ ] **pattern recognition** — detect repeating patterns and ensure recoloring maintains pattern coherence

### advanced shade analysis
- [ ] **shade curve visualization** — plot the L-C distribution of each shade family
- [ ] **outlier detection** — flag pixels that might be artifacts or compression noise
- [ ] **shade interpolation** — generate missing intermediate shades when a family has gaps

---

## phase 4: api and integrations

### rest api
- [ ] **http endpoint** — `POST /recolor` accepts an image + options, returns the recolored image
- [ ] **node.js server** — lightweight http server using built-in `node:http` + canvas adapter
- [ ] **rate limiting** — token-based rate limiting for public api access
- [ ] **webhook support** — fire a webhook when batch processing completes

### platform integrations
- [ ] **figma widget** — figjam widget version for collaborative recoloring workshops
- [ ] **vscode extension** — recolor image assets directly from the editor sidebar
- [ ] **cli tool** — `npx swatchswap recolor input.png --hue 264 --output blue.png`
- [ ] **github action** — automated asset recoloring in ci/cd pipelines

### design token integration
- [ ] **style dictionary compat** — import/export palettes as design tokens
- [ ] **figma variables sync** — read target colors from figma variables instead of manual picker
- [ ] **css custom properties** — export recolored palettes as css variable sets

---

## phase 5: multi-color and advanced algorithms

### multi-hue recoloring
- [ ] **independent hue zones** — define multiple source→target mappings in a single pass (e.g., reds→blue AND greens→orange simultaneously)
- [ ] **hue range masking** — visually select which hue ranges to affect using a circular hue wheel
- [ ] **selective chroma adjustment** — boost or reduce saturation independently per shade group
- [ ] **lightness curve remapping** — apply custom L curves to shade families (e.g., increase contrast within a shade group)

### color harmony
- [ ] **harmony generation** — given one target color, generate complementary, triadic, split-complementary, and tetradic palettes
- [ ] **harmony-aware recoloring** — recolor an image to match a generated harmony scheme
- [ ] **mood presets** — one-click presets like "warm", "cool", "muted", "vibrant" that adjust L, C, and H together

---

## phase 6: collaboration and ecosystem

### sharing and community
- [ ] **shareable links** — generate a url that encodes the image + recolor settings for instant sharing
- [ ] **palette marketplace** — community-contributed brand palettes and shade mapping presets
- [ ] **before/after embed** — embeddable comparison widget for portfolios and case studies

### team features
- [ ] **team palettes** — shared palette library synced across team members
- [ ] **approval workflows** — submit recolored assets for review before publishing
- [ ] **version history** — track recoloring operations with undo/redo across sessions

---

## implementation priorities

the roadmap prioritizes in this order:

1. **engine improvements** — benefits all surfaces automatically
2. **web app features** — fastest iteration, widest reach
3. **sdk capabilities** — enables developer ecosystem
4. **figma plugin features** — deepest integration, most specialized
5. **api and integrations** — scales usage beyond manual operation
6. **collaboration** — multiplier on existing value

each phase is designed so that items can be cherry-picked independently. the phases represent thematic grouping, not strict sequential gates.
