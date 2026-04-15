import { useRef } from 'react';
import { IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import { IconButton } from '../../atoms/IconButton';
import type { Transaction } from '../../../types/finance.types';
import styles from './TransactionSlidingCard.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  projected: 'Proyectada',
};

const typeLabels: Record<string, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
};

export interface TransactionSlidingCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export const TransactionSlidingCard = ({ transaction, onEdit, onDelete }: TransactionSlidingCardProps) => {
  const status = transaction.attributes.status ?? 'confirmed';
  const type = transaction.attributes.transaction_type ?? 'expense';
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null);

  const handleEdit = () => {
    void slidingRef.current?.close();
    onEdit(transaction);
  };

  const handleDelete = () => {
    void slidingRef.current?.close();
    onDelete(transaction);
  };

  return (
    <IonItemSliding ref={slidingRef} className={styles.sliding}>
      <IonItem className={styles.item} lines="none">
        <div className={styles.card}>
          <div className={styles.primary}>
            <div className={styles.header}>
              <span className={styles.date}>{transaction.attributes.date}</span>
              <span className={`${styles.pill} ${type === 'income' ? styles.pillIncome : styles.pillExpense}`}>
                {typeLabels[type] ?? type}
              </span>
            </div>
            <strong className={styles.concept}>{transaction.attributes.concept}</strong>
            <span className={styles.product}>{transaction.attributes.product}</span>
          </div>

          <div className={styles.secondary}>
            <span className={`${styles.status} ${styles[`status_${status}`] ?? ''}`}>
              {statusLabels[status] ?? status}
            </span>
            <strong className={styles.amount}>{formatCop(transaction.attributes.amount)}</strong>
            <div className={styles.actions}>
              <IconButton
                label="Editar transacción"
                icon={<IonIcon icon={createOutline} />}
                onClick={handleEdit}
              />
              <IconButton
                label="Borrar transacción"
                icon={<IonIcon icon={trashOutline} />}
                variant="danger"
                onClick={handleDelete}
              />
            </div>
          </div>
        </div>
      </IonItem>

      <IonItemOptions side="end">
        <IonItemOption className={styles.optionEdit} onClick={handleEdit}>
          <IonIcon icon={createOutline} />
        </IonItemOption>
        <IonItemOption className={styles.optionDelete} onClick={handleDelete}>
          <IonIcon icon={trashOutline} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
};
