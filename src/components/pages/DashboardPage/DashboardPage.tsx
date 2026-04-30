import { useState } from 'react';
import { IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { AppLayout } from '../../templates/AppLayout';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { ExecutionPanel } from './ExecutionPanel';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import pageStyles from '../FinancePage.module.css';
import styles from './DashboardPage.module.css';

const COLORS = ['#C0392B', '#C9980A', '#1A9E4A', '#D4732A', '#8A4FD8'];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(11,15,21,0.96)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: 'rgba(231,236,244,0.8)', fontSize: 12 },
  itemStyle: { color: '#fff', fontSize: 12 },
};

const AGENTS_URL = import.meta.env.VITE_AGENTS_URL as string | undefined;
const SERVICE_TOKEN = import.meta.env.VITE_SERVICE_TOKEN as string | undefined;

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'hace 1 día';
  return `hace ${days} días`;
};

const MILESTONE_LABELS: Record<string, string> = {
  debt_paid_off: '🎉 Deuda liquidada',
  first_debt_paid_off: '🎉 Primera deuda liquidada',
  debt_free: '🏆 Sin deudas',
  emergency_fund_reached: '🛡️ Fondo de emergencia listo',
  first_monthly_plan: '📋 Primer plan mensual',
  three_months_planned: '📅 3 meses planificados',
  investment_started: '📈 Inversión iniciada',
  month_positive_balance: '✅ Mes en positivo',
  discretionary_under_budget: '💪 Discrecional bajo presupuesto',
  overflow_deployed: '⚡ Overflow desplegado',
};

const formatMilestoneLabel = (code: string): string =>
  MILESTONE_LABELS[code] ?? `🏅 ${code.replace(/_/g, ' ')}`;

export const DashboardContent = () => {
  const { summary, insight, debts, pending, creditCardPending, obligations, completeness, milestones, loading, error, reload } =
    useDashboardData();
  const history = useHistory();
  const [snapshotOpen, setSnapshotOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const handleRefreshInsight = async () => {
    if (!AGENTS_URL || !SERVICE_TOKEN) return;
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch(`${AGENTS_URL}/agents/insight`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json() as { ok: boolean; message?: string };
      setRefreshMsg(body.message ?? (body.ok ? 'Análisis en proceso...' : 'No disponible aún.'));
    } catch {
      setRefreshMsg('Error al conectar con el agente.');
    } finally {
      setRefreshing(false);
    }
  };

  const liquidity = summary?.liquidity;
  const burnCategories = summary?.burn_rate?.categories ?? [];
  const hasPlanPendingConfirmation = completeness?.pending_confirmation?.includes('monthly_plan') ?? false;
  const lastMilestone = milestones.length > 0 ? milestones[0] : null;
  const activeSavingsGoals = summary?.savings_goals?.filter((g) => g.status === 'active') ?? [];
  const planMonthLabel = summary?.period
    ? new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(
        new Date(summary.period.year, summary.period.month - 1, 1),
      )
    : 'este mes';

  // ── Hero copy ──────────────────────────────────────────────────────────────
  const heroTitle = !liquidity
    ? 'Sin plan activo'
    : liquidity.buffer_status === 'comfortable'
    ? 'Mes bajo control'
    : liquidity.buffer_status === 'tight'
    ? 'El mes cierra justo'
    : 'Prioriza el flujo de caja';

  const heroDesc = !liquidity
    ? 'Crea un plan mensual para ver tu posición real de liquidez.'
    : liquidity.buffer_status === 'comfortable'
    ? 'Tienes margen real después de cubrir las obligaciones del próximo ciclo.'
    : liquidity.buffer_status === 'tight'
    ? 'Cubre primero. Mueve lo que sobre con cuidado.'
    : 'Las obligaciones del próximo ciclo necesitan cubrirse antes de mover cualquier dinero.';

  const isWarn = liquidity?.buffer_status !== 'comfortable';

  const coveragePct =
    liquidity && liquidity.next_cycle_obligations > 0
      ? Math.min(
          Math.round(
            (liquidity.projected_eom_balance / liquidity.next_cycle_obligations) * 100,
          ),
          100,
        )
      : 0;

  // ── Chart data ─────────────────────────────────────────────────────────────
  const donutData = burnCategories
    .filter((c) => c.spent > 0)
    .map((c, i) => ({
      name: c.category,
      value: c.spent,
      color: COLORS[i % COLORS.length],
    }));

  const barData = burnCategories.map((c, i) => ({
    name: c.category.length > 13 ? c.category.slice(0, 12) + '…' : c.category,
    gastado: c.spent,
    presupuesto: c.budget,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <IonContent className={pageStyles.pageContent}>
        <section className={pageStyles.stack}>

          {loading ? <Spinner size="lg" /> : null}
          {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}

          {!loading && !error && summary ? (
            <>
              {hasPlanPendingConfirmation ? (
                <div className={styles.planBanner}>
                  <p className={styles.planBannerText}>
                    Tu plan de {planMonthLabel} está listo para revisar — heredado del mes anterior.
                  </p>
                  <button
                    type="button"
                    className={styles.planBannerBtn}
                    onClick={() => history.push('/budgets')}
                  >
                    Revisar plan
                  </button>
                </div>
              ) : null}

              {/* ── ZONA 1 — Hero ─────────────────────────────────────────── */}
              <div className={styles.heroCard}>
                <div className={styles.heroTop}>
                  <div className={styles.heroCopy}>
                    <span className={styles.eyebrow}>Resumen ejecutivo</span>
                    <h2 className={styles.heroTitle}>{heroTitle}</h2>
                    <p className={styles.heroDesc}>{heroDesc}</p>

                    {/* Recomendación: insight del agente > fallback del summary */}
                    {insight && !insight.stale ? (
                      <div className={styles.insightBlock}>
                        <p className={styles.heroAction}>
                          {insight.recommendations.primary_action}
                        </p>
                        <span className={styles.insightMeta}>
                          Evaluado {formatRelativeTime(insight.generated_at)}
                        </span>
                      </div>
                    ) : insight?.stale ? (
                      <p className={styles.insightStale}>Análisis en proceso…</p>
                    ) : summary.financial_context?.recommended_action ? (
                      <div className={styles.insightBlock}>
                        <p className={styles.heroAction}>
                          {summary.financial_context.recommended_action}
                        </p>
                        <span className={styles.insightMeta}>Estimado</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Balance operable hoy — el número más útil del día a día */}
                  <div className={styles.heroMetric}>
                    <span className={styles.metricLabel}>Balance hoy</span>
                    <span className={[styles.metricValue, isWarn ? styles.metricWarn : ''].filter(Boolean).join(' ')}>
                      {formatCurrencyCompact(summary.balance.balance_confirmed)}
                    </span>
                    <span className={styles.metricCaption}>ingresos − gastos confirmados</span>
                  </div>
                </div>

                {liquidity && liquidity.pending_variable > 0 && liquidity.deployable_this_cycle > 0 ? (
                  <div className={styles.availableBand}>
                    <span className={styles.availableBandLabel}>Proyección si llega el ingreso pendiente</span>
                    <strong className={[styles.availableBandValue, isWarn ? styles.metricWarn : ''].filter(Boolean).join(' ')}>
                      {formatCurrencyCompact(liquidity.deployable_this_cycle)}
                    </strong>
                    <span className={styles.availableBandHint}>
                      = balance actual ({formatCurrencyCompact(liquidity.confirmed_balance)}) + ingreso pendiente ({formatCurrencyCompact(liquidity.pending_variable + liquidity.pending_base)}) − colchón ({formatCurrencyCompact(liquidity.protected_buffer)})
                    </span>
                  </div>
                ) : null}

                {/* Barra de cobertura del próximo ciclo */}
                {liquidity ? (
                  <div className={styles.pressureWrap}>
                    <div className={styles.pressureHeader}>
                      <span className={styles.pressureLabel}>
                        Cobertura del próximo ciclo
                      </span>
                      <span className={styles.pressurePct}>{coveragePct}%</span>
                    </div>
                    <div className={styles.pressureTrack}>
                      <div
                        className={[
                          styles.pressureFill,
                          coveragePct < 100 ? styles.pressureFillWarn : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{ width: `${coveragePct}%` }}
                      />
                    </div>
                    <p className={styles.pressureCaption}>
                      {formatCurrencyCompact(liquidity.projected_eom_balance)} proyectados para
                      cubrir {formatCurrencyCompact(liquidity.next_cycle_obligations)} en obligaciones
                    </p>
                  </div>
                ) : null}

                <div className={styles.heroBadges}>
                  <span className={styles.badge}>{pending.length} pendientes</span>
                  {summary.debts ? (
                    <span className={styles.badge}>
                      {formatCurrencyCompact(summary.debts.total_balance)} en deuda
                    </span>
                  ) : null}
                  {liquidity ? (
                    <span
                      className={[
                        styles.badge,
                        styles[`badge_${liquidity.buffer_status}`],
                      ].join(' ')}
                    >
                      {liquidity.buffer_status}
                    </span>
                  ) : null}
                  {lastMilestone ? (
                    <span
                      className={[styles.badge, styles.badge_milestone].join(' ')}
                      title={`Logrado ${formatRelativeTime(lastMilestone.achieved_at)}`}
                    >
                      {formatMilestoneLabel(lastMilestone.code)}
                    </span>
                  ) : null}
                  {activeSavingsGoals.length > 0 ? (
                    <span className={styles.badge}>
                      🎯 {activeSavingsGoals.length} {activeSavingsGoals.length === 1 ? 'meta' : 'metas'} activa{activeSavingsGoals.length === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>

                <div className={styles.heroActions}>
                  <Button
                    label={snapshotOpen ? 'Ocultar análisis' : 'Ver análisis'}
                    variant="ghost"
                    onClick={() => setSnapshotOpen((v) => !v)}
                  />
                  <Button
                    label={detailOpen ? 'Ocultar detalle' : 'Ver detalle'}
                    variant="ghost"
                    onClick={() => setDetailOpen((v) => !v)}
                  />
                  {AGENTS_URL && SERVICE_TOKEN ? (
                    <Button
                      label={refreshing ? 'Actualizando…' : 'Actualizar análisis'}
                      variant="ghost"
                      onClick={() => void handleRefreshInsight()}
                    />
                  ) : null}
                </div>
                {refreshMsg ? (
                  <p className={styles.insightMeta}>{refreshMsg}</p>
                ) : null}
              </div>

              {/* ── ZONA 2 — Ejecución del mes ───────────────────────────── */}
              {summary.month_execution ? (
                <ExecutionPanel
                  monthExecution={summary.month_execution}
                  period={summary.period}
                  onReload={reload}
                />
              ) : null}

              {/* ── ZONA 3 — Snapshot ─────────────────────────────────────── */}
              {snapshotOpen ? (
                <div className={styles.snapshot}>
                  <div className={styles.kpiRow}>
                    <div className={styles.kpi}>
                      <span className={styles.kpiLabel}>Ingreso pendiente este mes</span>
                      <strong className={styles.kpiValue}>
                        {liquidity
                          ? formatCurrencyCompact(liquidity.pending_variable + liquidity.pending_base)
                          : '—'}
                      </strong>
                      <span className={styles.kpiHint}>
                        variable aún no confirmado este mes
                      </span>
                    </div>
                    <div className={styles.kpi}>
                      <span className={styles.kpiLabel}>Reservado próximo ciclo</span>
                      <strong className={[styles.kpiValue, styles.kpiValueWarn].join(' ')}>
                        {liquidity ? formatCurrencyCompact(liquidity.next_cycle_obligations) : '—'}
                      </strong>
                      <span className={styles.kpiHint}>
                        obligaciones + mínimos + discrecional
                      </span>
                    </div>
                    {summary.overflow_status?.status === 'available' &&
                     (summary.overflow_status.realized_overflow ?? 0) > 0 ? (
                      <div className={styles.kpi}>
                        <span className={styles.kpiLabel}>Desplegable hoy</span>
                        <strong className={[styles.kpiValue, styles.kpiValueOk].join(' ')}>
                          {formatCurrencyCompact(summary.overflow_status.deployable_overflow)}
                        </strong>
                        <span className={styles.kpiHint}>
                          {summary.overflow_status.deployable_overflow < summary.overflow_status.realized_overflow
                            ? `de ${formatCurrencyCompact(summary.overflow_status.realized_overflow)} sobre el plan — el resto ya se gastó`
                            : 'ingreso extra sobre el plan base'}
                        </span>
                      </div>
                    ) : summary.overflow_status?.status === 'blocked_by_liquidity' ? (
                      <div className={styles.kpi}>
                        <span className={styles.kpiLabel}>Desplegable hoy</span>
                        <strong className={[styles.kpiValue, styles.kpiValueWarn].join(' ')}>$0</strong>
                        <span className={styles.kpiHint}>
                          hay overflow pero está reservado para el próximo ciclo
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {burnCategories.length > 0 ? (
                    <div className={styles.charts}>
                      {/* Donut — distribución de gastos */}
                      <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Distribución de gastos</h3>
                        <ResponsiveContainer width="100%" height={190}>
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={82}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {donutData.map((entry) => (
                                <Cell
                                  key={entry.name}
                                  fill={entry.color}
                                  opacity={0.88}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => formatCurrencyCompact(Number(value ?? 0))}
                              {...TOOLTIP_STYLE}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className={styles.legend}>
                          {donutData.map((entry) => (
                            <div key={entry.name} className={styles.legendItem}>
                              <span
                                className={styles.legendDot}
                                style={{ background: entry.color }}
                              />
                              <span className={styles.legendLabel}>{entry.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Horizontal bars — burn rate */}
                      <div className={styles.chartCard}>
                        <h3 className={styles.chartTitle}>Burn rate por categoría</h3>
                        <ResponsiveContainer width="100%" height={190}>
                          <BarChart
                            data={barData}
                            layout="vertical"
                            barCategoryGap="28%"
                            margin={{ left: 0, right: 12, top: 4, bottom: 4 }}
                          >
                            <XAxis type="number" hide />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={90}
                              tick={{
                                fill: 'rgba(231,236,244,0.68)',
                                fontSize: 11,
                                fontFamily: 'var(--font-sans)',
                              }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              formatter={(value, name) => [
                                formatCurrencyCompact(Number(value ?? 0)),
                                name === 'gastado' ? 'Gastado' : 'Presupuesto',
                              ]}
                              {...TOOLTIP_STYLE}
                            />
                            <Bar
                              dataKey="presupuesto"
                              fill="rgba(255,255,255,0.08)"
                              radius={[0, 4, 4, 0]}
                              barSize={7}
                            />
                            <Bar
                              dataKey="gastado"
                              radius={[0, 4, 4, 0]}
                              barSize={7}
                            >
                              {barData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* ── ZONA 4 — Detalle ──────────────────────────────────────── */}
              {detailOpen ? (
                <div className={styles.detail}>
                  {pending.length > 0 ? (
                    <section className={styles.detailSection}>
                      <h3 className={styles.detailTitle}>Transacciones pendientes</h3>
                      <div className={styles.list}>
                        {pending.slice(0, 8).map((t) => (
                          <div key={t.id} className={styles.listRow}>
                            <div className={styles.listMain}>
                              <span className={styles.listPrimary}>
                                {t.attributes.concept}
                              </span>
                              <span className={styles.listSecondary}>
                                {t.attributes.date} · {t.attributes.product}
                              </span>
                            </div>
                            <span className={styles.listAmount}>
                              {formatCurrencyCompact(t.attributes.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {obligations.length > 0 ? (
                    <section className={styles.detailSection}>
                      <h3 className={styles.detailTitle}>Obligaciones próximo ciclo</h3>
                      <div className={styles.list}>
                        {obligations.slice(0, 10).map((o) => (
                          <div key={o.id} className={styles.listRow}>
                            <div className={styles.listMain}>
                              <span className={styles.listPrimary}>
                                {o.attributes.name}
                              </span>
                              <span className={styles.listSecondary}>
                                Día {o.attributes.due_day}
                              </span>
                            </div>
                            <span className={styles.listAmount}>
                              {formatCurrencyCompact(o.attributes.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {(summary?.credit_card_pending ?? 0) > 0 ? (
                    <section className={styles.detailSection}>
                      <h3 className={styles.detailTitle}>Tarjeta de crédito — pendiente de pagar</h3>
                      <div className={styles.list}>
                        {creditCardPending.slice(0, 8).map((t) => (
                          <div key={t.id} className={styles.listRow}>
                            <div className={styles.listMain}>
                              <span className={styles.listPrimary}>{t.attributes.concept}</span>
                              <span className={styles.listSecondary}>{t.attributes.date}</span>
                            </div>
                            <span className={styles.listAmount}>
                              {formatCurrencyCompact(t.attributes.amount)}
                            </span>
                          </div>
                        ))}
                        <div className={styles.listRow}>
                          <div className={styles.listMain}>
                            <span className={styles.listPrimary}>Total por abonar</span>
                            <span className={styles.listSecondary}>
                              Se liquida cuando registres el pago al banco
                            </span>
                          </div>
                          <span className={[styles.listAmount, styles.metricWarn].join(' ')}>
                            {formatCurrencyCompact(summary!.credit_card_pending!)}
                          </span>
                        </div>
                      </div>
                    </section>
                  ) : null}

                  {debts.length > 0 ? (
                    <section className={styles.detailSection}>
                      <h3 className={styles.detailTitle}>Deudas activas</h3>
                      <div className={pageStyles.tableWrap}>
                        <table className={pageStyles.table}>
                          <thead>
                            <tr>
                              <th>Deuda</th>
                              <th>Estado</th>
                              <th className={pageStyles.numeric}>Saldo</th>
                              <th className={pageStyles.numeric}>Pago mensual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {debts.map((d) => (
                              <tr key={d.id}>
                                <td>{d.attributes.name}</td>
                                <td>{d.attributes.status}</td>
                                <td className={pageStyles.numeric}>
                                  {formatCurrencyCompact(d.attributes.current_balance)}
                                </td>
                                <td className={pageStyles.numeric}>
                                  {formatCurrencyCompact(d.attributes.monthly_payment)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

        </section>
    </IonContent>
  );
};

export const DashboardPage = () => (
  <AppLayout title="Dashboard">
    <DashboardContent />
  </AppLayout>
);
