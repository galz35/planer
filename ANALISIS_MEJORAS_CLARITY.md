# Análisis de Mejoras y Diseño Técnico de Arquitectura

## 1. Estado Actual de Bloqueos 🚫
**Situación:** El usuario reportó que el botón "Reportar Impedimento" no funcionaba.
**Diagnóstico Realizado:** Se detectó que, tras la migración a la arquitectura limpia (`TasksService`), el endpoint `POST /bloqueos` no estaba expuesto en el `ClarityController`, aunque el frontend intentaba consumirlo.
**Solución Aplicada (Hotfix):** Se implementaron los endpoints faltantes (`crearBloqueo`, `resolverBloqueo`) y se reconectó la lógica al repositorio SQL.
**Estado:** ✅ **Corregido**. Debería funcionar correctamente tras el último despliegue.

---

## 2. Jerarquía de Tareas (Padre/Hijo) y Fases 🏗️

### Análisis
Actualmente, el sistema maneja tareas planas asociadas a un Proyecto. Introducir jerarquía ("Subtareas") cambia fundamentalmente cómo se visualizan las tareas en la "Agenda".

**El Reto:** Si una tarea "Implementar Login" (Padre) tiene subtareas "Diseñar UI" y "Crear API", y ambas se muestran en la agenda del desarrollador, se genera duplicidad o ruido visual.

### Recomendación de Diseño
No mezclar el concepto de "Agrupador Lógico" (Fases) con "Dependencia Jerárquica" (Subtareas).

#### Opción A: Modelo de Fases (Recomendado para Planificación Macro) 🌟
En lugar de tareas Padre/Hijo complejas, utilizar **Fases** como contenedores de alto nivel dentro de un proyecto.
*   **Estructura:** Proyecto -> Fases (Hitos) -> Tareas.
*   **Comportamiento:** Las "Fases" no son ejecutables, son etiquetas de agrupación de tiempo (ej: "Fase 1: Enero", "Fase 2: Febrero").
*   **Ventaja:** No rompe la lógica de "Mi Día". Las tareas siguen siendo la unidad ejecutable.
*   **Base de Datos:** Tabla `p_Fases` (id, nombre, idProyecto). Tareas tienen `idFase`.

#### Opción B: Tareas Contenedoras (Lo que sugieres como "Categoría Padre")
Si se prefiere una jerarquía estricta de tareas:
*   Agregar columna `idPadre` (FK a `p_Tareas`) y `esContenedor` (Bit).
*   **Logica "Mi Agenda":** Modificar `clarity.repo.ts` -> `getMisTareas` para excluir tareas donde `esContenedor = 1`.
    *   `WHERE ... AND (t.esContenedor = 0 OR t.esContenedor IS NULL)`
*   **Visualización:** En la vista de Proyecto, mostrar árbol. En la vista de Agenda, solo hojas.

**Veredicto:** Recomiendo **Opción A (Fases)** si el objetivo es organizar tiempos (Fase 1, 2). Recomiendo **Opción B** solo si se necesita desglose granular infinito (Sub-sub-tareas). Para mantener la simplicidad de Clarity, **Fases** suele ser más limpio.

---

## 3. Asignación Múltiple e Individualidad 👥

### Análisis
El usuario solicita: *"1 tarea puede asignarle mas de 1 persona y cada uno lleve su tarea por separado... ver quien termino y quien no"*.

**Modelo Actual:**
Una tarea tiene múltiples asignados en `p_TareaAsignados`, pero **un solo estado** en `p_Tareas`.
*   Si Juan la marca "Hecha", se marca para todos.
*   Esto **NO CUMPLE** con el requerimiento de "cada uno lleve su tarea".

### Estrategia Recomendada: "Task Forking" (Ramificación de Tareas) 🚀
Cuando se asigna una tarea a varias personas con la intención de que *cada uno* la haga (ej: "Enviar reporte de gastos"), no es una tarea compartida, son N tareas idénticas.

**Diseño Propuesto:**
1.  Al crear tarea y seleccionar múltiples responsables:
    *   El Backend detecta >1 responsable.
    *   **Acción:** Crea **N copias** de la tarea, una para cada usuario.
    *   **Vinculación:** Usar un campo `idSincronizacion` o `guidOrigen` para saber que nacieron juntas (útil para reportes), o simplemente dejarlas independientes.
2.  **Ventaja:**
    *   Juan termina su tarea, María sigue pendiente.
    *   Reportes de "Quién terminó" son queries simples agrupando por `titulos` similares o ese ID de agrupación.
    *   No requiere refactorizar el motor de estados de la base de datos (que asume 1 tarea = 1 estado).

**Qué NO hacer:**
*   Intentar mover el campo `estado` a la tabla intermedia `p_TareaAsignados`. Esto requeriría reescribir TODO el backend, reportes, vistas y lógica de negocio. Es demasiado costoso y arriesgado.

---

## 4. Gestión de Tareas (Pasado/Futuro) 📅
**Requerimiento:** "Poder grabar tarea dia anterior y tarea a futuro".
**Estado Actual:**
*   `fechaObjetivo` ya controla esto.
*   Si `fechaObjetivo` < Hoy -> Es atrasada (Pasado).
*   Si `fechaObjetivo` > Hoy -> Es Futuro.
**Mejora UX:**
*   En la creación rápida, permitir seleccionar fecha explícita (ya sea un datepicker o lenguaje natural "mañana", "ayer").
*   Asegurar que el filtro "Mi Día" incluya tareas creadas con fecha de ayer (Retroactivas) para que el usuario pueda hacer check-in de cosas que olvidó registrar.

---

## 5. Evidencias y SharePoint 🔗
**Mejora:** Agregar campo `urlExterno` o `linkEvidencia` a nivel de Tarea (no solo Check-in).
**Implementación:**
*   `ALTER TABLE p_Tareas ADD linkEvidencia NVARCHAR(MAX) NULL`.
*   Frontend: Input opcional con icono de clip/enlace.

---

## 6. Métricas y Metas 🎯
**Idea:** "Poner metrica y meta a la tarea".
**Análisis:** Esto transforma una tarea binaria (Hecha/No) en una tarea cuantitativa.
**Diseño:**
*   Agregar campos: `metaCantidad` (Int/Float) y `progresoCantidad` (Int/Float), `unidadMedida` (string: "llamadas", "informes").
*   **UX:** En lugar de checkbox, mostrar una barra de progreso manual "Llevo 3 de 5".
*   Cuando `progresoCantidad` >= `metaCantidad` -> Auto marcar `Hecha`.

---

## 7. Clonación de Planes (Proyectos) 🐑

### Requerimiento
"Clonar plan... mismo plan tiene para departamento masaya o leon solo cambia fecha".

### Diseño de la Función "Clonar Proyecto"
Esta es una función potente para escalabilidad.

**Algoritmo de Clonación:**
1.  **Input:** `idProyectoOrigen`, `fechaInicioNuevo`, `nombreNuevo`.
2.  **Cálculo de Desplazamiento (Delta):**
    *   `DeltaDias = fechaInicioNuevo - fechaInicioOriginal`.
3.  **Proceso Transaccional:**
    *   Crear Nuevo Proyecto.
    *   Leer todas las tareas del Origen.
    *   Para cada tarea:
        *   Crear copia en Nuevo Proyecto.
        *   **Ajuste de Fechas:**
            *   `NuevaFechaObjetivo = FechaObjetivoOriginal + DeltaDias`.
            *   `NuevaFechaInicio = FechaInicioOriginal + DeltaDias`.
            *   Mantener dependencias y orden.
        *   Limpiar estados (`estado` = Pendiente, `progreso` = 0).
        *   Limpiar asignaciones (opcionalmente reasignar al clonador o dejar vacío).

**Beneficio:** Permite crear "Plantillas de Proyectos" (ej: "Apertura de Sucursal") y replicarlas instántaneamente ajustando todo el cronograma automáticamente.

---

## Resumen de Prioridades Sugeridas

1.  **Jerarquía (Fases):** Implementar tabla de Fases para organizar mejor los proyectos grandes sin romper la lista de tareas.
2.  **Clonar Proyecto:** Alta ganancia de productividad para el usuario. Implementación puramente backend (nuevo endpoint).
3.  **Asignación Múltiple (Forking):** Implementar lógica en backend para dividir tarea en múltiples copias al crear.
4.  **Campos Extra:** Añadir Links y Métricas es trivial (cambios menores en BD y UI), se puede hacer en cualquier momento.
