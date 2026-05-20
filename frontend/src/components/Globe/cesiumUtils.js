/**
 * Cesium utility helpers — high-definition (Retina-grade) canvas-based glow markers,
 * dashed materials, billboard icons. Pure functions, no Cesium Viewer state.
 */
import * as Cesium from 'cesium'

const CACHE = new Map()

/** Robust color parsing helper that safely adds alpha to HEX or RGB/RGBA strings */
export function colorToRgba(color, alpha = 1) {
  if (!color) return `rgba(255, 255, 255, ${alpha})`
  const trimmed = color.trim().toLowerCase()
  if (trimmed.startsWith('#')) {
    const cleanHex = trimmed.replace('#', '')
    let r = 0, g = 0, b = 0
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex[0] + cleanHex[0], 16)
      g = parseInt(cleanHex[1] + cleanHex[1], 16)
      b = parseInt(cleanHex[2] + cleanHex[2], 16)
    } else if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16)
      g = parseInt(cleanHex.substring(2, 4), 16)
      b = parseInt(cleanHex.substring(4, 6), 16)
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  if (trimmed.startsWith('rgba')) {
    // Replace the last alpha value
    return trimmed.replace(/[^,]+(?=\s*\)$)/, ` ${alpha}`)
  }
  if (trimmed.startsWith('rgb')) {
    return trimmed.replace('rgb', 'rgba').replace(')', `, ${alpha})`)
  }
  return color
}

/** Soft radial-glow circle drawn at 2x resolution for Retina-level crispness */
export function glowCircleCanvas(color = '#00d4ff', size = 32, coreAlpha = 1) {
  const drawSize = size * 2
  const key = `glow:${color}:${drawSize}:${coreAlpha}`
  if (CACHE.has(key)) return CACHE.get(key)
  
  const c = document.createElement('canvas')
  c.width = c.height = drawSize
  const ctx = c.getContext('2d')
  const r = drawSize / 2
  
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, color)
  g.addColorStop(0.3, color)
  g.addColorStop(0.6, colorToRgba(color, 0.35))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  
  ctx.fillStyle = g
  ctx.fillRect(0, 0, drawSize, drawSize)
  
  // Bright core
  ctx.globalAlpha = coreAlpha
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(r, r, drawSize * 0.12, 0, Math.PI * 2)
  ctx.fill()
  
  CACHE.set(key, c)
  return c
}

/** Diamond shape drawn at 2x resolution for perfect vector sharpness */
export function diamondCanvas(color = '#ffffff', size = 18) {
  const drawSize = size * 2
  const key = `diamond:${color}:${drawSize}`
  if (CACHE.has(key)) return CACHE.get(key)
  
  const c = document.createElement('canvas')
  c.width = c.height = drawSize
  const ctx = c.getContext('2d')
  const r = drawSize / 2
  
  // Soft glow under diamond
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, colorToRgba(color, 0.4))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, drawSize, drawSize)
  
  // Sharp diamond
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(r, 4)
  ctx.lineTo(drawSize - 4, r)
  ctx.lineTo(r, drawSize - 4)
  ctx.lineTo(4, r)
  ctx.closePath()
  ctx.fill()
  
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.6
  ctx.stroke()
  
  CACHE.set(key, c)
  return c
}

/** Triangle / wedge drawn at 2x resolution */
export function triangleCanvas(color = '#ff4444', size = 18) {
  const drawSize = size * 2
  const key = `triangle:${color}:${drawSize}`
  if (CACHE.has(key)) return CACHE.get(key)
  
  const c = document.createElement('canvas')
  c.width = c.height = drawSize
  const ctx = c.getContext('2d')
  const r = drawSize / 2
  
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, colorToRgba(color, 0.5))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, drawSize, drawSize)
  
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(r, 6)
  ctx.lineTo(drawSize - 6, drawSize - 6)
  ctx.lineTo(6, drawSize - 6)
  ctx.closePath()
  ctx.fill()
  
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.6
  ctx.stroke()
  
  CACHE.set(key, c)
  return c
}

/** Airplane vector icon drawn at 2x resolution with high-fidelity glow */
export function airplaneCanvas(color = '#ffd866', size = 36) {
  const drawSize = size * 2
  const key = `plane:${color}:${drawSize}`
  if (CACHE.has(key)) return CACHE.get(key)
  
  const c = document.createElement('canvas')
  c.width = c.height = drawSize
  const ctx = c.getContext('2d')
  const cx = drawSize / 2, cy = drawSize / 2
  
  // High-def shadows
  ctx.shadowColor = color
  ctx.shadowBlur = 16
  ctx.fillStyle = color
  
  ctx.beginPath()
  ctx.moveTo(cx, cy - 24)             // nose
  ctx.lineTo(cx + 4, cy - 8)
  ctx.lineTo(cx + 28, cy + 4)         // right wing tip
  ctx.lineTo(cx + 28, cy + 8)
  ctx.lineTo(cx + 4, cy + 4)
  ctx.lineTo(cx + 4, cy + 16)
  ctx.lineTo(cx + 12, cy + 22)
  ctx.lineTo(cx + 12, cy + 24)
  ctx.lineTo(cx - 12, cy + 24)
  ctx.lineTo(cx - 12, cy + 22)
  ctx.lineTo(cx - 4, cy + 16)
  ctx.lineTo(cx - 4, cy + 4)
  ctx.lineTo(cx - 28, cy + 8)
  ctx.lineTo(cx - 28, cy + 4)
  ctx.lineTo(cx - 4, cy - 8)
  ctx.closePath()
  ctx.fill()
  
  ctx.shadowBlur = 0
  ctx.lineWidth = 1.4
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  
  CACHE.set(key, c)
  return c
}

/** Ship icon chevron drawn at 2x resolution */
export function shipCanvas(color = '#00ffea', size = 22) {
  const drawSize = size * 2
  const key = `ship:${color}:${drawSize}`
  if (CACHE.has(key)) return CACHE.get(key)
  
  const c = document.createElement('canvas')
  c.width = c.height = drawSize
  const ctx = c.getContext('2d')
  const cx = drawSize / 2, cy = drawSize / 2
  
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.fillStyle = color
  
  ctx.beginPath()
  ctx.moveTo(cx, cy - 18)
  ctx.lineTo(cx + 10, cy + 14)
  ctx.lineTo(cx, cy + 8)
  ctx.lineTo(cx - 10, cy + 14)
  ctx.closePath()
  ctx.fill()
  
  ctx.shadowBlur = 0
  CACHE.set(key, c)
  return c
}

/** Satellite square icon drawn at 2x resolution */
export function satelliteCanvas(color = '#00ffe5', size = 10) {
  const drawSize = size * 2
  const key = `sat:${color}:${drawSize}`
  if (CACHE.has(key)) return CACHE.get(key)
  
  const c = document.createElement('canvas')
  c.width = c.height = drawSize
  const ctx = c.getContext('2d')
  const r = drawSize / 2
  
  const g = ctx.createRadialGradient(r, r, 0, r, r, r)
  g.addColorStop(0, color)
  g.addColorStop(0.4, color.replace(')', ',0.6)').replace('rgb', 'rgba'))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  
  ctx.fillStyle = g
  ctx.fillRect(0, 0, drawSize, drawSize)
  
  CACHE.set(key, c)
  return c
}

/** Hex → Cesium.Color */
export function toCesiumColor(hex, alpha = 1) {
  const c = Cesium.Color.fromCssColorString(hex || '#ffffff')
  c.alpha = alpha
  return c
}

/** Linear interpolation helper */
export function lerp(a, b, t) { return a + (b - a) * t }
