import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonSelect, IonSelectOption } from '@ionic/react';
import { AppLayout } from '../../templates/AppLayout';
import { Button } from '../../atoms/Button';
import { TextInput } from '../../atoms/TextInput';
import { CrudModal } from '../../molecules/CrudModal';
import { DataState } from '../../molecules/DataState/DataState';
import { financeService } from '../../../services/financeService';
import type { CategoryResource, ManageableSubcategory } from '../../../types/finance.types';
import pageStyles from '../FinancePage.module.css';
import styles from './SubcategoriesPage.module.css';

// Tiers de gasto a los que se puede vincular una función (no income/unknown).
const TIER_TYPES = ['committed', 'necessary', 'discretionary'];
const TIER_LABEL: Record<string, string> = {
  committed: 'Comprometido',
  necessary: 'Necesario',
  discretionary: 'Flexible',
};

type Tier = { id: number; type: string; label: string; color: string };

type Form = { name: string; icon: string; categoryIds: number[] };
const emptyForm: Form = { name: '', icon: 'pricetagOutline', categoryIds: [] };

export const SubcategoriesContent = () => {
  const [subs, setSubs] = useState<ManageableSubcategory[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ManageableSubcategory | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<ManageableSubcategory | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRows, catCol] = await Promise.all([
        financeService.fetchSubcategories(),
        financeService.fetchCategories(),
      ]);
      const tierList: Tier[] = (catCol.data as CategoryResource[])
        .filter((c) => TIER_TYPES.includes(String(c.attributes.category_type)))
        .map((c) => ({
          id: Number(c.id),
          type: String(c.attributes.category_type),
          label: TIER_LABEL[String(c.attributes.category_type)] ?? String(c.attributes.name),
          color: String(c.attributes.color ?? '#5B7280'),
        }));
      setSubs(subRows);
      setTiers(tierList);
    } catch {
      setError('No pudimos cargar las subcategorías.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setFormError(null); setFormOpen(true); };

  const openEdit = (s: ManageableSubcategory) => {
    setEditing(s);
    setForm({ name: s.name, icon: s.icon ?? 'pricetagOutline', categoryIds: s.categories.map((c) => c.id) });
    setFormError(null);
    setFormOpen(true);
  };

  const toggleTier = (id: number) =>
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((x) => x !== id) : [...f.categoryIds, id],
    }));

  const submitForm = async () => {
    if (!form.name.trim()) { setFormError('El nombre es obligatorio.'); return; }
    if (form.categoryIds.length === 0) { setFormError('Elegí al menos una categoría.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await financeService.updateSubcategory(editing.id, { name: form.name, icon: form.icon, category_ids: form.categoryIds });
      } else {
        await financeService.createSubcategory({ name: form.name, icon: form.icon, category_ids: form.categoryIds });
      }
      setFormOpen(false);
      await load();
    } catch {
      setFormError('No se pudo guardar. Revisá los datos.');
    } finally {
      setSubmitting(false);
    }
  };

  const reassignOptions = useMemo(
    () => subs.filter((s) => s.id !== deleting?.id),
    [subs, deleting],
  );

  const confirmDelete = async () => {
    if (!deleting || !reassignTo) return;
    setSubmitting(true);
    try {
      await financeService.deleteSubcategory(deleting.id, reassignTo);
      setDeleting(null);
      setReassignTo('');
      await load();
    } catch {
      setError('No se pudo borrar la subcategoría.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonContent className={pageStyles.pageContent}>
      <section className={pageStyles.stack}>
        <div className={pageStyles.focusStage}>
          <div className={`${pageStyles.focusCard} ${pageStyles.focusCardFull}`}>
            <div className={pageStyles.focusCopy}>
              <span className={pageStyles.eyebrow}>Subcategorías</span>
              <p className={pageStyles.focusQuestion}>¿Qué funciones agrupan tus gastos y a qué tiers pertenecen?</p>
              <h2 className={pageStyles.focusTitle}>{subs.length} subcategorías</h2>
              <p className={pageStyles.focusText}>
                Una función (ej. "salud") puede pertenecer a varios tiers. Los colores muestran a cuáles.
              </p>
            </div>
            <div className={pageStyles.focusActions}>
              <Button label="Nueva subcategoría" onClick={openNew} />
            </div>
          </div>
        </div>

        <DataState
          loading={loading}
          error={error}
          data={subs}
          emptyTitle="No hay subcategorías"
          emptyDescription="Creá una función y vinculala a uno o más tiers."
          emptyActionLabel="Nueva subcategoría"
          onEmptyAction={openNew}
          onRetry={() => void load()}
        >
          {(items) => (
            <div className={pageStyles.list}>
              {items.map((s) => (
                <article key={s.id} className={pageStyles.listItem}>
                  <div className={pageStyles.listPrimary}>
                    <span className={pageStyles.listLabel}>{s.name}</span>
                    <div className={styles.chips}>
                      {s.categories.map((c) => (
                        <span
                          key={c.id}
                          className={styles.chip}
                          style={{ backgroundColor: `${c.color ?? '#5B7280'}22`, color: c.color ?? '#5B7280', borderColor: `${c.color ?? '#5B7280'}55` }}
                        >
                          {TIER_LABEL[c.category_type] ?? c.category_type}
                        </span>
                      ))}
                    </div>
                    <span className={pageStyles.listMeta}>{s.transaction_count} transacciones</span>
                  </div>
                  <div className={pageStyles.listSecondary}>
                    <div className={styles.actions}>
                      <Button label="Editar" variant="ghost" size="sm" onClick={() => openEdit(s)} />
                      {!s.is_system && (
                        <Button label="Borrar" variant="danger" size="sm" onClick={() => { setDeleting(s); setReassignTo(''); }} />
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </DataState>
      </section>

      {/* Crear / editar */}
      <CrudModal
        isOpen={formOpen}
        title={editing ? 'Editar subcategoría' : 'Nueva subcategoría'}
        subtitle="Elegí a qué tiers pertenece (uno o más)."
        onClose={() => setFormOpen(false)}
      >
        <div className={styles.form}>
          <TextInput name="subcategory_name" label="Nombre" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <TextInput name="subcategory_icon" label="Ícono (Ionicon)" value={form.icon} onChange={(v) => setForm((f) => ({ ...f, icon: v }))} />
          <span className={pageStyles.listMeta}>Categorías (tiers)</span>
          <div className={styles.chips}>
            {tiers.map((t) => {
              const active = form.categoryIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={styles.chip}
                  onClick={() => toggleTier(t.id)}
                  style={{
                    backgroundColor: active ? t.color : `${t.color}18`,
                    color: active ? '#0B1220' : t.color,
                    borderColor: t.color,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {formError && <span className={styles.error}>{formError}</span>}
          <div className={styles.actions}>
            <Button label="Cancelar" variant="ghost" onClick={() => setFormOpen(false)} />
            <Button label={submitting ? 'Guardando…' : 'Guardar'} disabled={submitting} onClick={() => void submitForm()} />
          </div>
        </div>
      </CrudModal>

      {/* Borrar con reasignación */}
      <CrudModal
        isOpen={Boolean(deleting)}
        title="Borrar subcategoría"
        subtitle={deleting ? `"${deleting.name}" tiene ${deleting.transaction_count} transacciones. ¿A cuál las movés?` : ''}
        onClose={() => setDeleting(null)}
      >
        <div className={styles.form}>
          <IonSelect
            label="Mover a"
            placeholder="Elegí una subcategoría"
            value={reassignTo}
            onIonChange={(e) => setReassignTo(String(e.detail.value))}
          >
            {reassignOptions.map((s) => (
              <IonSelectOption key={s.id} value={s.id}>{s.name}</IonSelectOption>
            ))}
          </IonSelect>
          <div className={styles.actions}>
            <Button label="Cancelar" variant="ghost" onClick={() => setDeleting(null)} />
            <Button
              label={submitting ? 'Borrando…' : 'Borrar y mover'}
              variant="danger"
              disabled={submitting || !reassignTo}
              onClick={() => void confirmDelete()}
            />
          </div>
        </div>
      </CrudModal>
    </IonContent>
  );
};

export const SubcategoriesPage = () => (
  <AppLayout title="Subcategorías">
    <SubcategoriesContent />
  </AppLayout>
);
