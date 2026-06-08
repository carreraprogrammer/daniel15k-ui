import { IonButton, IonIcon, IonItemOptions } from '@ionic/react';
import {
  checkmarkDoneOutline,
  closeCircleOutline,
  closeOutline,
  createOutline,
  linkOutline,
  trashOutline,
} from 'ionicons/icons';
import styles from './SlideActions.module.css';

export type SlideActionType = 'edit' | 'delete' | 'link' | 'unlink' | 'done' | 'cancel';

export interface SlideAction {
  type: SlideActionType;
  onPress: () => void;
}

const ACTION_META: Record<SlideActionType, { icon: string; colorClass: string }> = {
  edit:   { icon: createOutline,        colorClass: styles.edit },
  delete: { icon: trashOutline,         colorClass: styles.delete },
  link:   { icon: linkOutline,          colorClass: styles.link },
  unlink: { icon: closeCircleOutline,   colorClass: styles.unlink },
  done:   { icon: checkmarkDoneOutline, colorClass: styles.done },
  cancel: { icon: closeOutline,         colorClass: styles.cancel },
};

export const SlideActions = ({ actions }: { actions: SlideAction[] }) => (
  <IonItemOptions side="end" className={styles.options}>
    <div className={styles.wrap}>
      {actions.map(({ type, onPress }) => {
        const { icon, colorClass } = ACTION_META[type];
        return (
          <IonButton key={type} fill="clear" onClick={onPress}>
            <IonIcon icon={icon} className={`${styles.icon} ${colorClass}`} />
          </IonButton>
        );
      })}
    </div>
  </IonItemOptions>
);
