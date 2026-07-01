import { IonIcon } from '@ionic/react';
import { resolveNamedIcon } from '../../organisms/BudgetWizard/iconRegistry';
import styles from './IconPicker.module.css';

// Íconos disponibles para funciones (subcategorías). Mismo set que el sheet del wizard.
export const ICON_OPTIONS: string[] = [
  'cafeOutline', 'restaurantOutline', 'fastFoodOutline', 'cartOutline', 'pizzaOutline', 'beerOutline',
  'homeOutline', 'carOutline', 'busOutline', 'bicycleOutline', 'airplaneOutline', 'medkitOutline',
  'barbellOutline', 'fitnessOutline', 'heartOutline', 'schoolOutline', 'bookOutline', 'constructOutline',
  'phonePortraitOutline', 'gameControllerOutline', 'filmOutline', 'musicalNotesOutline', 'colorPaletteOutline',
  'giftOutline', 'peopleOutline', 'cardOutline', 'cashOutline', 'diamondOutline', 'pawOutline', 'pricetagOutline',
];

export interface IconPickerProps {
  value: string | null;
  onChange: (icon: string) => void;
  disabled?: boolean;
}

export const IconPicker = ({ value, onChange, disabled }: IconPickerProps) => (
  <div className={styles.grid} role="radiogroup" aria-label="Selecciona un ícono">
    {ICON_OPTIONS.map((name) => {
      const selected = value === name;
      return (
        <button
          key={name}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={name.replace('Outline', '')}
          disabled={disabled}
          className={[styles.btn, selected ? styles.btnSelected : ''].filter(Boolean).join(' ')}
          onClick={() => onChange(name)}
        >
          <IonIcon icon={resolveNamedIcon(name)} className={styles.glyph} aria-hidden="true" />
        </button>
      );
    })}
  </div>
);
