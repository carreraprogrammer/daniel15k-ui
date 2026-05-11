import { useMemo, type CSSProperties } from 'react'
import { createAvatar } from '@dicebear/core'
import { identicon } from '@dicebear/collection'
import { deriveAvatarParams } from '../../../utils/avatarSeed'
import styles from './AvatarNucleus.module.css'

interface Props {
  seed: string
  level: number
  size?: number
}

export const AvatarNucleus = ({ seed, level, size }: Props) => {
  const params = deriveAvatarParams(seed)
  const avatarSize = size ?? 28
  const pieces = Array.from({ length: params.pieceCount }, (_, index) => index)

  // identicon: viewBox 0 0 5 5 — crisp 5×5 grid at any size, unique per seed.
  // No background rect to strip — the mask handles clipping natively.
  const svgContent = useMemo(() => createAvatar(identicon, { seed }).toString(), [seed])

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
