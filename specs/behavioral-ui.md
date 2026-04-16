# Behavioral UI — daniel15k-web

Fecha: 2026-04-15

## Objetivo

Convertir la taxonomía financiera en una lectura visible y accionable dentro de la UI.  
La web no debe mostrar solo montos y estados; debe mostrar qué parte del gasto fue:

- comprometida
- necesaria
- discrecional
- inversión
- social
- ingreso

## Implementado

### 1. Contrato de categorías en frontend

Se tipó explícitamente el recurso `Transaction` con:

- `relationships.category.data.id`
- `relationships.subcategory.data.id`
- `attributes.source_event_id`

Y se tipó `CategoryResource` para que el frontend preserve:

- `category_type`
- subcategorías incluidas en `relationships.subcategories.data`

### 2. Preservación de `relationships`

`financeService.normalizeResource()` ya no descarta relaciones JSON:API.  
Esto era obligatorio para resolver categorías reales sin hacks de `category_name`.

### 3. Capa de lectura conductual

Se creó `src/utils/financeBehavior.ts` con:

- `buildCategoryLookup(categories)`
- `resolveTransactionCategory(transaction, lookup)`
- `summarizeBehavior(transactions, lookup)`
- `buildBehaviorSignals(summary)`

Esta capa hace dos cosas:

1. traduce ids de categoría/subcategoría a nombres visibles
2. construye una lectura conductual básica del mes

### 4. Transactions

Cada card de transacción ahora muestra:

- categoría visible
- subcategoría visible cuando existe
- hint conductual corto:
  - `Elegido`
  - `Construye`
  - `Carga fija`
  - `Sostiene`
  - `Vínculo`
  - `Entrada`

Además la página muestra:

- total discrecional
- total de inversión
- panel de `Lectura conductual`

### 5. Dashboard

El dashboard ahora cruza:

- `summary`
- `transactions`
- `categories`

Y muestra:

- métrica de gasto discrecional
- métrica de inversión
- panel `Lectura conductual del mes`

## Qué NO hace todavía

- no aplica fricción directa en la UI
- no bloquea decisiones
- no cambia defaults del usuario
- no hace seguimiento longitudinal de sugerencias

La UI sigue siendo principalmente interpretativa, pero ya no ciega a la taxonomía.

## Regla de diseño

La categoría no debe renderizarse como etiqueta contable neutra.  
Siempre que se muestre, debe venir acompañada de una señal conductual breve.

## Siguiente capa sugerida

### Quick wins

- filtro por `category_type` en transacciones
- badges en dashboard para:
  - `consumo`
  - `mantenimiento`
  - `construcción`

### Mediano plazo

- timeline de patrones:
  - discretionary subiendo
  - investment cayendo
  - committed rígido

### Estructural

- inbox de intervenciones:
  - alerta
  - fricción
  - refuerzo
  - seguimiento
