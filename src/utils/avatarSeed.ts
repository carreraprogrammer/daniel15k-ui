export type AvatarFamily =
  | 'orbit' | 'sprout' | 'crystal' | 'comet'
  | 'horned' | 'stardust' | 'wave' | 'winged'

export type AvatarShape = 'circle' | 'blob' | 'rounded'

export interface AvatarParams {
  hue: number          // 214–260 (indigo/blue range — brand)
  saturation: number   // 68–88
  secondaryHue: number // 164–196 (teal/cyan range — accent)
  pulseSpeed: number   // 1.8–3.2 s
  family: AvatarFamily // retained for compatibility
  shape: AvatarShape   // core clip shape
  pieceCount: number   // 3–7
  orbitOffset: number  // 0–360 deg
  tiltPattern: number  // 0–3
  ringCount: number    // 3–5 concentric organic rings
  filamentCount: number // 4–8 radial filaments
}

const FAMILIES: AvatarFamily[] = [
  'orbit', 'sprout', 'crystal', 'comet',
  'horned', 'stardust', 'wave', 'winged',
]
const SHAPES: AvatarShape[] = ['circle', 'blob', 'rounded']

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
  const b = seedToBytes(seed, 11)

  // Brand-aligned hues: indigo/blue (214–260) primary, teal/cyan (164–196) secondary
  const hue = 214 + Math.floor((b[0] / 255) * 46)
  const secondaryHue = 164 + Math.floor((b[2] / 255) * 32)

  return {
    hue,
    saturation:    68 + Math.floor((b[1] / 255) * 20),
    secondaryHue,
    pulseSpeed:    1.8 + (b[3] / 255) * 1.4,
    family:        FAMILIES[b[4] % FAMILIES.length],
    shape:         SHAPES[b[5] % SHAPES.length],
    pieceCount:    3 + (b[6] % 5),
    orbitOffset:   Math.floor((b[7] / 255) * 360),
    tiltPattern:   b[8] % 4,
    ringCount:     3 + (b[9] % 3),
    filamentCount: 4 + (b[10] % 5),
  }
}
