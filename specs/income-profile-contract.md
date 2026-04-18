# Income Profile Contract

Fecha: 2026-04-17

## Objetivo

Cerrar la implementación del perfil de ingresos para que frontend y backend hablen el mismo idioma.

## Qué se normalizó

- `cadence` usa:
  - `monthly`
  - `biweekly`
  - `weekly`
  - `irregular`
- `classification` usa:
  - `base`
  - `variable`
  - `seasonal`
  - `one_time`

## Regla de UX

El usuario no debería pensar en `expected_day_from` / `expected_day_to` como dos números sueltos.

El flujo principal usa:

- ventanas predefinidas
- cadencia explícita
- confiabilidad explícita para ingresos no base
- una sola fuente de ingreso aunque tenga varias ventanas de cobro

Además:

- si la cadencia es `biweekly`, la UI pide el valor por quincena
- si la cadencia es `weekly`, la UI pide el valor por semana
- el total mensual esperado se calcula internamente y se muestra como referencia en la pantalla

## Modelo vigente

Ahora el frontend crea un `income_source` con `schedules` anidados:

- `monthly` -> 1 schedule
- `biweekly` -> 2 schedules
- `weekly` -> 4 schedules
- `irregular` -> 1 schedule de mes completo

Los campos top-level:

- `expected_day_from`
- `expected_day_to`
- `expected_amount`

se mantienen como denormalización de lectura y compatibilidad, pero la fuente de verdad ya es `schedules`.

## Impacto en UI

- el wizard de ingresos ya no parte quincenal en dos filas
- el composer manual ya usa el mismo contrato
- el listado de ingresos resume las ventanas desde `schedules`

## Deuda conocida

El backend todavía conserva los campos agregados en `income_sources` por compatibilidad con:

- sorting legacy
- Brain legacy
- cálculos agregados existentes

El siguiente paso de largo plazo sería mover más lógica a `income_source_schedules`, pero ya no hace falta duplicar fuentes para modelar quincenal o semanal.
