import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  homeOutline,
  cartOutline,
  heartOutline,
  bookOutline,
  giftOutline,
  flashOutline,
  sparklesOutline,
  chevronBackOutline,
  optionsOutline,
} from 'ionicons/icons';
import { useEffect, useMemo, useState } from 'react';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { financeService } from '../../../services/financeService';
import type { BurnRateCategory, Transaction } from '../../../types/finance.types';
import styles from './BudgetDetailPage.module.css';

// ── Config ────────────────────────────────────────────────────────────────────

const CAT_CONFIG: Record<string, { name: string; color: string; soft: string; icon: string }> = {
  committed:     { name: 'Comprometido', color: '#C0392B', soft: 'rgba(192,57,43,0.16)',   icon: homeOutline },
  necessary:     { name: 'Necesario',    color: '#D4732A', soft: 'rgba(212,115,42,0.16)',  icon: cartOutline },
  discretionary: { name: 'Discrecional', color: '#C9980A', soft: 'rgba(201,152,10,0.16)',  icon: heartOutline },
  investment:    { name: 'Inversión',    color: '#1A9E4A', soft: 'rgba(26,158,74,0.16)',   icon: bookOutline },
  social:        { name: 'Social',       color: '#8A4FD8', soft: 'rgba(138,79,216,0.16)',  icon: giftOutline },
  income:        { name: 'Ingreso',      color: '#0E96AD', soft: 'rgba(14,150,173,0.16)',  icon: flashOutline },
};

const catConfig = (code: string | null | undefined) =>
  CAT_CONFIG[code ?? ''] ?? { name: code ?? '—', color: '#5B7280', soft: 'rgba(91,114,128,0.16)', icon: flashOutline };

// ── Arc chart ─────────────────────────────────────────────────────────────────

const ARC_LEN = 283;

const ArcChart = ({ pct, color, spent, limit }: { pct: number; color: string; spent: number; limit: number }) => {
  const offset = ARC_LEN - ARC_LEN * Math.min(pct / 100, 1);
  return (
    <div className={styles.arcWrap}>
      <div className={styles.arcBig}>
        <div className={styles.arcNum}>{formatCurrencyCompact(spent)}</div>
        <div className={styles.arcSub}>{Math.round(pct)}% del plan</div>
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
            style={{ transition: 'stroke-dashoffset 700ms ease' }}
          />
          <text x="110" y="118" textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text-on-surface-muted)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrencyCompact(limit)} plan
          </text>
        </svg>
      </div>
    </div>
  );
};

// ── Transaction row ───────────────────────────────────────────────────────────

const txnDayLabel = (dateStr: string): string => {
  const parts = dateStr.split('/');
  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = parts[2] ? Number(parts[2]) : new Date().getFullYear();
  const txDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - txDate.setHours(0, 0, 0, 0)) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return parts.slice(0, 2).join('/');
};

const paymentLabel = (src: string | null | undefined) => {
  if (src === 'credit_card') return 'Crédito';
  if (src === 'debit') return 'Débito';
  if (src === 'cash') return 'Efectivo';
  return '';
};

const TxnRow = ({ tx, cfg }: { tx: Transaction; cfg: { color: string; soft: string; icon: string } }) => {
  const attr = tx.attributes;
  const isIncome = attr.transaction_type === 'income';
  const meta = [txnDayLabel(attr.date), paymentLabel(attr.payment_source)].filter(Boolean).join(' · ');
  return (
    <div className={styles.txnRow} style={{ '--cat-color': cfg.color, '--cat-soft': cfg.soft } as React.CSSProperties}>
      <div className={styles.txnIcon}><IonIcon icon={cfg.icon} /></div>
      <div className={styles.txnBody}>
        <div className={styles.txnName}>{attr.concept || attr.product}</div>
        {meta ? <div className={styles.txnMeta}>{meta}</div> : null}
      </div>
      <div className={`${styles.txnAmt} ${isIncome ? styles.txnAmtIncome : ''}`}>
        {isIncome ? '+' : '−'}{formatCurrencyCompact(attr.amount)}
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

interface RouteState {
  category?: BurnRateCategory;
}

export const BudgetDetailPage = () => {
  const history = useHistory();
  const { categoryType } = useParams<{ categoryType: string }>();
  const location = useLocation<RouteState>();
  const category = location.state?.category;

  const cfg = catConfig(categoryType);
  const now = new Date();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    financeService.fetchTransactions({
      page: 1,
      per_page: 50,
      sort_by: 'date',
      sort_dir: 'desc',
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    }).then((res) => {
      setTransactions(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryType]);

  const filtered = useMemo(
    () => transactions.filter((tx) => tx.attributes.category_type === categoryType),
    [transactions, categoryType],
  );

  const daysElapsed = now.getDate();
  const pct = category && category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
  const projection = category && daysElapsed > 0
    ? Math.round((category.spent / daysElapsed) * 30)
    : null;

  return (
    <IonPage>
      <IonContent
        className={styles.page}
        style={{ '--cat-color': cfg.color, '--cat-soft': cfg.soft } as React.CSSProperties}
      >
        {/* Topbar */}
        <div className={styles.topbar}>
          <button type="button" className={styles.iconBtn} onClick={() => history.goBack()}>
            <IonIcon icon={chevronBackOutline} />
          </button>
          <div className={styles.topbarCenter}>
            <span className={styles.topbarEyebrow}>Gaveta</span>
            <span className={styles.topbarTitle}>{cfg.name}</span>
          </div>
          <div className={styles.iconBtn}>
            <IonIcon icon={optionsOutline} />
          </div>
        </div>

        {/* Scroll content */}
        <div className={styles.scroll}>

          {/* Arc */}
          {category ? (
            <>
              <ArcChart pct={pct} color={cfg.color} spent={category.spent} limit={category.budget} />

              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Gastado</span>
                  <span className={styles.statValue}>{formatCurrencyCompact(category.spent)}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Presupuesto</span>
                  <span className={styles.statValue}>{formatCurrencyCompact(category.budget)}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Disponible</span>
                  <span className={`${styles.statValue} ${category.spent > category.budget ? styles.statNeg : styles.statPos}`}>
                    {formatCurrencyCompact(Math.abs(category.budget - category.spent))}
                  </span>
                </div>
              </div>
            </>
          ) : null}

          {/* Projection insight */}
          {projection !== null && category ? (
            <div className={styles.insight}>
              <div className={styles.insightIcon}><IonIcon icon={sparklesOutline} /></div>
              <div className={styles.insightBody}>
                <p className={styles.insightTitle}>Si seguís a este ritmo…</p>
                <p className={styles.insightText}>
                  Cerrás el mes en <strong>{formatCurrencyCompact(projection)}</strong>.{' '}
                  {projection > category.budget
                    ? `Te vas a pasar por ${formatCurrencyCompact(projection - category.budget)}.`
                    : `Te queda margen de ${formatCurrencyCompact(category.budget - projection)}.`}
                </p>
              </div>
            </div>
          ) : null}

          {/* Transactions */}
          <div className={styles.secHead}>
            <h3 className={styles.secTitle}>Movimientos</h3>
          </div>

          {loading ? (
            <div className={styles.center}><span className={styles.spinner} /></div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>Nada en esta gaveta este mes.</div>
          ) : (
            <div className={styles.txnGroup}>
              {filtered.map((tx) => <TxnRow key={tx.id} tx={tx} cfg={cfg} />)}
            </div>
          )}

        </div>
      </IonContent>
    </IonPage>
  );
};
