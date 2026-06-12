import type { ReactNode } from 'react';
import {
  IonContent,
  IonModal,
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
    expandToScroll={false}
    className={`sheet-modal sheet-modal--${height}`}
  >
    <IonContent>
      <div className="sheet-modal__shell">
        <div className="sheet-modal__topbar">
          <div className="sheet-modal__copy">
            <span className="sheet-modal__eyebrow">Daniel 15K</span>
            <h2 className="sheet-modal__title">{title}</h2>
          </div>
          <button type="button" className="sheet-modal__close" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </IonContent>
  </IonModal>
);
