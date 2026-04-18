import { useMemo, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { useDashboardData } from '../../../hooks/useDashboardData';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { summary, debts, pending, obligations, loading, error, behaviorSummary, behaviorSignals, reload } =
    useDashboardData();

  const focusState = useMemo(() => {
    if (!summary) {
      return {
        title: 'Todavía no hay lectura del mes',
        value: '—',
        caption: 'Carga el resumen para ver balance, presión y siguiente acción.',
        text: 'Esta pantalla debería responder cómo vas y qué importa hoy, no obligarte a leer seis widgets iguales.',
      };
    }

    const baseIncome = summary.monthly_plan?.base_budget_income ?? 0;
    const expenses = summary.balance.expense_confirmed;
    const remainingBase = baseIncome > 0 ? baseIncome - expenses : summary.balance.balance_confirmed;
    const recommendedAction = summary.financial_context?.recommended_action ?? 'Todavía no hay una acción recomendada.';
    const overflow = summary.overflow_status?.realized_overflow ?? 0;

    return {
      title: remainingBase >= 0 ? 'Así va tu mes' : 'Tu mes ya va pasado',
      value: formatCop(remainingBase),
      caption: baseIncome > 0 ? 'Disponible frente a tu ingreso base presupuestable' : 'Balance confirmado del período',
      text:
        overflow > 0
          ? `Ya hay overflow disponible. ${recommendedAction}`
          : recommendedAction,
    };
  }, [summary]);

  return (
    <AppLayout title="Dashboard">
      <section className={styles.stack}>
        <div className={`${styles.focusCard} ${styles.focusCardFull}`}>
          <div className={styles.focusGrid}>
            <div className={styles.focusCopy}>
              <span className={styles.eyebrow}>Resumen ejecutivo</span>
              <p className={styles.focusQuestion}>{`¿Cómo voy este mes y qué debería mirar primero, ${user?.name ?? 'Daniel'}?`}</p>
              <h2 className={styles.focusTitle}>{focusState.title}</h2>
              <p className={styles.focusText}>{focusState.text}</p>
            </div>
            <div>
              <div className={styles.focusValue}>{focusState.value}</div>
              <p className={styles.focusCaption}>{focusState.caption}</p>
            </div>
          </div>

          {!loading && !error && summary ? (
            <div className={styles.focusMeta}>
              <span className={styles.focusBadge}>{pending.length} pendientes</span>
              <span className={styles.focusBadge}>{formatCop(summary.debts?.total_balance ?? 0)} en deuda activa</span>
              <span className={styles.focusBadge}>{formatCop(behaviorSummary.totals.discretionary)} discrecional</span>
            </div>
          ) : null}

          <div className={styles.focusActions}>
            <Button
              label={detailsOpen ? 'Ocultar detalle' : 'Ver detalle del mes'}
              variant="ghost"
              onClick={() => setDetailsOpen((current) => !current)}
            />
          </div>
        </div>

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

        {!loading && !error && summary && detailsOpen ? (
          <>
            <div className={styles.metrics}>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Balance confirmado</span>
                <strong className={styles.metricValue}>{formatCop(summary.balance.balance_confirmed)}</strong>
                <p className={styles.metricHint}>Ingreso confirmado menos gasto confirmado del período.</p>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Gasto pendiente</span>
                <strong className={styles.metricValue}>{formatCop(summary.balance.expense_pending)}</strong>
                <p className={styles.metricHint}>Transacciones que siguen necesitando aclaración o confirmación.</p>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Deuda activa</span>
                <strong className={styles.metricValue}>{formatCop(summary.debts?.total_balance ?? 0)}</strong>
                <p className={styles.metricHint}>Saldo acumulado de deudas activas cargadas en la API.</p>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Pendientes abiertos</span>
                <strong className={styles.metricValue}>{pending.length}</strong>
                <p className={styles.metricHint}>Casos que el agente todavía no puede cerrar solo.</p>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Discrecional</span>
                <strong className={styles.metricValue}>{formatCop(behaviorSummary.totals.discretionary)}</strong>
                <p className={styles.metricHint}>Gasto elegido. Si esto sube, acá está la presión real para cambiar hábito.</p>
              </article>
              <article className={styles.metricCard}>
                <span className={styles.metricLabel}>Inversión</span>
                <strong className={styles.metricValue}>{formatCop(behaviorSummary.totals.investment)}</strong>
                <p className={styles.metricHint}>Lo que hoy sí está construyendo futuro, no solo manteniendo el sistema.</p>
              </article>
            </div>

            <div className={styles.columns}>
              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>Burn rate</h3>
                <div className={styles.list}>
                  {(summary.burn_rate?.categories ?? []).slice(0, 4).map((category) => (
                    <article key={category.category_id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listLabel}>{category.category}</span>
                        <span className={styles.listMeta}>
                          {formatCop(category.spent)} gastados de {formatCop(category.budget)}
                        </span>
                      </div>
                      <div className={styles.listSecondary}>
                        <span className={category.on_track ? styles.statusGood : styles.statusWarn}>
                          {category.on_track ? 'En rango' : 'Fuera de rango'}
                        </span>
                        <span className={styles.listMeta}>{formatCop(category.projected)} proyectados</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>Acción sugerida</h3>
                <div className={styles.list}>
                  <article className={styles.listItem}>
                    <div className={styles.listPrimary}>
                      <span className={styles.listLabel}>Fase actual</span>
                      <span className={styles.listMeta}>{summary.financial_context?.phase ?? 'sin definir'}</span>
                    </div>
                    <div className={styles.listSecondary}>
                      <span className={styles.pill}>{summary.financial_context?.strategy ?? 'sin estrategia'}</span>
                    </div>
                  </article>
                  <article className={styles.listItem}>
                    <div className={styles.listPrimary}>
                      <span className={styles.listLabel}>Recomendación del sistema</span>
                      <span className={styles.listMeta}>
                        {summary.financial_context?.recommended_action ?? 'Aún no hay acción calculada.'}
                      </span>
                    </div>
                  </article>
                </div>
              </section>
            </div>

            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Lectura conductual del mes</h3>
              <div className={styles.list}>
                {behaviorSignals.map((signal) => (
                  <article key={`${signal.tone}-${signal.title}`} className={styles.listItem}>
                    <div className={styles.listPrimary}>
                      <span className={styles.listLabel}>{signal.title}</span>
                      <span className={styles.listMeta}>{signal.message}</span>
                    </div>
                    <div className={styles.listSecondary}>
                      <span className={styles.pill}>{signal.tone}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className={styles.columns}>
              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>Pendientes recientes</h3>
                <div className={styles.list}>
                  {pending.slice(0, 5).map((transaction) => (
                    <article key={transaction.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listLabel}>{transaction.attributes.concept}</span>
                        <span className={styles.listMeta}>
                          {transaction.attributes.date} · {transaction.attributes.product}
                        </span>
                      </div>
                      <div className={styles.listSecondary}>
                        <span className={styles.listLabel}>{formatCop(transaction.attributes.amount)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.panel}>
                <h3 className={styles.panelTitle}>Compromisos cargados</h3>
                <div className={styles.list}>
                  {obligations.slice(0, 5).map((obligation) => (
                    <article key={obligation.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listLabel}>{obligation.attributes.name}</span>
                        <span className={styles.listMeta}>Día {obligation.attributes.due_day}</span>
                      </div>
                      <div className={styles.listSecondary}>
                        <span className={styles.listLabel}>{formatCop(obligation.attributes.amount)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Deuda</th>
                    <th>Estado</th>
                    <th className={styles.numeric}>Saldo</th>
                    <th className={styles.numeric}>Pago mensual</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.slice(0, 6).map((debt) => (
                    <tr key={debt.id}>
                      <td>{debt.attributes.name}</td>
                      <td>{debt.attributes.status}</td>
                      <td className={styles.numeric}>{formatCop(debt.attributes.current_balance)}</td>
                      <td className={styles.numeric}>{formatCop(debt.attributes.monthly_payment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </AppLayout>
  );
};
