import type { ReactNode } from 'react';
import {
  IonContent,
  IonModal,
} from '@ionic/react';
import './CrudModal.css';

export interface CrudModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}

export const CrudModal = ({ isOpen, title, subtitle, children, onClose }: CrudModalProps) => (
  <IonModal isOpen={isOpen} onDidDismiss={onClose} className="crud-modal">
    <IonContent className="crud-modal__content">
      <div className="crud-modal__shell">
        <div className="crud-modal__topbar">
          <div className="crud-modal__copy">
            <span className="crud-modal__eyebrow">Daniel 15K</span>
            <h2 className="crud-modal__title">{title}</h2>
            {subtitle ? <p className="crud-modal__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="crud-modal__close" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="crud-modal__body">{children}</div>
      </div>
    </IonContent>
  </IonModal>
);
