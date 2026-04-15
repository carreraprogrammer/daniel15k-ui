import { useEffect, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { TextInput } from '../../atoms/TextInput';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { financeService } from '../../../services/financeService';
import type { Budget, BudgetQueryParams, SummaryResponse } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

type CategoryOption = { label: string; value: string | number };

export const BudgetsPage = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BudgetQueryParams>({
    q: '',
    category_id: '',
    sort_by: 'category_id',
    sort_dir: 'asc',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetsResponse, summaryResponse, categoriesResponse] = await Promise.all([
        financeService.fetchBudgets(filters),
        financeService.fetchSummary(),
        financeService.fetchCategories(),
      ]);
      setBudgets(budgetsResponse.data);
      setSummary(summaryResponse);
      setCategoryOptions(
        categoriesResponse.data.map((category) => ({
          label: String(category.attributes.name ?? 'Sin nombre'),
          value: Number(category.id),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los presupuestos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters]);

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

        <section className={styles.filters}>
          <div className={styles.filtersGrid}>
            <TextInput
              name="budgets-q"
              label="Buscar"
              placeholder="Categoría"
              value={filters.q ?? ''}
              onChange={(q) => setFilters((current) => ({ ...current, q }))}
            />
            <SelectInput
              name="budgets-category"
              label="Categoría"
              value={filters.category_id ?? ''}
              onChange={(category_id) => setFilters((current) => ({ ...current, category_id }))}
              options={categoryOptions}
              placeholder="Todas"
            />
            <SelectInput
              name="budgets-sort-by"
              label="Ordenar por"
              value={filters.sort_by ?? 'category_id'}
              onChange={(sort_by) => setFilters((current) => ({ ...current, sort_by: String(sort_by) }))}
              options={[
                { label: 'Categoría', value: 'category_name' },
                { label: 'Límite', value: 'amount_limit' },
                { label: 'ID categoría', value: 'category_id' },
              ]}
            />
            <SelectInput
              name="budgets-sort-dir"
              label="Dirección"
              value={filters.sort_dir ?? 'asc'}
              onChange={(sort_dir) => setFilters((current) => ({ ...current, sort_dir: sort_dir as 'asc' | 'desc' }))}
              options={[
                { label: 'Ascendente', value: 'asc' },
                { label: 'Descendente', value: 'desc' },
              ]}
            />
          </div>
        </section>

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
