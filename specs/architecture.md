# architecture.md — boilerplate-ionic-react

Este documento es el mapa global del repositorio. Léelo completo antes de leer cualquier spec de dominio.
Ante cualquier ambigüedad, este archivo tiene precedencia sobre los specs de dominio.

---

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Ionic + React | 8.x + 18.x |
| Lenguaje | TypeScript | 5.x (strict: true) |
| Estado global | Zustand | 4.x |
| HTTP | Axios | 1.x |
| Routing | React Router v6 + IonReactRouter | — |
| Tests unitarios | Jest + Testing Library | — |
| Tests E2E | Playwright | — |
| Deploy | Vercel | — |
| Contenedor | Docker + docker-compose | — |

---

## Estructura de directorios

```
boilerplate-ionic-react/
├── src/
│   ├── components/
│   │   ├── atoms/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Label/
│   │   │   ├── ErrorMessage/
│   │   │   ├── Spinner/
│   │   │   └── Text/
│   │   ├── molecules/
│   │   │   ├── FormField/
│   │   │   ├── DynamicField/
│   │   │   └── NavBar/
│   │   ├── organisms/
│   │   │   ├── DynamicForm/
│   │   │   ├── AuthForm/
│   │   │   └── Header/
│   │   ├── templates/
│   │   │   ├── AuthLayout/
│   │   │   └── AppLayout/
│   │   └── pages/
│   │       ├── LoginPage/
│   │       ├── RegisterPage/
│   │       ├── DashboardPage/
│   │       └── ProfilePage/
│   ├── store/
│   │   ├── authStore.ts
│   │   └── formStore.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   └── formService.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   └── useDynamicForm.ts
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── form.types.ts
│   │   └── authorization.types.ts
│   ├── utils/
│   │   └── validators.ts
│   ├── router/
│   │   └── AppRouter.tsx
│   └── App.tsx
├── e2e/
│   ├── auth.spec.ts
│   ├── forms.spec.ts
│   └── authorization.spec.ts
├── specs/
│   ├── architecture.md
│   ├── auth.md
│   ├── roles-permissions.md
│   └── forms.md
├── public/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── vite.config.ts
└── README.md
```

---

## Reglas de arquitectura — sin excepciones

- **TypeScript strict** habilitado. `any` está prohibido. Usar `unknown` con narrowing si el tipo no es conocido.
- **Cada componente** tiene su archivo de test `.test.tsx` en la misma carpeta.
- **Cada carpeta de componente** tiene un `index.ts` que exporta el componente por default.
- **Zustand stores** solo tienen estado y actions. Cero lógica de UI.
- **Los services** (Axios) solo hacen llamadas HTTP. La transformación de datos es mínima — los types hacen ese trabajo.
- **Los hooks** son la capa entre stores/services y componentes.
- **El accessToken** vive exclusivamente en memoria (authStore). Nunca en localStorage ni sessionStorage.
- **El refreshToken** vive en localStorage con clave `'rft'`.
- **Los permisos** viajan en el JWT y se guardan en `authStore.permissions: string[]`. No hacer requests adicionales para obtenerlos.

---

## Convenciones de nombres

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes | PascalCase | `DynamicForm` |
| Hooks | camelCase con prefijo `use` | `usePermission` |
| Stores | camelCase con sufijo `Store` | `authStore` |
| Types/Interfaces | PascalCase | `FormSchema`, `AuthUser` |
| Archivos de componente | `NombreComponente.tsx` | `Button.tsx` |
| Archivos de test | `NombreComponente.test.tsx` | `Button.test.tsx` |
| Archivos de tipo | `dominio.types.ts` | `auth.types.ts` |
| Services | `dominioService.ts` | `authService.ts` |

---

## Variables de entorno

```
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Boilerplate
VITE_ENV=development
```

---

## Orden de ejecución para el agente

1. `ionic start boilerplate-ionic-react blank --type=react`
2. Instalar dependencias: `zustand axios react-router-dom @playwright/test`
3. Habilitar `strict: true` en `tsconfig.json`
4. Crear estructura de carpetas completa con `.gitkeep`
5. Definir **todos los tipos** en `src/types/` antes de tocar componentes
6. Implementar atoms en orden: `Button → Input → Label → ErrorMessage → Spinner → Text`
7. Implementar molecules: `FormField → DynamicField → NavBar`
8. Implementar stores: `authStore → formStore`
9. Implementar `src/services/api.ts` con interceptores JWT
10. Implementar organisms: `DynamicForm → AuthForm → Header`
11. Implementar templates: `AuthLayout → AppLayout`
12. Implementar pages
13. Configurar `AppRouter` con rutas protegidas y por permiso
14. Escribir tests Jest por cada componente
15. Escribir specs Playwright
16. Crear `Dockerfile` y `docker-compose.yml`
17. Escribir README

---

## Definición de done global

- `docker compose up` levanta sin errores en puerto 5173
- `tsc --noEmit` retorna 0 errores
- `npm test` pasa al 100%
- `npx playwright test` pasa al 100%
- El flujo completo register → login → dashboard → logout funciona
- Un usuario sin permiso no ve rutas protegidas por permiso
