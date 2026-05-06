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
  const coreSize = size ?? params.coreSize

  const cssVars = {
    '--av-hue':     String(params.hue),
    '--av-sat':     `${params.saturation}%`,
    '--av-size':    `${coreSize}px`,
    '--av-speed':   `${params.pulseSpeed}s`,
    '--av-sec-hue': String(params.secondaryHue),
  } as CSSProperties

  return (
    <div
      className={styles.root}
      style={cssVars}
      data-level={level}
      data-shape={params.shape}
      data-tilt={params.tiltPattern}
      data-glow={params.glowAmplitude}
      aria-hidden="true"
    >
      <div className={styles.corona} />
      <div className={styles.ring} />
      <div className={styles.core} />
    </div>
  )
}
