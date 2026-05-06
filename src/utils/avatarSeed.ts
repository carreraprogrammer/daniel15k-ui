export type TiltPattern = 'breathe' | 'flutter' | 'pulse' | 'ripple' | 'drift'
export type AvatarShape = 'circle' | 'blob' | 'faceted'
export type AvatarFamily = 'orbit' | 'sprout' | 'crystal' | 'comet'

export interface AvatarParams {
  hue: number           // 0–360
  saturation: number    // 50–90
  shape: AvatarShape
  family: AvatarFamily
  tiltPattern: TiltPattern
  pulseSpeed: number    // 1.2–3.0 s
  pieceCount: number
  orbitOffset: number
  secondaryHue: number
}

const TILT_PATTERNS: TiltPattern[] = ['breathe', 'flutter', 'pulse', 'ripple', 'drift']
const SHAPES: AvatarShape[] = ['circle', 'blob', 'faceted']
const FAMILIES: AvatarFamily[] = ['orbit', 'sprout', 'crystal', 'comet']

function seedToBytes(seed: string, count: number): number[] {
  const bytes: number[] = []
  let hash = 5381
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0
  }
  for (let i = 0; i < count; i++) {
    hash = ((hash << 5) + hash + i) | 0
    bytes.push(Math.abs(hash) % 256)
  }
  return bytes
}

export function deriveAvatarParams(seed: string): AvatarParams {
  const b = seedToBytes(seed, 9)
  return {
    hue:          Math.floor((b[0] / 255) * 360),
    saturation:   50 + Math.floor((b[1] / 255) * 40),
    shape:        SHAPES[b[2] % 3],
    family:       FAMILIES[b[8] % 4],
    tiltPattern:  TILT_PATTERNS[b[3] % 5],
    pulseSpeed:   1.2 + (b[4] / 255) * 1.8,
    pieceCount:   4 + (b[5] % 4),
    orbitOffset:  Math.floor((b[6] / 255) * 360),
    secondaryHue: Math.floor((b[7] / 255) * 360),
  }
}
