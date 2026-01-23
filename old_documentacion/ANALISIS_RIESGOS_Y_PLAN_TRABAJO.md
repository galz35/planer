# Análisis de Riesgos y Plan de Trabajo Seguro 🛡️

Este documento detalla los puntos críticos del sistema actual y establece el protocolo de seguridad para implementar las mejoras (Fases, Asignación Múltiple, Clonación) sin desestabilizar la operación ("Mi Día").

---

## 1. Mapa de Riesgos Críticos ⚠️
*¿Qué se puede dañar si no tenemos cuidado?*

### A. El Motor de "Mi Día" (RIESGO ALTO) 🔥
**Componente:** `clarity.repo.ts` -> `obtenerMisTareas` y `miDiaGet`.
**Por qué es frágil:** Esta consulta alimenta la pantalla principal. Cualquier cambio que introduzca duplicidad de tareas (ej. tareas padre/hijo mal hechas o copias de forking sin filtrar) **hará inservible la agenda diaria**.
**Impacto:** El usuario ve tareas repetidas o no ve lo que debe hacer hoy. El sistema pierde su propósito.

### B. Reportes de Equipo y Check-ins (RIESGO MEDIO) 📊
**Componente:** `clarity.repo.ts` -> `obtenerEquipoHoy`.
**Por qué es frágil:** Calcula estadísticas (hechas/pendientes) en tiempo real sumando filas.
**Riesgo:** Si implementamos el "Forking" (copias de tareas para múltiples usuarios), el conteo total de tareas del proyecto se multiplicará artificialmente.
*Ejemplo:* 1 Tarea asignada a 3 personas = 3 registros. Si el reporte cuenta "Total Tareas Proyecto", dirá 3 en lugar de 1, falseando la métrica de carga de trabajo.

### C. Integridad de la Base de Datos (RIESGO MEDIO) 💾
**Componente:** Tablas `p_Tareas`, `p_TareaAsignados`.
**Riesgo:** Al hacer la migración de datos (si fuera necesaria) o cambiar tipos de columnas, podríamos perder el historial de quién hizo qué.
**Impacto:** Pérdida de trazabilidad y auditoría.

---

## 2. Estrategia de Protección 🛡️

Para mitigar los riesgos identificados, seguiremos estas reglas estrictas:

### Regla 1: "La Tarea es la Unidad Atómica"
No modificaremos la estructura fundamental de `p_Tareas` para que signifique cosas diferentes (no mezclaremos "Tareas Reales" con "Tareas Contenedoras/Padres").
*   **Solución:** Usaremos la tabla satélite `p_Fases` para agrupar. Así, `p_Tareas` siempre contiene cosas ejecutables. Esto protege el **Riesgo A**.

### Regla 2: "Forking Transparente, Reportes Inteligentes"
Para la asignación múltiple (copias):
*   Marcaremos estas copias con un `guidAsignacion`.
*   **Defensa (Reportes):** Los reportes de conteo simple (cantidad de tareas) deberán actualizarse para contar `DISTINCT guidAsignacion` si se quiere saber "cuántos entregables únicos" hay, o contar `idTarea` si se quiere saber "cuánto esfuerzo humano" hay. Documentaremos esto claramente.

### Regla 3: "Migraciones No Destructivas"
Todos los cambios de SQL serán:
1.  `ADD COLUMN` (Agregar columnas, nunca borrar ni renombrar existentes).
2.  `CREATE TABLE` (Nuevas tablas).
3.  Nunca `ALTER COLUMN` que cambie tipos de datos con riesgo de truncado.

---

## 3. Plan de Trabajo Detallado (Paso a Paso) 📅

### FASE 1: Implementación de Fases (Hitos) - [PRIORIDAD 1]
*Objetivo: Organizar proyectos sin tocar la agenda diaria.*

1.  **Backup:** (Responsabilidad del DBA/Usuario, pero recordatorio indispensable).
2.  **Backend - SQL:**
    *   Ejecutar script de creación tabla `p_Fases`.
    *   Ejecutar script `ALTER TABLE p_Tareas ADD idFase INT`.
3.  **Backend - Código:**
    *   Actualizar `clarity.repo.ts` -> `crearTarea`: Aceptar `idFase`.
    *   Crear endpoints CRUD para Fases en `ClarityController`.
4.  **Frontend - UI Proyecto:**
    *   Modificar vista `ProjectDetail`.
    *   **Punto de Control:** Verificar que las tareas viejas (sin fase) siguen apareciendo en una sección "General".
5.  **Frontend - UI Nueva Tarea:**
    *   Agregar selector de Fase (opcional) en el modal de creación.
6.  **Validación de Riesgo:** Ir a `/app/hoy` y verificar que la agenda SIGUE IGUAL. Si cambió algo, revertir.

### FASE 2: Asignación Múltiple (Forking) - [PRIORIDAD 2]
*Objetivo: Que cada usuario tenga su propia tarea.*

1.  **Backend - SQL:**
    *   Ejecutar `ALTER TABLE p_Tareas ADD guidAsignacion UNIQUEIDENTIFIER`.
2.  **Backend - Lógica (Complejo):**
    *   Modificar `TasksService.tareaCrearRapida` y `crearTarea` completo.
    *   **Lógica:** Si `dto.asignados.length > 1`:
        *   Bucle `for` para insertar N tareas.
        *   Generar `guid` común.
3.  **Frontend:**
    *   Cambiar selector de usuarios para permitir selección múltiple (Checkboxes o Multi-Select).
4.  **Validación de Riesgo:**
    *   Crear tarea para Juan y Pedro.
    *   Entrar como Juan -> Ver tarea -> Marcar Hecha.
    *   Entrar como Pedro -> Ver tarea -> Confirmar que sigue Pendiente.

### FASE 3: Clonación de Proyectos - [PRIORIDAD 3]
*Objetivo: Productividad masiva.*

1.  **Backend - Servicio Nuevo:**
    *   Crear `PlanningService.clonarProyecto(idOrigen, nuevaFecha)`.
    *   Implementar algoritmo de lectura -> cálculo delta -> escritura masiva.
2.  **Frontend:**
    *   Botón "Clonar" en la lista de proyectos.
3.  **Validación:**
    *   Clonar un proyecto del año pasado.
    *   Verificar que las nuevas fechas son futuras y coherentes (ej: mantienen la distancia de 3 días entre tareas).

---

## 4. Resumen para el Usuario
Si seguimos este orden, **el sistema actual NO se dañará**.
*   Las Fases son solo una *etiqueta* adicional; si algo falla, simplemente no se ven las fases, pero las tareas ahí están.
*   El Forking crea tareas estándar; para el sistema "viejo" son solo tareas normales. Es 100% compatible hacia atrás.

**Recomendación:** Autorizar inicio de **Fase 1**.
