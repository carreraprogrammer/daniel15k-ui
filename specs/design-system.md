# design-system.md — boilerplate-ionic-react

Define los tokens de diseño, atoms especializados, y reglas de estilo del sistema.
Este archivo es la fuente de verdad visual. Leer antes de implementar cualquier componente.
Para adaptar a una marca específica: solo modificar `src/theme/tokens.css`. No tocar los atoms.

---

## Filosofía

- **Un solo lugar para cada decisión visual** — tokens.css. Sin valores hardcodeados en componentes.
- **Los atoms encapsulan complejidad** — quien usa `<PhoneInput>` no sabe nada de máscaras.
- **Consistencia por defecto** — spacing, radios y tipografía siguen una escala, no valores arbitrarios.
- **Adaptable por tokens** — cambiar la marca es cambiar variables, no componentes.

---

## Estructura de archivos de tema

```
src/
└── theme/
    ├── tokens.css        ← única fuente de verdad visual
    ├── reset.css         ← normalización de estilos base
    ├── typography.css    ← clases de tipografía reutilizables
    └── utilities.css     ← clases de utilidad mínimas (gap, flex, grid)
```

Importar en este orden en `src/App.tsx`:

```typescript
import './theme/tokens.css';
import './theme/reset.css';
import './theme/typography.css';
import './theme/utilities.css';
```

---

## tokens.css — completo

```css
/* ─────────────────────────────────────────────
   BOILERPLATE DESIGN TOKENS
   Personalidad: Geométrico · Minimalista · Dark
   Para adaptar a una marca: editar solo este archivo
───────────────────────────────────────────────── */

:root {
  /* ── COLORES BASE ── */
  --color-bg-primary:     #0A0A0F;   /* fondo principal */
  --color-bg-secondary:   #111118;   /* fondo de cards, sidebars */
  --color-bg-elevated:    #1A1A24;   /* fondo de modales, dropdowns */
  --color-bg-input:       #16161F;   /* fondo de inputs */

  /* ── COLORES DE MARCA (cambiar por cliente) ── */
  --color-brand:          #5B6AF0;   /* primario — azul índigo geométrico */
  --color-brand-hover:    #6B7AF8;
  --color-brand-active:   #4A58E0;
  --color-brand-subtle:   #1E2050;   /* fondo sutil con tono de marca */

  /* ── COLORES DE ACENTO ── */
  --color-accent:         #00E5CC;   /* cian para highlights */
  --color-accent-subtle:  #00302A;

  /* ── COLORES SEMÁNTICOS ── */
  --color-success:        #22C55E;
  --color-success-subtle: #052E16;
  --color-warning:        #F59E0B;
  --color-warning-subtle: #2D1F00;
  --color-error:          #EF4444;
  --color-error-subtle:   #2D0A0A;
  --color-info:           #3B82F6;
  --color-info-subtle:    #0A1628;

  /* ── TEXTO ── */
  --color-text-primary:   #F0F0F8;   /* texto principal */
  --color-text-secondary: #8888AA;   /* texto secundario, labels */
  --color-text-disabled:  #44445A;   /* texto deshabilitado */
  --color-text-inverse:   #0A0A0F;   /* texto sobre fondos claros */

  /* ── BORDES ── */
  --color-border:         #22222E;   /* borde por defecto */
  --color-border-focus:   #5B6AF0;   /* borde en foco (= brand) */
  --color-border-error:   #EF4444;
  --color-border-subtle:  #1A1A24;

  /* ── TIPOGRAFÍA ── */
  --font-sans:    'Inter', 'SF Pro Display', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  --text-xs:      0.75rem;    /* 12px */
  --text-sm:      0.875rem;   /* 14px */
  --text-base:    1rem;       /* 16px */
  --text-lg:      1.125rem;   /* 18px */
  --text-xl:      1.25rem;    /* 20px */
  --text-2xl:     1.5rem;     /* 24px */
  --text-3xl:     1.875rem;   /* 30px */
  --text-4xl:     2.25rem;    /* 36px */

  --font-regular:  400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-loose:  1.75;

  --tracking-tight:  -0.025em;
  --tracking-normal:  0em;
  --tracking-wide:    0.05em;
  --tracking-widest:  0.1em;

  /* ── ESPACIADO (escala 4px) ── */
  --space-1:   0.25rem;   /* 4px */
  --space-2:   0.5rem;    /* 8px */
  --space-3:   0.75rem;   /* 12px */
  --space-4:   1rem;      /* 16px */
  --space-5:   1.25rem;   /* 20px */
  --space-6:   1.5rem;    /* 24px */
  --space-8:   2rem;      /* 32px */
  --space-10:  2.5rem;    /* 40px */
  --space-12:  3rem;      /* 48px */
  --space-16:  4rem;      /* 64px */
  --space-20:  5rem;      /* 80px */

  /* ── BORDER RADIUS (geométrico = radios pequeños) ── */
  --radius-sm:   4px;
  --radius-md:   6px;
  --radius-lg:   8px;
  --radius-xl:   12px;
  --radius-full: 9999px;   /* para pills y avatares */

  /* ── SOMBRAS ── */
  --shadow-sm:  0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md:  0 4px 12px rgba(0, 0, 0, 0.5);
  --shadow-lg:  0 8px 32px rgba(0, 0, 0, 0.6);
  --shadow-brand: 0 0 0 3px rgba(91, 106, 240, 0.25);  /* glow en foco */

  /* ── TRANSICIONES ── */
  --transition-fast:   100ms ease;
  --transition-base:   200ms ease;
  --transition-slow:   300ms ease;

  /* ── Z-INDEX ── */
  --z-base:    0;
  --z-raised:  10;
  --z-dropdown: 100;
  --z-modal:   200;
  --z-toast:   300;

  /* ── IONIC OVERRIDES ── */
  --ion-background-color:       var(--color-bg-primary);
  --ion-text-color:             var(--color-text-primary);
  --ion-color-primary:          var(--color-brand);
  --ion-color-primary-contrast: var(--color-text-inverse);
  --ion-toolbar-background:     var(--color-bg-secondary);
  --ion-item-background:        var(--color-bg-secondary);
  --ion-card-background:        var(--color-bg-secondary);
  --ion-border-color:           var(--color-border);
}
```

---

## reset.css

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  font-size: 16px;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  background-color: var(--color-bg-primary);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img, video, svg {
  display: block;
  max-width: 100%;
}

button, input, textarea, select {
  font: inherit;
}

a {
  color: var(--color-brand);
  text-decoration: none;
}

a:hover {
  color: var(--color-brand-hover);
}
```

---

## typography.css

```css
.text-xs       { font-size: var(--text-xs); }
.text-sm       { font-size: var(--text-sm); }
.text-base     { font-size: var(--text-base); }
.text-lg       { font-size: var(--text-lg); }
.text-xl       { font-size: var(--text-xl); }
.text-2xl      { font-size: var(--text-2xl); }
.text-3xl      { font-size: var(--text-3xl); }
.text-4xl      { font-size: var(--text-4xl); }

.font-regular  { font-weight: var(--font-regular); }
.font-medium   { font-weight: var(--font-medium); }
.font-semibold { font-weight: var(--font-semibold); }
.font-bold     { font-weight: var(--font-bold); }

.text-primary   { color: var(--color-text-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-disabled  { color: var(--color-text-disabled); }
.text-brand     { color: var(--color-brand); }
.text-error     { color: var(--color-error); }
.text-success   { color: var(--color-success); }

.tracking-tight   { letter-spacing: var(--tracking-tight); }
.tracking-wide    { letter-spacing: var(--tracking-wide); }
.tracking-widest  { letter-spacing: var(--tracking-widest); }

.uppercase { text-transform: uppercase; }
.truncate  { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

---

## Atoms especializados — catálogo completo

Cada atom vive en `src/components/atoms/{NombreAtom}/`.
Cada atom tiene: `NombreAtom.tsx`, `NombreAtom.module.css`, `NombreAtom.test.tsx`, `index.ts`.
**Ningún atom importa otro atom** — son independientes.
**Ningún atom tiene lógica de negocio** — solo presentación y validación de su propio valor.

---

### TextInput

```typescript
interface TextInputProps {
  name: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;           // texto de ayuda bajo el input
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  autoComplete?: string;
}
```

Estilos del input:
```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-base);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}

.input:focus {
  border-color: var(--color-border-focus);
  box-shadow: var(--shadow-brand);
}

.input.hasError {
  border-color: var(--color-border-error);
}

.input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
}

.required::after {
  content: ' *';
  color: var(--color-error);
}

.error {
  font-size: var(--text-xs);
  color: var(--color-error);
  margin-top: var(--space-1);
}

.hint {
  font-size: var(--text-xs);
  color: var(--color-text-disabled);
  margin-top: var(--space-1);
}
```

---

### EmailInput

Extiende `TextInput` con validación de formato incluida.

```typescript
interface EmailInputProps extends Omit<TextInputProps, 'maxLength' | 'autoComplete'> {
  // No agrega props nuevas — la validación es interna
}
```

Comportamiento interno:
- `type="email"` en el input nativo
- `autoComplete="email"`
- Validación onBlur: si el valor no matchea `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` → setear error interno "Correo electrónico inválido"
- Si viene `error` desde props, tiene prioridad sobre el error interno

---

### PasswordInput

```typescript
interface PasswordInputProps extends Omit<TextInputProps, 'maxLength' | 'autoComplete'> {
  showStrength?: boolean;  // muestra barra de fortaleza de contraseña
}
```

Comportamiento interno:
- Toggle show/hide con ícono de ojo en el lado derecho del input
- Si `showStrength=true`: mostrar barra de 4 segmentos bajo el input
  - 1 segmento rojo: menos de 8 caracteres
  - 2 segmentos naranja: 8+ chars sin número o mayúscula
  - 3 segmentos amarillo: 8+ chars con número o mayúscula
  - 4 segmentos verde: 8+ chars con número Y mayúscula Y símbolo
- `autoComplete="current-password"` por defecto, `"new-password"` si `showStrength=true`

---

### PhoneInput

```typescript
interface PhoneInputProps {
  name: string;
  label?: string;
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  country?: 'CO' | 'EC' | 'MX' | 'US' | 'AR' | 'PE' | 'CL';  // default: 'CO'
}
```

Máscaras por país:
```typescript
const MASKS: Record<string, { prefix: string; mask: string; placeholder: string }> = {
  CO: { prefix: '+57', mask: '### ### ####',   placeholder: '+57 300 000 0000' },
  EC: { prefix: '+593', mask: '## ### ####',   placeholder: '+593 99 000 0000' },
  MX: { prefix: '+52', mask: '## #### ####',   placeholder: '+52 55 0000 0000' },
  US: { prefix: '+1',  mask: '(###) ###-####', placeholder: '+1 (555) 000-0000' },
  AR: { prefix: '+54', mask: '## ####-####',   placeholder: '+54 11 0000-0000' },
  PE: { prefix: '+51', mask: '### ### ###',    placeholder: '+51 999 000 000' },
  CL: { prefix: '+56', mask: '# #### ####',    placeholder: '+56 9 0000 0000' },
};
```

Comportamiento:
- Aplicar máscara mientras el usuario escribe (solo deja pasar dígitos)
- El `onChange` devuelve el valor sin formato (solo dígitos + prefijo) y si es válido
- Selector de país con bandera emoji a la izquierda del input
- Validar longitud según la máscara del país seleccionado

---

### NumberInput

```typescript
interface NumberInputProps {
  name: string;
  label?: string;
  value: number | '';
  onChange: (value: number | '') => void;
  error?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  required?: boolean;
  prefix?: string;   // ej: "$", "€"
  suffix?: string;   // ej: "kg", "%"
  format?: 'decimal' | 'integer' | 'currency';
}
```

Comportamiento:
- Sin flechas nativas del browser (`-moz-appearance: textfield`, `-webkit-appearance: none`)
- Si `format='currency'`: separadores de miles al formatear (solo en display, el valor interno es numérico)
- Validar min/max onBlur y mostrar error descriptivo: "El valor mínimo es {min}"

---

### TextareaInput

```typescript
interface TextareaInputProps {
  name: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  rows?: number;        // default: 4
  autoResize?: boolean; // default: true — crece con el contenido
  showCount?: boolean;  // muestra contador "X / maxLength"
}
```

---

### SelectInput

```typescript
interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

interface SelectInputProps {
  name: string;
  label?: string;
  value: string | number | '';
  onChange: (value: string | number) => void;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;   // opción vacía al inicio: "Seleccionar..."
  disabled?: boolean;
  required?: boolean;
}
```

Implementar como select nativo estilizado, no como `IonSelect` — el nativo da mejor UX en formularios web.

---

### CheckboxInput

```typescript
interface CheckboxInputProps {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}
```

El área de click incluye el label completo, no solo el checkbox.

---

### DateInput

```typescript
interface DateInputProps {
  name: string;
  label?: string;
  value: string;          // ISO 8601: "2026-03-21"
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;           // ISO 8601
  max?: string;           // ISO 8601
  format?: 'date' | 'datetime-local';
}
```

---

### ImageInput

```typescript
interface ImageInputProps {
  name: string;
  label?: string;
  value: string | null;   // URL de preview o null
  onChange: (file: File, previewUrl: string) => void;
  onRemove?: () => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  maxSizeMB?: number;     // default: 5
  accept?: string;        // default: "image/jpeg,image/png,image/webp"
  aspectRatio?: '1:1' | '16:9' | '4:3' | 'free';  // default: 'free'
}
```

Comportamiento:
- Click en el área o drag & drop para subir
- Preview inmediato antes del upload real
- Validar tamaño antes de aceptar el archivo — mostrar error si excede `maxSizeMB`
- Botón "Eliminar" sobre el preview si hay imagen y `onRemove` está definido
- Comprimir imagen client-side antes de pasar al `onChange` si supera 1MB
  (usar Canvas API: `canvas.toBlob(callback, 'image/jpeg', 0.85)`)
- Si `aspectRatio !== 'free'`: mostrar overlay con las proporciones esperadas

---

### Button

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: ButtonVariant;   // default: 'primary'
  size?: ButtonSize;         // default: 'md'
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}
```

Estilos por variante:
```css
.primary {
  background: var(--color-brand);
  color: var(--color-text-inverse);
  border: 1px solid transparent;
}
.primary:hover:not(:disabled) {
  background: var(--color-brand-hover);
}

.secondary {
  background: transparent;
  color: var(--color-brand);
  border: 1px solid var(--color-brand);
}
.secondary:hover:not(:disabled) {
  background: var(--color-brand-subtle);
}

.ghost {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.ghost:hover:not(:disabled) {
  background: var(--color-bg-elevated);
}

.danger {
  background: var(--color-error);
  color: white;
  border: 1px solid transparent;
}

.success {
  background: var(--color-success);
  color: white;
  border: 1px solid transparent;
}

.button {
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  cursor: pointer;
  transition: background var(--transition-fast), box-shadow var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.button:focus-visible {
  box-shadow: var(--shadow-brand);
  outline: none;
}

.button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sm { padding: var(--space-2) var(--space-3); font-size: var(--text-sm); }
.md { padding: var(--space-3) var(--space-5); font-size: var(--text-base); }
.lg { padding: var(--space-4) var(--space-6); font-size: var(--text-lg); }

.fullWidth { width: 100%; }
```

Cuando `loading=true`:
- Mostrar `<Spinner size="sm" />` en lugar del `iconLeft`
- Deshabilitar el botón
- Mantener el `label` visible para no cambiar el ancho

---

### Badge / Chip

```typescript
type BadgeVariant = 'brand' | 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;   // default: 'neutral'
  onRemove?: () => void;    // si está definido, muestra X al lado
  size?: 'sm' | 'md';
}
```

Usar para mostrar roles, permisos, y estados en tablas y listas.

---

### Spinner

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';   // sm: 16px, md: 24px, lg: 40px
  color?: string;               // default: var(--color-brand)
}
```

Implementar con CSS animation, no con `IonSpinner` — para control total del estilo.

```css
.spinner {
  border-radius: 50%;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-brand);
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

---

### ErrorMessage

```typescript
interface ErrorMessageProps {
  message?: string;   // si es undefined o '', no renderiza nada
}
```

---

### Label

```typescript
interface LabelProps {
  text: string;
  htmlFor?: string;
  required?: boolean;
}
```

---

## DynamicField — integración con los atoms

`DynamicField` recibe un `FieldSchema` del backend y renderiza el atom correcto:

```typescript
// src/components/molecules/DynamicField/DynamicField.tsx

const FIELD_MAP: Record<FieldSchema['type'], React.ComponentType<any>> = {
  text:           TextInput,
  email:          EmailInput,
  password:       PasswordInput,
  tel:            PhoneInput,
  number:         NumberInput,
  textarea:       TextareaInput,
  select:         SelectInput,
  checkbox:       CheckboxInput,
  date:           DateInput,
  'datetime-local': DateInput,
  hidden:         () => null,
};

export const DynamicField: React.FC<DynamicFieldProps> = ({ field, value, onChange, error }) => {
  const Component = FIELD_MAP[field.type];
  if (!Component) return null;

  return (
    <Component
      name={field.name}
      label={field.label}
      placeholder={field.placeholder}
      value={value}
      onChange={onChange}
      error={error}
      required={field.required}
      disabled={false}
      // Props específicas por tipo
      {...(field.type === 'textarea' && { rows: field.rows ?? 4 })}
      {...(field.type === 'select' && { options: field.options ?? [] })}
      {...(field.type === 'number' && { min: field.validations?.min_length, max: field.validations?.max_length })}
    />
  );
};
```

---

## Reglas de estilo — sin excepciones

- **Nunca** usar valores de color, spacing, o tipografía hardcodeados en componentes. Solo tokens.
- **Nunca** usar `style={{ color: '#fff' }}` inline. Los estilos inline están prohibidos salvo para valores dinámicos imposibles de manejar con CSS.
- **Nunca** usar `!important`.
- **Nunca** escribir estilos en archivos `.tsx`. Solo en `.module.css` del componente.
- **Nunca** un atom importa a otro atom.
- **Nunca** un atom hace un request HTTP.
- El archivo `tokens.css` es el único lugar donde se definen valores visuales base.

---

## Cómo adaptar a una marca

Para Coffee Parches por ejemplo, crear `src/theme/tokens.coffee-parches.css`:

```css
/* Override solo lo necesario */
:root {
  --color-brand:        #6F4E37;   /* café */
  --color-brand-hover:  #8B6347;
  --color-brand-active: #5A3E2B;
  --color-brand-subtle: #2A1F16;
  --color-accent:       #D4A847;   /* dorado */
  --font-sans: 'Playfair Display', Georgia, serif;
}
```

E importarlo en `App.tsx` reemplazando el import de `tokens.css`.
El 100% de la app cambia de personalidad visual sin tocar un solo componente.

---

## Definición de done — design system

- `tokens.css` existe en `src/theme/` y tiene todas las variables definidas en este spec
- Todos los atoms del catálogo están implementados con su `.module.css` y su `.test.tsx`
- `tsc --noEmit` pasa sin errores en todos los atoms
- Ningún atom tiene valores hardcodeados de color, spacing, o tipografía
- `DynamicField` renderiza el atom correcto para cada tipo de campo
- Un cambio en `--color-brand` en `tokens.css` se refleja visualmente en toda la app