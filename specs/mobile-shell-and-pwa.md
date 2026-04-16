# Mobile Shell And PWA

Fecha: 2026-04-16

## Objetivo

Corregir tres problemas del frontend móvil:

- sidebar inútil en pantallas pequeñas
- scroll inconsistente en el panel de contenido
- falta de configuración PWA instalable

## Shell móvil

### Antes

- el sidebar seguía renderizando como bloque normal
- en `@media (max-width: 1024px)` el `content` quedaba con `overflow: visible`
- el scroll terminaba mezclado entre `body` y panel interno

### Ahora

- el sidebar desktop se oculta en móvil
- el header muestra botón hamburguesa
- el menú móvil abre como overlay full-screen
- el menú se cierra por:
  - botón cerrar
  - backdrop
  - click en navegación
- mientras el menú está abierto:
  - `body.menu-open`
  - scroll del documento bloqueado

## Scroll

Se mantuvo el modelo correcto:

- `shell` a `100dvh`
- `main` con `overflow: hidden`
- `content` con `overflow-y: auto`
- `-webkit-overflow-scrolling: touch`

La versión móvil ya no degrada a `overflow: visible`.

## PWA

Se añadió:

- `public/manifest.webmanifest`
- `public/sw.js`
- iconos públicos SVG
- registro de `serviceWorker` en `main.tsx`
- metatags y links en `index.html`

## Alcance actual de la PWA

Queda soportado:

- instalación en navegadores compatibles
- apertura en modo standalone
- cache básico del shell y assets same-origin

No se añadió todavía:

- estrategia avanzada de offline para API
- versionado fino de cache por build hash
- prompts de update al usuario

## Siguiente mejora sugerida

- detectar `beforeinstallprompt`
- toast o banner `Instalar app`
- invalidación de cache por release
