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
