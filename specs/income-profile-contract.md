# Income Profile Contract

Fecha: 2026-04-17

## Objetivo

Cerrar la implementación del perfil de ingresos para que frontend y backend hablen el mismo idioma.

## Qué se normalizó

- `cadence` usa:
  - `monthly`
  - `biweekly`
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

## Workaround aceptado en este milestone

Cuando el usuario declara un ingreso quincenal en el wizard:

- la UI crea dos `income_sources`
- cada uno se guarda como entrada mensual esperada
- se marca con `evidence_source` de split

Esto no es el modelo final ideal.

## Deuda conocida

El modelo de largo plazo debería separar:

- `income_source`
- `income_source_schedule`

Pero ese cambio no entra en este cierre. Por ahora se prioriza coherencia operativa del contrato actual.
