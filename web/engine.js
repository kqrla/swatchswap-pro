// swatchswap-pro recoloring engine
// zero-dependency es module for pixel-level oklch hue rotation
// works in any browser environment with canvas support

// --- oklch color space conversions ---

function srgbToLinear(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const ob = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  return { L, C: Math.sqrt(a * a + ob * ob), H: (Math.atan2(ob, a) * 180 / Math.PI + 360) % 360 };
}

export function oklchToRgb(L, C, H) {
  const rad = H * Math.PI / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: Math.max(0, Math.min(255, Math.round(linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255))),
    g: Math.max(0, Math.min(255, Math.round(linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255))),
    b: Math.max(0, Math.min(255, Math.round(linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s) * 255)))
  };
}

export function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// --- 5-bit bucket quantization for fast color detection ---

function bucketKey(r, g, b) {
  return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
}

function bucketToRgb(key) {
  return {
    r: ((key >> 10) & 0x1f) << 3 | 4,
    g: ((key >> 5) & 0x1f) << 3 | 4,
    b: (key & 0x1f) << 3 | 4
  };
}

// --- core engine ---

export function detectColors(imageData, options = {}) {
  const { minPixels = 10, maxColors = 32 } = options;
  const data = imageData.data;
  const freq = new Map();

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    const key = bucketKey(data[i], data[i + 1], data[i + 2]);
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  return [...freq.entries()]
    .filter(([, count]) => count >= minPixels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([key, count]) => {
      const rgb = bucketToRgb(key);
      const lch = rgbToOklch(rgb.r, rgb.g, rgb.b);
      return {
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        rgb,
        oklch: lch,
        count,
        percentage: count / (data.length / 4) * 100
      };
    });
}

export function detectShades(colors, options = {}) {
  const { hueTolerance = 30, chromaTolerance = 0.05 } = options;

  const groups = [];
  const used = new Set();

  for (let i = 0; i < colors.length; i++) {
    if (used.has(i)) continue;
    const base = colors[i];
    const group = { anchor: base, shades: [base] };
    used.add(i);

    for (let j = i + 1; j < colors.length; j++) {
      if (used.has(j)) continue;
      const other = colors[j];
      const hueDiff = Math.abs(base.oklch.H - other.oklch.H);
      const hueClose = hueDiff < hueTolerance || hueDiff > (360 - hueTolerance);
      if (hueClose && other.oklch.C > 0.015) {
        group.shades.push(other);
        used.add(j);
      }
    }

    if (group.shades.length > 0) {
      group.shades.sort((a, b) => b.oklch.L - a.oklch.L);
      groups.push(group);
    }
  }

  return groups;
}

export function recolorImage(imageData, replacements, options = {}) {
  const { threshold = 60, softBlend = true } = options;
  const data = imageData.data;
  const result = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
  const rd = result.data;
  let changed = 0;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) { continue; }
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let bestDist = Infinity, bestReplacement = null;

    for (const { from, to } of replacements) {
      const fr = hexToRgb(from);
      const dist = Math.sqrt((r - fr.r) ** 2 + (g - fr.g) ** 2 + (b - fr.b) ** 2);
      if (dist < bestDist && dist < threshold) {
        bestDist = dist;
        bestReplacement = { from: fr, to: hexToRgb(to), dist };
      }
    }

    if (bestReplacement) {
      const { from: fr, to: tr, dist } = bestReplacement;
      if (softBlend && dist > 0) {
        const t = 1 - dist / threshold;
        rd[i] = Math.round(r + (tr.r - fr.r) * t);
        rd[i + 1] = Math.round(g + (tr.g - fr.g) * t);
        rd[i + 2] = Math.round(b + (tr.b - fr.b) * t);
      } else {
        rd[i] = tr.r;
        rd[i + 1] = tr.g;
        rd[i + 2] = tr.b;
      }
      changed++;
    }
  }

  return { imageData: result, changed };
}

export function recolorByHueRotation(imageData, sourceHue, targetHue, options = {}) {
  const { hueTolerance = 55, minChroma = 0.015 } = options;
  const data = imageData.data;
  const result = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
  const rd = result.data;
  let changed = 0;

  const hueDelta = targetHue - sourceHue;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    const lch = rgbToOklch(data[i], data[i + 1], data[i + 2]);
    const hueDiff = Math.abs(lch.H - sourceHue);
    const isMatch = (hueDiff <= hueTolerance || hueDiff >= (360 - hueTolerance)) && lch.C > minChroma;

    if (isMatch) {
      const newHue = (lch.H + hueDelta + 360) % 360;
      const rgb = oklchToRgb(lch.L, lch.C, newHue);
      rd[i] = rgb.r;
      rd[i + 1] = rgb.g;
      rd[i + 2] = rgb.b;
      changed++;
    }
  }

  return { imageData: result, changed };
}

export function getDominantHue(colors) {
  const chromatic = colors.filter(c => c.oklch.C > 0.015);
  if (chromatic.length === 0) return null;
  return chromatic[0].oklch.H;
}

export async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (src instanceof Blob) {
      img.src = URL.createObjectURL(src);
    } else {
      img.src = src;
    }
  });
}

export function imageToCanvas(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx, imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) };
}

export function canvasToBlob(canvas, type = 'image/png') {
  return new Promise(resolve => canvas.toBlob(resolve, type));
}

export const HUE_NAMES = {
  red: 25, orange: 55, yellow: 90, lime: 120, green: 145,
  teal: 175, cyan: 200, blue: 264, indigo: 280,
  purple: 300, magenta: 330, pink: 350, rose: 10
};
