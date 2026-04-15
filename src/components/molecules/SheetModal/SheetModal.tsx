import type { ReactNode } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import './SheetModal.css';

export interface SheetModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  height?: 'compact' | 'tall';
}

export const SheetModal = ({ isOpen, title, children, onClose, height = 'tall' }: SheetModalProps) => (
  <IonModal
    isOpen={isOpen}
    onDidDismiss={onClose}
    breakpoints={height === 'compact' ? [0, 0.46, 0.72] : [0, 0.72, 0.94]}
    initialBreakpoint={height === 'compact' ? 0.46 : 0.72}
    backdropBreakpoint={0.24}
    handle
    className={`sheet-modal sheet-modal--${height}`}
  >
    <IonHeader>
      <IonToolbar>
        <IonTitle>{title}</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={onClose}>Cerrar</IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent>{children}</IonContent>
  </IonModal>
);
