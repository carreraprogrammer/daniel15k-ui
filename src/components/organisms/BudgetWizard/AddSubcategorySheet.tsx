import { useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { financeService } from '../../../services/financeService';
import type { SubcategoryCreated } from '../../../types/finance.types';
import styles from './AddSubcategorySheet.module.css';

// ── Icon catalogue ─────────────────────────────────────────────────────────────

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

/** Convert camelCase Ionicon name to kebab-case for the web component */
const toKebab = (name: string): string =>
  name.replace(/([A-Z])/g, '-$1').toLowerCase();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddSubcategorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  categoryCode: string;
  categoryName: string;
  categoryId: string;
  onCreated: (sub: Pick<SubcategoryCreated, 'code' | 'name' | 'icon'>) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const AddSubcategorySheet = ({
  isOpen,
  onClose,
  categoryCode,
  categoryName,
  categoryId,
  onCreated,
}: AddSubcategorySheetProps) => {
  const [name, setName]       = useState('');
  const [icon, setIcon]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Derived CSS variable for the category accent color
  const chipColor = `var(--color-${categoryCode})`;

  // ── Reset local state when sheet closes ───────────────────────────────────

  const handleDidDismiss = () => {
    setName('');
    setIcon(null);
    setLoading(false);
    setError(null);
    onClose();
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const canSubmit = name.trim().length > 0 && icon !== null && !loading;

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
        code: created.code,
        name: created.name,
        icon: created.icon ?? icon,
      });

      // Parent controls isOpen; state is wiped in handleDidDismiss.
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })
          ?.response?.data?.error ??
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ??
        'Error al crear la subcategoría. Intenta de nuevo.';
      setError(message);
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleDidDismiss}
      initialBreakpoint={0.65}
      breakpoints={[0, 0.65, 0.95]}
      backdropBreakpoint={0.2}
      handle
      style={{ '--border-radius': '24px 24px 0 0' }}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar
          className={styles.toolbar}
          style={{ '--chip-color': chipColor } as React.CSSProperties}
        >
          <IonTitle className={styles.toolbarTitle}>
            Nueva subcategoría en{' '}
            <span
              className={styles.categoryChip}
              style={{ '--chip-color': chipColor } as React.CSSProperties}
            >
              {categoryName}
            </span>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={onClose}
              disabled={loading}
              className={styles.closeBtn}
              aria-label="Cerrar"
            >
              ✕
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className={styles.content}>
        <div
          className={styles.body}
          style={{ '--chip-color': chipColor } as React.CSSProperties}
        >
          {/* ── Name field ────────────────────────────────────────────────── */}
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
              style={{ '--chip-color': chipColor } as React.CSSProperties}
            />
            <span className={styles.charCount}>{name.length}/40</span>
          </section>

          {/* ── Icon grid ─────────────────────────────────────────────────── */}
          <section className={styles.section}>
            <span className={styles.label}>Ícono</span>
            <div
              className={styles.iconGrid}
              role="radiogroup"
              aria-label="Selecciona un ícono"
            >
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
                    className={[
                      styles.iconBtn,
                      isSelected ? styles.iconBtnSelected : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ '--chip-color': chipColor } as React.CSSProperties}
                    onClick={() => setIcon(iconName)}
                  >
                    <ion-icon
                      name={toKebab(iconName)}
                      class={styles.iconGlyph}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Inline error ──────────────────────────────────────────────── */}
          {error !== null && (
            <p className={styles.errorMsg} role="alert">
              {error}
            </p>
          )}
        </div>

        {/* ── Footer actions ────────────────────────────────────────────────── */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            style={
              canSubmit
                ? ({ '--chip-color': chipColor } as React.CSSProperties)
                : undefined
            }
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {loading ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : null}
            {loading ? 'Creando…' : 'Crear subcategoría →'}
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
};
