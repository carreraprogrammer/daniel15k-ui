import { useEffect, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { financeService } from '../../../services/financeService';
import type { Budget, SummaryResponse } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const BudgetsPage = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetsResponse, summaryResponse] = await Promise.all([
        financeService.fetchBudgets(),
        financeService.fetchSummary(),
      ]);
      setBudgets(budgetsResponse.data);
      setSummary(summaryResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los presupuestos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <AppLayout title="Presupuestos">
      <section className={styles.stack}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Finanzas</span>
          <h2 className={styles.headline}>Presupuesto y burn rate</h2>
          <p className={styles.description}>
            Lectura inicial del período activo para ver límites cargados y la proyección contra el gasto real.
          </p>
        </div>

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !budgets.length ? <EmptyState message="No hay presupuestos definidos para el período actual." /> : null}

        {!loading && !error && budgets.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th className={styles.numeric}>Límite</th>
                  <th className={styles.numeric}>Gastado</th>
                  <th className={styles.numeric}>Proyectado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map((budget) => {
                  const burnRate = summary?.burn_rate?.categories.find((item) => item.category_id === budget.attributes.category_id);
                  return (
                    <tr key={budget.id}>
                      <td>{budget.attributes.category_name ?? `Categoría ${budget.attributes.category_id}`}</td>
                      <td className={styles.numeric}>{formatCop(budget.attributes.amount_limit)}</td>
                      <td className={styles.numeric}>{formatCop(burnRate?.spent ?? 0)}</td>
                      <td className={styles.numeric}>{formatCop(burnRate?.projected ?? 0)}</td>
                      <td className={burnRate?.on_track === false ? styles.statusWarn : styles.statusGood}>
                        {burnRate?.on_track === false ? 'Fuera de rango' : 'En rango'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AppLayout>
  );
};
