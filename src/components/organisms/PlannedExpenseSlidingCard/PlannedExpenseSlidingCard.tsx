import { IonIcon, IonItem, IonItemSliding } from '@ionic/react';
import { Badge, type BadgeStatus } from '../../atoms/Badge';
import type { PlannedExpense } from '../../../types/finance.types';
import { normalizeFlexibleLabel } from '../../../utils/categoryLabels';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { SlideActions } from '../../molecules/SlideActions';
import type { SlideAction } from '../../molecules/SlideActions';
import styles from './PlannedExpenseSlidingCard.module.css';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));

const planningTypeLabels: Record<PlannedExpense['attributes']['planning_type'], string> = {
  mandatory_one_off: 'Obligatorio puntual',
  irregular_maintenance: 'Mantenimiento',
  wish: 'Deseo',
  planned_purchase: 'Compra planeada',
};

const statusLabels: Record<PlannedExpense['attributes']['status'], string> = {
  planned: 'Planeado',
  executed: 'Ejecutado',
  cancelled: 'Cancelado',
};

const statusTone: Record<PlannedExpense['attributes']['status'], BadgeStatus> = {
  planned: 'info',
  executed: 'success',
  cancelled: 'warning',
};

export interface PlannedExpenseSlidingCardProps {
  plannedExpense: PlannedExpense;
  onChangeStatus: (plannedExpense: PlannedExpense, status: PlannedExpense['attributes']['status']) => void;
  onEdit: (plannedExpense: PlannedExpense) => void;
}

export const PlannedExpenseSlidingCard = ({
  plannedExpense,
  onChangeStatus,
  onEdit,
}: PlannedExpenseSlidingCardProps) => {
  const attrs = plannedExpense.attributes;
  const categoryCode = attrs.category_code ?? 'necessary';

  return (
    <IonItemSliding className={styles.sliding}>
      <IonItem className={styles.item} lines="none">
        <div className={styles.card} style={{ '--cat-color': `var(--color-${categoryCode})` } as React.CSSProperties}>
          <div className={styles.primary}>
            <div className={styles.header}>
              <span className={styles.type}>{planningTypeLabels[attrs.planning_type] ?? attrs.planning_type}</span>
              <Badge label={statusLabels[attrs.status] ?? attrs.status} status={statusTone[attrs.status]} size="sm" />
            </div>
            <strong className={styles.name}>{attrs.name}</strong>
            <div className={styles.chipRow}>
              {attrs.category_name ? <span className={styles.catChip}>{normalizeFlexibleLabel(attrs.category_name)}</span> : null}
              {attrs.subcategory_name ? <span className={styles.subChip}>{attrs.subcategory_name}</span> : null}
            </div>
            <span className={styles.meta}>Objetivo {formatDate(attrs.target_date)}</span>
          </div>

          <div className={styles.secondary}>
            <span className={styles.label}>Estimado</span>
            <strong className={styles.amount}>{formatCurrencyCompact(attrs.amount_estimated)}</strong>
          </div>
        </div>
      </IonItem>

      <SlideActions actions={[
        ...(attrs.status === 'planned'
          ? [
              { type: 'done',   onPress: () => onChangeStatus(plannedExpense, 'executed') },
              { type: 'cancel', onPress: () => onChangeStatus(plannedExpense, 'cancelled') },
            ] satisfies SlideAction[]
          : []),
        { type: 'edit', onPress: () => onEdit(plannedExpense) },
      ]} />
    </IonItemSliding>
  );
};
