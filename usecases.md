# use cases

## designers

### brand exploration
you're exploring color directions for a new brand. you have a hero illustration in red, and the client wants to see it in blue, teal, and purple. instead of going back to the illustrator for three more rounds, drop the image in swatchswap, rotate the hue three times, and present all four directions in your next meeting. every shadow, highlight, and gradient translates perfectly.

### dark mode conversion
you've designed a light-themed marketing page with warm amber accents. the team wants a dark mode version. use swatchswap to rotate the amber accents to a cooler blue-teal that works on dark backgrounds, while keeping the same shade relationships between your primary, secondary, and subtle accent tones.

### icon set recoloring
you have a set of 40 icons in your brand's coral color. a new product line needs the same icons in indigo. select all 40 in figma, run swatchswap pro, pick the target hue — done. every icon keeps its internal shading and gradient structure.

### design system color exploration
when building a design system, you need to test how your entire component library looks under different primary colors. load a screenshot of your full component sheet, rotate the primary hue, and instantly see how every component — buttons, cards, alerts, badges — looks in the new color family.

## developers

### themed asset generation
your app supports custom themes (user-picked accent colors). instead of shipping 12 pre-colored versions of every illustration, ship one base illustration and use swatchswap's sdk at build time or runtime to generate the themed versions programmatically.

```js
import { swatchswap } from './sdk.js';

const themes = ['red', 'blue', 'green', 'purple', 'orange'];
for (const color of themes) {
  const ss = await swatchswap('hero-illustration.png');
  await ss.autoRecolor(color);
  await ss.download(`hero-${color}.png`);
}
```

### white-label products
you're building a saas platform where each customer gets their own branding. customer uploads their brand color, your backend uses swatchswap to recolor all default assets (onboarding illustrations, empty states, email headers) to match their brand. no manual design work per customer.

### ci/cd asset pipeline
add swatchswap to your build pipeline to automatically generate themed versions of marketing assets. when the design team updates the base illustration, the pipeline regenerates all color variants without human intervention.

### a/b testing
test whether users engage more with blue vs. green call-to-action graphics. use swatchswap to generate the variant programmatically, no designer bottleneck for a simple color test.

## marketing teams

### campaign color adaptation
you've produced a holiday campaign in red and gold. valentine's day is coming — rotate the reds to pink, keep the golds. st. patrick's day — rotate to green. every campaign asset (social cards, email banners, landing page heroes) can be recolored in minutes instead of redesigned.

### social media variants
create platform-specific color treatments. your instagram might use warm tones while linkedin uses cool professional blues. same base assets, different hue rotations.

### localized branding
different markets respond to different colors. red is lucky in china, while blue signals trust in the US. generate market-specific variants of your global campaign assets.

## product teams

### accessibility testing
test how your ui looks to users with color vision deficiency by rotating hues to simulate deuteranopia (red-green) or tritanopia (blue-yellow) confusion ranges. check if your information hierarchy holds up without specific color recognition.

### onboarding personalization
let users pick their preferred color during onboarding, then recolor all onboarding illustrations to match. creates an immediate sense of customization with zero asset overhead.

### feature flagged themes
roll out new brand colors gradually. use swatchswap to generate the new-color assets, feature-flag them for a percentage of users, measure engagement, and roll forward or back.

## agencies

### client pitch decks
present the same design concept in each client's brand colors. design once in a neutral palette, then generate client-specific versions for each pitch. saves hours of manual recoloring per pitch.

### template businesses
sell figma templates or illustration packs that buyers can recolor to their brand. include swatchswap as part of the template kit so buyers can customize without design skills.

## game developers

### team/faction colors
you have character sprites, flags, or ui elements that need to be recolored per team. create one base set, use swatchswap to generate red team, blue team, green team variants that preserve all the shading and detail.

### seasonal events
recolor game assets for seasonal events (spooky purple for halloween, icy blue for winter) without commissioning new art for every event.

## education

### color theory teaching
use the shade detection and oklch visualization to teach students how perceptual color spaces work. show how hue rotation in oklch preserves relationships that hsl rotation destroys.

### interactive color exercises
build assignments where students predict what a recolored image will look like, then verify with swatchswap. demonstrates the difference between additive/subtractive color models and perceptual uniformity.
