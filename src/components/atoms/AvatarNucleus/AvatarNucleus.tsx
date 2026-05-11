import { useMemo, type CSSProperties } from 'react'
import { createAvatar } from '@dicebear/core'
import {
  rings,
  croodlesNeutral,
  shapes,
  pixelArtNeutral,
  adventurerNeutral,
  funEmoji,
  loreleiNeutral,
  botttsNeutral,
} from '@dicebear/collection'
import { deriveAvatarParams, type AvatarFamily } from '../../../utils/avatarSeed'
import styles from './AvatarNucleus.module.css'

const FAMILY_STYLE: Record<AvatarFamily, Parameters<typeof createAvatar>[0]> = {
  orbit:    rings,
  sprout:   croodlesNeutral,
  crystal:  shapes,
  comet:    pixelArtNeutral,
  horned:   adventurerNeutral,
  stardust: funEmoji,
  wave:     loreleiNeutral,
  winged:   botttsNeutral,
}

interface Props {
  seed: string
  level: number
  size?: number
}

export const AvatarNucleus = ({ seed, level, size }: Props) => {
  const params = deriveAvatarParams(seed)
  const avatarSize = size ?? 28
  const pieces = Array.from({ length: params.pieceCount }, (_, index) => index)

  const svgContent = useMemo(() => {
    const style = FAMILY_STYLE[params.family]
    const raw = createAvatar(style, { seed }).toString()
    // Strip the white background rect so .core's dark bg shows through
    return raw.replace(/<rect\b[^>]*fill="#fff"[^>]*\/>/, '')
  }, [seed, params.family])

  const cssVars = {
    '--av-hue':     String(params.hue),
    '--av-sat':     `${params.saturation}%`,
    '--av-size':    `${avatarSize}px`,
    '--av-speed':   `${params.pulseSpeed}s`,
    '--av-sec-hue': String(params.secondaryHue),
    '--av-offset':  `${params.orbitOffset}deg`,
  } as CSSProperties

  return (
    <div
      className={styles.root}
      style={cssVars}
      data-level={level}
      data-shape={params.shape}
      data-family={params.family}
      data-tilt={params.tiltPattern}
      aria-hidden="true"
    >
      <div className={styles.ring} />
      {/* eslint-disable-next-line react/no-danger */}
      <div className={styles.core} dangerouslySetInnerHTML={{ __html: svgContent }} />
      <div className={styles.pieces}>
        {pieces.map((piece) => (
          <span
            key={piece}
            className={styles.piece}
            style={{ '--av-piece': piece, '--av-total': pieces.length } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}
