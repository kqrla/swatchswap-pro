# someday

ideas that aren't on the active roadmap but feel worth building eventually. no timelines, no promises — just things worth thinking about.

---

## color pairings and relational swaps

right now swatchswap treats every detected color independently. you swap red to purple, and that's it — the plugin doesn't know or care whether that red was sitting on top of a near-white background, or whether some other color in the image was specifically chosen to contrast against it.

the idea: let users define **pairs** — two or more colors that have a relationship. when one color in a pair is changed, the others adapt automatically to preserve (or intentionally break) that relationship.

the most obvious relationship is contrast: a dark text color paired with a light background. if the user changes the background to something much darker, the text color should shift lighter to maintain legibility. today the user has to figure that out manually and change both pickers. with pairing, changing the background would automatically push the text color toward the right luminance range.

other relationships worth supporting:
- **tint/shade pairing**: a base color and its lighter/darker variants. if the base shifts hue, the variants follow at the same relative lightness steps
- **complementary pairing**: two colors that sit across from each other on the hue wheel. if one moves to a different hue, the partner rotates by the same delta
- **analogous pairing**: two or more colors that are close in hue. if one shifts, the others shift by the same amount to stay clustered

### exporting pairings

pairings should be first-class exportable artifacts — separate from palettes (which are just lists of colors). a pairing export would describe the relationship, not just the colors:

```json
{
  "version": 1,
  "pairings": [
    {
      "id": "pair-text-bg",
      "label": "body text / page background",
      "type": "contrast",
      "targetContrastRatio": 4.5,
      "colors": [
        { "role": "foreground", "hex": "#111827" },
        { "role": "background", "hex": "#F9FAFB" }
      ]
    },
    {
      "id": "pair-brand-tints",
      "label": "brand purple tints",
      "type": "tint-shade",
      "base": "#7C3AED",
      "colors": [
        { "role": "50",  "hex": "#F5F3FF" },
        { "role": "100", "hex": "#EDE9FE" },
        { "role": "500", "hex": "#7C3AED" },
        { "role": "900", "hex": "#2E1065" }
      ]
    }
  ]
}
```

this format is importable back into the plugin (so you can reuse the same pairings across projects), shareable with a team, and compatible enough with design token conventions that it could eventually feed into a w3c dtcg token file.

---

## wcag-aware contrast suggestions

related to pairings but distinct: when the user is about to apply a swap that would put two paired colors into a failing contrast ratio (below 4.5:1 for aa normal text, 3:1 for aa large text), the plugin could flag it and offer a corrected version of the destination color that just barely meets the threshold.

not a blocker — the user can still apply the failing combo if they want — but an inline warning and a "fix to aa" button would prevent a lot of accidental accessibility regressions during rebrand work.

---

## semantic color roles

palettes today are just ordered lists of hex values. a richer model would let you tag colors with roles: `primary`, `primary-on-dark`, `surface`, `text-on-surface`, `error`, `success`, etc.

with roles defined, the plugin could do smarter things:
- when scanning a new image, try to match detected colors to known roles rather than presenting them as anonymous swatches
- when a role changes, automatically propagate to all other places in the file where that role appears
- export roles directly to figma variables collections, css custom properties, or style-dictionary-compatible json

---

## plugin-level swap history

figma's undo stack covers individual plugin operations, but once you close and reopen the plugin you lose the record of what was swapped and why. a swap history panel would show:
- which node, which color, from what to what, at what time
- the ability to re-apply a past swap to a new selection ("apply the same rebrand mapping i did yesterday to this new asset")
- export the history as a reusable swap script

---

## color harmony suggestions

when the user picks a new destination color, the plugin could suggest harmonious replacements for the other detected colors — based on complementary, triadic, analogous, or split-complementary relationships relative to the new color. presents as a set of preset "harmony schemes" to load in one click, rather than requiring the user to figure out the math manually.

---

## hypothesis: how pairing could be implemented

this section thinks through the mechanics. not a spec, not a commitment — just reasoning about whether it's tractable.

### storing pairing definitions

pairings would live in `figma.clientStorage` alongside palettes, with their own key (`swatchswap.pairings`). the data model is a list of pairing objects, each with a `type` field that determines how the relationship is calculated.

the ui would have a third tab ("Pairs") alongside Colors and Palettes. defining a pair would work like: select two color swatches from the currently detected colors, give the pair a label and a type, save. the pair is then visible in the Pairs tab and associated with the current palette if one is active.

### the contrast-pair algorithm

when the user changes `colorA` in a contrast pair:

1. compute the relative luminance of the new `colorA` using the wcag formula:
   ```
   L = 0.2126 * linearize(R) + 0.7152 * linearize(G) + 0.0722 * linearize(B)
   where linearize(v) = v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)^2.4
   ```

2. the contrast ratio between `colorA` and `colorB` is `(L_lighter + 0.05) / (L_darker + 0.05)`

3. to find a new `colorB` that achieves a target ratio (e.g. 4.5), solve for the required luminance:
   - if `colorA` is dark: `L_colorB = (targetRatio * (L_colorA + 0.05)) - 0.05`
   - if `colorA` is light: `L_colorB = (L_colorA + 0.05) / targetRatio - 0.05`

4. convert the required luminance back to an rgb value. the challenge here is that luminance is a single scalar but rgb is a 3-vector — there are infinite rgb triples with the same luminance. the constraint is to preserve the hue and saturation of the original `colorB` and only adjust its lightness in oklab or hsl space to hit the luminance target.

   working in oklch:
   - convert `colorB` to oklch: `{ L, C, H }`
   - hold `C` (chroma) and `H` (hue) constant
   - binary search over `L` (0.0 to 1.0) until `luminance(oklch_to_rgb(L, C, H))` matches the required value within tolerance (e.g. 0.001)
   - the result is the adjusted `colorB` with the same hue/chroma, new lightness

5. present the computed `colorB` as a suggestion in the `→` picker for that entry, highlighted to show it was auto-adjusted. the user can override it.

### the tint-shade-follow algorithm

for a tint/shade pair (base + variants at fixed lightness steps):

1. when the base color changes, express the change as a delta in oklch: `ΔL`, `ΔC`, `ΔH`
2. apply the same oklch delta to every variant in the pair
3. clamp to valid rgb range

this preserves the visual relationship ("50% lighter than base") even as the base hue and chroma shift. oklch is the right space for this because its lightness channel is perceptually uniform — a `+0.1L` delta looks the same regardless of the starting hue, which isn't true in hsl.

### the hue-follow algorithm (complementary / analogous)

for complementary pairs:

1. when `colorA`'s hue changes by `ΔH` in oklch, apply `+ΔH` to `colorB`'s hue as well
2. this keeps them the same angular distance apart on the hue wheel

for analogous pairs (a cluster of colors that should stay close in hue):

1. record the hue offsets of each member relative to the "anchor" color at definition time: `[+0°, +15°, +30°]`
2. when the anchor's hue changes, recompute each member's hue as `anchor_hue + recorded_offset`

### ui challenges

the trickiest part isn't the math — it's the ui. the color picker needs to show "this value was auto-suggested by a pairing rule" vs "this is what the user set manually". a subtle visual indicator (a small link icon on the picker, or a faint background tint on auto-adjusted rows) would communicate the relationship without being distracting. clicking the indicator would let the user detach from the pair for that row.

the other challenge is ordering: when the user changes `colorA`, the plugin auto-updates `colorB`'s picker. but the user might then manually tweak `colorB`, and if they later change `colorA` again, should the auto-update override their manual tweak? probably not — once a user touches a paired picker manually, it should detach from the auto-follow for that session (until they re-attach explicitly).

### what it wouldn't handle

- images with continuous gradients: the pairing concept works on discrete detected colors. for photographic images, the quantized colors are approximations and the pairing math would be approximate too. probably acceptable for logos and illustration assets, not reliable for photos.
- more than two colors in a contrast pair: wcag contrast is always a two-color relationship. three-way contrast constraints don't have a clean mathematical formulation and would need heuristics.
- perceptual accuracy across all monitors: oklch is perceptually uniform under standard conditions, but real display calibration varies. the algorithm gives a good approximation, not a photometric guarantee.
