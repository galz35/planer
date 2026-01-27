# INVENTARIO TÉCNICO: CONSULTAS Y PROCEDIMIENTOS BACKEND

Este documento cataloga todas las interacciones de base de datos utilizadas en el núcleo de Clarity.

## 📦 1. Módulo: Tareas (tasks.repo.ts)
*El núcleo de la gestión operativa.*

| Método TS | Objeto SQL | Tipo | Propósito |
|:---|:---|:---|:---|
| `crearTarea` | `sp_Tarea_CrearCompleta_v2` | **SP** | Crea tarea + asignaciones + validación jerarquía (Atómico). |
| `actualizarTarea` | `sp_ActualizarTarea` | **SP** | Actualiza campos básicos (vía `planning.repo`). |
| `recalcularJerarquia` | `sp_Tarea_RecalcularJerarquia_v2` | **SP** | **CRÍTICO.** Recalcula promedios y estados recursivamente hacia arriba. |
| `asignarUsuario` | `INSERT INTO p_TareaAsignados` | Query | Asigna responsable a tarea. |
| `obtenerTarea` | `SELECT ... FROM p_Tareas` | Query | Lectura simple de tarea por ID. |

## 📅 2. Módulo: Planificación (planning.repo.ts)
*Gestión de Proyectos y Planes de Trabajo.*

| Método TS | Objeto SQL | Tipo | Propósito |
|:---|:---|:---|:---|
| `obtenerProyectosPorUsuario` | `sp_ObtenerProyectos` | **SP** | Proyectos donde usuario colabora. |
| `obtenerProyectosVisibles` | `sp_Proyecto_ObtenerVisibles` | **SP** | Proyectos según jerarquía y permisos. |
| `crearProyecto` | `INSERT INTO p_Proyectos` | Query | Creación básica de proyecto. |
| `actualizarDatosProyecto` | `UPDATE p_Proyectos` | Query | Edición de cabecera de proyecto. |
| `obtenerPlanes` | `sp_Planning_ObtenerPlanes` | **SP** | Obtiene plan mensual de usuario. |
| `upsertPlan` | `INSERT/UPDATE p_PlanesTrabajo` | Query | Guarda objetivos del mes. |
| `obtenerEquipoDirecto` | `SELECT ... FROM p_Usuarios` | Query | Obtiene subordinados directos. |
| `crearSolicitudCambio` | `INSERT INTO p_SolicitudesCambio` | Query | Registra petición de cambio (Workflow). |
| `resolverSolicitud` | `UPDATE p_SolicitudesCambio` | Query | Aprueba/Rechaza cambio. |
| `clonarTarea` | `sp_Tarea_Clonar` | **SP** | Duplica una tarea existente. |
| `obtenerTareasCriticas` | `SELECT ... JOIN p_TareaAsignados` | Query | Dashboard de alertas (Overdue). |

## 👥 3. Módulo: Claridad (clarity.repo.ts)
*Operaciones diarias, Dashboard y Check-ins.*

| Método TS | Objeto SQL | Tipo | Propósito |
|:---|:---|:---|:---|
| `crearTarea` | **ELIMINADO / DEPRECATED** | - | - |
| `asignarUsuarioTarea` | `sp_Tarea_AsignarResponsable` | **SP** | Asignación segura por Carnet. |
| `eliminarTarea` | `sp_Tarea_Eliminar` | **SP** | Soft-delete de tarea. |
| `getTareasUsuario` | `sp_Tareas_ObtenerPorUsuario` | **SP** | "Mis Tareas" (filtros varios). |
| `obtenerEquipoHoy` | `sp_Equipo_ObtenerHoy` | **SP** | Snapshot diario de equipo. |
| `checkinUpsert` | `sp_Checkin_Upsert_v2` | **SP** | Registro de Check-in diario + Tareas vinculadas. |
| `obtenerKpisDashboard` | `sp_Dashboard_Kpis` | **SP** | Métricas del Home para usuario/lider. |
| `bloquearTarea` | `sp_Tarea_Bloquear` | **SP** | Registra impedimento en tarea. |

## 🔑 4. Módulo: Acceso (acceso.repo.ts)
*Seguridad, Jerarquía y Permisos.*

| Método TS | Objeto SQL | Tipo | Propósito |
|:---|:---|:---|:---|
| `calcularCarnetsVisibles` | `sp_Visibilidad_ObtenerCarnets` | **SP** | Obtiene lista plana de a quién puedo ver. |
| `obtenerDetallesUsuarios` | `sp_Usuarios_ObtenerDetalles...` | **SP** | Obtiene info (rol, nombre) de múltiples carnets. |
| `obtenerDelegacionesActivas` | `sp_DelegacionVisibilidad_...` | **SP** | Permisos delegados temporalmente. |
| `obtenerMiEquipoPorCarnet` | `sp_Visibilidad_ObtenerMiEquipo` | **SP** | Arbol completo de equipo visible. |

---
**Resumen:** El backend depende fuertemente de ~25 Stored Procedures críticos para mantener la lógica de negocio fuera de la aplicación, lo cual es correcto para integridad.
