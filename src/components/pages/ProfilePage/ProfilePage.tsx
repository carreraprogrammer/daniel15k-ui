import { useMemo } from 'react';
import { IonContent } from '@ionic/react';
import { useToast } from '../../../hooks/useToast';
import { authService } from '../../../services/authService';
import { useAuthStore } from '../../../store/authStore';
import { DynamicForm } from '../../organisms/DynamicForm';
import { AppLayout } from '../../templates/AppLayout';
import styles from './ProfilePage.module.css';

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { showError, showSuccess, toast } = useToast();

  const initialValues = useMemo(
    () => ({ name: user?.name ?? '', email: user?.email ?? '' }),
    [user?.email, user?.name],
  );

  return (
    <AppLayout title="Mi perfil">
      <IonContent className={styles.pageContent}>
      <section className={styles.grid}>
        <article className={styles.summaryCard}>
          <span className={styles.eyebrow}>Perfil</span>
          <h2 className={styles.title}>Gestiona tu información</h2>
          <p className={styles.description}>
            Mantén tus datos actualizados y revisa rápidamente el alcance actual de tu cuenta dentro del workspace.
          </p>

          <div className={styles.userMeta}>
            <div>
              <span className={styles.metaLabel}>Nombre</span>
              <strong>{user?.name ?? 'Sin nombre'}</strong>
            </div>
            <div>
              <span className={styles.metaLabel}>Correo</span>
              <strong>{user?.email ?? 'Sin correo'}</strong>
            </div>
            <div>
              <span className={styles.metaLabel}>Rol</span>
              <strong>{user?.superAdmin ? 'Superadministrador' : 'Colaborador'}</strong>
            </div>
          </div>
        </article>

        <article className={styles.formCard}>
          <div className={styles.formHeader}>
            <span className={styles.eyebrow}>Editar perfil</span>
            <h2 className={styles.formTitle}>Actualiza tu nombre visible</h2>
            <p className={styles.formDescription}>
              El correo se gestiona desde tu proveedor de acceso. Aquí solo actualizas el nombre con el que te
              identificas dentro de Daniel15K.
            </p>
          </div>

          <DynamicForm
            schema={{
              slug: 'profile-form',
              title: 'Perfil',
              submit_endpoint: `/api/v1/users/${user?.id ?? ':id'}`,
              submit_method: 'PATCH',
              fields: [{ name: 'name', type: 'text', label: 'Nombre' }],
            }}
            initialValues={initialValues}
            onSuccess={async () => {
              try {
                const nextUser = await authService.me();
                setUser(nextUser);
                showSuccess('Perfil actualizado.');
              } catch (error) {
                console.error('[ProfilePage] refresh:user:error', error);
                showError('Guardé el cambio, pero no pude refrescar tu sesión.');
              }
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
    </AppLayout>
  );
};
