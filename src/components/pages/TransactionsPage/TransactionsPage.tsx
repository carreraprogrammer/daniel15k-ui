import { useEffect, useState } from 'react';
import { AppLayout } from '../../templates/AppLayout';
import { Spinner } from '../../atoms/Spinner';
import { ErrorState } from '../../molecules/ErrorState';
import { EmptyState } from '../../molecules/EmptyState';
import { financeService } from '../../../services/financeService';
import type { Transaction } from '../../../types/finance.types';
import styles from '../FinancePage.module.css';

const formatCop = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export const TransactionsPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        {loading ? <Spinner size="lg" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {!loading && !error && !transactions.length ? <EmptyState message="No hay transacciones para el período actual." /> : null}

        {!loading && !error && transactions.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Producto</th>
                  <th>Estado</th>
                  <th className={styles.numeric}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.attributes.date}</td>
                    <td>{transaction.attributes.concept}</td>
                    <td>{transaction.attributes.product}</td>
                    <td>{transaction.attributes.status ?? 'sin estado'}</td>
                    <td className={styles.numeric}>{formatCop(transaction.attributes.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AppLayout>
  );
};
