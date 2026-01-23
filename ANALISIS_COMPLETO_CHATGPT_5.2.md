# 🩺 ANÁLISIS TÉCNICO EXHAUSTIVO: PROYECTO CLARITY (MOMENTUS)
> **Referencia para ChatGPT 5.2 / Claude 3.5 Sonnet**
> **Fecha:** 2026-01-23

---

## 1. 📂 VISIÓN DE LA ARQUITECTURA (SISTEMA DE GOBERNANZA)

Clarity no es un To-Do list. Es un **Sistema de Visibilidad Jerárquica**. El núcleo del sistema es un motor que decide qué datos puede ver cada usuario basándose en su posición en la empresa y permisos especiales.

### Stack Tecnológico
- **Frontend:** React (Vite) + TailwindCSS + Context API.
- **Backend:** NestJS (Node.js) con acceso directo a **SQL Server (T-SQL)**.
- **Base de Datos:** SQL Server (Migrado desde PostgreSQL para mayor escalabilidad corporativa).

---

## 2. 🗄️ ESTRUCTURA DE LA BASE DE DATOS (DETALLE TÉCNICO)
La base de datos utiliza un esquema relacional con lógica pesada en **Procedimientos Almacenados**.

### A. Tablas del Núcleo (Core)
| Tabla | Propósito | Columnas Clave |
| :--- | :--- | :--- |
| `p_Usuarios` | Empleados y su jerarquía | `idUsuario`, `carnet`, `jefeCarnet`, `idOrg` |
| `p_Proyectos` | Iniciativas estratégicas | `idProyecto`, `idNodoDuenio`, `enllavado`, `estado` |
| `p_Tareas` | Tareas atómicas | `idTarea`, `idProyecto`, `idCreador`, `porcentaje`, `esHito` |
| `p_Checkins` | Registro diario | `idCheckin`, `idUsuario`, `fecha`, `entregableTexto` |
| `p_Bloqueos` | Impedimentos | `idBloqueo`, `idUsuario` (origen), `motivo`, `estado` |
| `p_permiso_area` | ACL Jerárquico | `idorg_raiz`, `carnet_recibe` (Otorga visión de toda una rama) |

### B. Procedimientos Almacenados (Lógica de Servidor)
- **`sp_Tarea_Crear`**: Centraliza la inserción de tareas asegurando valores por defecto y auditoría.
- **`sp_Checkin_Crear`**: Realiza un **UPSERT** (Merge); si el usuario ya hizo check-in hoy, actualiza el existente en lugar de duplicar.
- **`sp_Visibilidad_ObtenerCarnets`**: El más complejo. Usa una **CTE Recursiva** para calcular en milisegundos todos los carnet que un usuario puede ver (subordinados + permisos especiales + administrador).

---

## 3. ⚙️ BACKEND (LOGICA DE NEGOCIO DETALLADA)
El backend utiliza un patrón de **Inyección de Dependencias** (NestJS), pero separa la persistencia en archivos `.repo.ts`.

### A. Capa de Servicios (`src/clarity`)
1.  **`TasksService`**:
    - **Función:** Coorindador principal. Valida permisos usando `VisibilidadService` antes de llamar a los repos.
    - **Lógica de Avance:** Al llegar al 100%, cierra automáticamente la tarea (`fechaFinReal`).
    - **Workload:** Agrega todas las tareas de los subordinados para generar el heatmap de carga laboral.
2.  **`RecurrenciaService`**:
    - **Función:** Gestiona tareas que se repiten (Semanal/Mensual).
    - **Lógica:** No crea N tareas a futuro; mantiene una configuración y genera instacias bajo demanda para el "Mi Día".

### B. Capa de Repositorios (`*.repo.ts`)
- No usan ORM (TypeORM removido). Usan `ejecutarQuery` y `ejecutarSP` para máximo control sobre T-SQL.
- `clarity.repo.ts`: Consultas de tareas, check-ins y bloqueos.
- `planning.repo.ts`: Consultas de proyectos y estructura estratégica.

---

## 🖥️ 4. FRONTEND (ANÁLISIS POR PÁGINA Y COMPONENTES)

### A. Mi Agenda (`/app/hoy`)
**Archivo:** `src/pages/Hoy/MiDiaPage.tsx`
- **¿Qué usa?**
    - `MiDiaProvider`: Contexto que guarda la fecha seleccionada.
    - `<ExecutionView>`: Componente de lista densa para tachar tareas rápidamente.
    - `<CheckinWizard>`: Modal interactivo.
- **Lógica UX:** El sistema "arrastra" tareas no hechas de ayer al presente para asegurar que nada se pierda.

### B. Portafolio de Proyectos (`/app/planning/proyectos`)
**Archivo:** `src/pages/Planning/ProyectosPage.tsx`
- **Componentes:**
    - Filtros dinámicos: Se alimentan de `p_OrganizacionNodos` para filtrar por áreas reales de la empresa.
    - Tarjetas de Proyecto: Muestran progreso visual (píldoras de color por estado).
- **Lógica:** Implementa el estado `Borrador` vs `Confirmado`. Un proyecto confirmado está "enllavado" y requiere aprobación para cambios críticos.

### C. Plan de Trabajo (WBS) (`/app/planning/plan-trabajo`)
**Archivo:** `src/pages/Planning/PlanTrabajoPage.tsx`
- **Componentes:**
    - `TaskRow`: Componente atómico que representa una tarea o hito.
    - Indicadores de Hitos: Estrellas que marcan entregables clave.
- **Lógica:** Permite la asignación masiva de responsables y re-estimación de fechas.

### D. Mi Equipo (`/app/equipo/mi-equipo`)
**Archivo:** `src/pages/Equipo/MiEquipoPage.tsx`
- **Componentes:**
    - `<MemberCard>`: Resumen individual (Avance vs Retraso).
    - `<TeamStats>`: Agregados de desempeño grupal.
- **Lógica:** Cruza la lista de subordinados (visibilidad) con el contador de tareas pendientes de cada uno.

---

## 5. 🤖 GUÍA PARA LA IA (CHATGPT 5.2)

Al analizar o proponer código para este proyecto:

1.  **Dureza de Tipado:** Usa siempre las interfaces de `src/clarity/interfaces/schema.interfaces.ts`.
2.  **Visibilidad Primero:** Cualquier consulta nueva que involucre usuarios DEBE filtrar por la jerarquía. No basta con `WHERE idUsuario = @id`. Debe ser `WHERE idUsuario IN (SELECT id FROM Visibles)`.
3.  **T-SQL Puro:** No uses funciones específicas de NestJS/TypeORM para filtrar. Escribe el SQL pensando en rendimiento de índices.
4.  **Estado de Tareas:** Los estados son estrictos: `Pendiente`, `EnCurso`, `Hecha`, `Bloqueada`, `Descartada`. Cualquier transición debe quedar auditada en `p_Auditoria`.
5.  **Audit Logs:** Todas las acciones de escritura (`Patch`, `Post`, `Delete`) deben llamar a `auditService.log`.
