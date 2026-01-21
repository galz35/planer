# 🧠 ANÁLISIS PROFUNDO DEL PROYECTO: CLARITY / PLANIFICACIÓN
> **Documento Maestro de Contexto para Modelos de IA (ChatGPT 5.2 / Claude 3.5)**
> **Objetivo:** Proporcionar una radiografía técnica, funcional y arquitectónica del sistema para facilitar refactorización, migración y análisis de lógica compleja.

---

## 1. 🌟 VISIÓN Y FILOSOFÍA DEL PROYECTO
**Nombre:** Clarity PWA (Sistema de Planificación Estratégica y Operativa)
**Propósito:** No es solo un gestor de tareas. Es un sistema de **Gobernanza Corporativa** basado en jerarquía estricta.
*   **Core Idea:** La visibilidad de la información depende estrictamente del organigrama ("Quién es jefe de quién").
*   **Problema que resuelve:** En organizaciones grandes, un gerente necesita ver el rendimiento consolidado de sus N niveles de descendencia, mientras que un operario solo ve sus tareas.
*   **Diferenciador:** Motor de Visibilidad Recursiva en tiempo real (PostgreSQL CTE).

---

## 2. 🏗️ ARQUITECTURA TÉCNICA (STACK ACTUAL)

### Backend (`/backend`)
*   **Framework:** NestJS (Node.js).
*   **Lenguaje:** TypeScript.
*   **ORM:** TypeORM.
*   **Base de Datos Actual:** PostgreSQL (Uso intensivo de JSONB y CTEs Recursivos).
*   **Autenticación:** JWT + Passport + Guardias Personalizados.

### Frontend (`/clarity-pwa`)
*   **Framework:** React (Vite).
*   **Estado:** Hooks personalizados + Context API.
*   **UI:** TailwindCSS + Shadcn/UI (Estética "Glassmorphism" y modo oscuro).
*   **Navegación:** Dinámica basada en JSON recibido del backend (`MenuBuilder`).

---

## 3. 🛡️ NÚCLEO CRÍTICO: MÓDULO DE ACCESO Y SEGURIDAD
Este es el componente más complejo del sistema. Si esto falla, se rompe la confidencialidad.

### Archivos Clave:
1.  **`src/acceso/visibilidad.service.ts` (CRÍTICO 🔴)**
    *   **Qué hace:** Ejecuta una consulta SQL nativa (`WITH RECURSIVE`) para calcular el árbol de empleados que un usuario puede ver.
    *   **Lógica:** Usuario -> Jefe Directo -> Recursión -> Permisos de Área -> Exclusiones (DENY).
    *   **Dependencia PostgreSQL:** Alta (Sintaxis `RECURSIVE`, `::text`, `ANY($1::text[])`).
2.  **`src/acceso/visibilidad.guard.ts`**
    *   **Qué hace:** Interceptor que protege cada ruta. Verifica `visibilidadService.puedeVer(usuarioLogueado, usuarioObjetivo)`.
3.  **`src/auth/auth.service.ts`**
    *   **Qué hace:** Login y generación de JWT. Decide el "Perfil" (Admin, Líder, Empleado) para renderizar el menú.

---

## 4. ⚠️ ANÁLISIS DE MIGRACIÓN: POSTGRESQL VS SQL SERVER
El sistema usa TypeORM, pero ciertas consultas se hicieron en SQL Nativo por rendimiento. Estos son los puntos de dolor para una migración:

| Archivo | Funcionalidad | Postgres (Código Actual) | SQL Server (Incompatible) |
| :--- | :--- | :--- | :--- |
| **`visibilidad.service.ts`** | Jerarquía de Empleados | `WITH RECURSIVE cte AS (...)` | `WITH cte AS (...)` (Sin RECURSIVE) |
| **`visibilidad.service.ts`** | Casting de Tipos | `$1::text` | `CAST(@p1 AS VARCHAR)` |
| **`visibilidad.service.ts`** | Filtrado Masivo de Arrays | `= ANY($1::text[])` | Requiere `Table-Valued Parameters` o `STRING_SPLIT` |
| **`tasks.service.ts`** | Búsqueda JSON | `data->>'campo'` (JSONB) | `JSON_VALUE(data, '$.campo')` |
| **`reports.service.ts`** | Fechas | `CURRENT_DATE`, `NOW()` | `GETDATE()` |
| **Todo el Backend** | Identificadores de Tabla | `"MiTabla"` (Comillas dobles) | `[MiTabla]` (Corchetes) |

> **Estrategia sugerida:** Crear una interfaz `IVisibilidadQueries` e implementar `PostgresVisibilidadQueries` y `SqlServerVisibilidadQueries` por separado.

---

## 5. 📂 ESTRUCTURA DETALLADA DEL BACKEND Y FUNCIONALIDAD

### `/src/clarity` (Gestión Operativa)
*   **`tasks.service.ts`**:
    *   *Qué hace:* CRUD de tareas, asignaciones.
    *   *Complejidad:* Filtra tareas que "debería ver" un usuario basándose en si es dueño, responsable, o jefe del dueño.
*   **`governance.service.ts`**:
    *   *Qué hace:* Reglas de negocio. ¿Puede X editar la tarea de Y?
*   **`reports.service.ts`**:
    *   *Qué hace:* Genera estadísticas para los dashboards. Usa agregaciones SQL (`COUNT`, `GROUP BY`) que pueden requerir ajuste en SQL Server.

### `/src/planning` (Estrategia)
*   **`planning.controller.ts`**: Endpoints para Planes, Proyectos y Hitos.
*   **`analytics.service.ts`**: Dashboard Gerencial. Calcula KPIs globales.

---

## 6. 🖥️ ESTRUCTURA DETALLADA DEL FRONTEND Y PÁGINAS

### Sistema de Rutas y Menú
*   **`MenuBuilder.tsx`**: Recibe un JSON del backend y construye el sidebar dinámicamente. No hay rutas "hardcoded" visibles para quien no tiene permisos.

### Páginas Principales (`src/pages`)
1.  **`ManagerDashboard.tsx` (`/dashboard`)**
    *   *Target:* Jefes y Gerentes.
    *   *Qué hace:* Gráficos de pastel y barras con el estado de tareas de *todo* el equipo descendente.
    *   *Hook Clave:* `useDashboardData` (consume endpoints de analytics).
2.  **`Equipo/ManagerDashboard.tsx` (Vista de Equipo)**
    *   *Target:* Líderes de equipo.
    *   *Qué hace:* Tabla detallada de subordinados, carga de trabajo y bloqueos.
3.  **`Planning/Proyectos.tsx`**
    *   *Target:* PMO y Planificadores.
    *   *Qué hace:* Vista tipo Gantt/Lista de proyectos estratégicos.
4.  **`Operacion/MisTareas.tsx`**
    *   *Target:* Usuario final.
    *   *Qué hace:* Kanban o Lista de tareas propias.
5.  **`Admin/UsersPage.tsx`**
    *   *Target:* RRHH / Admin IT.
    *   *Qué hace:* Gestión de usuarios, reseteo de claves y asignar jefes (modificar jerarquía).

---

## 7. 🚀 PLAN DE TRABAJO E IMPLEMENTACIÓN

### Fase 1: Estabilización y Optimización (ACTUAL)
*   [x] Optimizar Query Recursivo de Visibilidad (Hecho: uso de `UNION ALL` y `NOT EXISTS`).
*   [ ] Estandarizar respuestas de API.
*   [ ] Limpiar "ruido" en logs de consola.

### Fase 2: Robustez Multi-Motor (Preparación Migración)
*   [ ] Abstraer consultas SQL nativas a archivos de constantes separados por driver (`sql-server.queries.ts`, `postgres.queries.ts`).
*   [ ] Eliminar dependencias de funciones de fecha nativas en lógica de negocio (usar `date-fns` o `moment` en JS antes de guardar).

### Fase 3: Inteligencia de Negocio
*   [ ] Implementar "Inteligencia Interna": El sistema debe sugerir qué empleado está sobrecargado basándose en la data histórica de `tasks.service.ts`.

---

## 🤖 INSTRUCCIONES PARA LA IA ANALISTA
1.  **Al analizar código:** Asume siempre que la base de datos es PostgreSQL, pero **alerta** si el código sugerido usa funciones exclusivas que romperían una migración a SQL Server.
2.  **Al modificar `VisibilidadService`:** Ten extremo cuidado. Es un castillo de naipes recursivo. Un error aquí deja ciego a un Gerente o expone datos a un Junior.
3.  **Prioridad:** El rendimiento de lectura es más importante que el de escritura. Los dashboards cargan mucha data agregada.
