import { useEffect, useMemo, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { addOutline, trashOutline } from 'ionicons/icons';
import { AppLayout } from '../../templates/AppLayout';
import { IconButton } from '../../atoms/IconButton';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ConfirmModal } from '../../molecules/ConfirmModal';
import { CrudModal } from '../../molecules/CrudModal';
import { TransactionComposer } from '../../organisms/TransactionComposer';
import { TransactionSlidingCard } from '../../organisms/TransactionSlidingCard';
import { financeService } from '../../../services/financeService';
import type { SummaryResponse } from '../../../types/finance.types';
import type { Transaction, TransactionCreatePayload, TransactionUpdatePayload } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const parseDdMmYyyy = (value: string) => {
  const parts = value.split('/');
  if (parts.length !== 3) {
    return 0;
  }

  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
};

export const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [transactionsResponse, summaryResponse] = await Promise.all([
        financeService.fetchTransactions(),
        financeService.fetchSummary(),
      ]);

      const sortedTransactions = [...transactionsResponse.data].sort(
        (left, right) => parseDdMmYyyy(right.attributes.date) - parseDdMmYyyy(left.attributes.date),
      );

      setTransactions(sortedTransactions);
      setSummary(summaryResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar las transacciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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

  const handleDelete = async () => {
    if (!deletingTransaction) {
      return;
    }

    setSubmitting(true);
    try {
      await financeService.deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
      if (editingTransaction?.id === deletingTransaction.id) {
        setEditingTransaction(null);
      }
      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible borrar la transacción.');
    } finally {
      setSubmitting(false);
    }
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
                onDelete={setDeletingTransaction}
              />
            ))}
          </div>
        ) : null}
      </section>

      <ConfirmModal
        isOpen={Boolean(deletingTransaction)}
        title="Borrar transacción"
        message={
          deletingTransaction
            ? `Vas a borrar "${deletingTransaction.attributes.concept}" por ${deletingTransaction.attributes.amount}. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Borrar"
        danger
        onCancel={() => setDeletingTransaction(null)}
        onConfirm={() => void handleDelete()}
      />

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
