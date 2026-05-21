import type { CSSProperties, ReactNode } from 'react';
import { IonIcon } from '@ionic/react';
import { sparklesOutline } from 'ionicons/icons';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import styles from './DrawerDetailContent.module.css';

const ARC_LEN = 283;

export interface DrawerDetailStat {
  label: string;
  value: ReactNode;
  tone?: 'positive' | 'negative';
}

export interface DrawerDetailTransaction {
  id: string;
  name: string;
  meta?: string;
  amount: number;
  icon: string;
  isIncome?: boolean;
}

export interface DrawerDetailContentProps {
  color: string;
  soft: string;
  spent: number;
  pct: number;
  limit?: number | null;
  arcCaption?: string;
  stats: DrawerDetailStat[];
  insightTitle?: string;
  insightText?: ReactNode;
  insightIcon?: string;
  transactions: DrawerDetailTransaction[];
  loading?: boolean;
  emptyText: string;
}

export const DrawerDetailContent = ({
  color,
  soft,
  spent,
  pct,
  limit,
  arcCaption,
  stats,
  insightTitle,
  insightText,
  insightIcon = sparklesOutline,
  transactions,
  loading = false,
  emptyText,
}: DrawerDetailContentProps) => {
  const safePct = Math.max(0, Math.min(pct, 100));
  const offset = ARC_LEN - ARC_LEN * (safePct / 100);

  return (
    <div
      className={styles.content}
      style={{ '--drawer-color': color, '--drawer-soft': soft } as CSSProperties}
    >
      <div className={styles.arcWrap}>
        <div className={styles.arcBig}>
          <div className={styles.arcNum}>{formatCurrencyCompact(spent)}</div>
          <div className={styles.arcSub}>{arcCaption ?? `${Math.round(pct)}% del plan`}</div>
        </div>
        <div className={styles.arcFigure}>
          <svg width="220" height="110" viewBox="0 0 220 120">
            <path d="M20 110 A90 90 0 0 1 200 110" stroke="var(--surface-border)" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path
              d="M20 110 A90 90 0 0 1 200 110"
              stroke={color}
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              strokeDashoffset={offset}
              className={styles.arcPath}
            />
            <text x="110" y="118" textAnchor="middle" className={styles.arcLimit}>
              {limit == null ? 'Sin línea' : `${formatCurrencyCompact(limit)} plan`}
            </text>
          </svg>
        </div>
      </div>

      <div className={styles.statsRow}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <span className={styles.statLabel}>{stat.label}</span>
            <span
              className={[
                styles.statValue,
                stat.tone === 'positive' ? styles.statPositive : '',
                stat.tone === 'negative' ? styles.statNegative : '',
              ].filter(Boolean).join(' ')}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {insightTitle || insightText ? (
        <div className={styles.insight}>
          <div className={styles.insightIcon}><IonIcon icon={insightIcon} /></div>
          <div className={styles.insightBody}>
            {insightTitle ? <p className={styles.insightTitle}>{insightTitle}</p> : null}
            {insightText ? <p className={styles.insightText}>{insightText}</p> : null}
          </div>
        </div>
      ) : null}

      <div className={styles.secHead}>
        <h3 className={styles.secTitle}>Movimientos</h3>
      </div>

      {loading ? (
        <div className={styles.center}><span className={styles.spinner} /></div>
      ) : transactions.length === 0 ? (
        <div className={styles.empty}>{emptyText}</div>
      ) : (
        <ul className={styles.txnGroup}>
          {transactions.map((transaction) => (
            <li key={transaction.id} className={styles.txnRow}>
              <div className={styles.txnIcon}><IonIcon icon={transaction.icon} /></div>
              <div className={styles.txnBody}>
                <div className={styles.txnName}>{transaction.name}</div>
                {transaction.meta ? <div className={styles.txnMeta}>{transaction.meta}</div> : null}
              </div>
              <div className={`${styles.txnAmt} ${transaction.isIncome ? styles.txnAmtIncome : ''}`}>
                {transaction.isIncome ? '+' : '−'}{formatCurrencyCompact(transaction.amount)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
