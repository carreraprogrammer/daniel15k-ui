import { IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import type { RecurringObligation } from '../../../types/finance.types';
import styles from './RecurringObligationSlidingCard.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export interface RecurringObligationSlidingCardProps {
  obligation: RecurringObligation;
  onEdit: (obligation: RecurringObligation) => void;
  onDelete: (obligation: RecurringObligation) => void;
}

export const RecurringObligationSlidingCard = ({
  obligation,
  onEdit,
  onDelete,
}: RecurringObligationSlidingCardProps) => (
  <IonItemSliding className={styles.sliding}>
    <IonItem className={styles.item} lines="none">
      <div className={styles.card}>
        <div className={styles.primary}>
          <div className={styles.header}>
            <span className={styles.meta}>Día {obligation.attributes.due_day}</span>
            <span className={`${styles.status} ${obligation.attributes.active ? styles.statusActive : styles.statusInactive}`}>
              {obligation.attributes.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <strong className={styles.name}>{obligation.attributes.name}</strong>
          <span className={styles.meta}>{obligation.attributes.category_name ?? 'Sin categoría'}</span>
        </div>
        <div className={styles.secondary}>
          <span className={styles.label}>Mensual</span>
          <strong className={styles.amount}>{formatCop(obligation.attributes.amount)}</strong>
        </div>
      </div>
    </IonItem>

    <IonItemOptions side="end">
      <IonItemOption className={styles.optionEdit} onClick={() => onEdit(obligation)}>
        <IonIcon icon={createOutline} />
      </IonItemOption>
      <IonItemOption className={styles.optionDelete} onClick={() => onDelete(obligation)}>
        <IonIcon icon={trashOutline} />
      </IonItemOption>
    </IonItemOptions>
  </IonItemSliding>
);
