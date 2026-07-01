# Identidad Visual — Daniel 15K

> Última actualización: 2026-04-21
> Fuente de verdad para decisiones de diseño. Los tokens viven en `src/theme/tokens.css`.

---

## Personalidad

La app debe sentirse **relajante**. El usuario llega con la tensión natural de revisar sus finanzas. La interfaz tiene que bajar esa tensión, no subirla. Las referencias que definen el tono:

| Referencia | Qué tomamos |
|---|---|
| **I AM** (meditación) | Espacio en blanco generoso, gradientes suaves, nada que grite |
| **Headway** (libros) | Claridad tipográfica, progreso visible, gamificación elegante |
| **Gaia** (yoga/espiritualidad) | Fondos oscuros ricos, paleta orgánica, sensación de profundidad |
| **Dofus** (RPG) | Colores como elementos del mundo, íconos con carácter, sensación de estar *dentro* de algo |

La síntesis: una pantalla de gestión de personaje de RPG, pero calmada y sin urgencia.

---

## Tipografía

### Fuentes

| Rol | Fuente | Import |
|---|---|---|
| Cuerpo / UI general | `DM Sans` | Google Fonts |
| Headings / display | `Sora` | Google Fonts |
| Números / montos | `DM Mono` | Google Fonts |

```html
<!-- Agregar en index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=DM+Mono:wght@400;500&family=Sora:wght@300;400;600;700&display=swap" rel="stylesheet">
```

**Por qué DM Sans:** redondeada, warm, no corporativa. Transmite accesibilidad sin ser infantil.
**Por qué Sora:** geométrica con personalidad. Tiene el toque fantasy-clean de Dofus sin ser ornamental.
**Por qué DM Mono:** mismo sistema tipográfico que DM Sans — los montos numéricos se leen igual de cálidos.

### Tokens actualizados

```css
--font-sans:    'DM Sans', 'SF Pro Display', system-ui, sans-serif;
--font-display: 'Sora', 'DM Sans', system-ui, sans-serif;
--font-mono:    'DM Mono', 'JetBrains Mono', monospace;
```

---

## Paleta base

El fondo oscuro ya está bien. Los paneles glassmorphism son correctos. Lo que se refina:

| Token | Valor | Notas |
|---|---|---|
| `--color-bg-primary` | `#05070C` | Sin cambio — casi negro con tinte índigo |
| `--color-bg-secondary` | `#0F172A` | Sin cambio |
| `--color-bg-elevated` | `#111827` | Sin cambio |
| `--color-brand` | `#FB923C` | Sin cambio — naranja ámbar, cálido |
| `--color-accent` | `#FCD34D` | Sin cambio — solar, Headway reference |

---

## Paleta de categorías conductuales

Cada categoría es un **elemento del mundo**. Los colores son versiones profundas y ricas de los colores semánticos originales — menos saturación, más peso. En el fondo oscuro de la app, brillan como gemas.

| Categoría | Código | Color | Nombre | Elemento |
|---|---|---|---|---|
| Comprometido | `committed` | `#C0392B` | Granada | Piedra / hierro — peso, inamovilidad |
| Necesario | `necessary` | `#D4732A` | Ámbar | Tierra / sustento — calidez, vida |
| Flexible | `discretionary` | `#14B8A6` | Teal | Frío / libre de elegir — contrasta con committed/necessary cálidos (RFC-0001) |
| ~~Inversión~~ | ~~`investment`~~ | — | — | Deprecado (RFC-0001): → módulo Patrimonio |
| ~~Social~~ | ~~`social`~~ | — | — | Deprecado (RFC-0001): → subcategoría bajo Flexible |
| Ingreso | `income` | `#0E96AD` | Zafiro | Agua / flujo — claridad, movimiento |
| Desconocido | `unknown` | `#5B7280` | Niebla | Bruma — neutro, pendiente |

### Tokens CSS

```css
--color-committed:          #C0392B;
--color-committed-subtle:   #2D0A0A;
--color-necessary:          #D4732A;
--color-necessary-subtle:   #2D1500;
--color-discretionary:      #14B8A6;
--color-discretionary-subtle: #04312C;
--color-investment:         #1A9E4A;
--color-investment-subtle:  #052E16;
--color-social:             #8A4FD8;
--color-social-subtle:      #1A0B36;
--color-income:             #0E96AD;
--color-income-subtle:      #0A1F28;
--color-unknown:            #5B7280;
--color-unknown-subtle:     #141E2D;
```

---

## Íconos

### Librería

**Ionicons 8** (bundled con `@ionic/react`). No agregar otra librería de íconos.

```tsx
import { IonIcon } from '@ionic/react';
import { homeOutline, cartOutline } from 'ionicons/icons';
```

### Sistema de aplicación

- El **ícono** viene de la subcategoría — representa el **qué**
- El **color** viene de la categoría conductual — representa el **por qué**

```
[ícono en color de categoría]  Restaurante en Carulla   $45.000
         ↑                              ↑
  restaurantOutline               Discrecional
  coloreado en Oro               (#C9980A)
```

### Mapa completo subcategoría → ícono

**Comprometido**
| Subcategoría | Código | Ionicon |
|---|---|---|
| Arriendo | `arriendo` | `homeOutline` |
| Créditos | `creditos` | `cardOutline` |
| Seguros | `seguros` | `shieldOutline` |
| Servicios públicos | `servicios_publicos` | `flashOutline` |
| Colegiaturas | `colegiaturas` | `schoolOutline` |

**Necesario**
| Subcategoría | Código | Ionicon |
|---|---|---|
| Mercado | `mercado` | `cartOutline` |
| Gasolina | `gasolina` | `carOutline` |
| Transporte | `transporte` | `busOutline` |
| Salud | `salud` | `heartOutline` |
| Celular | `celular` | `phonePortraitOutline` |

**Discrecional**
| Subcategoría | Código | Ionicon |
|---|---|---|
| Restaurantes | `restaurantes` | `restaurantOutline` |
| Delivery | `delivery` | `fastFoodOutline` |
| Ocio | `ocio` | `gameControllerOutline` |
| Ropa | `ropa` | `shirtOutline` |
| Tecnología | `tecnologia` | `laptopOutline` |
| Suscripciones | `suscripciones` | `refreshOutline` |

**Inversión**
| Subcategoría | Código | Ionicon |
|---|---|---|
| Cursos | `cursos` | `schoolOutline` |
| Libros | `libros` | `bookOutline` |
| Suplementos | `suplementos` | `fitnessOutline` |
| Herramientas | `herramientas` | `constructOutline` |
| Ahorro voluntario | `ahorro_voluntario` | `saveOutline` |

**Social**
| Subcategoría | Código | Ionicon |
|---|---|---|
| Regalos | `regalos` | `giftOutline` |
| Salidas | `salidas` | `peopleOutline` |
| Familia | `familia` | `heartOutline` |
| Donaciones | `donaciones` | `handLeftOutline` |

**Ingreso**
| Subcategoría | Código | Ionicon |
|---|---|---|
| Salario | `salario` | `briefcaseOutline` |
| Freelance | `freelance` | `codeSlashOutline` |
| Reembolso | `reembolso` | `returnDownBackOutline` |
| Arriendo recibido | `arriendo_recibido` | `businessOutline` |
| Otros ingresos | `otros_ingreso` | `addCircleOutline` |

**Desconocido**
| Subcategoría | Código | Ionicon |
|---|---|---|
| — | — | `helpCircleOutline` (fallback de categoría) |

---

## Sistema de glows (fondo ambiental)

Los tres gradientes radiales del `AppLayout` no son decorativos — tienen intención semántica. Hoja de ruta:

| Glow | Color | Significado | Estado actual |
|---|---|---|---|
| Teal | `rgba(0, 229, 204, 0.11)` | Flujo de ingreso — siempre presente | Implementado |
| Índigo | `rgba(91, 106, 240, 0.16)` | Inversión y crecimiento | Implementado, sin semántica |
| Ámbar | `rgba(252, 211, 77, 0.10)` | Alerta de presupuesto | Implementado, sin semántica |

A futuro: los glows se intensifican o atenúan según el estado financiero del mes. No es un cambio para ahora — pero la arquitectura ya lo soporta.

---

## Border radius

Los radios actuales (4–12px) son demasiado angulares para la personalidad relajante. El `AppLayout` ya usa 24–30px en los paneles principales. Se agrega escala intermedia:

```css
--radius-sm:   6px;    /* antes 4px */
--radius-md:   10px;   /* antes 6px */
--radius-lg:   14px;   /* antes 8px */
--radius-xl:   20px;   /* antes 12px */
--radius-2xl:  24px;   /* nuevo */
--radius-3xl:  32px;   /* nuevo */
```

---

## Reglas de aplicación

1. **Color de categoría nunca como fondo de pantalla completa** — solo como acento: borde izquierdo, ícono coloreado, chip pequeño, barra de progreso.
2. **El fondo oscuro es el protagonista** — los colores son joyas sobre piedra, no pintura en pared.
3. **Espaciado generoso** — entre cards, entre ítems de lista, entre secciones. La respiración visual es parte del relajamiento.
4. **Sin rojos alarmantes para errores de UX** — usar `--color-error` solo para errores técnicos. Para overspending en presupuesto, usar la paleta de categorías (Comprometido en Granada) no el rojo de error.

---

## Referencias

- **Taxonomía completa y Budget Wizard** — definición autoritativa de categorías, subcategorías, iconos y lógica del wizard: `daniel15k-api/specs/finanzas/taxonomy-and-budget-wizard.md`
  - Los colores definidos aquí en "Paleta de categorías conductuales" deben mantenerse sincronizados con los `category_code` de ese spec.
  - Los iconos del "Mapa completo subcategoría → ícono" deben mantenerse sincronizados con los `subcategory_icon` sembrados en `db/seeds.rb`.
