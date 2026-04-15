# roles-permissions.md — boilerplate-ionic-react

Dominio: autorización en el cliente
Responsabilidad: consumir los permisos que vienen en el JWT, exponerlos via store y hook, y proteger rutas y elementos de UI según esos permisos.
Leer `architecture.md` antes de implementar este dominio.

---

## Principio fundamental

Los permisos **no se piden al servidor** después del login.
Viajan dentro del access token JWT en el campo `permissions: string[]`.
El frontend decodifica el token, extrae los permisos, y los guarda en `authStore`.
No hay endpoint `/me/permissions`. No hay requests adicionales.

---

## Tipos — src/types/authorization.types.ts

Crear este archivo completo antes de cualquier implementación:

```typescript
// Formato de permiso: "resource:action"
// Ejemplos: "users:read", "roles:create", "forms:destroy"
export type PermissionSlug = string;

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  superAdmin: boolean;
  permissions: PermissionSlug[];
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  permissions: PermissionSlug[];
}

export interface AssignRolePayload {
  roleSlug: string;
  expiresAt?: string; // ISO 8601, undefined = sin expiración
}

export interface RevokeRolePayload {
  roleSlug: string;
}
```

---

## Store — src/store/authStore.ts

El store de auth ya existe del dominio de auth. Extenderlo con los campos de autorización.
No crear un store separado para permisos — viajan con el usuario autenticado.

```typescript
import { create } from 'zustand';
import { AuthUser, PermissionSlug } from '../types/authorization.types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions de auth (definidas en auth.md)
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: AuthUser) => void;

  // Helpers de autorización — NO son actions, son computed helpers
  hasPermission: (slug: PermissionSlug) => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  // ... actions de auth definidas en auth.md ...

  hasPermission: (slug: PermissionSlug): boolean => {
    const { user } = get();
    if (!user) return false;
    if (user.superAdmin) return true;
    return user.permissions.includes(slug);
  },

  isSuperAdmin: (): boolean => {
    return get().user?.superAdmin ?? false;
  },
}));
```

### Cómo poblar los permisos desde el JWT

En el action `login` (y en `refreshToken`), después de recibir el access token:

```typescript
// Decodificar el JWT sin verificar firma (la firma ya la verificó el servidor)
// Instalar: npm install jwt-decode
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  user_id: number;
  email: string;
  super_admin: boolean;
  permissions: string[];
  jti: string;
  exp: number;
}

const payload = jwtDecode<JwtPayload>(accessToken);

set({
  accessToken,
  isAuthenticated: true,
  user: {
    id:          payload.user_id,
    email:       payload.email,
    name:        response.data.attributes.name, // viene del body de la respuesta
    superAdmin:  payload.super_admin,
    permissions: payload.permissions,
  }
});
```

---

## Hook — src/hooks/usePermission.ts

Este hook es la interfaz que usan los componentes. No deben importar el store directamente para verificar permisos.

```typescript
import { useAuthStore } from '../store/authStore';
import { PermissionSlug } from '../types/authorization.types';

interface UsePermissionReturn {
  can: (slug: PermissionSlug) => boolean;
  canAny: (slugs: PermissionSlug[]) => boolean;
  canAll: (slugs: PermissionSlug[]) => boolean;
  isSuperAdmin: boolean;
}

export const usePermission = (): UsePermissionReturn => {
  const hasPermission = useAuthStore(state => state.hasPermission);
  const isSuperAdmin  = useAuthStore(state => state.isSuperAdmin);

  return {
    can:         (slug) => hasPermission(slug),
    canAny:      (slugs) => slugs.some(slug => hasPermission(slug)),
    canAll:      (slugs) => slugs.every(slug => hasPermission(slug)),
    isSuperAdmin: isSuperAdmin(),
  };
};
```

---

## Routing — protección por permiso

### Componente PermissionRoute

Crear `src/router/PermissionRoute.tsx`:

```typescript
import React from 'react';
import { Redirect } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { PermissionSlug } from '../types/authorization.types';

interface PermissionRouteProps {
  permission: PermissionSlug;
  children: React.ReactNode;
  redirectTo?: string;
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  permission,
  children,
  redirectTo = '/dashboard',
}) => {
  const { can } = usePermission();

  if (!can(permission)) {
    return <Redirect to={redirectTo} />;
  }

  return <>{children}</>;
};
```

### Uso en AppRouter.tsx

```typescript
// Ruta protegida por autenticación Y por permiso
<Route path="/admin/roles">
  <ProtectedRoute>
    <PermissionRoute permission="roles:read">
      <RolesPage />
    </PermissionRoute>
  </ProtectedRoute>
</Route>

<Route path="/admin/users">
  <ProtectedRoute>
    <PermissionRoute permission="users:read">
      <UsersPage />
    </PermissionRoute>
  </ProtectedRoute>
</Route>
```

---

## Componente — PermissionGate (ocultar UI)

Crear `src/components/atoms/PermissionGate/PermissionGate.tsx`:

```typescript
import React from 'react';
import { usePermission } from '../../../hooks/usePermission';
import { PermissionSlug } from '../../../types/authorization.types';

interface PermissionGateProps {
  permission: PermissionSlug;
  children: React.ReactNode;
  fallback?: React.ReactNode; // qué mostrar si no tiene permiso (por defecto: nada)
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { can } = usePermission();
  return <>{can(permission) ? children : fallback}</>;
};
```

Crear `src/components/atoms/PermissionGate/index.ts`:

```typescript
export { PermissionGate } from './PermissionGate';
```

Crear `src/components/atoms/PermissionGate/PermissionGate.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { PermissionGate } from './PermissionGate';
import { useAuthStore } from '../../../store/authStore';

jest.mock('../../../store/authStore');

describe('PermissionGate', () => {
  it('muestra children si el usuario tiene el permiso', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      hasPermission: () => true,
      isSuperAdmin: () => false,
    });
    render(<PermissionGate permission="roles:read"><span>Visible</span></PermissionGate>);
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('oculta children si el usuario no tiene el permiso', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      hasPermission: () => false,
      isSuperAdmin: () => false,
    });
    render(<PermissionGate permission="roles:read"><span>Visible</span></PermissionGate>);
    expect(screen.queryByText('Visible')).not.toBeInTheDocument();
  });

  it('muestra fallback si el usuario no tiene el permiso y hay fallback', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      hasPermission: () => false,
      isSuperAdmin: () => false,
    });
    render(
      <PermissionGate permission="roles:read" fallback={<span>Sin acceso</span>}>
        <span>Visible</span>
      </PermissionGate>
    );
    expect(screen.getByText('Sin acceso')).toBeInTheDocument();
  });

  it('super admin siempre ve los children', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      hasPermission: () => true, // superAdmin bypasea en el store
      isSuperAdmin: () => true,
    });
    render(<PermissionGate permission="roles:destroy"><span>Admin content</span></PermissionGate>);
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
```

---

## Service — src/services/roleService.ts

```typescript
import api from './api';
import { Role, AssignRolePayload, RevokeRolePayload } from '../types/authorization.types';

interface RolesResponse {
  data: Array<{
    id: string;
    type: 'roles';
    attributes: {
      name: string;
      slug: string;
      description: string | null;
      active: boolean;
      permissions: string[];
    };
  }>;
  meta: { total: number };
}

const mapRole = (item: RolesResponse['data'][0]): Role => ({
  id:          item.id,
  name:        item.attributes.name,
  slug:        item.attributes.slug,
  description: item.attributes.description,
  active:      item.attributes.active,
  permissions: item.attributes.permissions,
});

export const roleService = {
  getAll: async (): Promise<Role[]> => {
    const res = await api.get<RolesResponse>('/api/v1/roles');
    return res.data.data.map(mapRole);
  },

  getById: async (id: string): Promise<Role> => {
    const res = await api.get<{ data: RolesResponse['data'][0] }>(`/api/v1/roles/${id}`);
    return mapRole(res.data.data);
  },

  assignPermission: async (roleId: string, permissionSlug: string): Promise<void> => {
    await api.post(`/api/v1/roles/${roleId}/assign_permission`, {
      permission_slug: permissionSlug,
    });
  },

  revokePermission: async (roleId: string, permissionSlug: string): Promise<void> => {
    await api.delete(`/api/v1/roles/${roleId}/revoke_permission`, {
      data: { permission_slug: permissionSlug },
    });
  },
};

export const userRoleService = {
  assignRole: async (userId: string, payload: AssignRolePayload): Promise<void> => {
    await api.post(`/api/v1/users/${userId}/assign_role`, {
      role_slug:  payload.roleSlug,
      expires_at: payload.expiresAt,
    });
  },

  revokeRole: async (userId: string, payload: RevokeRolePayload): Promise<void> => {
    await api.delete(`/api/v1/users/${userId}/revoke_role`, {
      data: { role_slug: payload.roleSlug },
    });
  },
};
```

---

## Pages — páginas de administración

### src/components/pages/RolesPage/

Crear con este comportamiento:

- Usa `usePermission().can('roles:read')` — si no tiene permiso, redirige (esto ya lo maneja `PermissionRoute`).
- Lista todos los roles consumiendo `roleService.getAll()`.
- Botón "Crear rol" solo visible con `<PermissionGate permission="roles:create">`.
- Botón "Eliminar" por rol solo visible con `<PermissionGate permission="roles:destroy">`.

### src/components/pages/UsersPage/

- Lista usuarios consumiendo el endpoint `GET /api/v1/users`.
- Botón "Asignar rol" por usuario visible con `<PermissionGate permission="users:assign_role">`.

---

## Tests E2E — e2e/authorization.spec.ts

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authorization', () => {
  test('viewer no puede acceder a /admin/roles', async ({ page }) => {
    // Login como viewer@boilerplate.dev / Viewer1234!
    await page.goto('/login');
    await page.fill('[name="email"]', 'viewer@boilerplate.dev');
    await page.fill('[name="password"]', 'Viewer1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Intentar acceder a ruta protegida
    await page.goto('/admin/roles');
    // Debe redirigir a dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('admin puede acceder a /admin/roles y ve la lista', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@boilerplate.dev');
    await page.fill('[name="password"]', 'Admin1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await page.goto('/admin/roles');
    await expect(page).toHaveURL('/admin/roles');
    await expect(page.locator('text=Administrador')).toBeVisible();
  });

  test('viewer no ve el botón de crear rol en UI', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'viewer@boilerplate.dev');
    await page.fill('[name="password"]', 'Viewer1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Aunque logre ver la página, el botón no existe
    await expect(page.locator('text=Crear rol')).not.toBeVisible();
  });
});
```

---

## Reglas — lo que el agente NO debe hacer

- NO hacer un request a `/api/v1/me/permissions` después del login. Los permisos vienen en el JWT.
- NO guardar permisos en localStorage. Solo en `authStore` (memoria).
- NO verificar permisos con `if (user.role === 'admin')`. Siempre usar `can('resource:action')`.
- NO importar `useAuthStore` directamente en componentes para verificar permisos. Usar `usePermission`.
- NO crear lógica de permisos inline en componentes. Todo pasa por `PermissionGate` o `usePermission`.

---

## Definición de done — este dominio

- `usePermission().can('roles:read')` retorna `true` para admin y `false` para viewer
- `usePermission().can('anything')` retorna `true` para super_admin
- `PermissionGate` oculta/muestra contenido correctamente en tests
- `PermissionRoute` redirige a `/dashboard` si no hay permiso
- Ruta `/admin/roles` es accesible para admin e inaccesible para viewer
- `npm test` de `PermissionGate.test.tsx` pasa al 100%
- `npx playwright test e2e/authorization.spec.ts` pasa al 100%
