import { IonIcon, IonItem, IonItemSliding } from '@ionic/react';
import type { ManageableSubcategory } from '../../../types/finance.types';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import { SlideActions } from '../../molecules/SlideActions';
import type { SlideAction } from '../../molecules/SlideActions';
import styles from './SubcategorySlidingCard.module.css';

const TIER_LABEL: Record<string, string> = {
  committed: 'Comprometido',
  necessary: 'Necesario',
  discretionary: 'Flexible',
};

export interface SubcategorySlidingCardProps {
  subcategory: ManageableSubcategory;
  onEdit: (s: ManageableSubcategory) => void;
  onDelete: (s: ManageableSubcategory) => void;
}

export const SubcategorySlidingCard = ({ subcategory, onEdit, onDelete }: SubcategorySlidingCardProps) => {
  const primaryColor = subcategory.categories[0]?.color ?? '#5B7280';

  const actions: SlideAction[] = [
    { type: 'edit', onPress: () => onEdit(subcategory) },
    ...(!subcategory.is_system
      ? [{ type: 'delete' as const, onPress: () => onDelete(subcategory) }]
      : []),
  ];

  return (
    <IonItemSliding className={styles.sliding}>
      <IonItem className={styles.item} lines="none">
        <div className={styles.card} style={{ '--cat-color': primaryColor } as React.CSSProperties}>
          <div className={styles.iconWrap} aria-hidden="true">
            <IonIcon icon={resolveNamedIcon(subcategory.icon ?? 'pricetagOutline')} className={styles.iconGlyph} />
          </div>

          <div className={styles.primary}>
            <strong className={styles.name}>{subcategory.name}</strong>
            {subcategory.description ? (
              <span className={styles.description}>{subcategory.description}</span>
            ) : null}
            <div className={styles.chipRow}>
              {subcategory.categories.map((c) => (
                <span
                  key={c.id}
                  className={styles.tierChip}
                  style={{
                    backgroundColor: `${c.color ?? '#5B7280'}22`,
                    color: c.color ?? '#5B7280',
                    borderColor: `${c.color ?? '#5B7280'}55`,
                  }}
                >
                  {TIER_LABEL[c.category_type] ?? c.category_type}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.secondary}>
            <span className={styles.count}>{subcategory.transaction_count}</span>
            <span className={styles.countLabel}>movs</span>
          </div>
        </div>
      </IonItem>

      <SlideActions actions={actions} />
    </IonItemSliding>
  );
};
