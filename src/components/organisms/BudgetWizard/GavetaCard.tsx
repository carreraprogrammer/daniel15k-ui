import type { CSSProperties } from 'react';
import styles from './GavetaCard.module.css';

export const CATEGORY_COLORS: Record<string, { c: string; s: string }> = {
  committed:     { c: '#C0392B', s: 'rgba(192,57,43,0.16)' },
  necessary:     { c: '#D4732A', s: 'rgba(212,115,42,0.16)' },
  discretionary: { c: '#C9980A', s: 'rgba(201,152,10,0.16)' },
  investment:    { c: '#1A9E4A', s: 'rgba(26,158,74,0.16)' },
  social:        { c: '#8A4FD8', s: 'rgba(138,79,216,0.16)' },
};

const DEFAULT_COLOR = { c: '#7A6E5E', s: 'rgba(122,110,94,0.16)' };

export type GavetaState = 'empty' | 'filled' | 'locked' | 'highlighted';

export interface GavetaChange {
  kind: 'up' | 'down';
  label: string;
}

interface GavetaCardProps {
  code: string;
  name: string;
  hint?: string;
  amt: number;
  change?: GavetaChange;
  state?: GavetaState;
  showSlider?: boolean;
  sliderMax?: number;
  prior?: number | null;
  faded?: boolean;
  onClick?: () => void;
  onSliderChange?: (value: number) => void;
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

export const GavetaCard = ({
  code,
  name,
  hint,
  amt,
  change,
  state = 'filled',
  showSlider = false,
  sliderMax = 1_500_000,
  prior = null,
  faded = false,
  onClick,
  onSliderChange,
}: GavetaCardProps) => {
  const col = CATEGORY_COLORS[code] ?? DEFAULT_COLOR;
  const initial = name[0]?.toUpperCase() ?? '?';
  const sliderPct = sliderMax > 0 ? Math.min((amt / sliderMax) * 100, 100) : 0;
  const priorPct = prior !== null && sliderMax > 0 ? Math.min((prior / sliderMax) * 100, 100) : null;

  return (
    <div
      className={[
        styles.card,
        state === 'highlighted' ? styles.highlighted : '',
        faded ? styles.faded : '',
        onClick ? styles.clickable : '',
      ].filter(Boolean).join(' ')}
      style={{
        '--cat-c': col.c,
        '--cat-s': col.s,
      } as CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.header}>
        <div className={styles.icon}>{initial}</div>
        <div className={styles.meta}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{name}</span>
            {change && (
              <span className={styles.badge} data-kind={change.kind}>
                {change.label}
              </span>
            )}
          </div>
          {hint && <div className={styles.hint}>{hint}</div>}
        </div>
        <div className={styles.amount} data-state={state}>
          {state === 'empty' ? '$ ___' : `$${fmtK(amt)}`}
          {state === 'locked' && <span className={styles.checkmark}>✓</span>}
        </div>
      </div>

      {showSlider && (
        <div className={styles.sliderWrap}>
          <div className={styles.sliderTrack}>
            <div className={styles.sliderFill} style={{ width: `${sliderPct}%` }} />
            {priorPct !== null && (
              <div className={styles.priorMarker} style={{ left: `${priorPct}%` }} />
            )}
            <div className={styles.sliderThumb} style={{ left: `calc(${sliderPct}% - 10px)` }} />
            {onSliderChange && (
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={50_000}
                value={amt}
                className={styles.sliderInput}
                onChange={(e) => onSliderChange(Number(e.target.value))}
                aria-label={`Monto de ${name}`}
              />
            )}
          </div>
          <div className={styles.sliderChips}>
            {[
              { label: 'Mi promedio', delta: 0, absolute: null },
              { label: '−$100K', delta: -100_000, absolute: null },
              { label: '+$100K', delta: 100_000, absolute: null },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                className={styles.sliderChip}
                onClick={() => {
                  if (onSliderChange) {
                    const next = chip.absolute !== null ? chip.absolute : Math.max(0, amt + chip.delta);
                    onSliderChange(Math.min(next, sliderMax));
                  }
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
