import { IonContent, IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { sparklesOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { useAuthStore } from '../../../store/authStore';
import pageStyles from '../FinancePage.module.css';
import styles from './DashboardPage.module.css';

const getGreetingByHour = (hour: number) => {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getFirstName = (name?: string | null) => {
  if (!name) return '';

  return name.trim().split(/\s+/u)[0] ?? '';
};

export const DashboardContent = () => {
  const { summary, insight, obligations, completeness, loading, error, reload } = useDashboardData();
  const history = useHistory();

  const liquidity = summary?.liquidity;
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

  const nextCycleDay = obligations.length > 0
    ? Math.min(...obligations.map(o => Number(o.attributes.due_day)).filter(n => Number.isFinite(n) && n > 0))
    : null;
  const nextCycleDate = nextCycleDay && nextCycleDay > today.getDate()
    ? new Date(today.getFullYear(), today.getMonth(), nextCycleDay)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayLabel = dayMonthFmt.format(today);
  const nextCycleLabel = dayMonthFmt.format(nextCycleDate);
  const temporalPct = Math.min(
    Math.round((today.getDate() / nextCycleDate.getDate()) * 100),
    100,
  );

  const margin = liquidity?.free_after_obligations ?? 0;
  const balance = liquidity?.confirmed_balance ?? summary?.balance.net_balance ?? summary?.balance.balance_confirmed ?? 0;
  const shortfall = Math.abs(margin);

  const stateColor = !liquidity
    ? 'var(--text-on-surface-muted)'
    : liquidity.buffer_status === 'comfortable'
    ? 'var(--color-success)'
    : liquidity.buffer_status === 'tight'
    ? '#C9980A'
    : 'var(--color-error)';

  const heroPhrase = !liquidity
    ? 'Sin plan activo.'
    : liquidity.buffer_status === 'comfortable'
    ? 'Vas relajado.'
    : liquidity.buffer_status === 'tight'
    ? 'Vas justo hasta la quincena.'
    : margin < -(balance / 2)
    ? 'Estás en rojo.'
    : `Te van a faltar ${formatCurrencyCompact(shortfall)}.`;

  const heroSubtitle = !liquidity
    ? 'Crea un plan mensual para ver tu posición.'
    : liquidity.buffer_status === 'comfortable'
    ? `Tu plata cubre lo que viene y te sobran ${formatCurrencyCompact(margin)} hasta el ${nextCycleLabel}.`
    : liquidity.buffer_status === 'tight'
    ? `Tus ${formatCurrencyCompact(balance)} cubren lo del día a día. No hay margen, pero no hay riesgo.`
    : margin < -(balance / 2)
    ? `Faltan ${formatCurrencyCompact(shortfall)} antes del ${nextCycleLabel}. Déjame ayudarte.`
    : `Llegamos al límite antes del corte. Tenemos opciones, ¿hablamos?`;


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

                {liquidity ? (
                  <div className={styles.heroZeroNumbers}>
                    <div className={styles.heroZeroNumberItem}>
                      <span className={styles.heroZeroNumberLabel}>En tu flujo</span>
                      <span className={styles.heroZeroNumberValue}>
                        {formatCurrencyCompact(liquidity.confirmed_balance)}
                      </span>
                    </div>
                    <div className={styles.heroZeroNumberItem}>
                      <span className={styles.heroZeroNumberLabel}>Margen para extras</span>
                      <span className={styles.heroZeroNumberAccent}>
                        {formatCurrencyCompact(liquidity.free_after_obligations)}
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
                    El análisis nocturno de tu coach aparecerá aquí.
                  </p>
                  <div className={styles.insightCardMeta}>
                    <span>Análisis nocturno</span>
                    <span>·</span>
                    <span>Ver razonamiento</span>
                  </div>
                </div>
              </div>
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
