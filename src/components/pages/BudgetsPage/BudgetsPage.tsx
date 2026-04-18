import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { Button } from '../../atoms/Button';
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
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  const burnCategories = summary?.burn_rate?.categories ?? [];
  const outOfRange = burnCategories.filter((item) => item.on_track === false);
  const topRisk = outOfRange[0] ?? burnCategories[0] ?? null;

  return (
    <AppLayout title="Presupuestos">
      <section className={styles.stack}>
        {!detailsOpen ? (
          <div className={`${styles.focusCard} ${styles.focusCardFull}`}>
            <div className={styles.focusGrid}>
              <div className={styles.focusCopy}>
                <span className={styles.eyebrow}>Presupuestos</span>
                <p className={styles.focusQuestion}>¿El mes va dentro del plan o ya se salió de rango?</p>
                <h2 className={styles.focusTitle}>
                  {outOfRange.length ? `${outOfRange.length} categorías fuera de rango` : 'El burn rate sigue estable'}
                </h2>
                <p className={styles.focusText}>
                  {topRisk
                    ? `${topRisk.category} es la señal más útil para empezar. No necesitas leer toda la tabla antes de saber dónde mirar.`
                    : 'Cuando existan presupuestos, esta tarjeta te dirá primero si el plan sigue sano o no.'}
                </p>
              </div>
              <div>
                <div className={styles.focusValue}>{topRisk ? formatCop(topRisk.projected) : '—'}</div>
                <p className={styles.focusCaption}>
                  {topRisk ? `Proyección actual de ${topRisk.category}` : 'Sin burn rate visible todavía'}
                </p>
              </div>
            </div>

            {topRisk ? (
              <section className={styles.focusSupport}>
                <div className={styles.focusSupportHeader}>
                  <h3 className={styles.focusSupportTitle}>Riesgo principal</h3>
                  <span className={styles.focusSupportValue}>{Math.round(topRisk.pct)}%</span>
                </div>
                <div className={styles.focusRail}>
                  <div
                    className={`${styles.focusRailFill} ${topRisk.on_track ? '' : styles.focusRailFillWarn}`}
                    style={{ width: `${Math.min(Math.round(topRisk.pct), 100)}%` }}
                  />
                </div>
                <p className={styles.focusSupportText}>
                  {formatCop(topRisk.spent)} gastados de {formatCop(topRisk.budget)}; proyectado a {formatCop(topRisk.projected)}.
                </p>
              </section>
            ) : null}

            <div className={styles.focusMeta}>
              <span className={styles.focusBadge}>{budgets.length} categorías con presupuesto</span>
              <span className={styles.focusBadge}>{outOfRange.length} alertas</span>
            </div>

            <div className={styles.focusActions}>
              <Button
                label="Explorar detalle"
                variant="ghost"
                onClick={() => setDetailsOpen(true)}
              />
            </div>
          </div>
        ) : null}

        {detailsOpen ? (
          <div className={styles.detailStage}>
            <div className={styles.detailStageHeader}>
              <div className={styles.detailStageCopy}>
                <h3 className={styles.detailStageTitle}>Detalle de presupuestos</h3>
                <p className={styles.detailStageText}>La tabla completa y los filtros aparecen en esta vista secundaria, no apilados debajo del estado inicial.</p>
              </div>
              <Button label="Volver al resumen" variant="ghost" onClick={() => setDetailsOpen(false)} />
            </div>
            <div className={styles.detailPanel}>
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
            </div>
          </div>
        ) : null}

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !budgets.length ? <EmptyState message="No hay presupuestos definidos para el período actual." /> : null}

        {!loading && !error && budgets.length && detailsOpen ? (
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
