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

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

interface SubcatRowProps {
  name: string;
  amt: number;
  source?: SourceKey;
  confidence?: 'high' | 'medium' | 'low';
  locked?: boolean;
  hint?: string | null;
  deltaProposed?: number | null;
  isSystem?: boolean;
}

export const SubcatRow = ({
  name, amt, source = 'benchmarks', confidence = 'high',
  locked = false, hint = null, deltaProposed = null, isSystem = false,
}: SubcatRowProps) => {
  const cfg = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.benchmarks;
  const isLow = confidence === 'low';
  return (
    <div className={`${styles.row} ${isSystem ? styles.rowSystem : ''}`}>
      <span className={`${styles.bullet} ${isLow ? styles.bulletWarn : ''}`} />
      <div className={styles.copy}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{name}</span>
          {isSystem && <span className={styles.autoTag}>auto</span>}
        </div>
        {hint && (
          <div className={`${styles.hint} ${isLow ? styles.hintWarn : ''}`}>{hint}</div>
        )}
      </div>
      <div className={styles.valueCol}>
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
      </div>
    </div>
  );
};
