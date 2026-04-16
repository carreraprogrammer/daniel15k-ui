import { useRef } from 'react';
import { IonButton, IonIcon, IonItem, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import type { ResolvedTransactionCategory, Transaction } from '../../../types/finance.types';
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
  category: ResolvedTransactionCategory;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export const TransactionSlidingCard = ({ transaction, category, onEdit, onDelete }: TransactionSlidingCardProps) => {
  const status = transaction.attributes.status ?? 'confirmed';
  const type = transaction.attributes.transaction_type ?? 'expense';
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null);
  const behaviorTone = category.categoryType || 'unknown';

  const handleEdit = () => {
    console.debug('[TransactionSlidingCard] handleEdit', { id: transaction.id });
    void slidingRef.current?.close();
    onEdit(transaction);
  };

  const handleDelete = () => {
    console.debug('[TransactionSlidingCard] handleDelete', { id: transaction.id });
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
            <div className={styles.behaviorRow}>
              <span className={`${styles.behaviorPill} ${styles[`behavior_${behaviorTone}`] ?? styles.behavior_unknown}`}>
                {category.categoryName}
              </span>
              {category.subcategoryName ? <span className={styles.behaviorMeta}>{category.subcategoryName}</span> : null}
            </div>
          </div>

          <div className={styles.secondary}>
            <span className={`${styles.status} ${styles[`status_${status}`] ?? ''}`}>
              {statusLabels[status] ?? status}
            </span>
            <strong className={styles.amount}>{formatCop(transaction.attributes.amount)}</strong>
          </div>
        </div>
      </IonItem>

      <IonItemOptions side="end" className={styles.options}>
        <div className={styles.buttonsWrapper}>
          <IonButton fill="clear" onClick={handleEdit}>
            <IonIcon icon={createOutline} className={`${styles.buttonIcon} ${styles.editIcon}`} />
          </IonButton>
          <IonButton fill="clear" onClick={handleDelete}>
            <IonIcon icon={trashOutline} className={`${styles.buttonIcon} ${styles.deleteIcon}`} />
          </IonButton>
        </div>
      </IonItemOptions>
    </IonItemSliding>
  );
};
