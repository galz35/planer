# Auditoría de Deuda Técnica y Estabilidad

Este documento detalla la deuda técnica identificada en el proyecto `Clarity`, clasificándola por severidad y ofreciendo una estrategia de remediación. También aborda el análisis de riesgos de bloqueo (Deadlocks).

---

## 🔒 1. Análisis de Deadlocks (Bloqueos)
**Preocupación:** El uso de `UPDLOCK` en el recálculo podría generar bloqueos fatales si se combina con actualizaciones concurrentes.

**Evaluación:**
*   **Arquitectura Actual:** Las operaciones de "Actualizar Tarea" y "Recalcular Jerarquía" ocurren en **transacciones secuenciales separadas**.
    1.  T1: `UPDATE p_Tareas` (Se ejecuta y libera locks inmediatamente).
    2.  T2: `EXEC sp_Recalcular` (Se ejecuta después, toma locks breves y confirma).
*   **Conclusión:** El riesgo de Deadlock entre Actualización y Recálculo es **NULO** por diseño (no se solapan).
*   **Riesgo Residual:** Existe una ventana de milisegundos entre T1 y T2 donde el padre podría "parpadear" con datos viejos, pero el T2 corregirá esto inevitablemente (`Eventual Consistency`). Es el compromiso correcto para evitar bloqueos totales del sistema.

---

## 🏚️ 2. Deuda Técnica Identificada

### A. Código Duplicado (Mantenibilidad) - 🔴 ALTA
Existen múltiples repositorios haciendo lo mismo con ligeras variaciones.
*   **`clarity.repo.ts` vs `planning.repo.ts` vs `tasks.repo.ts`**.
*   **Hallazgo:** `clarity.repo.ts` contiene una función `crearTarea` (líneas 11-60) que es casi idéntica a la versión deprecada de `planning.repo.ts`. Ambas deberían morir en favor de `tasks.repo.ts`.
*   **Acción Recomendada:** Centralizar **todas** las operaciones de escritura en `tasks.repo.ts` y convertir los otros repos en "Solo Lectura" (Query Repos).

### B. Gestión de Transacciones (Robustez) - 🟠 MEDIA
*   **Hallazgo:** Los repositorios no aceptan un objeto `transaction` (`tx`) en sus métodos. Esto impide orquestar operaciones complejas (ej: "Crear Proyecto + Crear 5 Tareas") en una sola unidad atómica desde el Servicio.
*   **Acción Recomendada:** Refactorizar `ejecutarSP` y todos los métodos repo para aceptar un parámetro opcional `tx: sql.Transaction`.

### C. Strings Mágicos (Calidad) - 🟡 BAJA
*   **Hallazgo:** Uso extensivo de literales como `'Pendiente'`, `'Hecha'`, `'Responsable'` dispersos en el código TypeScript y SQL.
*   **Riesgo:** Un error de dedo (`'Hecho'` vs `'Hecha'`) puede romper el recálculo silenciosamente.
*   **Acción Recomendada:** Crear constantes globales o `Enums` en TS y una tabla de tipos en SQL.

### D. Paso de Parámetros Ineficiente (Performance) - 🟡 BAJA
*   **Hallazgo:** Métodos como `obtenerEquipoHoy` en `clarity.repo.ts` construyen grandes strings CSV (`val1,val2,val3`) para pasar listas de IDs a SQL.
*   **Riesgo:** Lento y consume memoria si la lista crece (ej. 5000 empleados).
*   **Acción Recomendada:** Usar **Table-Valued Parameters (TVP)**, como ya se hace correctamente en `checkinUpsert`.

---

## 3. Plan de Saneamiento (Roadmap)

1.  **Fase 1 (Inmediata):** Eliminar código muerto en `clarity.repo.ts` (`crearTarea`) para evitar confusión.
2.  **Fase 2 (Corto Plazo):** Unificar `actualizarTarea` totalmente en `tasks.repo.ts` y borrar las copias en `planning` y `clarity`.
3.  **Fase 3 (Mediano Plazo):** Refactorizar para uso de Transacciones (`tx`) y TVPs.

---

**Estatus General del Proyecto:**
El núcleo crítico (Jerarquías) está sano y blindado. La deuda técnica reside principalmente en las áreas periféricas y legadas que no han sido migradas al nuevo estándar.
