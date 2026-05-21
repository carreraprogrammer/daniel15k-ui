import styles from './StatusStrip.module.css';

export interface StatusCell {
  label: string;
  value: string;
  delta?: string;
  tone?: 'warn' | 'bad';
}

interface StatusStripProps {
  cells: StatusCell[];
}

export const StatusStrip = ({ cells }: StatusStripProps) => (
  <div className={styles.strip}>
    {cells.map((c, i) => (
      <div key={i} className={styles.cell}>
        <span className={styles.label}>{c.label}</span>
        <span className={`${styles.value} ${c.tone === 'warn' ? styles.warn : c.tone === 'bad' ? styles.bad : ''}`}>
          {c.value}
          {c.delta && (
            <span className={`${styles.delta} ${c.delta.startsWith('+') ? styles.up : styles.down}`}>
              {c.delta}
            </span>
          )}
        </span>
      </div>
    ))}
  </div>
);
