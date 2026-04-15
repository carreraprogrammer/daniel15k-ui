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
import './CrudModal.css';

export interface CrudModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export const CrudModal = ({ isOpen, title, children, onClose }: CrudModalProps) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose} className="crud-modal">
    <IonHeader>
      <IonToolbar>
        <IonTitle>{title}</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={onClose}>Cerrar</IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent color="tertiary">{children}</IonContent>
  </IonModal>
);
