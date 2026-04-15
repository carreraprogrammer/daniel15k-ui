import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ListToolbar } from '../../molecules/ListToolbar';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { FilterSheet } from '../../molecules/FilterSheet';
import { financeService } from '../../../services/financeService';
import type { Budget, BudgetQueryParams, SummaryResponse } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

type CategoryOption = { label: string; value: string | number };

const initialFilters: BudgetQueryParams = {
  q: '',
  category_id: '',
  sort_by: 'category_id',
  sort_dir: 'asc',
};

export const BudgetsPage = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<BudgetQueryParams>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<BudgetQueryParams>(initialFilters);

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

  const activeFilterCount = useMemo(() => [filters.category_id].filter(Boolean).length, [filters.category_id]);

  const chips = useMemo(() => {
    const next = [];
    if (filters.q) next.push({ key: 'q', label: `Buscar: ${filters.q}` });
    if (filters.category_id) {
      const category = categoryOptions.find((item) => String(item.value) === String(filters.category_id));
      next.push({ key: 'category_id', label: `Categoría: ${category?.label ?? filters.category_id}` });
    }
    return next;
  }, [categoryOptions, filters.category_id, filters.q]);

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

        <ListToolbar
          searchLabel="Buscar presupuestos"
          searchPlaceholder="Categoría"
          searchValue={filters.q ?? ''}
          resultLabel={`${budgets.length} resultados`}
          activeFilterCount={activeFilterCount}
          onSearchChange={(q) => {
            const next = { ...filters, q };
            setFilters(next);
            setDraftFilters(next);
          }}
          onOpenSort={() => setSortOpen(true)}
          onOpenFilters={() => setFiltersOpen(true)}
        />

        <AppliedFiltersBar
          chips={chips}
          onRemove={(key) => {
            const next = { ...filters, [key]: '' };
            setFilters(next);
            setDraftFilters(next);
          }}
          onClearAll={() => {
            setFilters(initialFilters);
            setDraftFilters(initialFilters);
          }}
        />

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

      <SortSheet
        isOpen={sortOpen}
        title="Ordenar presupuestos"
        sortBy={String(filters.sort_by ?? 'category_id')}
        sortDir={(filters.sort_dir as 'asc' | 'desc') ?? 'asc'}
        options={[
          { label: 'Categoría', value: 'category_name' },
          { label: 'Límite', value: 'amount_limit' },
          { label: 'ID categoría', value: 'category_id' },
        ]}
        onClose={() => setSortOpen(false)}
        onChangeSortBy={(sort_by) => setFilters((current) => ({ ...current, sort_by }))}
        onChangeSortDir={(sort_dir) => setFilters((current) => ({ ...current, sort_dir }))}
      />

      <FilterSheet
        isOpen={filtersOpen}
        title="Filtrar presupuestos"
        resultLabel={`Mostrar ${budgets.length} resultados`}
        onClose={() => {
          setDraftFilters(filters);
          setFiltersOpen(false);
        }}
        onReset={() => setDraftFilters({ ...initialFilters, q: filters.q })}
        onApply={() => {
          setFilters(draftFilters);
          setFiltersOpen(false);
        }}
      >
        <section className={styles.sheetSection}>
          <h3 className={styles.sheetSectionTitle}>Categoría</h3>
          <SelectInput
            name="budget-filter-category"
            value={draftFilters.category_id ?? ''}
            onChange={(category_id) => setDraftFilters((current) => ({ ...current, category_id }))}
            options={categoryOptions}
            placeholder="Todas"
          />
        </section>
      </FilterSheet>
    </AppLayout>
  );
};
