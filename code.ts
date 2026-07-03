const TOOL_ID = 'swatchswap-pro'
const DISPLAY_NAME = 'SwatchSwap Pro'
const PALETTE_STORAGE_KEY = 'swatchswap.palettes'

figma.root.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })
figma.showUI(__html__, { width: 320, height: 460 })

function getAllNodes(root: SceneNode): SceneNode[] {
  const nodes: SceneNode[] = [root]
  if ('findAll' in root) nodes.push(...(root as GroupNode).findAll(() => true))
  return nodes
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)))
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

function colorsEqual(a: RGB, b: RGB): boolean {
  return Math.abs(a.r - b.r) < 0.002 &&
         Math.abs(a.g - b.g) < 0.002 &&
         Math.abs(a.b - b.b) < 0.002
}

async function loadPalettes(): Promise<any[]> {
  try {
    const raw = await figma.clientStorage.getAsync(PALETTE_STORAGE_KEY)
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}

async function savePalettes(palettes: any[]): Promise<void> {
  await figma.clientStorage.setAsync(PALETTE_STORAGE_KEY, palettes)
}

async function scanAndSend() {
  const sel = figma.currentPage.selection
  if (sel.length === 0) {
    figma.ui.postMessage({ type: 'no-selection' })
    return
  }

  const solidColorMap = new Map<string, boolean>()
  const imageRefs: { nodeId: string; fillIndex: number; imageHash: string }[] = []
  const uniqueHashes = new Set<string>()

  for (const root of sel) {
    for (const node of getAllNodes(root)) {
      try {
        if ('fills' in node && Array.isArray(node.fills)) {
          const fills = node.fills as Paint[]
          for (let i = 0; i < fills.length; i++) {
            const fill = fills[i]
            if (fill.type === 'SOLID') {
              solidColorMap.set(rgbToHex(fill.color.r, fill.color.g, fill.color.b), true)
            } else if (fill.type === 'IMAGE' && (fill as ImagePaint).imageHash) {
              const hash = (fill as ImagePaint).imageHash!
              imageRefs.push({ nodeId: node.id, fillIndex: i, imageHash: hash })
              uniqueHashes.add(hash)
            }
          }
        }
        if ('strokes' in node && Array.isArray(node.strokes)) {
          for (const stroke of node.strokes as Paint[]) {
            if (stroke.type === 'SOLID') solidColorMap.set(rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b), true)
          }
        }
      } catch (_) {}
    }
  }

  const hasSolids = solidColorMap.size > 0
  const hasImages = imageRefs.length > 0

  if (!hasSolids && !hasImages) {
    figma.ui.postMessage({ type: 'error', message: 'No colors found. Try selecting colored shapes inside the group.' })
    return
  }

  const imageList: { hash: string; bytes: number[] }[] = []
  for (const hash of uniqueHashes) {
    try {
      const img = figma.getImageByHash(hash)
      if (!img) continue
      const bytes = await img.getBytesAsync()
      imageList.push({ hash, bytes: Array.from(bytes) })
    } catch (_) {}
  }

  const palettes = await loadPalettes()

  figma.ui.postMessage({
    type: 'scan-result',
    solidColors: Array.from(solidColorMap.keys()),
    imageRefs,
    images: imageList,
    nodeNames: sel.map(n => n.name),
    nodeCount: sel.length,
    palettes,
  })
}

figma.on('selectionchange', scanAndSend)
scanAndSend()

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'resize') {
    figma.ui.resize(320, Math.max(120, Math.min(900, Math.round(msg.height))))
    return
  }

  if (msg.type === 'save-palette') {
    const palettes = await loadPalettes()
    const existing = palettes.findIndex((p: any) => p.id === msg.palette.id)
    if (existing >= 0) palettes[existing] = msg.palette
    else palettes.push(msg.palette)
    await savePalettes(palettes)
    figma.ui.postMessage({ type: 'palettes-updated', palettes })
    figma.notify('Palette saved.')
    return
  }

  if (msg.type === 'delete-palette') {
    const palettes = await loadPalettes()
    const updated = palettes.filter((p: any) => p.id !== msg.id)
    await savePalettes(updated)
    figma.ui.postMessage({ type: 'palettes-updated', palettes: updated })
    return
  }

  if (msg.type === 'apply') {
    const sel = figma.currentPage.selection
    if (sel.length === 0) {
      figma.notify('Select at least one layer first.')
      return
    }

    let changed = 0

    const solidReplacements: { from: string; to: string }[] = msg.solidReplacements || []
    const solidRepList = solidReplacements
      .filter(r => r.from.toLowerCase() !== r.to.toLowerCase())
      .map(r => ({ fromRGB: hexToRgb(r.from), toRGB: hexToRgb(r.to) }))

    // Build hash remap once — shared image hashes across all selected nodes
    const modifiedImages: { oldHash: string; bytes: number[] }[] = msg.modifiedImages || []
    const hashRemap = new Map<string, string>()
    for (const { oldHash, bytes } of modifiedImages) {
      try {
        const newImg = figma.createImage(new Uint8Array(bytes))
        hashRemap.set(oldHash, newImg.hash)
      } catch (_) {}
    }

    for (const root of sel) {
      for (const node of getAllNodes(root)) {
        try {
          if ('fills' in node && Array.isArray(node.fills)) {
            const fills = [...node.fills] as Paint[]
            let mod = false
            for (let i = 0; i < fills.length; i++) {
              const fill = fills[i]
              if (fill.type === 'SOLID' && solidRepList.length > 0) {
                for (const rep of solidRepList) {
                  if (colorsEqual(fill.color, rep.fromRGB)) {
                    fills[i] = { ...fill, color: rep.toRGB }
                    mod = true; changed++; break
                  }
                }
              } else if (fill.type === 'IMAGE') {
                const hash = (fill as ImagePaint).imageHash
                if (hash && hashRemap.has(hash)) {
                  fills[i] = { ...fill, imageHash: hashRemap.get(hash)! } as ImagePaint
                  mod = true; changed++
                }
              }
            }
            if (mod) node.fills = fills
          }
          if ('strokes' in node && Array.isArray(node.strokes) && solidRepList.length > 0) {
            const strokes = [...node.strokes] as Paint[]
            let mod = false
            for (let i = 0; i < strokes.length; i++) {
              const stroke = strokes[i]
              if (stroke.type === 'SOLID') {
                for (const rep of solidRepList) {
                  if (colorsEqual(stroke.color, rep.fromRGB)) {
                    strokes[i] = { ...stroke, color: rep.toRGB }
                    mod = true; changed++; break
                  }
                }
              }
            }
            if (mod) node.strokes = strokes
          }
        } catch (_) {}
      }
      root.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })
    }

    figma.notify(
      changed > 0
        ? `Updated ${changed} color${changed === 1 ? '' : 's'} across ${sel.length} node${sel.length === 1 ? '' : 's'}.`
        : 'No changes applied.'
    )
    await scanAndSend()
  }
}
