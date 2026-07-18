// swatchswap-pro developer sdk
// lightweight api for integrating swatchswap recoloring into any application
// zero dependencies — uses the engine module internally

import {
  detectColors, detectShades, recolorImage, recolorByHueRotation,
  getDominantHue, loadImage, imageToCanvas, canvasToBlob,
  rgbToOklch, oklchToRgb, hexToRgb, rgbToHex, HUE_NAMES
} from './engine.js';

export class SwatchSwap {
  constructor(options = {}) {
    this.options = {
      threshold: options.threshold || 60,
      softBlend: options.softBlend !== false,
      hueTolerance: options.hueTolerance || 55,
      minChroma: options.minChroma || 0.015,
      maxColors: options.maxColors || 32,
      ...options
    };
  }

  // load an image from url, file, blob, or img element
  async load(source) {
    if (source instanceof HTMLImageElement) {
      this._source = source;
    } else if (source instanceof HTMLCanvasElement) {
      this._canvas = source;
      this._ctx = source.getContext('2d');
      this._imageData = this._ctx.getImageData(0, 0, source.width, source.height);
      return this;
    } else {
      this._source = await loadImage(source);
    }
    const { canvas, ctx, imageData } = imageToCanvas(this._source);
    this._canvas = canvas;
    this._ctx = ctx;
    this._imageData = imageData;
    return this;
  }

  // detect all colors in the loaded image
  detect(options = {}) {
    if (!this._imageData) throw new Error('no image loaded. call .load() first.');
    return detectColors(this._imageData, { ...this.options, ...options });
  }

  // detect shade groups (colors with similar hue)
  shades(options = {}) {
    const colors = this.detect(options);
    return detectShades(colors, { ...this.options, ...options });
  }

  // get the dominant hue in the image
  dominantHue() {
    const colors = this.detect();
    return getDominantHue(colors);
  }

  // recolor using explicit hex-to-hex replacements
  // replacements: [{ from: '#ff0000', to: '#0000ff' }, ...]
  recolor(replacements, options = {}) {
    if (!this._imageData) throw new Error('no image loaded. call .load() first.');
    const { imageData, changed } = recolorImage(
      this._imageData, replacements, { ...this.options, ...options }
    );
    this._imageData = imageData;
    this._ctx.putImageData(imageData, 0, 0);
    return { changed, canvas: this._canvas };
  }

  // recolor by rotating hue in oklch space (shade-preserving)
  // source/target can be hue degrees or named colors from HUE_NAMES
  rotateHue(source, target, options = {}) {
    if (!this._imageData) throw new Error('no image loaded. call .load() first.');
    const srcHue = typeof source === 'string' ? (HUE_NAMES[source.toLowerCase()] ?? parseFloat(source)) : source;
    const tgtHue = typeof target === 'string' ? (HUE_NAMES[target.toLowerCase()] ?? parseFloat(target)) : target;
    if (srcHue == null || tgtHue == null) throw new Error('invalid hue value.');

    const { imageData, changed } = recolorByHueRotation(
      this._imageData, srcHue, tgtHue, { ...this.options, ...options }
    );
    this._imageData = imageData;
    this._ctx.putImageData(imageData, 0, 0);
    return { changed, canvas: this._canvas };
  }

  // auto-detect dominant hue and rotate to target
  async autoRecolor(targetHue, options = {}) {
    const srcHue = this.dominantHue();
    if (srcHue == null) throw new Error('no dominant chromatic color found in image.');
    return this.rotateHue(srcHue, targetHue, options);
  }

  // export as blob
  async toBlob(type = 'image/png') {
    return canvasToBlob(this._canvas, type);
  }

  // export as data url
  toDataURL(type = 'image/png') {
    return this._canvas.toDataURL(type);
  }

  // export as downloadable file
  async download(filename = 'swatchswap-output.png', type = 'image/png') {
    const blob = await this.toBlob(type);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // get the canvas element for direct manipulation
  get canvas() { return this._canvas; }
  get imageData() { return this._imageData; }
  get width() { return this._canvas?.width; }
  get height() { return this._canvas?.height; }
}

// convenience factory
export async function swatchswap(source, options = {}) {
  const ss = new SwatchSwap(options);
  await ss.load(source);
  return ss;
}

// re-export utilities
export { rgbToOklch, oklchToRgb, hexToRgb, rgbToHex, HUE_NAMES };

export default SwatchSwap;
