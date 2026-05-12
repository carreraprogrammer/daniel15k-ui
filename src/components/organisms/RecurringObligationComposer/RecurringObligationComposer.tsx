import { IonIcon } from '@ionic/react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button } from '../../atoms/Button';
import { NumberInput } from '../../atoms/NumberInput';
import { SelectInput } from '../../atoms/SelectInput';
import { TextInput } from '../../atoms/TextInput';
import { TextareaInput } from '../../atoms/TextareaInput';
import { AddSubcategorySheet } from '../BudgetWizard/AddSubcategorySheet';
import { resolveNamedIcon } from '../BudgetWizard/iconRegistry';
import { getCategoryDisplayName } from '../../../utils/categoryLabels';
import type { CategoryResource, RecurringObligation, RecurringObligationPayload } from '../../../types/finance.types';
import styles from '../ComposerForm.module.css';

interface Values {
  name: string;
  amount: number | '';
  dueDay: number | '';
  categoryId: string;
  subcategoryId: string;
  active: string;
  notes: string;
}

const emptyValues: Values = {
  name: '',
  amount: '',
  dueDay: '',
  categoryId: '',
  subcategoryId: '',
  active: 'true',
  notes: '',
};

const valuesFromObligation = (obligation: RecurringObligation | null): Values => {
  if (!obligation) {
    return emptyValues;
  }

  return {
    name: obligation.attributes.name,
    amount: obligation.attributes.amount,
    dueDay: obligation.attributes.due_day ?? '',
    categoryId: obligation.attributes.category_id ? String(obligation.attributes.category_id) : '',
    subcategoryId: obligation.attributes.subcategory_id ? String(obligation.attributes.subcategory_id) : '',
    active: String(obligation.attributes.active ?? true),
    notes: obligation.attributes.notes ?? '',
  };
};

export interface RecurringObligationComposerProps {
  obligation?: RecurringObligation | null;
  loading?: boolean;
  categories: CategoryResource[];
  onCreate: (payload: RecurringObligationPayload) => Promise<void>;
  onUpdate: (id: string, payload: Partial<RecurringObligationPayload>) => Promise<void>;
  onCancel?: () => void;
}

export const RecurringObligationComposer = ({
  obligation = null,
  loading,
  categories,
  onCreate,
  onUpdate,
  onCancel,
}: RecurringObligationComposerProps) => {
  const [values, setValues] = useState<Values>(emptyValues);
  const [localCategories, setLocalCategories] = useState<CategoryResource[]>(categories);
  const [subcategorySheetOpen, setSubcategorySheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(obligation);
  const submitLabel = useMemo(() => (isEditing ? 'Guardar cambios' : 'Crear recurrente'), [isEditing]);
  const selectedCategory = useMemo(
    () => localCategories.find((category) => String(category.id) === values.categoryId) ?? null,
    [localCategories, values.categoryId],
  );
  const subcategoryOptions = useMemo(
    () => selectedCategory?.relationships?.subcategories?.data ?? [],
    [selectedCategory],
  );

  useEffect(() => {
    setValues(valuesFromObligation(obligation));
    setLocalCategories(categories);
    setError(null);
  }, [categories, obligation]);

  const reset = () => {
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!values.name.trim() || values.amount === '' || values.amount <= 0 || values.dueDay === '' || values.dueDay < 1 || values.dueDay > 31) {
      setError('Completa nombre, monto y día de vencimiento válido.');
      return;
    }

    const payload: RecurringObligationPayload = {
      name: values.name.trim(),
      amount: Number(values.amount),
      due_day: values.dueDay,
      category_id: values.categoryId === '' ? null : Number(values.categoryId),
      subcategory_id: values.subcategoryId === '' ? null : Number(values.subcategoryId),
      active: values.active === 'true',
      notes: values.notes.trim(),
    };

    setError(null);

    try {
      if (obligation) {
        await onUpdate(obligation.id, payload);
      } else {
        await onCreate(payload);
        reset();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No fue posible guardar el gasto recurrente.');
    }
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Programación</p>
              <h3 className={styles.sectionTitle}>Contexto del cobro</h3>
            </div>
            <p className={styles.sectionText}>
              Define nombre, monto y calendario. La clasificación viene después para no mezclar estructura con detalle.
            </p>
          </div>

          <div className={styles.grid}>
            <div className={styles.spanTwo}>
              <TextInput
                name="recurring-name"
                label="Nombre"
                value={values.name}
                onChange={(name) => setValues((current) => ({ ...current, name }))}
                required
              />
            </div>
            <NumberInput
              name="recurring-amount"
              label="Monto"
              value={values.amount}
              onChange={(amount) => setValues((current) => ({ ...current, amount }))}
              format="currency"
              min={1}
              required
            />
            <NumberInput
              name="recurring-due-day"
              label="Día de vencimiento"
              value={values.dueDay}
              onChange={(dueDay) => setValues((current) => ({ ...current, dueDay }))}
              min={1}
              max={31}
              required
            />
            <SelectInput
              name="recurring-active"
              label="Estado"
              value={values.active}
              onChange={(active) => setValues((current) => ({ ...current, active: String(active) }))}
              options={[
                { label: 'Activa', value: 'true' },
                { label: 'Inactiva', value: 'false' },
              ]}
              required
            />
            <div className={styles.spanTwo}>
              <TextareaInput
                name="recurring-notes"
                label="Notas"
                value={values.notes}
                onChange={(notes) => setValues((current) => ({ ...current, notes }))}
                rows={4}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Clasificación</p>
              <h3 className={styles.sectionTitle}>Categoría y subcategoría</h3>
            </div>
            <p className={styles.sectionText}>
              Usa el mismo lenguaje visual de transacciones: categoría por color y subcategoría por icono.
            </p>
          </div>

          <div className={styles.categoryRail}>
            {localCategories.map((category) => {
              const active = String(category.id) === values.categoryId;
              const accent = category.attributes.color ?? 'var(--color-accent)';
              return (
                <button
                  key={category.id}
                  type="button"
                  className={[styles.categoryToken, active ? styles.categoryTokenActive : ''].filter(Boolean).join(' ')}
                  style={{ '--category-accent': accent } as CSSProperties}
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      categoryId: active ? '' : String(category.id),
                      subcategoryId: '',
                    }))
                  }
                >
                  <span className={styles.categorySwatch} />
                  <span className={styles.categoryTokenText}>{getCategoryDisplayName({ name: category.attributes.name, code: category.attributes.code, type: category.attributes.category_type })}</span>
                </button>
              );
            })}
          </div>

          {selectedCategory ? (
            <div
              className={styles.subcategorySection}
              style={{ '--category-accent': selectedCategory.attributes.color ?? 'var(--color-accent)' } as CSSProperties}
            >
              <div className={styles.subcategoryHeader}>
                <span className={styles.subcategoryLabel}>Subcategoría</span>
                <button type="button" className={styles.addSubcategoryBtn} onClick={() => setSubcategorySheetOpen(true)}>
                  + Crear subcategoría
                </button>
              </div>

              <div className={styles.subcategoryRail}>
                {subcategoryOptions.map((subcategory) => {
                  const active = String(subcategory.id) === values.subcategoryId;
                  return (
                    <button
                      key={subcategory.id}
                      type="button"
                      className={[styles.subcategoryToken, active ? styles.subcategoryTokenActive : ''].filter(Boolean).join(' ')}
                      onClick={() =>
                        setValues((current) => ({
                          ...current,
                          subcategoryId: active ? '' : String(subcategory.id),
                        }))
                      }
                    >
                      <span className={styles.subcategoryIconWrap}>
                        <IonIcon
                          icon={resolveNamedIcon(subcategory.attributes?.icon ?? undefined)}
                          className={styles.subcategoryIcon}
                          aria-hidden="true"
                        />
                      </span>
                      <span className={styles.subcategoryTokenText}>{subcategory.attributes?.name ?? 'Sin subcategoría'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.actions}>
          <Button label="Cancelar" variant="ghost" onClick={handleCancel} disabled={loading} />
          <Button label={submitLabel} onClick={() => void handleSubmit()} loading={loading} />
        </div>
      </section>

      {selectedCategory ? (
        <AddSubcategorySheet
          isOpen={subcategorySheetOpen}
          onClose={() => setSubcategorySheetOpen(false)}
          categoryCode={selectedCategory.attributes.code ?? 'unknown'}
          categoryName={getCategoryDisplayName({ name: selectedCategory.attributes.name, code: selectedCategory.attributes.code, type: selectedCategory.attributes.category_type, fallback: 'Categoría' })}
          categoryId={String(selectedCategory.id)}
          onCreated={(sub) => {
            setLocalCategories((current) =>
              current.map((category) =>
                String(category.id) !== String(selectedCategory.id)
                  ? category
                  : {
                      ...category,
                      relationships: {
                        ...category.relationships,
                        subcategories: {
                          data: [
                            ...(category.relationships?.subcategories?.data ?? []),
                            {
                              id: sub.id,
                              type: 'subcategories',
                              attributes: {
                                name: sub.name,
                                code: sub.code,
                                icon: sub.icon,
                              },
                            },
                          ],
                        },
                      },
                    },
              ),
            );
            setValues((current) => ({ ...current, subcategoryId: sub.id }));
            setSubcategorySheetOpen(false);
          }}
        />
      ) : null}
    </>
  );
};
