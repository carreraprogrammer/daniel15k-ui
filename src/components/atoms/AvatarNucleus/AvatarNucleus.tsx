import { useMemo, type CSSProperties } from 'react'
import { createAvatar } from '@dicebear/core'
import { rings } from '@dicebear/collection'
import { deriveAvatarParams } from '../../../utils/avatarSeed'
import styles from './AvatarNucleus.module.css'

interface Props {
  seed: string
  level: number
  size?: number
}

function seededFrac(seed: string, index: number): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = (Math.imul(h, 0x01000193)) >>> 0
  }
  h ^= index * 0x9e3779b9
  h = (Math.imul(h, 0x01000193)) >>> 0
  return (h >>> 0) / 0xffffffff
}

export const AvatarNucleus = ({ seed, level, size }: Props) => {
  const params = deriveAvatarParams(seed)
  const avatarSize = size ?? 28
  const lv = Math.min(Math.max(level, 0), 5)

  const uid = seed.replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'av'
  const glowGradId  = `gl-${uid}`
  const shellGradId = `sh-${uid}`
  const seedBgId    = `sb-${uid}`

  // Brand-aligned palette — DiceBear picks unique combinations per seed
  const BRAND_RING_COLORS = [
    '1E2050', // brand-subtle (deep indigo)
    '2D3A8C', // mid indigo
    '4A58E0', // brand-active
    '5B6AF0', // brand primary
    '6B7AF8', // brand-hover
    '818CF8', // periwinkle
    '8B9BFF', // light indigo
    '003D36', // deep teal
    '006B60', // mid teal
    '00A89A', // teal
    '00E5CC', // accent cyan
    '7FFFF0', // light cyan
  ]

  // DiceBear rings — unique ring structure per user seed, constrained to brand palette
  const ringsSvg = useMemo(
    () => createAvatar(rings, {
      seed,
      backgroundColor: [],
      ringColor: BRAND_RING_COLORS,
    }).toString(),
    [seed], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const { shellRings, filaments } = useMemo(() => {
    const sr = [
      { rx: 42, ry: 36 + seededFrac(seed, 0) * 6,  angle: seededFrac(seed, 1) * 25 },
      { rx: 34, ry: 28 + seededFrac(seed, 2) * 5,  angle: seededFrac(seed, 3) * 40 },
    ]
    const f = Array.from({ length: params.filamentCount }, (_, i) => {
      const angle = seededFrac(seed, i + 80) * 360
      const len   = 18 + seededFrac(seed, i + 90) * 16
      const rad   = (angle * Math.PI) / 180
      return { x2: 50 + Math.cos(rad) * len, y2: 50 + Math.sin(rad) * len }
    })
    return { shellRings: sr, filaments: f }
  }, [seed, params.filamentCount])

  const cssVars = {
    '--av-hue':     String(params.hue),
    '--av-sat':     `${params.saturation}%`,
    '--av-size':    `${avatarSize}px`,
    '--av-speed':   `${params.pulseSpeed}s`,
    '--av-sec-hue': String(params.secondaryHue),
    '--av-offset':  `${params.orbitOffset}deg`,
  } as CSSProperties

  const filamentOpacity = [0,    0,    0.22, 0.44, 0.64, 0.84][lv]
  const centerOpacity   = [0.18, 0.42, 0.70, 0.85, 0.95, 1.00][lv]
  const centerRadius    = [1.4,  1.9,  2.6,  3.2,  4.0,  5.0][lv]

  const hsl = (h: number, s: number, l: number, a = 1) =>
    a < 1 ? `hsl(${h} ${s}% ${l}% / ${a})` : `hsl(${h} ${s}% ${l}%)`

  const h  = params.hue
  const sh = params.secondaryHue

  return (
    <div
      className={styles.root}
      style={cssVars}
      data-level={lv}
      data-shape={params.shape}
      data-family={params.family}
      data-tilt={params.tiltPattern}
      aria-hidden="true"
    >
      <div className={styles.ring} />

      <div className={styles.core}>
        {lv === 0 ? (
          /* ── LEVEL 0: SEMILLA — pure custom SVG, dormant ── */
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id={seedBgId} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={hsl(h, 40, 6)}  />
                <stop offset="60%"  stopColor={hsl(h, 35, 10)} />
                <stop offset="100%" stopColor={hsl(h, 30, 5)}  />
              </radialGradient>
              <radialGradient id={shellGradId} cx="50%" cy="50%" r="50%">
                <stop offset="70%"  stopColor="transparent"      stopOpacity="0"   />
                <stop offset="88%"  stopColor={hsl(h, 45, 22, 0.6)} />
                <stop offset="100%" stopColor={hsl(h, 40, 14, 0.9)} />
              </radialGradient>
              <radialGradient id={glowGradId} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="white"            stopOpacity="0.18" />
                <stop offset="50%"  stopColor={hsl(sh, 80, 78)} stopOpacity="0.08" />
                <stop offset="100%" stopColor="transparent"      stopOpacity="0"    />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="50" fill={`url(#${seedBgId})`} />
            {shellRings.map((sr, i) => (
              <ellipse
                key={i}
                cx="50" cy="50"
                rx={sr.rx} ry={sr.ry}
                transform={`rotate(${sr.angle} 50 50)`}
                fill="none"
                stroke={hsl(h, 50, 45)}
                strokeWidth={i === 0 ? 1.2 : 0.7}
                opacity={i === 0 ? 0.55 : 0.35}
              />
            ))}
            {/* Dormant life — barely visible center */}
            <circle cx="50" cy="50" r="8"           fill={`url(#${glowGradId})`} />
            <circle cx="50" cy="50" r={centerRadius} fill={hsl(sh, 80, 78)} opacity="0.2" />
            {/* Hard outer shell */}
            <circle cx="50" cy="50" r="50"           fill={`url(#${shellGradId})`} />
          </svg>
        ) : (
          /* ── LEVELS 1–5: DiceBear rings + glow overlay ── */
          <>
            {/* eslint-disable-next-line react/no-danger */}
            <div className={styles.ringBase} dangerouslySetInnerHTML={{ __html: ringsSvg }} />

            <svg className={styles.overlayGlow} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id={glowGradId} cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="white"           stopOpacity={centerOpacity}        />
                  <stop offset="45%"  stopColor={hsl(sh, 90, 82)} stopOpacity={centerOpacity * 0.5}  />
                  <stop offset="100%" stopColor="transparent"      stopOpacity="0"                    />
                </radialGradient>
              </defs>

              {/* Filaments — cyan tendrils, visible from level 2 */}
              {filamentOpacity > 0 && filaments.map((f, i) => (
                <line
                  key={i}
                  x1="50" y1="50"
                  x2={f.x2} y2={f.y2}
                  stroke={hsl(sh, 85, 72)}
                  strokeWidth="0.38"
                  opacity={filamentOpacity}
                />
              ))}

              {/* Center glow */}
              <circle cx="50" cy="50" r="18" fill={`url(#${glowGradId})`} />

              {/* Nucleus core point */}
              <circle
                cx="50" cy="50"
                r={centerRadius}
                fill={hsl(sh, 100, 90)}
                opacity={Math.max(0.2, centerOpacity)}
              />
            </svg>
          </>
        )}
      </div>

      <div className={styles.pieces}>
        {Array.from({ length: params.pieceCount }, (_, i) => (
          <span
            key={i}
            className={styles.piece}
            style={{ '--av-piece': i, '--av-total': params.pieceCount } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}
