import { IonIcon } from '@ionic/react';
import { useState } from 'react';
import { resolveNamedIcon } from './iconRegistry';
import styles from './SubcatRow.module.css';

type SourceKey = string;

const SOURCE_CONFIG: Record<string, { label: string; icon: string; dashed: boolean; cls: string }> = {
  recurring_obligations: { label: 'recurrente',   icon: '🔒', dashed: false, cls: 'success' },
  recurring:             { label: 'recurrente',   icon: '🔒', dashed: false, cls: 'success' },
  budgets:               { label: 'plan abierto', icon: '●',  dashed: false, cls: 'success' },
  planned_expenses:      { label: 'planeado',     icon: '●',  dashed: false, cls: 'success' },
  planned_expense:       { label: 'planeado',     icon: '●',  dashed: false, cls: 'success' },
  transactions:          { label: 'promedio 3m',  icon: '●',  dashed: false, cls: 'brand'   },
  history:               { label: 'promedio 3m',  icon: '●',  dashed: false, cls: 'brand'   },
  prev_month:            { label: 'mes anterior', icon: '●',  dashed: false, cls: 'brand'   },
  benchmarks:            { label: 'estimado base',icon: '○',  dashed: true,  cls: 'warn'    },
  benchmark:             { label: 'estimado base',icon: '○',  dashed: true,  cls: 'warn'    },
  imprevisto:            { label: 'sistema',      icon: '┄',  dashed: true,  cls: 'muted'   },
};

// Quick-nudge chips shown below the input when editing
const NUDGE_CHIPS = [
  { label: '−50K', delta: -50_000 },
  { label: '−25K', delta: -25_000 },
  { label: '+25K', delta:  25_000 },
  { label: '+50K', delta:  50_000 },
  { label: '+100K', delta: 100_000 },
];

function LockSvg() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2"/>
      <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
    </svg>
  );
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

interface SubcatRowProps {
  name: string;
  amt: number;
  icon?: string | null;
  source?: SourceKey;
  confidence?: 'high' | 'medium' | 'low';
  locked?: boolean;
  hint?: string | null;
  deltaProposed?: number | null;
  isSystem?: boolean;
  onSetAmount?: (amt: number) => void;
}

export const SubcatRow = ({
  name, amt, icon = null, source = 'benchmarks', confidence = 'high',
  locked = false, hint = null, deltaProposed = null, isSystem = false,
  onSetAmount,
}: SubcatRowProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const cfg = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.benchmarks;
  const isLow = confidence === 'low';
  const canEdit = onSetAmount != null && !locked;

  const startEdit = () => {
    setDraft(String(amt));
    setEditing(true);
  };

  const commitEdit = () => {
    const parsed = parseInt(draft.replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) onSetAmount?.(parsed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  const nudge = (delta: number) => {
    const next = Math.max(0, amt + delta);
    onSetAmount?.(next);
  };

  return (
    <div className={`${styles.row} ${isSystem ? styles.rowSystem : ''} ${editing ? styles.rowEditing : ''}`}>
      {icon
        ? <span className={styles.subcatIcon}><IonIcon icon={resolveNamedIcon(icon)} /></span>
        : <span className={`${styles.bullet} ${isLow ? styles.bulletWarn : ''}`} />
      }

      <div className={styles.copy}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{name}</span>
          {isSystem && <span className={styles.autoTag}>auto</span>}
        </div>
        {hint && (
          <div className={`${styles.hint} ${isLow ? styles.hintWarn : ''}`}>{hint}</div>
        )}
        {editing && (
          <div className={styles.nudgeRow}>
            {NUDGE_CHIPS.map((c) => (
              <button
                key={c.label}
                type="button"
                className={styles.nudgeChip}
                onClick={() => nudge(c.delta)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.valueCol}>
        {onSetAmount != null ? (
          locked ? (
            <span className={styles.lockRow}>
              <LockSvg />
              <span className={styles.amt}>${fmtK(amt)}</span>
            </span>
          ) : editing ? (
            <input
              type="number"
              className={styles.amtInput}
              value={draft}
              min={0}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              aria-label={`Monto de ${name}`}
            />
          ) : (
            <button
              type="button"
              className={styles.amtTap}
              onClick={canEdit ? startEdit : undefined}
              aria-label={`Editar monto de ${name}`}
            >
              ${fmtK(amt)}
              {canEdit && <span className={styles.editPencil}>✎</span>}
            </button>
          )
        ) : (
          <>
            <div className={styles.amtRow}>
              {deltaProposed != null && deltaProposed > 0 && (
                <span className={styles.delta}>+{fmtK(deltaProposed)}</span>
              )}
              <span className={styles.amt}>${fmtK(amt)}</span>
            </div>
            <span className={`${styles.chip} ${cfg.dashed ? styles.chipDashed : ''} ${styles[`chip_${cfg.cls}`]}`}>
              <span className={styles.chipIcon}>{locked ? '🔒' : cfg.icon}</span>
              {cfg.label}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
