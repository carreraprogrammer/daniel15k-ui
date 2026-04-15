# frontend-pages.md — boilerplate-ionic-react

Define todas las páginas del MVP, qué endpoints consume cada una, qué flujos maneja, y qué componentes usa.
Leer `architecture.md`, `roles-permissions.md`, y `specs/api-contract.md` del backend antes de implementar.

---

## Mapa de rutas

| Ruta | Página | Protección | Permiso adicional |
|------|--------|-----------|------------------|
| `/` | Redirect automático | — | — |
| `/login` | LoginPage | Solo si NO autenticado | — |
| `/register` | RegisterPage | Solo si NO autenticado | — |
| `/dashboard` | DashboardPage | Autenticado | — |
| `/profile` | ProfilePage | Autenticado | — |
| `/admin/users` | UsersPage | Autenticado | `users:read` |
| `/admin/users/:id` | UserDetailPage | Autenticado | `users:read` |
| `/admin/roles` | RolesPage | Autenticado | `roles:read` |
| `/admin/roles/:id` | RoleDetailPage | Autenticado | `roles:read` |
| `/admin/forms` | FormsPage | Autenticado | `forms:read` |
| `/admin/forms/:slug` | FormDetailPage | Autenticado | `forms:read` |
| `*` | NotFoundPage | — | — |

### Reglas de redirect

- `/` → si autenticado: `/dashboard`. Si no: `/login`.
- Rutas `/login` y `/register` → si ya autenticado: redirect a `/dashboard`.
- Rutas protegidas sin token → redirect a `/login` guardando la ruta intentada en state.
- Rutas con permiso insuficiente → redirect a `/dashboard` con toast de error.
- Después de login exitoso → ir a la ruta guardada o `/dashboard` si no hay ninguna.

---

## Páginas públicas

### LoginPage — `/login`

**Template:** `AuthLayout`
**Endpoints:** `GET /api/v1/forms/login-form` → `POST /api/v1/auth/login`

**Flujo:**
1. Al montar: cargar schema `login-form` desde el backend via `formStore.fetchSchema('login-form')`.
2. Renderizar `<DynamicForm schema={schema} onSuccess={handleLoginSuccess} />`.
3. `DynamicForm` hace POST al `submit_endpoint` definido en el schema (`/api/v1/auth/login`).
4. En `onSuccess`: recibir `{ data, meta }` → guardar tokens y user en `authStore` → redirigir.
5. En `onError`: mostrar errores inline en los campos correspondientes.

**UI adicional:**
- Link "¿No tienes cuenta? Regístrate" → `/register`
- Spinner mientras carga el schema
- Botón de submit deshabilitado mientras loading

---

### RegisterPage — `/register`

**Template:** `AuthLayout`
**Endpoints:** `GET /api/v1/forms/register-form` → `POST /api/v1/auth/register`

**Flujo:**
1. Cargar schema `register-form`.
2. Renderizar `<DynamicForm>` con el schema.
3. En `onSuccess`: guardar tokens → redirigir a `/dashboard`.
4. En `onError`: mostrar errores por campo.

**UI adicional:**
- Link "¿Ya tienes cuenta? Inicia sesión" → `/login`

---

## Páginas autenticadas — usuario general

### DashboardPage — `/dashboard`

**Template:** `AppLayout`
**Endpoints:** ninguno adicional (datos ya están en `authStore`)

**Contenido:**
- Saludo con el nombre del usuario: `"Hola, {user.name}"`
- Card con email del usuario
- Card con lista de permisos activos (solo visible para `super_admin` o usuarios con `users:read`)
- Sección "Accesos rápidos" con links a las secciones que el usuario puede ver según sus permisos:
  - `<PermissionGate permission="users:read">` → link a `/admin/users`
  - `<PermissionGate permission="roles:read">` → link a `/admin/roles`
  - `<PermissionGate permission="forms:read">` → link a `/admin/forms`
- Si el usuario no tiene ningún permiso de admin: mostrar mensaje "No tienes módulos administrativos asignados."

---

### ProfilePage — `/profile`

**Template:** `AppLayout`
**Endpoints:** `GET /api/v1/forms/profile-form` → `PATCH /api/v1/users/:id`

**Flujo:**
1. Cargar schema `profile-form`.
2. Pre-poblar los campos con los datos del usuario desde `authStore.user`.
3. Renderizar `<DynamicForm>` con valores iniciales.
4. El `submit_endpoint` del schema apunta a `/api/v1/users/:id` — reemplazar `:id` con `authStore.user.id` antes de hacer el request.
5. En `onSuccess`: actualizar `authStore.user` con los nuevos datos → mostrar toast "Perfil actualizado".
6. En `onError`: mostrar errores por campo.

**Nota para el agente:**
`DynamicForm` debe aceptar una prop `initialValues: Record<string, unknown>` para pre-poblar campos.
Si no tiene esta prop implementada, agregarla antes de implementar esta página.

---

## Páginas de administración

### UsersPage — `/admin/users`

**Template:** `AppLayout`
**Protección:** `PermissionRoute permission="users:read"`
**Endpoints:** `GET /api/v1/users`

**Contenido:**
- Tabla con columnas: Nombre, Email, Roles, Acciones
- Cada fila tiene botón "Ver detalle" → `/admin/users/:id`
- `<PermissionGate permission="users:destroy">` → botón "Eliminar" por fila
- Llamada a `DELETE /api/v1/users/:id` con confirmación antes de ejecutar
- Estado de loading mientras carga la lista
- Estado vacío si no hay usuarios

---

### UserDetailPage — `/admin/users/:id`

**Template:** `AppLayout`
**Protección:** `PermissionRoute permission="users:read"`
**Endpoints:** `GET /api/v1/users/:id`, `POST /api/v1/users/:id/assign_role`, `DELETE /api/v1/users/:id/revoke_role`

**Contenido:**
- Card con datos del usuario (nombre, email, super_admin badge si aplica)
- Lista de roles actuales con chip por cada rol
- `<PermissionGate permission="users:assign_role">`:
  - Select con roles disponibles (cargar de `GET /api/v1/roles`)
  - Input opcional de fecha de expiración
  - Botón "Asignar rol"
- `<PermissionGate permission="users:revoke_role">`:
  - Botón "Revocar" por cada rol en la lista

---

### RolesPage — `/admin/roles`

**Template:** `AppLayout`
**Protección:** `PermissionRoute permission="roles:read"`
**Endpoints:** `GET /api/v1/roles`

**Contenido:**
- Lista de roles con nombre, slug, descripción y cantidad de permisos
- `<PermissionGate permission="roles:create">` → botón "Crear rol" que abre modal
- Modal de creación: campos nombre, slug (auto-generado desde nombre, editable), descripción
- Botón "Ver detalle" por rol → `/admin/roles/:id`
- `<PermissionGate permission="roles:destroy">` → botón "Eliminar" con confirmación

---

### RoleDetailPage — `/admin/roles/:id`

**Template:** `AppLayout`
**Protección:** `PermissionRoute permission="roles:read"`
**Endpoints:** `GET /api/v1/roles/:id`, `POST /api/v1/roles/:id/assign_permission`, `DELETE /api/v1/roles/:id/revoke_permission`

**Contenido:**
- Card con datos del rol
- Lista de permisos asignados con chip por cada uno, formato `resource:action`
- Permisos agrupados por recurso (todos los `users:*` juntos, todos los `forms:*` juntos, etc.)
- `<PermissionGate permission="roles:update">`:
  - Select con permisos disponibles no asignados aún
  - Botón "Agregar permiso"
  - Botón "Quitar" por cada permiso en la lista

---

### FormsPage — `/admin/forms`

**Template:** `AppLayout`
**Protección:** `PermissionRoute permission="forms:read"`
**Endpoints:** `GET /api/v1/forms`

**Contenido:**
- Lista de schemas con título, slug, cantidad de campos, estado (activo/inactivo)
- `<PermissionGate permission="forms:create">` → botón "Crear schema"
- Botón "Ver detalle" → `/admin/forms/:slug`
- `<PermissionGate permission="forms:destroy">` → botón "Eliminar" con confirmación

---

### FormDetailPage — `/admin/forms/:slug`

**Template:** `AppLayout`
**Protección:** `PermissionRoute permission="forms:read"`
**Endpoints:** `GET /api/v1/forms/:slug`

**Contenido:**
- Metadata del schema: título, slug, submit_endpoint, submit_method
- Lista de fields con nombre, tipo, orden, y si es requerido
- Preview: renderizar `<DynamicForm schema={schema} />` en modo read-only (sin submit real)
- `<PermissionGate permission="forms:update">` → botón "Editar"

---

## Página de error

### NotFoundPage — `*`

**Template:** ninguno (página standalone)

**Contenido:**
- Mensaje "Página no encontrada"
- Botón "Volver al inicio" → `/`

---

## Componentes globales requeridos

### Toast / Notificaciones

Usar `IonToast` de Ionic. Crear un hook `useToast` con métodos:
- `showSuccess(message: string)`
- `showError(message: string)`
- `showInfo(message: string)`

Usar en lugar de `alert()` en toda la app.

### Modal de confirmación

Crear `ConfirmModal` molecule con props:
```typescript
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;   // default: "Confirmar"
  cancelLabel?: string;    // default: "Cancelar"
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;        // botón confirmar en rojo
}
```

Usar en todas las acciones destructivas (eliminar usuario, eliminar rol, revocar permiso).

### Header con menú de usuario

El organism `Header` existente debe incluir:
- Nombre del usuario actual (desde `authStore`)
- Menú dropdown con:
  - "Mi perfil" → `/profile`
  - "Cerrar sesión" → llama logout del store

### Navegación lateral (solo en AppLayout)

`AppLayout` debe incluir `IonMenu` con links:
- Dashboard → `/dashboard` (siempre visible)
- Mi perfil → `/profile` (siempre visible)
- Usuarios → `/admin/users` (solo con `users:read`)
- Roles → `/admin/roles` (solo con `roles:read`)
- Formularios → `/admin/forms` (solo con `forms:read`)

Usar `<PermissionGate>` para ocultar los links sin permiso.

---

## Estados de UI requeridos en todas las páginas

Cada página debe manejar explícitamente estos tres estados:

```typescript
// Loading
if (isLoading) return <Spinner />;

// Error
if (error) return <ErrorState message={error.message} onRetry={refetch} />;

// Empty
if (data.length === 0) return <EmptyState message="No hay elementos" />;

// Data
return <>{/* contenido normal */}</>;
```

Crear los componentes `ErrorState` y `EmptyState` como molecules antes de implementar páginas.

---

## Definición de done — frontend completo

- `docker compose up` levanta en puerto 5173 sin errores
- `tsc --noEmit` retorna 0 errores
- `npm test` pasa al 100%
- `npx playwright test` pasa al 100%
- Flujo completo: register → login → dashboard → profile → logout
- Admin ve `/admin/users`, `/admin/roles`, `/admin/forms`
- Viewer es redirigido a `/dashboard` si intenta acceder a `/admin/roles`
- Todos los botones de acción respetan `PermissionGate`
- Ningún `any` en TypeScript — `tsc --strict` pasa limpio
