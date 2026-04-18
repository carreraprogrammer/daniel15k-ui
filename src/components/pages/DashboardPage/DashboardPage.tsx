import { AppLayout } from '../../templates/AppLayout';
import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { AgentEventRenderer } from '../../molecules/AgentEventRenderer';
import { useDashboardData } from '../../../hooks/useDashboardData';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const { summary, debts, pending, obligations, loading, error, behaviorSummary, behaviorSignals, reload } =
    useDashboardData();

  return (
    <AppLayout title="Dashboard">
      <section className={styles.stack}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Resumen ejecutivo</span>
          <h2 className={styles.headline}>{`Hola, ${user?.name ?? 'Daniel'}`}</h2>
          <p className={styles.description}>
            Primer panel operativo para revisar balance, presión de gasto, pendientes y compromisos fijos sin depender solo del flujo por Telegram.
          </p>
        </div>

        <AgentEventRenderer />

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

        {!loading && !error && summary ? (
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
