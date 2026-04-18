# Focus-First Finance Pages

Fecha: 2026-04-18

## Objetivo

Reducir ruido inicial en las páginas operativas de finanzas para que cada pantalla responda primero una sola pregunta principal y deje el resto como detalle opcional.

## Principio aplicado

Cada página operativa debe cumplir esta secuencia:

1. mostrar una respuesta dominante arriba del fold
2. dejar una acción principal visible
3. esconder filtros, buscadores y resúmenes secundarios detrás de `Explorar detalle`

La lista o tabla principal puede seguir visible, pero ya no debe competir arriba con barras de búsqueda, chips, métricas y paneles auxiliares al mismo tiempo.

## Páginas ajustadas

### Dashboard

- pregunta principal: `¿Cómo voy este mes y qué debería mirar primero?`
- respuesta dominante: estado del mes con valor principal y recomendación corta
- detalle opcional: métricas, burn rate, señales conductuales, pendientes, compromisos y tabla de deudas

### Transacciones

- pregunta principal: `¿Qué fue lo último que pasó y necesito revisar?`
- respuesta dominante: última transacción visible con monto, fecha, estado y categoría
- detalle opcional: búsqueda, filtros rápidos, chips aplicados y resumen del período

### Deudas

- pregunta principal: `¿Cuánta presión de deuda tengo hoy?`
- respuesta dominante: saldo total activo y pago mensual agregado
- detalle opcional: búsqueda, filtros y resumen expandido

### Recurrentes

- pregunta principal cambia según la vista:
  - ingresos: `¿Con qué ingresos espero contar este mes?`
  - obligaciones: `¿Cuánto pesa mi operación fija todos los meses?`
- respuesta dominante: total y conteo principal de la vista activa
- detalle opcional: búsqueda, filtros y resumen expandido

### Presupuestos

- pregunta principal: `¿El mes va dentro del plan o ya se salió de rango?`
- respuesta dominante: cantidad de categorías fuera de rango y mayor riesgo actual
- detalle opcional: búsqueda, filtros y tabla completa para inspección

## Regla para cambios futuros

Antes de añadir un bloque nuevo en una página financiera, responder:

1. ¿qué pregunta principal responde esta pantalla?
2. ¿este bloque ayuda a responderla en los primeros 5 segundos?
3. si no, ¿puede vivir detrás de un reveal, scroll o sheet?

Si la respuesta a la segunda pregunta es `no`, no debe ir en la parte superior de la pantalla.
