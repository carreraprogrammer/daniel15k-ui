export type AvatarFamily =
  | 'orbit' | 'sprout' | 'crystal' | 'comet'
  | 'horned' | 'stardust' | 'wave' | 'winged'

export type AvatarShape = 'circle' | 'blob' | 'rounded'

export interface AvatarParams {
  hue: number          // 0–360  (primary color)
  saturation: number   // 60–90
  secondaryHue: number // 0–360  (accent color)
  pulseSpeed: number   // 1.8–3.2 s
  family: AvatarFamily // creature type
  shape: AvatarShape   // core clip shape
  pieceCount: number   // 3–7
  orbitOffset: number  // 0–360 deg
  tiltPattern: number  // 0–3
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
  const b = seedToBytes(seed, 9)

  const hue = 34 + Math.floor((b[0] / 255) * 22)
  const secondaryHue = 42 + Math.floor((b[2] / 255) * 16)

  return {
    hue,
    saturation:   62 + Math.floor((b[1] / 255) * 18),
    secondaryHue,
    pulseSpeed:   1.8 + (b[3] / 255) * 1.4,
    family:       FAMILIES[b[4] % FAMILIES.length],
    shape:        SHAPES[b[5] % SHAPES.length],
    pieceCount:   3 + (b[6] % 5),
    orbitOffset:  Math.floor((b[7] / 255) * 360),
    tiltPattern:  b[8] % 4,
  }
}
