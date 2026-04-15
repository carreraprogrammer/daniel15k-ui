import { useEffect, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { ConfirmModal } from '../../molecules/ConfirmModal';
import { TransactionComposer } from '../../organisms/TransactionComposer';
import { TransactionSlidingCard } from '../../organisms/TransactionSlidingCard';
import { financeService } from '../../../services/financeService';
import type { Transaction, TransactionCreatePayload, TransactionUpdatePayload } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

export const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await financeService.fetchTransactions();
      setTransactions(response.data);
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

  return (
    <AppLayout title="Transacciones">
      <section className={styles.stack}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Finanzas</span>
          <h2 className={styles.headline}>Operación manual del mes</h2>
          <p className={styles.description}>
            Vista inicial de transacciones confirmadas y pendientes para reemplazar el trabajo manual disperso.
          </p>
        </div>

        <TransactionComposer
          transaction={editingTransaction}
          loading={submitting}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onCancelEdit={() => setEditingTransaction(null)}
        />

        {!loading ? (
          <div className={styles.hero}>
            <span className={styles.eyebrow}>Lista editable</span>
            <p className={styles.description}>
              Desliza cada fila para editar o borrar una transacción cuando el agente se equivoque.
            </p>
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
                onEdit={setEditingTransaction}
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
    </AppLayout>
  );
};
