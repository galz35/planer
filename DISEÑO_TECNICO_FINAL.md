# Documento de Diseño Técnico Final: Plan Recomendado para Mejoras Clarity v2 🚀

## 1. Evaluación y Veredicto Técnico 👩‍💻
He analizado la propuesta consolidada (tu input + feedback externo) contrastándola con el código fuente real de tu proyecto (`backend/src/clarity/*`, `clarity-pwa/src/*`).

**Veredicto:** La propuesta es **EXCELENTE y 100% COMPATIBLE**.
Es técnicamente superior a cualquier intento de anidación compleja (subtareas infinitas) porque respeta la arquitectura "plana" y rápida de SQL Server que ya tienes implementada.

### ¿Por qué esta es la mejor opción para *TU* proyecto?
1.  **Modelo de Fases vs Jerarquía:** Tu sistema base (`p_Tareas`) está optimizado para consultas rápidas de "Mi Día". Introducir recursividad (padre->hijo->nieto) haría las consultas de agenda muy lentas y complejas. El modelo de **Fases (Agrupadores)** permite organizar visualmente sin tocar el motor de consultas de la agenda.
2.  **Task Forking (Asignación):** Intentar compartir una sola tarea con múltiples status requeriría una tabla `p_TareaEstadoUsuario` que no existe. Copiar la tarea (Forking) es la solución más pragmática: usa la estructura existente y resuelve el problema de negocio ("cada uno su avance") inmediatamente sin escribir miles de líneas de código nuevo.

---

## 2. Especificación Técnica de Implementación 🛠️

A continuación, presento el diseño detallado para ejecutar este plan.

### A. Módulo de Fases y Organización (Proyectos) 🏗️
Este cambio permite dividir proyectos grandes en etapas (ej: "Semana 1", "Implementación").

**Cambios en Base de Datos (SQL Server):**
```sql
-- Nueva Tabla: Agrupadores lógicos de tiempo/etapa
CREATE TABLE p_Fases (
    idFase INT IDENTITY(1,1) PRIMARY KEY,
    idProyecto INT NOT NULL, -- FK p_Proyectos
    nombre NVARCHAR(150) NOT NULL,
    orden INT DEFAULT 0,
    activo BIT DEFAULT 1,
    CONSTRAINT FK_Fases_Proyectos FOREIGN KEY (idProyecto) REFERENCES p_Proyectos(idProyecto)
);

-- Modificación Tabla Tareas
ALTER TABLE p_Tareas ADD idFase INT NULL;
ALTER TABLE p_Tareas ADD CONSTRAINT FK_Tareas_Fases FOREIGN KEY (idFase) REFERENCES p_Fases(idFase);

-- Índices para mantener velocidad
CREATE INDEX IX_Fases_Proyecto ON p_Fases(idProyecto, orden);
```

**Impacto en Frontend:**
- **Vista Proyecto (`ProjectDetail`):** Ahora debe agrupar las tareas visualmente por `idFase`. Tareas con `idFase = NULL` van a "General" o "Backlog".
- **Vista Agenda (`MiDiaPage`):** **CERO IMPACTO**. Las tareas se siguen listando igual, quizás mostrando un pequeño "badge" con el nombre de la fase si es relevante, pero la lógica de carga no cambia.

---

### B. Módulo de Asignación Múltiple (Task Forking) 👥
Permite asignar una tarea a 5 personas y que cada una tenga su copia independiente.

**Cambios en Base de Datos:**
Reutilizaremos la columna `idGrupo` que ya existe en `p_Tareas` (detectada en el código actual) o crearemos `guidGrupo` si `idGrupo` tiene otro uso legacy.
*Recomendación:* Crear `guidAsignacion` para evitar conflictos con lógica antigua.

```sql
ALTER TABLE p_Tareas ADD guidAsignacion UNIQUEIDENTIFIER NULL; -- Para vincular las copias
```

**Lógica de Negocio (Backend `TasksService`):**
Al recibir `crearTarea` con múltiples responsables:
1.  Generar un `NEWID()` (Guid).
2.  Iterar sobre la lista de responsables.
3.  Insertar una fila en `p_Tareas` por cada responsable, asignando el mismo `guidAsignacion`.
4.  **Resultado:** 5 tareas creadas. Si Juan completa la suya, las otras 4 siguen pendientes.

**Reportes:**
- "Ver avance global": `SELECT AVG(porcentaje) FROM p_Tareas WHERE guidAsignacion = '...'`

---

### C. Clonación de Proyectos (Plantillas) 🐑
La "Killer Feature" para productividad.

**Backend (`CloneService`):**
Endpoint: `POST /proyectos/:id/clonar`
Body: `{ fechaInicioNueva: '2026-06-01', nombre: 'Nuevo Proyecto' }`

**Algoritmo Delta-T (Desplazamiento Temporal):**
1.  Obtener `FechaInicioOriginal` del proyecto fuente.
2.  Calcular `Delta = FechaInicioNueva - FechaInicioOriginal` (en días).
3.  **Clonar:**
    *   Insertar Proyecto Nuevo.
    *   Insertar Fases Nuevas (mapeando IDs viejos -> nuevos).
    *   Insertar Tareas Nuevas:
        *   `NuevaFecha = ViejaFecha + Delta`
        *   `idFase = MapaFases[idFaseVieja]`
        *   `Estado` = 'Pendiente'
        *   `Progreso` = 0

---

### D. Métricas y Evidencias 🎯
Mejoras puntuales para enriquecer la tarea.

**Cambios en Base de Datos:**
```sql
ALTER TABLE p_Tareas ADD 
    linkEvidencia NVARCHAR(500) NULL,
    metaCantidad DECIMAL(18,2) NULL, -- Ej: 100 (llamadas)
    progresoCantidad DECIMAL(18,2) NULL, -- Ej: 50 (llevo 50)
    unidadMedida NVARCHAR(50) NULL; -- Ej: "Prospectos"
```

**Lógica UI:**
- Si `metaCantidad > 0`, reemplazar el Checkbox simple por una barra de progreso interactiva (slider o input numérico).
- Al llegar al 100% de la cantidad, marcar `estado = 'Hecha'` automáticamente.

---

## 3. Hoja de Ruta Sugerida (Roadmap) 🗺️

Para implementar esto sin detener la operación actual, sugiero este orden:

1.  **Semana 1: Fases (Estructura)** 🧱
    *   Crear tabla `p_Fases`.
    *   Ajustar endpoint `GET /proyectos/:id/tareas` para devolver estructura agrupada.
    *   Actualizar UI de Detalle de Proyecto.
    *   *Riesgo:* Bajo. Solo afecta visualización de proyectos.

2.  **Semana 2: Clonación (Productividad)** ⚡
    *   Crear endpoint de clonado en backend (lógica pura).
    *   Botón "Clonar" en UI.
    *   *Riesgo:* Nulo. Es creación de datos nuevos.

3.  **Semana 3: Asignación Múltiple (Forking)** 👯
    *   Modificar UI de creación de tareas para aceptar múltiples usuarios.
    *   Ajustar backend para el bucle de creación.
    *   *Riesgo:* Medio. Requiere pruebas para asegurar que las copias se crean bien.

4.  **Semana 4: Métricas y Links (Detalles)** 💎
    *   Agregar columnas y campos en el modal de tarea.
    *   *Riesgo:* Bajo.

## 4. Conclusión
El diseño propuesto es **sólido, escalable y seguro**. No requiere reescribir el núcleo del sistema ("Mi Día" / `Checkins`), lo cual es la mayor ventaja. Transforma a Clarity de un "To-Do List" a un gestor de proyectos serio sin perder su agilidad característica.

**Recomendación Inmediata:** Proceder con la **Fase 1 (Implementación de Fases)**.
