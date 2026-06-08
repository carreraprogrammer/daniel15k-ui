import type { CSSProperties } from 'react'
import { PERSONAS, EMOTIONS } from '../../../store/buddyStore'
import type { Persona, Emotion } from '../../../store/buddyStore'
import styles from './Buddy.module.css'

interface Props {
  persona?: Persona
  emotion?: Emotion
  size?: number
  motion?: number
  idleBlinkSeed?: number
}

const INK = 'var(--ink)'

function catch_(cx: number, cy: number, pf: number) {
  return <circle cx={cx} cy={cy} r={1.7 * pf} fill="rgba(255,255,255,0.92)" />
}

function roundEyes(y: number, r: number, pf: number, lookY = 0) {
  return (
    <g className={styles.eyes}>
      <circle cx="37" cy={y} r={r * pf} fill={INK} />
      <circle cx="63" cy={y} r={r * pf} fill={INK} />
      {catch_(34.5, y - 2 + lookY, pf)}
      {catch_(60.5, y - 2 + lookY, pf)}
    </g>
  )
}

function faceFor(emotion: Emotion, pf: number) {
  switch (emotion) {
    case 'calm':
      return (
        <g>
          {roundEyes(50, 5.4, pf)}
          <path d="M41 64 Q50 70.5 59 64" stroke={INK} strokeWidth="3.4"
            fill="none" strokeLinecap="round" />
        </g>
      )

    case 'happy':
      return (
        <g>
          <g className={styles.eyes}>
            <path d="M31.5 51 Q37 44 42.5 51" stroke={INK} strokeWidth="3.8"
              fill="none" strokeLinecap="round" />
            <path d="M57.5 51 Q63 44 68.5 51" stroke={INK} strokeWidth="3.8"
              fill="none" strokeLinecap="round" />
          </g>
          <path d="M39 62 Q50 75 61 62 Q50 67.5 39 62 Z" fill={INK} />
          <path d="M44.5 70.5 Q50 73 55.5 70.5" stroke="rgba(255,160,150,0.55)"
            strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
      )

    case 'think':
      return (
        <g>
          {roundEyes(49, 5, pf, -1.5)}
          <path d="M56 41.5 Q63 39 70 41.5" stroke={INK} strokeWidth="2.6"
            fill="none" strokeLinecap="round" />
          <path d="M45 66.5 Q49 64.5 53 66.8" stroke={INK} strokeWidth="3"
            fill="none" strokeLinecap="round" />
        </g>
      )

    case 'worry':
      return (
        <g>
          <path d="M31 45 L43 41" stroke={INK} strokeWidth="3"
            fill="none" strokeLinecap="round" />
          <path d="M69 45 L57 41" stroke={INK} strokeWidth="3"
            fill="none" strokeLinecap="round" />
          {roundEyes(52, 4.7, pf)}
          <path d="M44 67.5 Q50 64.5 56 67.5" stroke={INK} strokeWidth="3"
            fill="none" strokeLinecap="round" />
        </g>
      )

    case 'cheer':
      return (
        <g>
          <path d="M30.5 40.5 Q37 37 43.5 40.5" stroke={INK} strokeWidth="2.6"
            fill="none" strokeLinecap="round" />
          <path d="M56.5 40.5 Q63 37 69.5 40.5" stroke={INK} strokeWidth="2.6"
            fill="none" strokeLinecap="round" />
          {roundEyes(50.5, 5.6, pf, -1)}
          <path d="M37.5 61 Q50 77 62.5 61 Q50 68 37.5 61 Z" fill={INK} />
        </g>
      )

    case 'sleep':
      return (
        <g>
          <path d="M31.5 50 Q37 55.5 42.5 50" stroke={INK} strokeWidth="3.4"
            fill="none" strokeLinecap="round" />
          <path d="M57.5 50 Q63 55.5 68.5 50" stroke={INK} strokeWidth="3.4"
            fill="none" strokeLinecap="round" />
          <path d="M46.5 66 Q50 68.5 53.5 66" stroke={INK} strokeWidth="2.6"
            fill="none" strokeLinecap="round" />
        </g>
      )
  }
}

function Extras({ emotion }: { emotion: Emotion }) {
  if (emotion === 'think') {
    return (
      <div className={styles.extras}>
        <span className={styles.thinkDot} />
        <span className={styles.thinkDot} />
        <span className={styles.thinkDot} />
      </div>
    )
  }
  if (emotion === 'sleep') {
    return (
      <div className={styles.extras}>
        <span className={styles.zLetter}>z</span>
        <span className={styles.zLetter}>z</span>
        <span className={styles.zLetter}>z</span>
      </div>
    )
  }
  if (emotion === 'happy' || emotion === 'cheer') {
    return (
      <div className={styles.extras}>
        <span className={styles.spark} />
        <span className={styles.spark} />
        <span className={styles.spark} />
      </div>
    )
  }
  return null
}

export const Buddy = ({
  persona = 'pip',
  emotion = 'calm',
  size = 120,
  motion = 1,
  idleBlinkSeed = 0,
}: Props) => {
  const P = PERSONAS[persona]
  const E = EMOTIONS[emotion]
  const amp  = (E.amp * P.motion * motion).toFixed(2)
  const dur  = (E.dur / (0.7 + 0.3 * P.motion)).toFixed(2)
  const blushOn = emotion === 'happy' || emotion === 'cheer' || emotion === 'calm'

  const style: CSSProperties = {
    '--c':           P.color,
    '--size':        `${size}px`,
    '--amp':         `${amp}px`,
    '--dur':         `${dur}s`,
    '--glow':        E.glow,
    '--round':       P.round,
    '--blink-delay': `${-(idleBlinkSeed % 5)}s`,
  } as CSSProperties

  const rootClass = [styles.buddy, styles[emotion]].filter(Boolean).join(' ')

  return (
    <div className={rootClass} style={style} aria-hidden="true">
      <div className={styles.stage}>
        <Extras emotion={emotion} />
        <div className={styles.body}>
          <div className={styles.shine} />
          <svg className={styles.face} viewBox="0 0 100 100">
            {faceFor(emotion, P.pupil)}
          </svg>
          {blushOn && (
            <>
              <span className={`${styles.cheek} ${styles.cheekL}`} />
              <span className={`${styles.cheek} ${styles.cheekR}`} />
            </>
          )}
        </div>
      </div>
      <div className={styles.shadow} />
    </div>
  )
}
