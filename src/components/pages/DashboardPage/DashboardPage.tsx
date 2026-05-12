import { IonContent, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  sparklesOutline,
  homeOutline,
  cartOutline,
  heartOutline,
  bookOutline,
  giftOutline,
  flashOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { useAuthStore } from '../../../store/authStore';
import type { Transaction } from '../../../types/finance.types';
import pageStyles from '../FinancePage.module.css';
import styles from './DashboardPage.module.css';

const getGreetingByHour = (hour: number) => {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

// ── Conductual category config ─────────────────────────────────────────────

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

// ── Transaction date label ─────────────────────────────────────────────────

const txnDayLabel = (dateStr: string): string => {
  const parts = dateStr.split('/');
  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = parts[2] ? Number(parts[2]) : new Date().getFullYear();
  const txDate = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - txDate.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return parts.slice(0, 2).join('/');
};

const paymentLabel = (src: string | null | undefined): string => {
  if (src === 'credit_card') return 'Crédito';
  if (src === 'debit') return 'Débito';
  if (src === 'cash') return 'Efectivo';
  return '';
};

// ── Transaction row (zone 4) ───────────────────────────────────────────────

const TxnItem = ({ tx }: { tx: Transaction }) => {
  const attr = tx.attributes;
  const cfg = catConfig(attr.category_type);
  const isIncome = attr.transaction_type === 'income';
  const meta = [txnDayLabel(attr.date), paymentLabel(attr.payment_source)].filter(Boolean).join(' · ');

  return (
    <div
      className={styles.txnRow}
      style={{ '--cat-color': cfg.color, '--cat-soft': cfg.soft } as React.CSSProperties}
    >
      <div className={styles.txnIcon}>
        <IonIcon icon={cfg.icon} />
      </div>
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

const getFirstName = (name?: string | null) => {
  if (!name) return '';

  return name.trim().split(/\s+/u)[0] ?? '';
};

export const DashboardContent = () => {
  const { summary, insight, completeness, loading, error, reload, monthTransactions } = useDashboardData();
  const history = useHistory();

  const runway = summary?.cash_flow_runway;
  const hasPlanPendingConfirmation = completeness?.pending_confirmation?.includes('monthly_plan') ?? false;
  const rollingChanges = (summary?.monthly_plan?.assumptions?.rolling_changes as string[] | undefined) ?? [];
  const planMonthLabel = summary?.period
    ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
        new Date(summary.period.year, summary.period.month - 1, 1),
      )
    : 'este mes';

  // ── Zone 0 — Hero ──────────────────────────────────────────────────────────
  const today = new Date();
  const dayMonthFmt = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });

  const nextIncomeDayNum = runway?.next_income_day ?? null;
  const nextCycleDate = nextIncomeDayNum
    ? new Date(today.getFullYear(), today.getMonth(), nextIncomeDayNum)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayLabel = dayMonthFmt.format(today);
  const nextCycleLabel = dayMonthFmt.format(nextCycleDate);
  const daysToIncome = runway?.days_to_next_income ?? null;
  const temporalPct = daysToIncome !== null && nextIncomeDayNum !== null
    ? Math.min(Math.round(((nextIncomeDayNum - daysToIncome) / nextIncomeDayNum) * 100), 100)
    : Math.min(Math.round((today.getDate() / nextCycleDate.getDate()) * 100), 100);

  const commitmentGap = runway?.commitment_gap ?? null;
  const balance = runway?.confirmed_balance ?? summary?.balance.net_balance ?? summary?.balance.balance_confirmed ?? 0;
  const shortfall = commitmentGap !== null && commitmentGap < 0 ? Math.abs(commitmentGap) : 0;

  const stateColor = !runway?.health_status
    ? 'var(--text-on-surface-muted)'
    : runway.health_status === 'comfortable'
    ? 'var(--color-success)'
    : runway.health_status === 'warning'
    ? '#C9980A'
    : 'var(--color-error)';

  const heroPhrase = !runway?.health_status
    ? 'Sin datos de flujo.'
    : runway.health_status === 'comfortable'
    ? 'Vas relajado.'
    : runway.health_status === 'warning'
    ? 'Vas justo hasta la quincena.'
    : 'Estás en rojo.';

  const heroSubtitle = !runway?.health_status
    ? 'Registrá transacciones para ver tu posición.'
    : runway.health_status === 'comfortable'
    ? `Te sobran ${formatCurrencyCompact(commitmentGap ?? 0)} después de cubrir lo que viene hasta el ${nextCycleLabel}.`
    : runway.health_status === 'warning'
    ? `Tus ${formatCurrencyCompact(balance)} cubren lo del día a día. No hay margen, pero no hay riesgo.`
    : `Faltan ${formatCurrencyCompact(shortfall)} antes del ${nextCycleLabel}. Déjame ayudarte.`;


  return (
    <IonContent className={pageStyles.pageContent}>
        <section className={pageStyles.stack}>

          {loading ? <div className={pageStyles.centeredState}><Spinner size="lg" /></div> : null}
          {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

          {!loading && !error && summary ? (
            <>
              {/* ── ZONA 0 — Hero ─────────────────────────────────────────── */}
              <div
                className={styles.heroZero}
                style={{ '--state-color': stateColor } as React.CSSProperties}
              >
                <div className={styles.heroZeroStatus}>
                  <span className={styles.heroZeroStatusDot} />
                  <span className={styles.heroZeroStatusText}>
                    TU ESTADO · HASTA EL {nextCycleLabel.toUpperCase()}
                  </span>
                </div>

                <div className={styles.heroZeroCopy}>
                  <p className={styles.heroZeroPhrase}>{heroPhrase}</p>
                  <p className={styles.heroZeroSubtitle}>{heroSubtitle}</p>
                </div>

                <div className={styles.heroZeroTemporal}>
                  <div className={styles.heroZeroTemporalDates}>
                    <span>Hoy · {todayLabel}</span>
                    <span>Quincena · {nextCycleLabel}</span>
                  </div>
                  <div className={styles.pressureTrack} role="progressbar" aria-valuenow={temporalPct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={styles.heroZeroTemporalFill} style={{ width: `${temporalPct}%` }} />
                  </div>
                </div>

                {runway ? (
                  <div className={styles.heroZeroNumbers}>
                    <div className={styles.heroZeroNumberItem}>
                      <span className={styles.heroZeroNumberLabel}>En tu flujo</span>
                      <span className={styles.heroZeroNumberValue}>
                        {formatCurrencyCompact(runway.confirmed_balance)}
                      </span>
                    </div>
                    <div className={styles.heroZeroNumberItem}>
                      <span className={styles.heroZeroNumberLabel}>Margen hasta la quincena</span>
                      <span className={styles.heroZeroNumberAccent}>
                        {formatCurrencyCompact(runway.commitment_gap ?? 0)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* ── Gráficas — movidas al análisis nocturno (pendiente) ───────
              {burnCategories.length > 0 ? (
                <div className={styles.charts}>
                  ... charts JSX commentado temporalmente ...
                </div>
              ) : null}
              ─────────────────────────────────────────────────────────────── */}

              {hasPlanPendingConfirmation ? (
                <div className={styles.planBanner}>
                  <div className={styles.planBannerBody}>
                    <p className={styles.planBannerText}>
                      Tu plan de {planMonthLabel} está listo para revisar — heredado del mes anterior.
                    </p>
                    {rollingChanges.length > 0 ? (
                      <ul className={styles.planBannerChanges}>
                        {rollingChanges.map((change) => (
                          <li key={change} className={styles.planBannerChange}>
                            {change}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={styles.planBannerBtn}
                    onClick={() => history.push('/budgets')}
                  >
                    Revisar plan
                  </button>
                </div>
              ) : null}

              {/* ── ZONA 1 — Insight del agente ───────────────────────────── */}
              <div className={styles.insightCard}>
                <div className={styles.insightCardIcon}>
                  <IonIcon icon={sparklesOutline} />
                </div>
                <div className={styles.insightCardBody}>
                  <p className={styles.insightCardTitle}>Una sugerencia tuya</p>
                  <p className={styles.insightCardText}>
                    {insight?.recommendations?.primary_action ?? 'El análisis nocturno de tu coach aparecerá aquí.'}
                  </p>
                  <div className={styles.insightCardMeta}>
                    <span>Análisis nocturno</span>
                    <span>·</span>
                    <span>Ver razonamiento</span>
                  </div>
                </div>
              </div>

              {/* ── ZONA 2 — Tu mes en pocas líneas ───────────────────────── */}
              {(summary.balance || runway) ? (
                <>
                  <div className={styles.secHead}>
                    <h3 className={styles.secHeadTitle}>Tu mes en pocas líneas</h3>
                  </div>
                  <div className={styles.chipRow}>
                    <div className={styles.chipStat}>
                      <span className={styles.chipStatLabel}>Gastado este mes</span>
                      <span className={styles.chipStatValue}>
                        {formatCurrencyCompact(summary.balance.expense_confirmed)}
                      </span>
                    </div>
                    <div className={styles.chipStat}>
                      <span className={styles.chipStatLabel}>Ritmo diario</span>
                      <span className={styles.chipStatValue}>
                        {formatCurrencyCompact(runway?.daily_necessary_burn ?? 0)}
                        <span className={styles.chipStatUnit}>/día</span>
                      </span>
                    </div>
                  </div>
                </>
              ) : null}

              {/* ── ZONA 3 — Cómo va cada gaveta ──────────────────────────── */}
              {(summary.burn_rate?.categories?.length ?? 0) > 0 ? (
                <>
                  <div className={styles.secHead}>
                    <h3 className={styles.secHeadTitle}>Cómo va cada gaveta</h3>
                    <button
                      type="button"
                      className={styles.secHeadMore}
                      onClick={() => history.push('/budgets')}
                    >
                      Ver todo <IonIcon icon={chevronForwardOutline} />
                    </button>
                  </div>
                  <div className={styles.catList}>
                    {(summary.burn_rate?.categories ?? []).map((cat) => {
                      const cfg = catConfig(cat.category_type);
                      const pct = cat.budget > 0 ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
                      const over = cat.spent > cat.budget && cat.budget > 0;
                      const detailPath = `/gaveta/${cat.category_type}`;
                      return (
                        <div
                          key={cat.category_id}
                          className={styles.catCard}
                          style={{ '--cat-color': cfg.color, '--cat-soft': cfg.soft } as React.CSSProperties}
                          role="button"
                          tabIndex={0}
                          onClick={() => history.push(detailPath, { category: cat })}
                          onKeyDown={(e) => e.key === 'Enter' && history.push(detailPath, { category: cat })}
                        >
                          <div className={styles.catIconWrap}>
                            <IonIcon icon={cfg.icon} />
                          </div>
                          <div className={styles.catMain}>
                            <div className={styles.catName}>{cfg.name}</div>
                            <div className={styles.catSub}>
                              {formatCurrencyCompact(cat.spent)} de {formatCurrencyCompact(cat.budget)}
                            </div>
                            <div className={styles.catBar}>
                              <div
                                className={`${styles.catBarFill} ${over ? styles.catBarFillOver : ''}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <IonIcon icon={chevronForwardOutline} className={styles.catChevron} />
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {/* ── ZONA 4 — Lo último ────────────────────────────────────── */}
              {monthTransactions.length > 0 ? (
                <>
                  <div className={styles.secHead}>
                    <h3 className={styles.secHeadTitle}>Lo último</h3>
                    <button
                      type="button"
                      className={styles.secHeadMore}
                      onClick={() => history.push('/transactions')}
                    >
                      Ver todo <IonIcon icon={chevronForwardOutline} />
                    </button>
                  </div>
                  <div className={styles.txnList}>
                    {monthTransactions.slice(0, 3).map((tx) => (
                      <TxnItem key={tx.id} tx={tx} />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}

        </section>
    </IonContent>
  );
};

export const DashboardPage = () => {
  const userName = useAuthStore((state) => state.user?.name);
  const greeting = getGreetingByHour(new Date().getHours());
  const firstName = getFirstName(userName);

  return (
    <AppLayout title={`${greeting}${firstName ? ` ${firstName}` : ''}`}>
      <DashboardContent />
    </AppLayout>
  );
};
