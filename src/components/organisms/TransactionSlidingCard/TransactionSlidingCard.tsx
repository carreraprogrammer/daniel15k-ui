import { useRef } from 'react';
import { IonButton, IonIcon, IonItem, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, linkOutline, trashOutline } from 'ionicons/icons';
import type { CategoryLookupItem } from '../../../utils/financeBehavior';
import type { PaymentSource, Transaction } from '../../../types/finance.types';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import styles from './TransactionSlidingCard.module.css';

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
};

const paymentSourceLabels: Record<PaymentSource, string> = {
  credit_card: 'Tarjeta',
  debit: 'Débito / Nequi',
  cash: 'Efectivo',
};

const formatTransactionDate = (value: string) => {
  if (!value) return '';

  const localMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (localMatch) {
    return `${localMatch[1].padStart(2, '0')}/${localMatch[2].padStart(2, '0')}/${localMatch[3]}`;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(parsed);
  }

  return value;
};

export interface TransactionSlidingCardProps {
  transaction: Transaction;
  category: CategoryLookupItem;
  linkedLabel?: string | null;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onLink?: (transaction: Transaction) => void;
  variant?: 'default' | 'grouped';
}

export const TransactionSlidingCard = ({ transaction, category, linkedLabel, onEdit, onDelete, onLink, variant = 'default' }: TransactionSlidingCardProps) => {
  const slidingRef = useRef<HTMLIonItemSlidingElement | null>(null);

  const status   = transaction.attributes.status ?? 'confirmed';
  const type     = transaction.attributes.transaction_type ?? 'expense';
  const catCode  = category.categoryCode ?? 'unknown';
  const catColor = `var(--color-${catCode})`;
  const iconData = resolveNamedIcon(category.subcategoryIcon ?? category.categoryIcon);
  const isIncome = type === 'income';
  const isGrouped = variant === 'grouped';
  const paymentLabel = transaction.attributes.payment_source
    ? paymentSourceLabels[transaction.attributes.payment_source]
    : null;
  const metaParts = [formatTransactionDate(transaction.attributes.date), paymentLabel, transaction.attributes.product]
    .filter((part): part is string => Boolean(part && part.trim()));

  const handleEdit = () => {
    void slidingRef.current?.close();
    onEdit(transaction);
  };

  const handleDelete = () => {
    void slidingRef.current?.close();
    onDelete(transaction);
  };

  const handleLink = () => {
    void slidingRef.current?.close();
    onLink?.(transaction);
  };

  return (
    <IonItemSliding ref={slidingRef} className={[styles.sliding, isGrouped ? styles.grouped : ''].filter(Boolean).join(' ')}>
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

            {!isGrouped ? (
              <div className={styles.chipRow}>
                <span className={styles.catChip}>
                  <span className={styles.catDot} />
                  {category.categoryName}
                </span>
                {category.subcategoryName && (
                  <span className={styles.subChip}>{category.subcategoryName}</span>
                )}
              </div>
            ) : null}

            <span className={styles.meta}>{metaParts.join(' · ')}</span>
            {linkedLabel ? (
              <span className={styles.linked}>{linkedLabel}</span>
            ) : null}
            {isGrouped && status === 'pending' ? (
              <span className={styles.pendingInline}>Falta confirmar</span>
            ) : null}
          </div>

          {/* ── Secondary info ── */}
          <div className={styles.secondary}>
            <strong className={[styles.amount, isIncome ? styles.amountIncome : ''].filter(Boolean).join(' ')}>
              {isIncome ? '+' : '-'}{formatCurrencyCompact(transaction.attributes.amount)}
            </strong>
            {!isGrouped ? (
              <span className={`${styles.status} ${styles[`status_${status}`] ?? ''}`}>
                {statusLabels[status] ?? status}
              </span>
            ) : null}
          </div>
        </div>
      </IonItem>

      <IonItemOptions side="end" className={styles.options}>
        <div className={styles.buttonsWrapper}>
          {onLink ? (
            <IonButton fill="clear" onClick={handleLink}>
              <IonIcon icon={linkOutline} className={`${styles.buttonIcon} ${styles.linkIcon}`} />
            </IonButton>
          ) : null}
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
