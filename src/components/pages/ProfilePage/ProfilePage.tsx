import { useEffect, useMemo, useState } from 'react';
import { IonContent } from '@ionic/react';
import { useToast } from '../../../hooks/useToast';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../atoms/Button';
import { useThemeStore, type ThemePreference } from '../../../store/themeStore';
import { useProgressStore, LEVEL_NAMES } from '../../../store/progressStore';
import { AvatarNucleus } from '../../atoms/AvatarNucleus';
import { api } from '../../../services/api';
import { DataState } from '../../molecules/DataState/DataState';
import { DynamicForm } from '../../organisms/DynamicForm';
import { AppLayout } from '../../templates/AppLayout';
import styles from './ProfilePage.module.css';

interface FinancialCtx {
  phase?: string | null;
  strategy?: string | null;
  notes?: string | null;
}

const PHASE_LABEL: Record<string, string> = {
  debt_payoff:     'Pago de deudas',
  emergency_fund:  'Fondo de emergencia',
  investing:       'Inversión',
  wealth_building: 'Construcción de patrimonio',
};

const STRATEGY_LABEL: Record<string, string> = {
  snowball:  'Bola de nieve (menor deuda primero)',
  avalanche: 'Avalancha (mayor interés primero)',
};

export const ProfileContent = () => {
  const user    = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout  = useAuthStore((state) => state.logout);
  const themePreference = useThemeStore((state) => state.preference);
  const setThemePreference = useThemeStore((state) => state.setPreference);
  const { data: progressData, fetchProgress, setPreviewLevel, getEffectiveLevel } = useProgressStore();
  const { showError, showSuccess, toast } = useToast();
  const [financialContext, setFinancialContext] = useState<FinancialCtx | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setContextLoading(true);
    setContextError(null);
    api.get('/api/v1/financial_context')
      .then(({ data }) => {
        const attrs = (data as { data?: { attributes?: FinancialCtx } })?.data?.attributes ?? null;
        setFinancialContext(attrs);
        setContextLoading(false);
      })
      .catch((error) => {
        setContextError(error instanceof Error ? error.message : 'No fue posible cargar el contexto financiero.');
        setContextLoading(false);
      });
  }, []);

  const profileSchema = useMemo(
    () => ({
      slug:            'profile-form',
      title:           'Perfil',
      submit_endpoint: `/api/v1/users/${user?.id ?? ':id'}`,
      submit_method:   'PATCH' as const,
      fields: [
        { name: 'name', type: 'text' as const, label: 'Nombre' },
        { name: 'city', type: 'text' as const, label: 'Ciudad', placeholder: 'Ej: Medellín, Colombia' },
      ],
    }),
    [user?.id],
  );

  const initialValues = useMemo(
    () => ({ name: user?.name ?? '', city: user?.city ?? '' }),
    [user?.name, user?.city],
  );

  return (
    <IonContent className={styles.pageContent}>
        <section className={styles.grid}>

          {/* ── Left: summary ── */}
          <aside className={styles.summaryCard}>
            <span className={styles.eyebrow}>Perfil</span>
            <h2 className={styles.title}>Tu cuenta</h2>

            <div className={styles.userMeta}>
              <div>
                <span className={styles.metaLabel}>Nombre</span>
                <strong>{user?.name ?? 'Sin nombre'}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Ciudad</span>
                <strong>{user?.city || '—'}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Correo</span>
                <strong>{user?.email ?? '—'}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Rol</span>
                <strong>{user?.superAdmin ? 'Superadministrador' : 'Usuario'}</strong>
              </div>
            </div>

            <div className={styles.preferenceBlock}>
              <div>
                <span className={styles.metaLabel}>Apariencia</span>
                <strong>Modo de color</strong>
              </div>
              <div className={styles.themeSwitch} role="group" aria-label="Modo de color">
                {(['system', 'dark', 'light'] as ThemePreference[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`${styles.themeOption} ${themePreference === mode ? styles.themeOptionActive : ''}`}
                    onClick={() => setThemePreference(mode)}
                    aria-pressed={themePreference === mode}
                  >
                    {mode === 'system' ? 'Auto' : mode === 'dark' ? 'Oscuro' : 'Claro'}
                  </button>
                ))}
              </div>
            </div>

            {progressData?.bypassReadiness && (
              <div className={styles.preferenceBlock}>
                <div>
                  <span className={styles.metaLabel}>Vista previa de avatar</span>
                  <strong>Nivel {getEffectiveLevel()} — {LEVEL_NAMES[getEffectiveLevel()]}</strong>
                </div>
                <div className={styles.levelPreview}>
                  <AvatarNucleus
                    seed={progressData.avatarSeed}
                    level={getEffectiveLevel()}
                    size={48}
                  />
                </div>
                <div className={styles.levelSwitch} role="group" aria-label="Nivel de vista previa">
                  {LEVEL_NAMES.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.levelOption} ${getEffectiveLevel() === idx ? styles.levelOptionActive : ''}`}
                      onClick={() => setPreviewLevel(idx)}
                      aria-pressed={getEffectiveLevel() === idx}
                      title={name}
                    >
                      {idx}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              label="Cerrar sesión"
              variant="ghost"
              onClick={() => void logout()}
            />

            <span className={styles.eyebrow} style={{ marginTop: '8px' }}>Contexto financiero</span>
            <DataState
              loading={contextLoading}
              error={contextError}
              data={financialContext ? [financialContext] : []}
              emptyTitle="Sin contexto financiero"
              emptyDescription="Todavía no hay fase, estrategia o notas guardadas para esta cuenta."
            >
              {([context]) => (
                <div className={styles.userMeta}>
                  <div>
                    <span className={styles.metaLabel}>Fase actual</span>
                    <strong>{PHASE_LABEL[context.phase ?? ''] ?? context.phase ?? '—'}</strong>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>Estrategia de deuda</span>
                    <strong>{STRATEGY_LABEL[context.strategy ?? ''] ?? context.strategy ?? '—'}</strong>
                  </div>
                  {context.notes ? (
                    <div>
                      <span className={styles.metaLabel}>Notas / objetivo</span>
                      <strong>{context.notes}</strong>
                    </div>
                  ) : null}
                </div>
              )}
            </DataState>
          </aside>

          {/* ── Right: edit form ── */}
          <article className={styles.formCard}>
            <div className={styles.formHeader}>
              <span className={styles.eyebrow}>Editar perfil</span>
              <h2 className={styles.formTitle}>Actualiza tu información</h2>
              <p className={styles.formDescription}>
                El correo se gestiona desde tu proveedor de acceso. El nombre y la ciudad
                se usan como contexto en el asistente financiero.
              </p>
            </div>

            <DynamicForm
              schema={profileSchema}
              initialValues={initialValues}
              submitLabel="Guardar cambios"
              onSuccess={(response) => {
                const attrs = (response as { data?: { attributes?: { name?: string; city?: string | null } } })
                  ?.data?.attributes;
                if (user && attrs) {
                  setUser({
                    ...user,
                    ...(attrs.name != null && { name: attrs.name }),
                    ...(attrs.city !== undefined && { city: attrs.city }),
                  });
                }
                showSuccess('Perfil actualizado.');
              }}
              onError={(error) => {
                console.error('[ProfilePage] submit:error', error);
                showError('No pude actualizar tu perfil.');
              }}
            />
            {toast}
          </article>

        </section>
    </IonContent>
  );
};

export const ProfilePage = () => (
  <AppLayout title="Mi perfil">
    <ProfileContent />
  </AppLayout>
);
