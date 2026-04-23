import { IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding } from '@ionic/react';
import { createOutline, trashOutline } from 'ionicons/icons';
import type { RecurringObligation } from '../../../types/finance.types';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import styles from './RecurringObligationSlidingCard.module.css';

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export interface RecurringObligationSlidingCardProps {
  obligation: RecurringObligation;
  linkedDebtLabel?: string | null;
  onEdit: (obligation: RecurringObligation) => void;
  onDelete: (obligation: RecurringObligation) => void;
}

export const RecurringObligationSlidingCard = ({
  obligation,
  linkedDebtLabel,
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
                  {attrs.category_name}
                </span>
              )}
              {attrs.subcategory_name && (
                <span className={styles.subChip}>{attrs.subcategory_name}</span>
              )}
              {linkedDebtLabel ? (
                <span className={styles.linkChip}>{linkedDebtLabel}</span>
              ) : null}
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
            <strong className={styles.amount}>{formatCop(attrs.amount)}</strong>
            <span className={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive].join(' ')}>
              {isActive ? 'Activa' : 'Inactiva'}
            </span>
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
};
