import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon, IonLabel, IonSegment, IonSegmentButton } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { IconButton } from '../../atoms/IconButton';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ConfirmModal } from '../../molecules/ConfirmModal';
import { CrudModal } from '../../molecules/CrudModal';
import { ListToolbar } from '../../molecules/ListToolbar';
import { AppliedFiltersBar } from '../../molecules/AppliedFiltersBar';
import { SortSheet } from '../../molecules/SortSheet';
import { FilterSheet } from '../../molecules/FilterSheet';
import { RecurringObligationComposer } from '../../organisms/RecurringObligationComposer';
import { RecurringObligationSlidingCard } from '../../organisms/RecurringObligationSlidingCard';
import { IncomeSourceComposer } from '../../organisms/IncomeSourceComposer';
import { IncomeSourceSlidingCard } from '../../organisms/IncomeSourceSlidingCard';
import { financeService } from '../../../services/financeService';
import type {
  IncomeSource,
  IncomeSourcePayload,
  IncomeSourceQueryParams,
  RecurringObligation,
  RecurringObligationPayload,
  RecurringObligationQueryParams,
} from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

type CategoryOption = { label: string; value: string | number };

const initialObligationFilters: RecurringObligationQueryParams = {
  q: '',
  active: 'all',
  category_id: '',
  sort_by: 'due_day',
  sort_dir: 'asc',
};

const initialIncomeFilters: IncomeSourceQueryParams = {
  q: '',
  active: true,
  is_variable: 'all',
  sort_by: 'expected_day_from',
  sort_dir: 'asc',
};

export const RecurringObligationsPage = () => {
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState<RecurringObligation | null>(null);
  const [deletingObligation, setDeletingObligation] = useState<RecurringObligation | null>(null);
  const [obligationFilters, setObligationFilters] = useState<RecurringObligationQueryParams>(initialObligationFilters);
  const [draftObligationFilters, setDraftObligationFilters] = useState<RecurringObligationQueryParams>(initialObligationFilters);
  const [incomeFilters, setIncomeFilters] = useState<IncomeSourceQueryParams>(initialIncomeFilters);
  const [incomeSortOpen, setIncomeSortOpen] = useState(false);
  const [incomeFiltersOpen, setIncomeFiltersOpen] = useState(false);
  const [draftIncomeFilters, setDraftIncomeFilters] = useState<IncomeSourceQueryParams>(initialIncomeFilters);
  const [activeView, setActiveView] = useState<'income' | 'obligations'>('obligations');
  const [incomeComposerOpen, setIncomeComposerOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<IncomeSource | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [obligationsResponse, incomeResponse, categoriesResponse] = await Promise.all([
        financeService.fetchRecurringObligations(obligationFilters),
        financeService.fetchIncomeSources(incomeFilters),
        financeService.fetchCategories(),
      ]);
      setObligations(obligationsResponse.data);
      setIncomeSources(incomeResponse.data);
      setCategoryOptions(
        categoriesResponse.data.map((category) => ({
          label: String(category.attributes.name ?? 'Sin nombre'),
          value: Number(category.id),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar la operación recurrente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [incomeFilters, obligationFilters]);

  const metrics = useMemo(() => {
    const activeObligations = obligations.filter((obligation) => obligation.attributes.active !== false);
    return {
      obligationsTotal: activeObligations.reduce((sum, obligation) => sum + obligation.attributes.amount, 0),
      obligationsCount: activeObligations.length,
      incomeTotal: incomeSources.reduce((sum, source) => sum + source.attributes.expected_amount, 0),
      incomeCount: incomeSources.length,
    };
  }, [incomeSources, obligations]);
  const coveragePct = metrics.obligationsTotal > 0
    ? Math.round((metrics.incomeTotal / metrics.obligationsTotal) * 100)
    : 0;

  const handleCreate = async (payload: RecurringObligationPayload) => {
    setSubmitting(true);
    try {
      await financeService.createRecurringObligation(payload);
      setComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, payload: Partial<RecurringObligationPayload>) => {
    setSubmitting(true);
    try {
      await financeService.updateRecurringObligation(id, payload);
      setEditingObligation(null);
      setComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingObligation) {
      return;
    }

    setSubmitting(true);
    try {
      await financeService.deleteRecurringObligation(deletingObligation.id);
      setDeletingObligation(null);
      if (editingObligation?.id === deletingObligation.id) {
        setEditingObligation(null);
      }
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible borrar el recurrente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateIncome = async (payload: IncomeSourcePayload) => {
    setSubmitting(true);
    try {
      await financeService.createIncomeSource(payload);
      setIncomeComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIncome = async (id: string, payload: Partial<IncomeSourcePayload>) => {
    setSubmitting(true);
    try {
      await financeService.updateIncomeSource(id, payload);
      setEditingIncome(null);
      setIncomeComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteIncome = async () => {
    if (!deletingIncome) return;
    setSubmitting(true);
    try {
      await financeService.deleteIncomeSource(deletingIncome.id);
      setDeletingIncome(null);
      if (editingIncome?.id === deletingIncome.id) setEditingIncome(null);
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible borrar el ingreso.');
    } finally {
      setSubmitting(false);
    }
  };

  const obligationActiveFilterCount = useMemo(
    () =>
      [obligationFilters.active !== 'all' ? obligationFilters.active : '', obligationFilters.category_id].filter(Boolean).length,
    [obligationFilters.active, obligationFilters.category_id],
  );

  const incomeActiveFilterCount = useMemo(
    () => [incomeFilters.active !== 'all' ? incomeFilters.active : '', incomeFilters.is_variable !== 'all' ? incomeFilters.is_variable : ''].filter(Boolean).length,
    [incomeFilters.active, incomeFilters.is_variable],
  );

  const obligationChips = useMemo(() => {
    const chips = [];
    if (obligationFilters.q) chips.push({ key: 'q', label: `Buscar: ${obligationFilters.q}` });
    if (obligationFilters.active !== 'all') {
      chips.push({ key: 'active', label: obligationFilters.active ? 'Solo activas' : 'Solo inactivas' });
    }
    if (obligationFilters.category_id) {
      const category = categoryOptions.find((item) => String(item.value) === String(obligationFilters.category_id));
      chips.push({ key: 'category_id', label: `Categoría: ${category?.label ?? obligationFilters.category_id}` });
    }
    return chips;
  }, [categoryOptions, obligationFilters.active, obligationFilters.category_id, obligationFilters.q]);

  const incomeChips = useMemo(() => {
    const chips = [];
    if (incomeFilters.q) chips.push({ key: 'q', label: `Buscar: ${incomeFilters.q}` });
    if (incomeFilters.is_variable !== 'all') {
      chips.push({ key: 'is_variable', label: incomeFilters.is_variable ? 'Variables' : 'Fijos' });
    }
    return chips;
  }, [incomeFilters.is_variable, incomeFilters.q]);

  return (
    <AppLayout title="Recurrentes">
      <IonContent className={styles.pageContent}>
      <section className={styles.stack}>
        {!detailsOpen && !loading && !error ? (
          <div className={`${styles.focusCard} ${styles.focusCardFull}`}>
            <div className={styles.focusGrid}>
              <div className={styles.focusCopy}>
                <span className={styles.eyebrow}>Recurrentes</span>
                <p className={styles.focusQuestion}>
                  {activeView === 'income'
                    ? '¿Con qué ingresos espero contar este mes?'
                    : '¿Cuánto pesa mi operación fija todos los meses?'}
                </p>
                <h2 className={styles.focusTitle}>
                  {activeView === 'income'
                    ? `${incomeSources.length} fuentes de ingreso`
                    : `${metrics.obligationsCount} obligaciones activas`}
                </h2>
                <p className={styles.focusText}>
                  {activeView === 'income'
                    ? 'Aquí deberías poder ver rápido si tu perfil de ingresos base ya está claro, sin entrar de inmediato a filtros o formularios.'
                    : 'Antes de editar nada, esta vista debería decirte cuánto cuesta sostener el sistema actual cada mes.'}
                </p>
              </div>
              <div>
                <div className={styles.focusValue}>
                  {activeView === 'income' ? formatCop(metrics.incomeTotal) : formatCop(metrics.obligationsTotal)}
                </div>
                <p className={styles.focusCaption}>
                  {activeView === 'income' ? 'Ingreso esperado recurrente' : 'Carga recurrente mensual'}
                </p>
              </div>
            </div>

            {metrics.obligationsTotal > 0 ? (
              <section className={styles.focusSupport}>
                <div className={styles.focusSupportHeader}>
                  <h3 className={styles.focusSupportTitle}>Cobertura mensual</h3>
                  <span className={styles.focusSupportValue}>{coveragePct}%</span>
                </div>
                <div className={styles.focusRail}>
                  <div
                    className={`${styles.focusRailFill} ${coveragePct < 100 ? styles.focusRailFillWarn : ''}`}
                    style={{ width: `${Math.min(coveragePct, 100)}%` }}
                  />
                </div>
                <p className={styles.focusSupportText}>
                  {formatCop(metrics.incomeTotal)} de ingresos recurrentes frente a {formatCop(metrics.obligationsTotal)} en obligaciones.
                </p>
              </section>
            ) : null}

            <div className={styles.focusMeta}>
              {activeView === 'income' ? (
                <span className={styles.focusBadge}>{incomeSources.filter((source) => source.attributes.classification === 'base').length} base confiable</span>
              ) : (
                <span className={styles.focusBadge}>{metrics.obligationsCount} activos</span>
              )}
              <span className={styles.focusBadge}>
                {activeView === 'income' ? `${incomeSources.length} fuentes` : `${obligations.length} registrados`}
              </span>
            </div>

            <div className={styles.focusActions}>
              {activeView === 'income' ? (
                <IconButton
                  label="Agregar ingreso"
                  variant="primary"
                  icon={<IonIcon icon={addOutline} />}
                  onClick={() => { setEditingIncome(null); setIncomeComposerOpen(true); }}
                />
              ) : (
                <IconButton
                  label="Nuevo recurrente"
                  variant="primary"
                  icon={<IonIcon icon={addOutline} />}
                  onClick={() => { setEditingObligation(null); setComposerOpen(true); }}
                />
              )}
              <Button
                label="Explorar detalle"
                variant="ghost"
                onClick={() => setDetailsOpen(true)}
              />
            </div>
          </div>
        ) : null}

        {detailsOpen ? (
          <>
            {loading ? <Spinner size="lg" /> : null}
            {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
            <div className={styles.detailStageHeader}>
              <div className={styles.detailStageCopy}>
                <h3 className={styles.detailStageTitle}>Detalle recurrente</h3>
                <p className={styles.detailStageText}>Aquí vives entre filtros, segmentación y cards. La vista inicial ya respondió la pregunta principal.</p>
              </div>
              <Button label="Volver al resumen" variant="ghost" onClick={() => setDetailsOpen(false)} />
            </div>
            <section className={styles.segmentWrap}>
              <IonSegment value={activeView} onIonChange={(event) => setActiveView((event.detail.value as 'income' | 'obligations') ?? 'obligations')}>
                <IonSegmentButton value="obligations">
                  <IonLabel>Obligaciones</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="income">
                  <IonLabel>Ingresos</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </section>
            {activeView === 'income' ? (
              <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Fuentes de ingreso</h3>
              <div className={styles.detailPanel}>
                <ListToolbar
                  searchLabel="Buscar ingresos"
                  searchPlaceholder="Nombre"
                  searchValue={incomeFilters.q ?? ''}
                  resultLabel={`${incomeSources.length} resultados`}
                  activeFilterCount={incomeActiveFilterCount}
                  onSearchChange={(q) => {
                    const next = { ...incomeFilters, q };
                    setIncomeFilters(next);
                    setDraftIncomeFilters(next);
                  }}
                  onOpenSort={() => setIncomeSortOpen(true)}
                  onOpenFilters={() => setIncomeFiltersOpen(true)}
                />
                <AppliedFiltersBar
                  chips={incomeChips}
                  onRemove={(key) => {
                    const next = { ...incomeFilters, [key]: key === 'is_variable' ? 'all' : '' };
                    setIncomeFilters(next);
                    setDraftIncomeFilters(next);
                  }}
                  onClearAll={() => {
                    setIncomeFilters(initialIncomeFilters);
                    setDraftIncomeFilters(initialIncomeFilters);
                  }}
                />
              </div>
              {!incomeSources.length ? (
                <EmptyState message="No hay fuentes de ingreso cargadas." />
              ) : (
                <div className={styles.list}>
                  {incomeSources.map((source) => (
                    <IncomeSourceSlidingCard
                      key={source.id}
                      source={source}
                      onEdit={(s) => { setEditingIncome(s); setIncomeComposerOpen(true); }}
                      onDelete={setDeletingIncome}
                    />
                  ))}
                </div>
              )}
              </section>
            ) : (
              <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Obligaciones recurrentes</h3>
              <div className={styles.detailPanel}>
                <ListToolbar
                  searchLabel="Buscar recurrentes"
                  searchPlaceholder="Nombre"
                  searchValue={obligationFilters.q ?? ''}
                  resultLabel={`${obligations.length} resultados`}
                  activeFilterCount={obligationActiveFilterCount}
                  onSearchChange={(q) => {
                    const next = { ...obligationFilters, q };
                    setObligationFilters(next);
                    setDraftObligationFilters(next);
                  }}
                  onOpenSort={() => setSortOpen(true)}
                  onOpenFilters={() => setFiltersOpen(true)}
                />
                <div className={styles.quickFilters}>
                  <Button
                    label="Activos"
                    size="sm"
                    variant={obligationFilters.active === true ? 'primary' : 'ghost'}
                    onClick={() => {
                      const next: RecurringObligationQueryParams = {
                        ...obligationFilters,
                        active: obligationFilters.active === true ? 'all' : true,
                      };
                      setObligationFilters(next);
                      setDraftObligationFilters(next);
                    }}
                  />
                </div>
                <AppliedFiltersBar
                  chips={obligationChips}
                  onRemove={(key) => {
                    const next: RecurringObligationQueryParams =
                      key === 'active'
                        ? { ...obligationFilters, active: 'all' }
                        : key === 'category_id'
                          ? { ...obligationFilters, category_id: '' }
                          : { ...obligationFilters, q: '' };
                    setObligationFilters(next);
                    setDraftObligationFilters(next);
                  }}
                  onClearAll={() => {
                    setObligationFilters(initialObligationFilters);
                    setDraftObligationFilters(initialObligationFilters);
                  }}
                />
              </div>
              {!obligations.length ? (
                <EmptyState message="No hay obligaciones recurrentes registradas." />
              ) : (
                <div className={styles.list}>
                  {obligations.map((obligation) => (
                    <RecurringObligationSlidingCard
                      key={obligation.id}
                      obligation={obligation}
                      onEdit={(nextObligation) => {
                        setEditingObligation(nextObligation);
                        setComposerOpen(true);
                      }}
                      onDelete={setDeletingObligation}
                    />
                  ))}
                </div>
              )}
              </section>
            )}
          </>
        ) : null}
      </section>

      <SortSheet
        isOpen={sortOpen}
        title="Ordenar recurrentes"
        sortBy={String(obligationFilters.sort_by ?? 'due_day')}
        sortDir={(obligationFilters.sort_dir as 'asc' | 'desc') ?? 'asc'}
        options={[
          { label: 'Día de vencimiento', value: 'due_day' },
          { label: 'Monto', value: 'amount' },
          { label: 'Nombre', value: 'name' },
        ]}
        onClose={() => setSortOpen(false)}
        onChangeSortBy={(sort_by) => setObligationFilters((current) => ({ ...current, sort_by }))}
        onChangeSortDir={(sort_dir) => setObligationFilters((current) => ({ ...current, sort_dir }))}
      />

      <SortSheet
        isOpen={incomeSortOpen}
        title="Ordenar ingresos"
        sortBy={String(incomeFilters.sort_by ?? 'expected_day_from')}
        sortDir={(incomeFilters.sort_dir as 'asc' | 'desc') ?? 'asc'}
        options={[
          { label: 'Día esperado', value: 'expected_day_from' },
          { label: 'Monto', value: 'expected_amount' },
          { label: 'Nombre', value: 'name' },
        ]}
        onClose={() => setIncomeSortOpen(false)}
        onChangeSortBy={(sort_by) => setIncomeFilters((current) => ({ ...current, sort_by }))}
        onChangeSortDir={(sort_dir) => setIncomeFilters((current) => ({ ...current, sort_dir }))}
      />

      <FilterSheet
        isOpen={filtersOpen}
        title="Filtrar recurrentes"
        resultLabel={`Mostrar ${obligations.length} resultados`}
        onClose={() => {
          setDraftObligationFilters(obligationFilters);
          setFiltersOpen(false);
        }}
        onReset={() => setDraftObligationFilters({ ...initialObligationFilters, q: obligationFilters.q })}
        onApply={() => {
          setObligationFilters(draftObligationFilters);
          setFiltersOpen(false);
        }}
      >
        <section className={styles.sheetSection}>
          <h3 className={styles.sheetSectionTitle}>Estado</h3>
          <SelectInput
            name="rec-filter-active"
            value={String(draftObligationFilters.active ?? 'all')}
            onChange={(active) =>
              setDraftObligationFilters((current) => ({
                ...current,
                active: active === 'all' ? 'all' : active === 'true',
              }))
            }
            options={[
              { label: 'Todos', value: 'all' },
              { label: 'Activos', value: 'true' },
              { label: 'Inactivos', value: 'false' },
            ]}
            placeholder="Todos"
          />
        </section>
        <section className={styles.sheetSection}>
          <h3 className={styles.sheetSectionTitle}>Categoría</h3>
          <SelectInput
            name="rec-filter-category"
            value={draftObligationFilters.category_id ?? ''}
            onChange={(category_id) => setDraftObligationFilters((current) => ({ ...current, category_id }))}
            options={categoryOptions}
            placeholder="Todas"
          />
        </section>
      </FilterSheet>

      <FilterSheet
        isOpen={incomeFiltersOpen}
        title="Filtrar ingresos"
        resultLabel={`Mostrar ${incomeSources.length} resultados`}
        onClose={() => {
          setDraftIncomeFilters(incomeFilters);
          setIncomeFiltersOpen(false);
        }}
        onReset={() => setDraftIncomeFilters({ ...initialIncomeFilters, q: incomeFilters.q })}
        onApply={() => {
          setIncomeFilters(draftIncomeFilters);
          setIncomeFiltersOpen(false);
        }}
      >
        <section className={styles.sheetSection}>
          <h3 className={styles.sheetSectionTitle}>Tipo</h3>
          <SelectInput
            name="income-filter-variable"
            value={String(draftIncomeFilters.is_variable ?? 'all')}
            onChange={(is_variable) =>
              setDraftIncomeFilters((current) => ({
                ...current,
                is_variable: is_variable === 'all' ? 'all' : is_variable === 'true',
              }))
            }
            options={[
              { label: 'Todos', value: 'all' },
              { label: 'Variables', value: 'true' },
              { label: 'Fijos', value: 'false' },
            ]}
            placeholder="Todos"
          />
        </section>
      </FilterSheet>

      <ConfirmModal
        isOpen={Boolean(deletingObligation)}
        title="Borrar recurrente"
        message={
          deletingObligation
            ? `Vas a borrar "${deletingObligation.attributes.name}". Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Borrar"
        danger
        onCancel={() => setDeletingObligation(null)}
        onConfirm={() => void handleDelete()}
      />

      <CrudModal
        isOpen={composerOpen}
        title={editingObligation ? 'Editar recurrente' : 'Nuevo recurrente'}
        onClose={() => {
          setComposerOpen(false);
          setEditingObligation(null);
        }}
      >
        <RecurringObligationComposer
          obligation={editingObligation}
          loading={submitting}
          categoryOptions={categoryOptions}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancel={() => {
            setComposerOpen(false);
            setEditingObligation(null);
          }}
        />
      </CrudModal>

      <CrudModal
        isOpen={incomeComposerOpen}
        title={editingIncome ? 'Editar ingreso' : 'Nuevo ingreso'}
        onClose={() => { setIncomeComposerOpen(false); setEditingIncome(null); }}
      >
        <IncomeSourceComposer
          source={editingIncome}
          loading={submitting}
          onCreate={handleCreateIncome}
          onUpdate={handleUpdateIncome}
          onCancel={() => { setIncomeComposerOpen(false); setEditingIncome(null); }}
        />
      </CrudModal>

      <ConfirmModal
        isOpen={Boolean(deletingIncome)}
        title="Borrar ingreso"
        message={deletingIncome ? `Vas a borrar "${deletingIncome.attributes.name}". Esta acción no se puede deshacer.` : ''}
        confirmLabel="Borrar"
        danger
        onCancel={() => setDeletingIncome(null)}
        onConfirm={() => void handleDeleteIncome()}
      />
      </IonContent>
    </AppLayout>
  );
};
