import { IonIcon, IonItem, IonItemSliding } from '@ionic/react';
import { Badge } from '../../atoms/Badge';
import type { RecurringObligation } from '../../../types/finance.types';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import { normalizeFlexibleLabel } from '../../../utils/categoryLabels';
import { formatCurrencyCompact } from '../../../utils/formatCurrency';
import { SlideActions } from '../../molecules/SlideActions';
import type { SlideAction } from '../../molecules/SlideActions';
import styles from './RecurringObligationSlidingCard.module.css';

export interface RecurringObligationSlidingCardProps {
  obligation: RecurringObligation;
  linkedDebtLabel?: string | null;
  onUnlinkDebt?: (obligation: RecurringObligation) => void;
  onEdit: (obligation: RecurringObligation) => void;
  onDelete: (obligation: RecurringObligation) => void;
}

export const RecurringObligationSlidingCard = ({
  obligation,
  linkedDebtLabel,
  onUnlinkDebt,
  onEdit,
  onDelete,
}: RecurringObligationSlidingCardProps) => {
  const attrs    = obligation.attributes;
  const catCode  = attrs.category_code ?? 'unknown';
  const catColor = `var(--color-${catCode})`;
  const iconData = resolveNamedIcon(attrs.subcategory_icon ?? 'repeatOutline');
  const isActive = attrs.active !== false;

  return (
    <IonItemSliding className={styles.sliding}>
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
            <strong className={styles.name}>{attrs.name}</strong>

            <div className={styles.chipRow}>
              {attrs.category_name && (
                <span className={styles.catChip}>
                  <span className={styles.catDot} />
                  {normalizeFlexibleLabel(attrs.category_name)}
                </span>
              )}
              {attrs.subcategory_name && (
                <span className={styles.subChip}>{attrs.subcategory_name}</span>
              )}
              {linkedDebtLabel ? (
                <span className={styles.linkChip}>{linkedDebtLabel}</span>
              ) : null}
              {attrs.temporary && attrs.end_date && (
                <span className={styles.temporaryChip}>
                  hasta {new Date(attrs.end_date + 'T12:00:00').toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })}
                </span>
              )}
              {!attrs.category_name && !attrs.subcategory_name && (
                <span className={styles.subChip}>Sin categoría</span>
              )}
            </div>

            <span className={styles.meta}>
              {attrs.due_day ? `Día ${attrs.due_day}` : 'Sin fecha fija'}
            </span>
          </div>

          {/* ── Secondary info ── */}
          <div className={styles.secondary}>
            <strong className={styles.amount}>{formatCurrencyCompact(attrs.amount)}</strong>
            <Badge label={isActive ? 'Activa' : 'Inactiva'} status={isActive ? 'success' : 'warning'} size="sm" />
          </div>
        </div>
      </IonItem>

      <SlideActions actions={[
        ...(linkedDebtLabel && onUnlinkDebt
          ? [{ type: 'unlink' as const, onPress: () => onUnlinkDebt(obligation) }] satisfies SlideAction[]
          : []),
        { type: 'edit',   onPress: () => onEdit(obligation) },
        { type: 'delete', onPress: () => onDelete(obligation) },
      ]} />
    </IonItemSliding>
  );
};
