# 🧠 ANÁLISIS TÉCNICO PROFUNDO: PROYECTO CLARITY (PLANIFICACIÓN)
> **Versión 2.0 - Documento Maestro para Modelos de IA (GPT-5/Claude 3.5)**
> **Objetivo:** Proporcionar un contexto omnisciente del sistema para permitir refactorización masiva, migración de base de datos y análisis de reglas de negocio complejas sin alucinaciones.

---

## 1. 🧬 ADN DEL PROYECTO
**Clarity** no es un gestor de tareas convencional. Es un **Sistema de Gobernanza Corporativa Jerárquica**.
*   **Axioma Central:** "La visibilidad de la información es descendente y recursiva". Un usuario no ve tareas; ve **personas** y las tareas de esas personas, *si y solo si* tiene autoridad sobre ellas según el organigrama.
*   **Stack:** Monorepo híbrido. Backend en NestJS (API REST) y Frontend en React (SPA/PWA) con Vite.
*   **Estado Actual:** Producción en MVP avanzado. Base de datos PostgreSQL con lógica de grafos (CTEs).

---

## 2. 🏛️ ESTRUCTURA Y ARQUITECTURA DETALLADA

### 2.1 Backend (`/backend`) - NestJS
El backend está organizado por "Dominios" en `src/`:

| Dominio | Carpeta | Responsabilidad | Archivo Crítico |
| :--- | :--- | :--- | :--- |
| **Acceso** | `src/acceso` | **El Núcleo.** Calcula quién ve a quién. Lógica de seguridad. | `visibilidad.service.ts` 🔴 |
| **Auth** | `src/auth` | Login (JWT), Guardado de Sesión, Definición de Entidades de Usuario. | `auth.service.ts` |
| **Clarity** | `src/clarity` | **Operación Diaria.** Tareas, Bloqueos, Check-ins, Auditoría. | `tasks.service.ts` 🟠 |
| **Planning** | `src/planning` | **Estrategia.** Proyectos, Planes Mensuales, Analytics. | `planning.service.ts`, `analytics.service.ts` |
| **Common** | `src/common` | Utilidades, Auditoría Centralizada, Middlewares. | `audit.service.ts` |

### 2.2 Frontend (`/clarity-pwa`) - React
Estructura de rutas basada en roles (`App.tsx`):

| Ruta Base | Módulo | Componente Clave | Público Objetivo |
| :--- | :--- | :--- | :--- |
| `/app/hoy` | **Mi Día** | `MiDiaPage` | Operativos (Vista 360 de su trabajo). |
| `/app/equipo` | **Liderazgo** | `ManagerDashboard` | Jefes (Vista de rendimiento de subordinados). |
| `/app/planning` | **Estrategia** | `ProyectosPage`, `PlanTrabajoPage` | Gerentes/PMO. |
| `/app/admin` | **Configuración** | `UsersPage`, `VisibilidadPage` | RRHH/Sistemas (Setup de jerarquía). |

---

## 3. 🛡️ SEGURIDAD Y VISIBILIDAD (EL "CEREBRO")
La lógica más compleja reside en **`src/acceso/visibilidad.service.ts`**.
Este servicio responde a la pregunta: *"¿Puede el Usuario A ver los datos del Usuario B?"*.

### Algoritmo de Visibilidad (PostgreSQL CTE)
1.  **Input:** `carnetSolicitante` (Usuario A).
2.  **Recursión (WITH RECURSIVE):**
    *   Encuentra a A.
    *   Encuentra a todos cuyo `jefeCarnet` sea A.
    *   Encuentra a los subordinados de esos subordinados (N niveles).
    *   Aplica delegaciones temporales (`p_delegacion_visibilidad`).
3.  **Permisos de Nodo:**
    *   Verifica si A tiene permiso sobre el nodo organizacional de B (Tabla `p_permiso_area`).
4.  **Exclusiones:**
    *   Resta cualquier usuario explícitamente bloqueado (`p_permiso_empleado` con `DENY`).
5.  **Output:** Array de `carnets` visibles.

> **⚠️ RIESGO:** Esta lógica usa sintaxis exclusiva de PostgreSQL (`::text`, `ANY($1)`, `RECURSIVE`). Romperá si se migra a SQL Server sin reescritura.

---

## 4. 📊 DICCIONARIO DE DATOS (ENTIDADES PRINCIPALES)

### Usuarios (`Usuario`, `p_Usuarios`)
*   Tabla maestra. Contiene `carnet`, `rolGlobal`, `idOrg` (nodo), `jefeCarnet`.
*   Es la única fuente de verdad para la jerarquía.

### Tareas (`Tarea`, `p_Tareas`)
*   Unidad atómica de trabajo.
*   Campos Clave:
    *   `idAsignado`: Quién la hace.
    *   `idResponsable`: Quién responde por ella (puede ser distinto).
    *   `idPlan`: Vinculación al Plan Mensual.
    *   `idProyecto`: Vinculación a Proyecto Estratégico.
    *   `estado`: `Pendiente` -> `EnCurso` -> `Hecha` / `Bloqueada`.

### Planes (`PlanTrabajo`)
*   Agrupador mensual de tareas. "Contrato" de un usuario con su jefe para el mes.
*   Estados: `Borrador`, `Confirmado` (Jefe validó), `Cerrado`.

### Proyectos (`Proyecto`)
*   Entidad macro. Puede ser `Estrategico` u `Operativo`.
*   Un proyecto tiene N Tareas.

---

## 5. 🔍 ANÁLISIS DE CÓDIGO Y LÓGICA DE NEGOCIO

### 5.1 `tasks.service.ts` (El Obrero)
*   Maneja la creación rápida de tareas y el flujo del día a día.
*   **Lógica "Mi Día":** Algoritmo que sugiere qué hacer hoy basándose en:
    1.  Urgencia (`fechaObjetivo` <= Hoy).
    2.  Estado (`EnCurso`).
    3.  Plan Mensual (Si pertenece al mes actual).
*   **Auditoría:** Cada cambio de estado inyecta un registro en `audit.service`.

### 5.2 `planning.service.ts` (El Estratega)
*   Gestiona el ciclo de vida de los proyectos.
*   **Regla de Oro:** Si un plan está confirmaod, las tareas no se pueden borrar sin una `SolicitudCambio`.
*   **Sistema de Aprobaciones:** Implementa un flujo donde el usuario solicita cambiar una fecha y el jefe aprueba/rechaza.

### 5.3 `analytics.service.ts` (El Analista)
*   Calcula KPIs para los Dashboards.
*   **Cuellos de Botella:** Identifica qué área tiene más tareas atrasadas.
*   **Adopción:** Calcula cuántos usuarios tienen "Plan Confirmado" este mes.

---

## 6. ⚠️ LISTA DE INCOMPATIBILIDADES: POSTGRESQL vs SQL SERVER
Para migrar a SQL Server, se deben refactorizar los siguientes patrones detectados en el código:

| Archivo Fuente | Patrón Postgres | Solución SQL Server | Gravedad |
| :--- | :--- | :--- | :--- |
| `visibilidad.service.ts` | `WITH RECURSIVE` | `WITH` (CTE Estándar) | ALTA 🔴 |
| `visibilidad.service.ts` | `$1::text` (Casting) | `CAST(@p1 AS VARCHAR)` | MEDIA 🟠 |
| `visibilidad.service.ts` | `= ANY($1)` (Arrays) | `IN (SELECT value FROM STRING_SPLIT(...))` | ALTA 🔴 |
| `analytics.service.ts` | Fechas `YYYY-MM-DD` string | `CAST` explícito a `DATE`/`DATETIME` | BAJA 🟡 |
| `*.service.ts` | `ilike` (Case Insensitive) | `LIKE` (SQL Server es CI por defecto) | BAJA 🟡 |
| `*.entity.ts` | `@Column({ type: 'jsonb' })` | `@Column({ type: 'nvarchar', length: 'MAX' })` | ALTA 🔴 |

---

## 7. 🗺️ MAPA DE CARACTERÍSTICAS PENDIENTES (ROADMAP)
Lo que el sistema *debería* hacer próximamente:
1.  **Inteligencia de Carga:** Alertar si se asigna tarea a alguien con >150% de carga.
2.  **Simulaciones:** "¿Qué pasa si muevo la fecha fin del proyecto?" (Impacto en cadena).
3.  **Migración de Driver:** Abstracción completa de la capa de datos para soportar SQL Server mediante un patrón de repositorio agnóstico.

---
**FIN DEL INFORME TÉCNICO**
Este documento debe ser utilizado como referencia absoluta al generar código o analizar bugs.
