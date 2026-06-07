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
import { DrawerDetailContent, type DrawerDetailTransaction } from '../../organisms/DrawerDetail';
import styles from './BudgetDetailPage.module.css';

// ── Config ────────────────────────────────────────────────────────────────────

const CAT_CONFIG: Record<string, { name: string; color: string; soft: string; icon: string }> = {
  committed:     { name: 'Comprometido', color: '#C0392B', soft: 'rgba(192,57,43,0.16)',   icon: homeOutline },
  necessary:     { name: 'Necesario',    color: '#D4732A', soft: 'rgba(212,115,42,0.16)',  icon: cartOutline },
  discretionary: { name: 'Flexible',     color: '#C9980A', soft: 'rgba(201,152,10,0.16)',  icon: heartOutline },
  investment:    { name: 'Inversión',    color: '#1A9E4A', soft: 'rgba(26,158,74,0.16)',   icon: bookOutline },
  social:        { name: 'Social',       color: '#8A4FD8', soft: 'rgba(138,79,216,0.16)',  icon: giftOutline },
  income:        { name: 'Ingreso',      color: '#0E96AD', soft: 'rgba(14,150,173,0.16)',  icon: flashOutline },
};

const catConfig = (code: string | null | undefined) =>
  CAT_CONFIG[code ?? ''] ?? { name: code ?? '—', color: '#5B7280', soft: 'rgba(91,114,128,0.16)', icon: flashOutline };

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

const buildTxn = (tx: Transaction, icon: string): DrawerDetailTransaction => {
  const attr = tx.attributes;
  const meta = [txnDayLabel(attr.date), paymentLabel(attr.payment_source)].filter(Boolean).join(' · ');

  return {
    id: tx.id,
    name: attr.concept || attr.product || 'Movimiento sin nombre',
    meta,
    amount: attr.amount,
    icon,
    isIncome: attr.transaction_type === 'income',
  };
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
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    Promise.all([
      financeService.fetchTransactions({ page: 1, per_page: 100, sort_by: 'date', sort_dir: 'desc', month: currentMonth, year: currentYear }),
      financeService.fetchTransactions({ page: 1, per_page: 50, sort_by: 'date', sort_dir: 'desc', month: prevMonth, year: prevYear }),
    ]).then(([currentRes, prevRes]) => {
      const coversThisPeriod = prevRes.data.filter(
        (tx) => tx.attributes.covers_period_month === currentMonth && tx.attributes.covers_period_year === currentYear,
      );
      setTransactions([...currentRes.data, ...coversThisPeriod]);
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
  const primaryMetric = category?.primary_metric;
  const detailTransactions = useMemo(
    () => filtered.map((tx) => buildTxn(tx, cfg.icon)),
    [filtered, cfg.icon],
  );

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

        <div className={styles.scroll}>
          {category ? (
            <DrawerDetailContent
              color={cfg.color}
              soft={cfg.soft}
              spent={category.spent}
              pct={pct}
              limit={category.budget}
              stats={[
                { label: 'Gastado', value: formatCurrencyCompact(category.spent) },
                { label: 'Presupuesto', value: formatCurrencyCompact(category.budget) },
                {
                  label: primaryMetric?.kind === 'payment_status' ? 'Pendiente' : 'Disponible',
                  value: primaryMetric?.kind === 'payment_status'
                    ? formatCurrencyCompact(primaryMetric.value)
                    : formatCurrencyCompact(Math.abs(category.budget - category.spent)),
                  tone: category.spent > category.budget || primaryMetric?.status === 'critical' ? 'negative' : 'positive',
                },
              ]}
              insightTitle={primaryMetric?.title ?? (projection !== null ? 'Si seguís a este ritmo…' : undefined)}
              insightIcon={sparklesOutline}
              insightText={primaryMetric?.body ?? (projection !== null ? (
                <>
                  Cerrás el mes en <strong>{formatCurrencyCompact(projection)}</strong>.{' '}
                  {projection > category.budget
                    ? `Te vas a pasar por ${formatCurrencyCompact(projection - category.budget)}.`
                    : `Te queda margen de ${formatCurrencyCompact(category.budget - projection)}.`}
                </>
              ) : undefined)}
              transactions={detailTransactions}
              loading={loading}
              emptyText="Nada en esta gaveta este mes."
            />
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
};
