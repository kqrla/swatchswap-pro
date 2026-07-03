# swatchswap pro

forked from [kqrla/swatchswap](https://github.com/kqrla/swatchswap) — same core engine, plus bulk multi-node processing and a saved brand palette system.

---

## what's new

### bulk processing

select multiple nodes before running the plugin. the color scan aggregates unique colors from all selected nodes — fill and stroke colors across the whole selection, plus any image fills. when you click **apply colors**, the mapping is applied to every selected node at once.

a banner at the top of the colors tab shows "N nodes selected — changes apply to all" so it's always clear when you're in bulk mode.

useful for:
- rebranding: select all instances of an icon across the page, change the old brand color once, apply everywhere
- batch image recoloring: select multiple image-fill rectangles and swap the same color across all of them in one shot

### brand palette system

a **palettes tab** lets you save, load, and manage named color palettes. palettes are stored in `figma.clientStorage` — they persist across sessions and across files in figma.

**saving a palette:**
1. set your target colors in the Colors tab (the "→" picker values)
2. switch to the Palettes tab
3. type a name and click **save current**

the saved palette captures the current destination colors (not the source colors). this makes palettes most useful as "target brand palettes" — a fixed set of colors you want to map things to.

**loading a palette:**
clik **load** next to any saved palette. the plugin fills the "→" pickers in order from the palette colors (palette[0] → first detected color's target, palette[1] → second, etc.). you're switched back to the Colors tab automatically and can adjust before applying.

**import / export:**
- **export json** — downloads all saved palettes as `swatchswap-palettes.json`
- **import json** — imports palettes from a previously exported file, merging with existing palettes by id

the json format is plain and portable:
```json
[
  {
    "id": "pal-1720000000000",
    "name": "brand 2025",
    "colors": ["#7C3AED", "#059669", "#111827", "#F9FAFB"]
  }
]
```

---

## installing

1. clone or download this repo
2. in figma: **plugins → development → import plugin from manifest**
3. select `manifest.json`

no build step required — `code.js` is plain javascript.

---

## files

| file | purpose |
|---|---|
| `manifest.json` | figma plugin manifest |
| `code.js` | plugin backend — runs in figma's sandbox |
| `code.ts` | typescript source for `code.js` |
| `ui.html` | plugin ui — colors tab + palettes tab |

---

## how it works

the color engine is unchanged from the original swatchswap:
- **vector fills/strokes**: scanned directly from node properties, swapped with exact rgb matching
- **image fills**: exported as png bytes via `figma.getImageByHash`, pixel-walked with euclidean distance threshold (35), soft-blended to preserve anti-aliasing, re-uploaded via `figma.createImage`

the new additions:
- `scanAndSend` now iterates over all `figma.currentPage.selection` nodes instead of requiring exactly one
- `figma.clientStorage` persists palettes between sessions — async key-value store available in figma plugins, not accessible to other plugins
- the `hashRemap` is built once before the bulk apply loop so shared image hashes across multiple selected nodes are only uploaded once
