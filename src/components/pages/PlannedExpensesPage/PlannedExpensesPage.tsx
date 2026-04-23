import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { IconButton } from '../../atoms/IconButton';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { CrudModal } from '../../molecules/CrudModal';
import { ListToolbar } from '../../molecules/ListToolbar';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { PlannedExpenseComposer } from '../../organisms/PlannedExpenseComposer';
import { PlannedExpenseSlidingCard } from '../../organisms/PlannedExpenseSlidingCard';
import { financeService } from '../../../services/financeService';
import type {
  CategoryResource,
  PlannedExpense,
  PlannedExpensePayload,
  PlannedExpenseQueryParams,
} from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const planningTypeLabels: Record<string, string> = {
  mandatory_one_off: 'Obligatorio puntual',
  irregular_maintenance: 'Mantenimiento',
  wish: 'Deseo',
  planned_purchase: 'Compra planeada',
};

const initialFilters: PlannedExpenseQueryParams = {
  q: '',
  status: '',
  planning_type: '',
  category_id: '',
  sort_by: 'target_date',
  sort_dir: 'asc',
};

export const PlannedExpensesPage = () => {
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [categories, setCategories] = useState<CategoryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PlannedExpense | null>(null);
  const [filters, setFilters] = useState<PlannedExpenseQueryParams>(initialFilters);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [expensesResponse, categoriesResponse] = await Promise.all([
        financeService.fetchPlannedExpenses(filters),
        financeService.fetchCategories(),
      ]);
      setPlannedExpenses(expensesResponse.data);
      setCategories(categoriesResponse.data);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'No fue posible cargar los gastos planeados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters]);

  const metrics = useMemo(() => {
    const pending = plannedExpenses.filter((expense) => expense.attributes.status === 'planned');
    return {
      totalEstimated: pending.reduce((sum, expense) => sum + expense.attributes.amount_estimated, 0),
      plannedCount: pending.length,
      totalCount: plannedExpenses.length,
    };
  }, [plannedExpenses]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        label: category.attributes.name ?? 'Sin categoría',
        value: String(category.id),
      })),
    [categories],
  );

  const handleCreate = async (payload: PlannedExpensePayload) => {
    setSubmitting(true);
    try {
      await financeService.createPlannedExpense(payload);
      setComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, payload: Partial<PlannedExpensePayload>) => {
    setSubmitting(true);
    try {
      await financeService.updatePlannedExpense(id, payload);
      setEditingExpense(null);
      setComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (plannedExpense: PlannedExpense, status: PlannedExpense['attributes']['status']) => {
    await handleUpdate(plannedExpense.id, { status });
  };

  const appliedChips = useMemo(() => {
    const chips = [];
    if (filters.q) chips.push({ key: 'q', label: `Buscar: ${filters.q}` });
    if (filters.status) chips.push({ key: 'status', label: `Estado: ${filters.status}` });
    if (filters.planning_type) {
      chips.push({ key: 'planning_type', label: `Tipo: ${planningTypeLabels[filters.planning_type] ?? filters.planning_type}` });
    }
    if (filters.category_id) {
      const category = categoryOptions.find((option) => option.value === String(filters.category_id));
      chips.push({ key: 'category_id', label: `Categoría: ${category?.label ?? filters.category_id}` });
    }
    return chips;
  }, [categoryOptions, filters.category_id, filters.planning_type, filters.q, filters.status]);

  const activeFilterCount = useMemo(
    () => appliedChips.filter((chip) => chip.key !== 'q').length,
    [appliedChips],
  );

  const removeChip = (key: string) => {
    setFilters((current) => ({ ...current, [key]: '' }));
  };

  return (
    <AppLayout title="Planeados">
      <IonContent className={styles.pageContent}>
        <section className={`${styles.stack} ${!detailsOpen ? styles.stackFill : ''}`}>
          {!detailsOpen ? (
            <div className={styles.focusStage}>
              <div className={`${styles.focusCard} ${styles.focusCardFull} ${styles.focusCardCentered}`}>
                <div className={styles.focusGrid}>
                  <div className={styles.focusCopy}>
                    <span className={styles.eyebrow}>Planeación futura</span>
                    <p className={styles.focusQuestion}>¿Qué gasto previsible viene adelante y todavía no debería entrar como transacción?</p>
                    <h2 className={styles.focusTitle}>
                      {metrics.plannedCount ? `${metrics.plannedCount} gastos pendientes` : 'No hay gastos pendientes'}
                    </h2>
                    <p className={styles.focusText}>
                      Esta vista concentra compras planeadas, mantenimientos y gastos puntuales futuros sin mezclarlos con flujo mensual ni con transacciones reales.
                    </p>
                  </div>
                  <div>
                    <div className={styles.focusValue}>{formatCop(metrics.totalEstimated)}</div>
                    <p className={styles.focusCaption}>Monto estimado pendiente</p>
                  </div>
                </div>

                <div className={styles.focusMeta}>
                  <span className={styles.focusBadge}>{metrics.totalCount} registrados</span>
                  <span className={styles.focusBadge}>{metrics.plannedCount} siguen abiertos</span>
                </div>

                <div className={styles.focusActions}>
                  <IconButton
                    label="Nuevo gasto planeado"
                    variant="primary"
                    icon={<IonIcon icon={addOutline} />}
                    onClick={() => {
                      setEditingExpense(null);
                      setComposerOpen(true);
                    }}
                  />
                  <Button label="Explorar detalle" variant="ghost" onClick={() => setDetailsOpen(true)} />
                </div>
              </div>
            </div>
          ) : null}

          {detailsOpen ? (
            <div className={styles.detailStage}>
              <div className={styles.detailStageHeader}>
                <div className={styles.detailStageCopy}>
                  <h3 className={styles.detailStageTitle}>Detalle de gastos planeados</h3>
                  <p className={styles.detailStageText}>Aquí viven el listado, los filtros y la edición mínima de la planeación futura.</p>
                </div>
                <Button label="Volver al resumen" variant="ghost" onClick={() => setDetailsOpen(false)} />
              </div>
              <div className={styles.detailPanel}>
                <ListToolbar
                  searchLabel="Buscar gastos planeados"
                  searchPlaceholder="SOAT, viaje, mantenimiento"
                  searchValue={filters.q ?? ''}
                  resultLabel={`${plannedExpenses.length} resultados`}
                  activeFilterCount={activeFilterCount}
                  onSearchChange={(q) => setFilters((current) => ({ ...current, q }))}
                  onOpenSort={() => setSortOpen(true)}
                  onOpenFilters={() => setFiltersVisible((visible) => !visible)}
                />

                {filtersVisible ? (
                  <div className={styles.filterPanel}>
                    <div className={styles.inlineFilters}>
                      <SelectInput
                        name="planned-expenses-status"
                        value={filters.status ?? ''}
                        onChange={(status) => setFilters((current) => ({ ...current, status: String(status) }))}
                        options={[
                          { label: 'Planeado', value: 'planned' },
                          { label: 'Ejecutado', value: 'executed' },
                          { label: 'Cancelado', value: 'cancelled' },
                        ]}
                        placeholder="Todos los estados"
                      />
                      <SelectInput
                        name="planned-expenses-type"
                        value={filters.planning_type ?? ''}
                        onChange={(planning_type) => setFilters((current) => ({ ...current, planning_type: String(planning_type) }))}
                        options={[
                          { label: 'Obligatorio puntual', value: 'mandatory_one_off' },
                          { label: 'Mantenimiento', value: 'irregular_maintenance' },
                          { label: 'Deseo', value: 'wish' },
                          { label: 'Compra planeada', value: 'planned_purchase' },
                        ]}
                        placeholder="Todos los tipos"
                      />
                      <SelectInput
                        name="planned-expenses-category"
                        value={filters.category_id ?? ''}
                        onChange={(category_id) => setFilters((current) => ({ ...current, category_id: String(category_id) }))}
                        options={categoryOptions}
                        placeholder="Todas las categorías"
                      />
                    </div>
                  </div>
                ) : null}

                <AppliedFiltersBar
                  chips={appliedChips}
                  onRemove={removeChip}
                  onClearAll={() => setFilters(initialFilters)}
                />
              </div>
            </div>
          ) : null}

          {loading ? <Spinner size="lg" /> : null}
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {!loading && !error && !plannedExpenses.length ? (
            <EmptyState
              message={
                activeFilterCount || filters.q
                  ? 'No hay gastos planeados que coincidan con esos filtros.'
                  : 'No hay gastos planeados registrados.'
              }
            />
          ) : null}

          {!loading && !error && plannedExpenses.length && detailsOpen ? (
            <div className={styles.list}>
              {plannedExpenses.map((plannedExpense) => (
                <PlannedExpenseSlidingCard
                  key={plannedExpense.id}
                  plannedExpense={plannedExpense}
                  onChangeStatus={(nextExpense, status) => {
                    void handleChangeStatus(nextExpense, status);
                  }}
                  onEdit={(nextExpense) => {
                    setEditingExpense(nextExpense);
                    setComposerOpen(true);
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>

        <SortSheet
          isOpen={sortOpen}
          title="Ordenar gastos planeados"
          sortBy={String(filters.sort_by ?? 'target_date')}
          sortDir={(filters.sort_dir as 'asc' | 'desc') ?? 'asc'}
          options={[
            { label: 'Fecha objetivo', value: 'target_date' },
            { label: 'Monto estimado', value: 'amount_estimated' },
            { label: 'Nombre', value: 'name' },
            { label: 'Estado', value: 'status' },
            { label: 'Tipo', value: 'planning_type' },
          ]}
          onClose={() => setSortOpen(false)}
          onChangeSortBy={(sort_by) => setFilters((current) => ({ ...current, sort_by }))}
          onChangeSortDir={(sort_dir) => setFilters((current) => ({ ...current, sort_dir }))}
        />

        <CrudModal
          isOpen={composerOpen}
          title={editingExpense ? 'Editar gasto planeado' : 'Nuevo gasto planeado'}
          subtitle="Usa esta entidad para gastos futuros previsibles que todavía no deben vivir como transacción ni como recurrente mensual."
          onClose={() => {
            setComposerOpen(false);
            setEditingExpense(null);
          }}
        >
          <PlannedExpenseComposer
            plannedExpense={editingExpense}
            loading={submitting}
            categories={categories}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onCancel={() => {
              setComposerOpen(false);
              setEditingExpense(null);
            }}
          />
        </CrudModal>
      </IonContent>
    </AppLayout>
  );
};
