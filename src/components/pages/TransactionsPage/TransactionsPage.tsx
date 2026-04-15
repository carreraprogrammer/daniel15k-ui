import { useEffect, useMemo, useState } from 'react';
import { IonIcon, useIonAlert, useIonToast } from '@ionic/react';
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
import { FilterSheet } from '../../molecules/FilterSheet';
import { TransactionComposer } from '../../organisms/TransactionComposer';
import { TransactionSlidingCard } from '../../organisms/TransactionSlidingCard';
import { financeService } from '../../../services/financeService';
import type { SummaryResponse, TransactionQueryParams } from '../../../types/finance.types';
import type { Transaction, TransactionCreatePayload, TransactionUpdatePayload } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const initialFilters: TransactionQueryParams = {
  q: '',
  status: '',
  transaction_type: '',
  source: '',
  sort_by: 'date',
  sort_dir: 'desc',
};

export const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionQueryParams>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<TransactionQueryParams>(initialFilters);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [transactionsResponse, summaryResponse] = await Promise.all([
        financeService.fetchTransactions(filters),
        financeService.fetchSummary(),
      ]);
      setTransactions(transactionsResponse.data);
      setSummary(summaryResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar las transacciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filters]);

  const handleCreate = async (payload: TransactionCreatePayload) => {
    setSubmitting(true);
    try {
      await financeService.createTransaction(payload);
      setComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, payload: TransactionUpdatePayload) => {
    setSubmitting(true);
    try {
      await financeService.updateTransaction(id, payload);
      setEditingTransaction(null);
      setComposerOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    console.debug('[TransactionsPage] handleDelete:start', {
      id: transaction.id,
      concept: transaction.attributes.concept,
    });
    setSubmitting(true);
    try {
      await financeService.deleteTransaction(transaction.id);
      console.debug('[TransactionsPage] handleDelete:success', { id: transaction.id });
      if (editingTransaction?.id === transaction.id) {
        setEditingTransaction(null);
      }
      await load();
      await presentToast({
        message: 'Transacción borrada con éxito',
        duration: 2200,
        color: 'success',
        position: 'top',
      });
    } catch (deleteError) {
      console.error('[TransactionsPage] handleDelete:error', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible borrar la transacción.');
      await presentToast({
        message: 'No se pudo borrar la transacción',
        duration: 2600,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const requestDelete = async (transaction: Transaction) => {
    console.debug('[TransactionsPage] requestDelete', {
      id: transaction.id,
      concept: transaction.attributes.concept,
      amount: transaction.attributes.amount,
    });

    await presentAlert({
      header: 'Borrar transacción',
      message: `¿Seguro que quieres borrar "${transaction.attributes.concept}" por ${formatCop(transaction.attributes.amount)}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.debug('[TransactionsPage] requestDelete:cancelled', { id: transaction.id });
          },
        },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            console.debug('[TransactionsPage] requestDelete:confirmed', { id: transaction.id });
            void handleDelete(transaction);
          },
        },
      ],
    });
  };

  const metrics = useMemo(() => {
    const incomeTotal = transactions
      .filter((transaction) => transaction.attributes.transaction_type === 'income')
      .reduce((sum, transaction) => sum + transaction.attributes.amount, 0);
    const expenseTotal = transactions
      .filter((transaction) => transaction.attributes.transaction_type !== 'income')
      .reduce((sum, transaction) => sum + transaction.attributes.amount, 0);
    const pendingCount = transactions.filter((transaction) => transaction.attributes.status === 'pending').length;

    return {
      count: transactions.length,
      incomeTotal,
      expenseTotal,
      pendingCount,
    };
  }, [transactions]);

  const activeFilterCount = useMemo(
    () => [filters.status, filters.transaction_type, filters.source].filter(Boolean).length,
    [filters.source, filters.status, filters.transaction_type],
  );

  const appliedChips = useMemo(() => {
    const chips = [];

    if (filters.q) chips.push({ key: 'q', label: `Buscar: ${filters.q}` });
    if (filters.status) chips.push({ key: 'status', label: `Estado: ${filters.status}` });
    if (filters.transaction_type) {
      chips.push({
        key: 'transaction_type',
        label: filters.transaction_type === 'income' ? 'Tipo: Ingreso' : 'Tipo: Gasto',
      });
    }
    if (filters.source) chips.push({ key: 'source', label: `Origen: ${filters.source}` });

    return chips;
  }, [filters.q, filters.source, filters.status, filters.transaction_type]);

  const removeChip = (key: string) => {
    const next = { ...filters, [key]: '' };
    setFilters(next);
    setDraftFilters(next);
  };

  const quickToggle = (patch: Partial<TransactionQueryParams>) => {
    const key = Object.keys(patch)[0] as keyof TransactionQueryParams;
    const value = patch[key];
    const nextValue = filters[key] === value ? '' : value;
    const next = { ...filters, [key]: nextValue };
    setFilters(next);
    setDraftFilters(next);
  };

  return (
    <AppLayout title="Transacciones">
      <section className={styles.stack}>
        <div className={styles.hero}>
          <div className={styles.listItem}>
            <div className={styles.listPrimary}>
              <span className={styles.eyebrow}>Finanzas</span>
              <h2 className={styles.headline}>Operación manual del mes</h2>
              <p className={styles.description}>
                Vista inicial de transacciones confirmadas y pendientes para reemplazar el trabajo manual disperso.
              </p>
            </div>
            <div className={styles.listSecondary}>
              <IconButton
                label="Nueva transacción"
                variant="primary"
                icon={<IonIcon icon={addOutline} />}
                onClick={() => {
                  setEditingTransaction(null);
                  setComposerOpen(true);
                }}
              />
            </div>
          </div>
        </div>

        {!loading ? (
          <div className={styles.metrics}>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Balance confirmado</span>
              <strong className={styles.metricValue}>{formatCop(summary?.balance.balance_confirmed ?? 0)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Gastos del período</span>
              <strong className={styles.metricValue}>{formatCop(metrics.expenseTotal)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Ingresos del período</span>
              <strong className={styles.metricValue}>{formatCop(metrics.incomeTotal)}</strong>
            </article>
            <article className={styles.metricCard}>
              <span className={styles.metricLabel}>Pendientes / total</span>
              <strong className={styles.metricValue}>
                {metrics.pendingCount} / {metrics.count}
              </strong>
            </article>
          </div>
        ) : null}

        <ListToolbar
          searchLabel="Buscar transacciones"
          searchPlaceholder="Concepto o producto"
          searchValue={filters.q ?? ''}
          resultLabel={`${metrics.count} resultados`}
          activeFilterCount={activeFilterCount}
          onSearchChange={(q) => {
            const next = { ...filters, q };
            setFilters(next);
            setDraftFilters(next);
          }}
          onOpenSort={() => setSortOpen(true)}
          onOpenFilters={() => setFiltersOpen(true)}
        />

        <div className={styles.quickFilters}>
          <Button
            label="Pendientes"
            size="sm"
            variant={filters.status === 'pending' ? 'primary' : 'ghost'}
            onClick={() => quickToggle({ status: 'pending' })}
          />
          <Button
            label="Gastos"
            size="sm"
            variant={filters.transaction_type === 'expense' ? 'primary' : 'ghost'}
            onClick={() => quickToggle({ transaction_type: 'expense' })}
          />
          <Button
            label="Ingresos"
            size="sm"
            variant={filters.transaction_type === 'income' ? 'primary' : 'ghost'}
            onClick={() => quickToggle({ transaction_type: 'income' })}
          />
        </div>

        <AppliedFiltersBar
          chips={appliedChips}
          onRemove={removeChip}
          onClearAll={() => {
            setFilters(initialFilters);
            setDraftFilters(initialFilters);
          }}
        />

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !transactions.length ? <EmptyState message="No hay transacciones para el período actual." /> : null}

        {!loading && !error && transactions.length ? (
          <div className={styles.list}>
            {transactions.map((transaction) => (
              <TransactionSlidingCard
                key={transaction.id}
                transaction={transaction}
                onEdit={(nextTransaction) => {
                  setEditingTransaction(nextTransaction);
                  setComposerOpen(true);
                }}
                onDelete={(selectedTransaction) => {
                  void requestDelete(selectedTransaction);
                }}
              />
            ))}
          </div>
        ) : null}
      </section>

      <SortSheet
        isOpen={sortOpen}
        title="Ordenar transacciones"
        sortBy={String(filters.sort_by ?? 'date')}
        sortDir={(filters.sort_dir as 'asc' | 'desc') ?? 'desc'}
        options={[
          { label: 'Fecha', value: 'date' },
          { label: 'Monto', value: 'amount' },
          { label: 'Concepto', value: 'concept' },
          { label: 'Estado', value: 'status' },
        ]}
        onClose={() => setSortOpen(false)}
        onChangeSortBy={(sort_by) => setFilters((current) => ({ ...current, sort_by }))}
        onChangeSortDir={(sort_dir) => setFilters((current) => ({ ...current, sort_dir }))}
      />

      <FilterSheet
        isOpen={filtersOpen}
        title="Filtrar transacciones"
        resultLabel={`Mostrar ${metrics.count} resultados`}
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
          <h3 className={styles.sheetSectionTitle}>Estado</h3>
          <SelectInput
            name="tx-filter-status"
            value={draftFilters.status ?? ''}
            onChange={(status) => setDraftFilters((current) => ({ ...current, status: String(status) }))}
            options={[
              { label: 'Confirmada', value: 'confirmed' },
              { label: 'Pendiente', value: 'pending' },
              { label: 'Proyectada', value: 'projected' },
            ]}
            placeholder="Todos"
          />
        </section>
        <section className={styles.sheetSection}>
          <h3 className={styles.sheetSectionTitle}>Tipo</h3>
          <SelectInput
            name="tx-filter-type"
            value={draftFilters.transaction_type ?? ''}
            onChange={(transaction_type) =>
              setDraftFilters((current) => ({ ...current, transaction_type: String(transaction_type) }))
            }
            options={[
              { label: 'Gasto', value: 'expense' },
              { label: 'Ingreso', value: 'income' },
            ]}
            placeholder="Todos"
          />
        </section>
        <section className={styles.sheetSection}>
          <h3 className={styles.sheetSectionTitle}>Origen</h3>
          <SelectInput
            name="tx-filter-source"
            value={draftFilters.source ?? ''}
            onChange={(source) => setDraftFilters((current) => ({ ...current, source: String(source) }))}
            options={[{ label: 'Manual', value: 'manual' }]}
            placeholder="Todos"
          />
        </section>
      </FilterSheet>

      <CrudModal
        isOpen={composerOpen}
        title={editingTransaction ? 'Editar transacción' : 'Nueva transacción'}
        onClose={() => {
          setComposerOpen(false);
          setEditingTransaction(null);
        }}
      >
        <TransactionComposer
          transaction={editingTransaction}
          loading={submitting}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancel={() => {
            setComposerOpen(false);
            setEditingTransaction(null);
          }}
        />
      </CrudModal>
    </AppLayout>
  );
};
