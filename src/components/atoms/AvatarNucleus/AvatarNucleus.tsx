import type { CSSProperties } from 'react'
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
      data-tilt={params.tiltPattern}
      aria-hidden="true"
    >
      <div className={styles.ring} />
      <div className={styles.core} />
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
