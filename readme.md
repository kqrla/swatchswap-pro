# swatchswap pro

shade-preserving color recoloring for figma, the browser, and your own apps.

swatchswap pro takes a fundamentally different approach to recoloring images. instead of naive find-and-replace on exact hex values, it works in the **oklch perceptual color space** — detecting all shades of a color family, understanding their lightness and chroma relationships, and rotating the hue while preserving those exact relationships. dark reds become dark blues. highlight reds become highlight blues. shadows, gradients, and anti-aliased edges all come through clean.

## what's in this repo

```
├── code.ts / code.js    figma plugin backend (bulk processing, palettes, pairings)
├── ui.html              figma plugin ui (colors, palettes, pairs tabs)
├── manifest.json        figma plugin manifest
├── web/
│   ├── index.html       standalone browser app — drag, drop, recolor, download
│   ├── engine.js        zero-dependency recoloring engine (es module)
│   └── sdk.js           developer sdk for embedding in your own apps
├── readme.md            you're reading it
├── underthehood.md      technical deep-dive with mermaid diagrams
├── features.md          complete feature list
├── usecases.md          real-world use cases
├── roadmap.md           development roadmap
└── someday.md           future ideas and hypotheses
```

## quickstart — standalone web app

1. clone this repo
2. serve the `web/` folder with any static server:
   ```bash
   cd web && python3 -m http.server 8080
   ```
3. open `http://localhost:8080` in your browser
4. drag an image in, adjust the hue slider, hit apply

no build step. no dependencies. no npm install. just html + js.

## quickstart — developer sdk

```html
<script type="module">
import { swatchswap } from './web/sdk.js';

const ss = await swatchswap('photo.png');

// auto-detect dominant color and rotate to blue
await ss.autoRecolor('blue');

// or specify exact hue values
ss.rotateHue(25, 264);  // red → blue

// or use named colors
ss.rotateHue('red', 'teal');

// download the result
await ss.download('recolored.png');
</script>
```

### sdk api

```js
import { SwatchSwap, swatchswap } from './web/sdk.js';

// factory (loads image automatically)
const ss = await swatchswap(source, options);

// or class-based
const ss = new SwatchSwap(options);
await ss.load(source);  // url, file, blob, or img element

// detection
ss.detect()           // → array of { hex, rgb, oklch, count, percentage }
ss.shades()           // → array of shade groups with anchor + variants
ss.dominantHue()      // → dominant hue in degrees (oklch H)

// recoloring
ss.rotateHue(src, tgt)             // shade-preserving hue rotation
ss.recolor([{ from, to }, ...])    // direct hex-to-hex swap with soft blending
await ss.autoRecolor('blue')       // auto-detect source + rotate

// export
ss.toDataURL()           // → data url string
await ss.toBlob()        // → blob
await ss.download(name)  // → triggers browser download
ss.canvas                // → raw canvas element
```

### options

| option | default | description |
|--------|---------|-------------|
| `threshold` | `60` | max rgb distance for color matching |
| `softBlend` | `true` | smooth blending at color boundaries |
| `hueTolerance` | `55` | degrees of hue variation to include |
| `minChroma` | `0.015` | minimum oklch chroma to consider chromatic |
| `maxColors` | `32` | max colors to detect |

### named hue values

```
red: 25°    orange: 55°   yellow: 90°   lime: 120°
green: 145° teal: 175°    cyan: 200°    blue: 264°
indigo: 280° purple: 300° magenta: 330° pink: 350°
rose: 10°
```

## quickstart — figma plugin

1. open figma → plugins → development → import plugin from manifest
2. point to `manifest.json` in this repo
3. select one or more layers and run the plugin
4. use the **colors** tab for quick recoloring
5. use the **palettes** tab to save and reuse brand color sets
6. use the **pairs** tab (v2) for oklch contrast-aware pairings

## how it works (tl;dr)

1. **detect** — 5-bit bucket quantization scans every pixel, counts frequency per color bucket
2. **group** — colors with similar oklch hue are clustered into shade families
3. **rotate** — for each pixel in the source hue range, convert to oklch, shift the hue angle, keep L and C identical
4. **blend** — euclidean rgb distance with soft `t = 1 - dist/threshold` blending preserves anti-aliasing

read [underthehood.md](underthehood.md) for the full technical breakdown with diagrams.

## license

mit
