import { useEffect, useMemo, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { IconButton } from '../../atoms/IconButton';
import { Spinner } from '../../atoms/Spinner';
import { TextInput } from '../../atoms/TextInput';
import { SelectInput } from '../../atoms/SelectInput';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ConfirmModal } from '../../molecules/ConfirmModal';
import { CrudModal } from '../../molecules/CrudModal';
import { RecurringObligationComposer } from '../../organisms/RecurringObligationComposer';
import { RecurringObligationSlidingCard } from '../../organisms/RecurringObligationSlidingCard';
import { financeService } from '../../../services/financeService';
import type {
  IncomeSource,
  IncomeSourceQueryParams,
  RecurringObligation,
  RecurringObligationPayload,
  RecurringObligationQueryParams,
} from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

type CategoryOption = { label: string; value: string | number };

export const RecurringObligationsPage = () => {
  const [obligations, setObligations] = useState<RecurringObligation[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState<RecurringObligation | null>(null);
  const [deletingObligation, setDeletingObligation] = useState<RecurringObligation | null>(null);
  const [obligationFilters, setObligationFilters] = useState<RecurringObligationQueryParams>({
    q: '',
    active: 'all',
    category_id: '',
    sort_by: 'due_day',
    sort_dir: 'asc',
  });
  const [incomeFilters, setIncomeFilters] = useState<IncomeSourceQueryParams>({
    q: '',
    active: 'all',
    is_variable: 'all',
    sort_by: 'expected_day_from',
    sort_dir: 'asc',
  });

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

  return (
    <AppLayout title="Recurrentes">
      <section className={styles.stack}>
        <div className={styles.hero}>
          <div className={styles.listItem}>
            <div className={styles.listPrimary}>
              <span className={styles.eyebrow}>Finanzas</span>
              <h2 className={styles.headline}>Ingresos y obligaciones recurrentes</h2>
              <p className={styles.description}>
                Ajusta gastos fijos y revisa si los ingresos esperados alcanzan para cubrir la operación mensual.
              </p>
            </div>
            <div className={styles.listSecondary}>
              <IconButton
                label="Nuevo recurrente"
                variant="primary"
                icon={<IonIcon icon={addOutline} />}
                onClick={() => {
                  setEditingObligation(null);
                  setComposerOpen(true);
                }}
              />
            </div>
          </div>
        </div>

        {!loading ? (
          <div className={styles.metrics}>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Total ingresos esperados</span>
              <strong className={styles.metricValue}>{formatCop(metrics.incomeTotal)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Total obligaciones</span>
              <strong className={styles.metricValue}>{formatCop(metrics.obligationsTotal)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Fuentes de ingreso</span>
              <strong className={styles.metricValue}>{metrics.incomeCount}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Recurrentes activos</span>
              <strong className={styles.metricValue}>{metrics.obligationsCount}</strong>
            </article>
          </div>
        ) : null}

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error ? (
          <div className={styles.columns}>
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Fuentes de ingreso</h3>
              <div className={styles.filtersCompact}>
                <div className={styles.filtersGrid}>
                  <TextInput
                    name="income-q"
                    label="Buscar"
                    placeholder="Nombre"
                    value={incomeFilters.q ?? ''}
                    onChange={(q) => setIncomeFilters((current) => ({ ...current, q }))}
                  />
                  <SelectInput
                    name="income-variable"
                    label="Tipo"
                    value={String(incomeFilters.is_variable ?? 'all')}
                    onChange={(is_variable) =>
                      setIncomeFilters((current) => ({
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
                  <SelectInput
                    name="income-sort-by"
                    label="Ordenar por"
                    value={incomeFilters.sort_by ?? 'expected_day_from'}
                    onChange={(sort_by) => setIncomeFilters((current) => ({ ...current, sort_by: String(sort_by) }))}
                    options={[
                      { label: 'Día esperado', value: 'expected_day_from' },
                      { label: 'Monto', value: 'expected_amount' },
                      { label: 'Nombre', value: 'name' },
                    ]}
                  />
                  <SelectInput
                    name="income-sort-dir"
                    label="Dirección"
                    value={incomeFilters.sort_dir ?? 'asc'}
                    onChange={(sort_dir) =>
                      setIncomeFilters((current) => ({ ...current, sort_dir: sort_dir as 'asc' | 'desc' }))
                    }
                    options={[
                      { label: 'Ascendente', value: 'asc' },
                      { label: 'Descendente', value: 'desc' },
                    ]}
                  />
                </div>
              </div>
              {!incomeSources.length ? (
                <EmptyState message="No hay fuentes de ingreso cargadas." />
              ) : (
                <div className={styles.list}>
                  {incomeSources.map((source) => (
                    <article key={source.id} className={styles.listItem}>
                      <div className={styles.listPrimary}>
                        <span className={styles.listLabel}>{source.attributes.name}</span>
                        <span className={styles.listMeta}>
                          Día {source.attributes.expected_day_from} a {source.attributes.expected_day_to}
                        </span>
                      </div>
                      <div className={styles.listSecondary}>
                        <span className={styles.pill}>{source.attributes.is_variable ? 'Variable' : 'Fija'}</span>
                        <span className={styles.listLabel}>{formatCop(source.attributes.expected_amount)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Obligaciones recurrentes</h3>
              <div className={styles.filtersCompact}>
                <div className={styles.filtersGrid}>
                  <TextInput
                    name="recurring-q"
                    label="Buscar"
                    placeholder="Nombre"
                    value={obligationFilters.q ?? ''}
                    onChange={(q) => setObligationFilters((current) => ({ ...current, q }))}
                  />
                  <SelectInput
                    name="recurring-active"
                    label="Estado"
                    value={String(obligationFilters.active ?? 'all')}
                    onChange={(active) =>
                      setObligationFilters((current) => ({
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
                  <SelectInput
                    name="recurring-category-filter"
                    label="Categoría"
                    value={obligationFilters.category_id ?? ''}
                    onChange={(category_id) => setObligationFilters((current) => ({ ...current, category_id }))}
                    options={categoryOptions}
                    placeholder="Todas"
                  />
                  <SelectInput
                    name="recurring-sort-by"
                    label="Ordenar por"
                    value={obligationFilters.sort_by ?? 'due_day'}
                    onChange={(sort_by) =>
                      setObligationFilters((current) => ({ ...current, sort_by: String(sort_by) }))
                    }
                    options={[
                      { label: 'Día de vencimiento', value: 'due_day' },
                      { label: 'Monto', value: 'amount' },
                      { label: 'Nombre', value: 'name' },
                    ]}
                  />
                  <SelectInput
                    name="recurring-sort-dir"
                    label="Dirección"
                    value={obligationFilters.sort_dir ?? 'asc'}
                    onChange={(sort_dir) =>
                      setObligationFilters((current) => ({ ...current, sort_dir: sort_dir as 'asc' | 'desc' }))
                    }
                    options={[
                      { label: 'Ascendente', value: 'asc' },
                      { label: 'Descendente', value: 'desc' },
                    ]}
                  />
                </div>
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
          </div>
        ) : null}
      </section>

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
    </AppLayout>
  );
};
