import { useRef } from 'react';
import { IonButton, IonIcon, IonItem, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import type { CategoryLookupItem } from '../../../utils/financeBehavior';
import type { Transaction } from '../../../types/finance.types';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import styles from './TransactionSlidingCard.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
};

export interface TransactionSlidingCardProps {
  transaction: Transaction;
  category: CategoryLookupItem;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export const TransactionSlidingCard = ({ transaction, category, onEdit, onDelete }: TransactionSlidingCardProps) => {
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null);

  const status   = transaction.attributes.status ?? 'confirmed';
  const type     = transaction.attributes.transaction_type ?? 'expense';
  const catCode  = category.categoryCode ?? 'unknown';
  const catColor = `var(--color-${catCode})`;
  const iconData = resolveNamedIcon(category.subcategoryIcon ?? category.categoryIcon);
  const isIncome = type === 'income';

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
        <div
          className={styles.card}
          style={{ '--cat-color': catColor } as React.CSSProperties}
        >
          {/* ── Icon ── */}
          <div className={styles.iconWrap} aria-hidden="true">
            <IonIcon icon={iconData} className={styles.iconGlyph} />
          </div>

          {/* ── Primary info ── */}
          <div className={styles.primary}>
            <strong className={styles.concept}>{transaction.attributes.concept}</strong>

            <div className={styles.chipRow}>
              <span className={styles.catChip}>
                <span className={styles.catDot} />
                {category.categoryName}
              </span>
              {category.subcategoryName && (
                <span className={styles.subChip}>{category.subcategoryName}</span>
              )}
            </div>

            <span className={styles.meta}>
              {transaction.attributes.product}
              {transaction.attributes.product && transaction.attributes.date ? ' · ' : ''}
              {transaction.attributes.date}
            </span>
          </div>

          {/* ── Secondary info ── */}
          <div className={styles.secondary}>
            <strong className={[styles.amount, isIncome ? styles.amountIncome : ''].filter(Boolean).join(' ')}>
              {isIncome ? '+' : ''}{formatCop(transaction.attributes.amount)}
            </strong>
            <span className={`${styles.status} ${styles[`status_${status}`] ?? ''}`}>
              {statusLabels[status] ?? status}
            </span>
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
