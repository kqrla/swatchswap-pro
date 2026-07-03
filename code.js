const TOOL_ID = 'swatchswap-pro'
const DISPLAY_NAME = 'SwatchSwap Pro'
const PALETTE_STORAGE_KEY = 'swatchswap.palettes'

figma.root.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })
figma.showUI(__html__, { width: 320, height: 460 })

function getAllNodes(root) {
  const nodes = [root]
  if ('findAll' in root) nodes.push(...root.findAll(() => true))
  return nodes
}

function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v * 255)))
  return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

function colorsEqual(a, b) {
  return Math.abs(a.r - b.r) < 0.002 &&
         Math.abs(a.g - b.g) < 0.002 &&
         Math.abs(a.b - b.b) < 0.002
}

async function loadPalettes() {
  try {
    const raw = await figma.clientStorage.getAsync(PALETTE_STORAGE_KEY)
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}

async function savePalettes(palettes) {
  await figma.clientStorage.setAsync(PALETTE_STORAGE_KEY, palettes)
}

async function scanAndSend() {
  const sel = figma.currentPage.selection
  if (sel.length === 0) {
    figma.ui.postMessage({ type: 'no-selection' })
    return
  }

  const solidColorMap = new Map()
  const imageRefs = []
  const uniqueHashes = new Set()

  for (const root of sel) {
    for (const node of getAllNodes(root)) {
      try {
        if ('fills' in node && Array.isArray(node.fills)) {
          const fills = node.fills
          for (let i = 0; i < fills.length; i++) {
            const fill = fills[i]
            if (fill.type === 'SOLID') {
              solidColorMap.set(rgbToHex(fill.color.r, fill.color.g, fill.color.b), true)
            } else if (fill.type === 'IMAGE' && fill.imageHash) {
              imageRefs.push({ nodeId: node.id, fillIndex: i, imageHash: fill.imageHash })
              uniqueHashes.add(fill.imageHash)
            }
          }
        }
        if ('strokes' in node && Array.isArray(node.strokes)) {
          for (const stroke of node.strokes) {
            if (stroke.type === 'SOLID') solidColorMap.set(rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b), true)
          }
        }
      } catch (_) {}
    }
  }

  if (solidColorMap.size === 0 && imageRefs.length === 0) {
    figma.ui.postMessage({ type: 'error', message: 'No colors found. Try selecting colored shapes inside the group.' })
    return
  }

  const imageList = []
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
    const existing = palettes.findIndex(p => p.id === msg.palette.id)
    if (existing >= 0) palettes[existing] = msg.palette
    else palettes.push(msg.palette)
    await savePalettes(palettes)
    figma.ui.postMessage({ type: 'palettes-updated', palettes })
    figma.notify('Palette saved.')
    return
  }

  if (msg.type === 'delete-palette') {
    const palettes = await loadPalettes()
    const updated = palettes.filter(p => p.id !== msg.id)
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

    const solidRepList = (msg.solidReplacements || [])
      .filter(r => r.from.toLowerCase() !== r.to.toLowerCase())
      .map(r => ({ fromRGB: hexToRgb(r.from), toRGB: hexToRgb(r.to) }))

    // build hash remap once — same recolored image applies to all nodes sharing that hash
    const hashRemap = new Map()
    for (const { oldHash, bytes } of (msg.modifiedImages || [])) {
      try {
        const newImg = figma.createImage(new Uint8Array(bytes))
        hashRemap.set(oldHash, newImg.hash)
      } catch (_) {}
    }

    for (const root of sel) {
      for (const node of getAllNodes(root)) {
        try {
          if ('fills' in node && Array.isArray(node.fills)) {
            const fills = [...node.fills]
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
              } else if (fill.type === 'IMAGE' && fill.imageHash && hashRemap.has(fill.imageHash)) {
                fills[i] = { ...fill, imageHash: hashRemap.get(fill.imageHash) }
                mod = true; changed++
              }
            }
            if (mod) node.fills = fills
          }
          if ('strokes' in node && Array.isArray(node.strokes) && solidRepList.length > 0) {
            const strokes = [...node.strokes]
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
