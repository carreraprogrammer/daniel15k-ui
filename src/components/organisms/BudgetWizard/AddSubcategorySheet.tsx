import { useState, type CSSProperties } from 'react';
import { IonIcon } from '@ionic/react';
import { SheetModal } from '../../molecules/SheetModal';
import { financeService } from '../../../services/financeService';
import type { SubcategoryCreated } from '../../../types/finance.types';
import { resolveNamedIcon } from './iconRegistry';
import styles from './AddSubcategorySheet.module.css';

const ICON_OPTIONS: string[] = [
  'fitnessOutline',
  'gameControllerOutline',
  'pawOutline',
  'musicalNotesOutline',
  'bookOutline',
  'airplaneOutline',
  'colorPaletteOutline',
  'footballOutline',
  'beerOutline',
  'cafeOutline',
  'filmOutline',
  'cartOutline',
  'barbellOutline',
  'phonePortraitOutline',
  'medkitOutline',
  'homeOutline',
  'rocketOutline',
  'bicycleOutline',
  'flowerOutline',
  'pizzaOutline',
  'carOutline',
  'schoolOutline',
  'heartOutline',
  'diamondOutline',
];

export interface AddSubcategorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  categoryCode: string;
  categoryName: string;
  categoryId: string;
  onCreated: (sub: Pick<SubcategoryCreated, 'id' | 'code' | 'name' | 'icon'>) => void;
}

export const AddSubcategorySheet = ({
  isOpen,
  onClose,
  categoryCode,
  categoryName,
  categoryId,
  onCreated,
}: AddSubcategorySheetProps) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chipColor = `var(--color-${categoryCode})`;
  const canSubmit = name.trim().length > 0 && icon !== null && !loading;

  const handleDismiss = () => {
    setName('');
    setIcon(null);
    setLoading(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit || icon === null) return;

    setLoading(true);
    setError(null);

    try {
      const created = await financeService.createSubcategory({
        name: name.trim(),
        category_id: categoryId,
        icon,
      });

      onCreated({
        id: created.id,
        code: created.code,
        name: created.name,
        icon: created.icon ?? icon,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al crear la subcategoría. Intenta de nuevo.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <SheetModal isOpen={isOpen} onClose={handleDismiss} title="Nueva subcategoría" height="tall">
      <div className={styles.body} style={{ '--chip-color': chipColor } as CSSProperties}>
        <div className={styles.intro}>
          <div className={styles.introCopy}>
            <span className={styles.introLabel}>Categoría fija</span>
            <strong className={styles.introTitle}>{categoryName}</strong>
            <p className={styles.introText}>
              Crea una subcategoría sin salir del editor. El icono heredará el color de esta categoría para mantener lectura rápida.
            </p>
          </div>
          <span className={styles.categoryChip}>{categoryName}</span>
        </div>

        <section className={styles.section}>
          <label htmlFor="sub-name" className={styles.label}>
            Nombre
          </label>
          <input
            id="sub-name"
            type="text"
            className={styles.nameInput}
            placeholder="ej. Gym, Netflix, Mascotas…"
            value={name}
            maxLength={40}
            disabled={loading}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
          <span className={styles.charCount}>{name.length}/40</span>
        </section>

        <section className={styles.section}>
          <span className={styles.label}>Ícono</span>
          <div className={styles.iconGrid} role="radiogroup" aria-label="Selecciona un ícono">
            {ICON_OPTIONS.map((iconName) => {
              const isSelected = icon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={iconName.replace('Outline', '')}
                  disabled={loading}
                  className={[styles.iconBtn, isSelected ? styles.iconBtnSelected : ''].filter(Boolean).join(' ')}
                  onClick={() => setIcon(iconName)}
                >
                  <IonIcon icon={resolveNamedIcon(iconName)} className={styles.iconGlyph} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>

        {error !== null ? (
          <p className={styles.errorMsg} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={handleDismiss} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {loading ? 'Creando…' : 'Crear subcategoría'}
          </button>
        </div>
      </div>
    </SheetModal>
  );
};
