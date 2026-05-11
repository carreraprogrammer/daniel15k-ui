import { useEffect, useMemo, useState } from 'react';
import { IonContent } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { financeService } from '../../../services/financeService';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import type { Debt, IncomeSource, RecurringObligation } from '../../../types/finance.types';
import styles from './PatrimonioPage.module.css';

type View = 'ingresos' | 'recurrentes' | 'deudas';

const debtTypeLabel: Record<string, string> = {
  credit_card:      'Tarjeta de crédito',
  personal_loan:    'Crédito personal',
  mortgage:         'Hipoteca',
  student_loan:     'Crédito educativo',
  auto_loan:        'Crédito vehículo',
  line_of_credit:   'Cupo de crédito',
  other:            'Otro',
};

const incomeDayLabel = (source: IncomeSource): string => {
  const { expected_day_from, expected_day_to } = source.attributes;
  if (expected_day_from === expected_day_to) return `Día ${expected_day_from}`;
  return `Días ${expected_day_from}–${expected_day_to}`;
};

export const EstructuraContent = () => {
  const history = useHistory();
  const [view, setView] = useState<View>('ingresos');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [debtsRes, incomeRes, obligationsRes] = await Promise.all([
        financeService.fetchDebts({ status: 'active', sort_by: 'created_at', sort_dir: 'desc' }),
        financeService.fetchIncomeSources({ active: 'all' }),
        financeService.fetchRecurringObligations({ active: 'all', sort_by: 'due_day', sort_dir: 'asc' }),
      ]);
      setDebts(debtsRes.data);
      setIncomeSources(incomeRes.data);
      setObligations(obligationsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const debtMetrics = useMemo(() => {
    const active = debts.filter((d) => d.attributes.status === 'active');
    return {
      total: active.reduce((s, d) => s + d.attributes.current_balance, 0),
      monthly: active.reduce((s, d) => s + d.attributes.monthly_payment, 0),
    };
  }, [debts]);

  const incomeMetrics = useMemo(() => ({
    total: incomeSources.reduce((s, src) => s + (src.attributes.expected_amount ?? 0), 0),
  }), [incomeSources]);

  const obligationMetrics = useMemo(() => {
    const active = obligations.filter((o) => o.attributes.active !== false);
    return {
      total: active.reduce((s, o) => s + o.attributes.amount, 0),
      count: active.length,
    };
  }, [obligations]);

  return (
    <IonContent>
      <div className={styles.page}>

        {/* ── Segment selector ── */}
        <div className={styles.segmentRow}>
          <button
            type="button"
            className={[styles.segBtn, view === 'ingresos' ? styles.segBtnActive : ''].filter(Boolean).join(' ')}
            onClick={() => setView('ingresos')}
          >
            Ingresos
          </button>
          <button
            type="button"
            className={[styles.segBtn, view === 'recurrentes' ? styles.segBtnActive : ''].filter(Boolean).join(' ')}
            onClick={() => setView('recurrentes')}
          >
            Recurrentes
          </button>
          <button
            type="button"
            className={[styles.segBtn, view === 'deudas' ? styles.segBtnActive : ''].filter(Boolean).join(' ')}
            onClick={() => setView('deudas')}
          >
            Deudas
          </button>
        </div>

        {loading ? <Spinner size="lg" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {/* ── Vista: Ingresos ── */}
        {!loading && !error && view === 'ingresos' ? (
          <div className={styles.listSection}>
            <div className={styles.viewHeader}>
              <span className={styles.viewLabel}>Total mensual</span>
              <span className={[styles.viewTotal, styles.viewTotalIncome].join(' ')}>
                {formatCurrencyCompact(incomeMetrics.total)}
              </span>
            </div>
            <p className={styles.sectionEyebrow}>Fuentes de ingreso</p>
            {incomeSources.length === 0 ? (
              <p className={styles.empty}>No hay fuentes de ingreso registradas.</p>
            ) : (
              <div className={styles.list}>
                {incomeSources.map((src) => (
                  <div key={src.id} className={styles.incomeRow}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowName}>{src.attributes.name}</span>
                      <span className={styles.rowSub}>{incomeDayLabel(src)}</span>
                    </div>
                    <div className={styles.rowRight}>
                      <span className={styles.rowAmountIncome}>
                        {formatCurrencyCompact(src.attributes.expected_amount ?? 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── Vista: Recurrentes ── */}
        {!loading && !error && view === 'recurrentes' ? (
          <div className={styles.listSection}>
            <div className={styles.obligationSummary}>
              <div className={styles.obligationStat}>
                <span className={styles.obligationStatLabel}>Carga mensual</span>
                <span className={styles.obligationStatValue}>
                  {formatCurrencyCompact(obligationMetrics.total)}
                </span>
              </div>
              <div className={styles.obligationStat}>
                <span className={styles.obligationStatLabel}>Activos</span>
                <span className={styles.obligationStatValue}>{obligationMetrics.count}</span>
              </div>
            </div>

            <p className={styles.sectionEyebrow}>Compromisos recurrentes</p>
            {obligations.length === 0 ? (
              <p className={styles.empty}>No hay gastos recurrentes registrados.</p>
            ) : (
              <div className={styles.list}>
                {obligations.map((obligation) => {
                  const attr = obligation.attributes;
                  const isActive = attr.active !== false;
                  return (
                    <div key={obligation.id} className={styles.recurringRow}>
                      <div className={styles.rowMain}>
                        <span className={styles.rowName}>{attr.name}</span>
                        <span className={styles.rowSub}>
                          {attr.due_day ? `Día ${attr.due_day}` : 'Fecha variable'}
                          {attr.category_name ? ` · ${attr.category_name}` : ''}
                        </span>
                      </div>
                      <div className={styles.rowRight}>
                        <span className={styles.rowAmountDebt}>
                          {formatCurrencyCompact(attr.amount)}
                        </span>
                        <span className={isActive ? styles.rowStatusActive : styles.rowStatusInactive}>
                          {isActive ? 'Cobrando' : 'Pausado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              className={styles.manageLink}
              onClick={() => history.push('/recurring')}
            >
              Gestionar recurrentes →
            </button>
          </div>
        ) : null}

        {/* ── Vista: Deudas ── */}
        {!loading && !error && view === 'deudas' ? (
          <div className={styles.listSection}>
            <div className={styles.debtSummary}>
              <div className={styles.debtStat}>
                <span className={styles.debtStatLabel}>Saldo total</span>
                <span className={styles.debtStatValue}>{formatCurrencyCompact(debtMetrics.total)}</span>
              </div>
              <div className={styles.debtStat}>
                <span className={styles.debtStatLabel}>Cuota mensual</span>
                <span className={styles.debtStatValue}>{formatCurrencyCompact(debtMetrics.monthly)}</span>
              </div>
            </div>

            <p className={styles.sectionEyebrow}>Deudas activas</p>
            {debts.length === 0 ? (
              <p className={styles.empty}>No hay deudas activas. Bien hecho.</p>
            ) : (
              <div className={styles.list}>
                {debts.map((debt) => {
                  const attr = debt.attributes;
                  const pct = attr.original_amount > 0
                    ? Math.min(Math.round((1 - attr.current_balance / attr.original_amount) * 100), 100)
                    : 0;
                  return (
                    <div key={debt.id} className={styles.debtRow}>
                      <div className={styles.debtRowTop}>
                        <div className={styles.rowMain}>
                          <span className={styles.rowName}>{attr.name}</span>
                          <span className={styles.rowSub}>
                            {debtTypeLabel[attr.debt_type] ?? attr.debt_type}
                            {attr.interest_rate ? ` · ${attr.interest_rate}% mensual` : ''}
                          </span>
                        </div>
                        <div className={styles.rowRight}>
                          <span className={styles.rowAmountDebt}>
                            {formatCurrencyCompact(attr.current_balance)}
                          </span>
                          <span className={styles.rowSub}>
                            {formatCurrencyCompact(attr.monthly_payment)}/mes
                          </span>
                        </div>
                      </div>
                      <div className={styles.pressureTrack}>
                        <div
                          className={styles.pressureFill}
                          style={{ width: `${pct}%` }}
                          title={`${pct}% pagado`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              className={styles.manageLink}
              onClick={() => history.push('/debts')}
            >
              Gestionar deudas →
            </button>
          </div>
        ) : null}

      </div>
    </IonContent>
  );
};

export const EstructuraPage = () => (
  <AppLayout title="Estructura">
    <EstructuraContent />
  </AppLayout>
);

export const PatrimonioPage = EstructuraPage;
