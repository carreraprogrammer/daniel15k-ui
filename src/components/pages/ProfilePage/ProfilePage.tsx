import { useEffect, useMemo, useState } from 'react';
import { IonContent } from '@ionic/react';
import { useToast } from '../../../hooks/useToast';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../atoms/Button';
import { useThemeStore, type ThemePreference } from '../../../store/themeStore';
import { useAccentStore, ACCENT_PRESETS } from '../../../store/accentStore';
import { useProgressStore, LEVEL_NAMES } from '../../../store/progressStore';
import { useEmailConnectionStore } from '../../../store/emailConnectionStore';
import { AvatarNucleus } from '../../atoms/AvatarNucleus';
import { api } from '../../../services/api';
import { adminService, type AdminAccount } from '../../../services/adminService';
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

const AVATAR_SAMPLE_OFFSETS = [-8, -4, -2, -1, 0, 1, 2, 4, 8, 13, 21, 34];

export const ProfileContent = () => {
  const user    = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout  = useAuthStore((state) => state.logout);
  const themePreference = useThemeStore((state) => state.preference);
  const setThemePreference = useThemeStore((state) => state.setPreference);
  const accentPreset = useAccentStore((state) => state.preset);
  const setAccentPreset = useAccentStore((state) => state.setPreset);
  const { data: progressData, fetchProgress, setPreviewLevel, getEffectiveLevel } = useProgressStore();
  const {
    connected: gmailConnected,
    loading: gmailLoading,
    actionLoading: gmailActionLoading,
    error: gmailError,
    fetchStatus: fetchGmailStatus,
    startOAuth,
    disconnect: disconnectGmail,
  } = useEmailConnectionStore();
  const { showError, showSuccess, toast } = useToast();
  const [financialContext, setFinancialContext] = useState<FinancialCtx | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [avatarSampleUserId, setAvatarSampleUserId] = useState('1');
  const startImpersonation = useAuthStore((state) => state.startImpersonation);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.superAdmin) return;
    setAccountsLoading(true);
    adminService.getAccounts()
      .then(({ data }) => setAccounts(data.data))
      .catch(() => { /* silencioso — no bloquea el perfil */ })
      .finally(() => setAccountsLoading(false));
  }, [user?.superAdmin]);

  const handleImpersonate = async (account: AdminAccount) => {
    setImpersonatingId(account.id);
    try {
      const { data } = await adminService.impersonate(account.id);
      startImpersonation(data.data.access_token, { id: account.id, name: account.name, email: account.email });
    } catch {
      showError('No pude impersonar esta cuenta.');
    } finally {
      setImpersonatingId(null);
    }
  };

  useEffect(() => {
    fetchProgress();
    void fetchGmailStatus();
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

  const normalizedAvatarUserId = avatarSampleUserId.trim() || '1';
  const avatarPreviewSeed = useMemo(
    () => `${progressData?.avatarSeed ?? 'seed'}:sample-user:${normalizedAvatarUserId}`,
    [normalizedAvatarUserId, progressData?.avatarSeed],
  );
  const avatarNearbyUserIds = useMemo(() => {
    const numericId = Number.parseInt(normalizedAvatarUserId, 10);
    if (Number.isFinite(numericId)) {
      return AVATAR_SAMPLE_OFFSETS
        .map((offset) => Math.max(1, numericId + offset))
        .filter((sampleId, index, ids) => ids.indexOf(sampleId) === index)
        .map(String);
    }

    return [
      normalizedAvatarUserId,
      `${normalizedAvatarUserId}-a`,
      `${normalizedAvatarUserId}-b`,
      `${normalizedAvatarUserId}-c`,
      `${normalizedAvatarUserId}-d`,
      `${normalizedAvatarUserId}-e`,
    ];
  }, [normalizedAvatarUserId]);

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

            <div className={styles.preferenceBlock}>
              <div>
                <span className={styles.metaLabel}>Apariencia</span>
                <strong>Color de acento</strong>
              </div>
              <div className={styles.accentPicker} role="group" aria-label="Color de acento">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    className={`${styles.accentSwatch} ${accentPreset.color === preset.color ? styles.accentSwatchActive : ''}`}
                    style={{ '--swatch-color': preset.color } as React.CSSProperties}
                    onClick={() => setAccentPreset(preset)}
                    aria-pressed={accentPreset.color === preset.color}
                    aria-label={preset.label}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            {progressData?.bypassReadiness && (
              <div className={styles.preferenceBlock}>
                <div>
                  <span className={styles.metaLabel}>Vista previa de avatar</span>
                  <strong>
                    Usuario {normalizedAvatarUserId} · Nivel {getEffectiveLevel()} — {LEVEL_NAMES[getEffectiveLevel()]}
                  </strong>
                </div>
                <div className={styles.levelPreview}>
                  <AvatarNucleus
                    seed={avatarPreviewSeed}
                    level={getEffectiveLevel()}
                    size={28}
                  />
                </div>
                <div className={styles.avatarControlGroup}>
                  <span className={styles.controlLabel}>Usuario simulado</span>
                  <input
                    className={styles.avatarSeedInput}
                    type="text"
                    inputMode="numeric"
                    value={avatarSampleUserId}
                    onChange={(event) => setAvatarSampleUserId(event.target.value)}
                    placeholder="Ej: 1042"
                    aria-label="ID de usuario simulado"
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
                <div className={styles.avatarMatrix} aria-label="Comparación de avatar por usuario simulado">
                  {avatarNearbyUserIds.map((sampleUserId) => (
                    <div key={sampleUserId} className={styles.avatarMatrixItem}>
                      <AvatarNucleus
                        seed={`${progressData.avatarSeed}:sample-user:${sampleUserId}`}
                        level={getEffectiveLevel()}
                        size={18}
                      />
                      <span>U{sampleUserId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user?.superAdmin && (
              <div className={styles.preferenceBlock}>
                <div>
                  <span className={styles.metaLabel}>Herramientas</span>
                  <strong>Impersonar usuario</strong>
                </div>
                {accountsLoading && (
                  <span className={styles.controlLabel}>Cargando cuentas...</span>
                )}
                {accounts.filter((a) => a.user_id !== user.id).map((account) => (
                  <div key={account.id} className={styles.impersonateRow}>
                    <div className={styles.impersonateInfo}>
                      <strong>{account.name}</strong>
                      <span>{account.email}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.impersonateBtn}
                      onClick={() => void handleImpersonate(account)}
                      disabled={impersonatingId === account.id}
                    >
                      {impersonatingId === account.id ? 'Entrando...' : 'Ver como'}
                    </button>
                  </div>
                ))}
                {!accountsLoading && accounts.filter((a) => a.user_id !== user.id).length === 0 && (
                  <span className={styles.controlLabel}>No hay otras cuentas.</span>
                )}
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

            {/* ── Gmail OAuth ── */}
            <div className={styles.gmailBlock}>
              <div className={styles.gmailBlockHeader}>
                <span className={styles.eyebrow}>Integraciones</span>
                <strong>Gmail</strong>
              </div>

              {gmailLoading ? (
                <span className={styles.controlLabel}>Verificando...</span>
              ) : gmailConnected === true ? (
                <>
                  <div className={styles.gmailStatus}>
                    <span className={styles.gmailDot} />
                    <span className={styles.gmailStatusLabel}>Gmail conectado</span>
                  </div>
                  <p className={styles.gmailDescription}>
                    El agente nocturno analiza tus correos bancarios automáticamente.
                  </p>
                  <button
                    type="button"
                    className={styles.gmailDisconnectBtn}
                    onClick={() => void disconnectGmail()}
                    disabled={gmailActionLoading}
                  >
                    {gmailActionLoading ? 'Desconectando...' : 'Desconectar Gmail'}
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.gmailDescription}>
                    Conectá tu Gmail para que el agente detecte automáticamente los movimientos
                    de Davivienda y Nequi cada noche.
                  </p>
                  <button
                    type="button"
                    className={styles.gmailConnectBtn}
                    onClick={() => void startOAuth()}
                    disabled={gmailActionLoading}
                  >
                    {gmailActionLoading ? 'Abriendo...' : 'Conectar Gmail'}
                  </button>
                </>
              )}

              {gmailError != null && (
                <span className={styles.gmailError}>{gmailError}</span>
              )}
            </div>

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
