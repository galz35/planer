# Revisión frontend (diseño y mejoras por página)

## clarity-pwa/src/pages/LoginPage.tsx
- Diseño: layout 2 columnas (branding izquierda en desktop, formulario derecha), tarjeta con gradiente y estados de carga/errores.
- Accesibilidad: los `label` no están vinculados a `input` (no hay `htmlFor` ni `id`).

## clarity-pwa/src/pages/Hoy/MiDiaPage.tsx
- Diseño: barra superior móvil, controles de fecha, tabs con `NavLink`, KPIs y `Outlet` para vistas.
- La pestaña Matriz está comentada en el nav.

## clarity-pwa/src/pages/Hoy/views/ExecutionView.tsx
- Diseño: alterna entre vista de plan activo y formulario de check‑in; alerta si hay bloqueos.
- Error de guardado solo se comunica por toast.

## clarity-pwa/src/pages/Hoy/views/CalendarView.tsx
- Diseño: contenedor scrollable con `AgendaSemanal` y acciones completar/descartar con toast.

## clarity-pwa/src/pages/Hoy/views/TimelineView.tsx
- Diseño: contenedor scrollable con `AgendaTimeline` y acciones completar/descartar con toast.

## clarity-pwa/src/pages/Hoy/views/ExecutiveView.tsx
- Diseño: wrapper directo de `DashboardEjecutivo`.

## clarity-pwa/src/pages/Hoy/views/AlertsView.tsx
- Diseño: wrapper de `AlertasWidget` con actualización.

## clarity-pwa/src/pages/Hoy/views/BlockersView.tsx
- Diseño: wrapper de `BloqueosWidget` con actualización.

## clarity-pwa/src/pages/Hoy/views/MetricsView.tsx
- Diseño: wrapper de `MetricasWidget`.

## clarity-pwa/src/pages/Hoy/views/TeamView.tsx
- Diseño: wrapper de `EquipoWidget`.

## clarity-pwa/src/pages/Hoy/views/VisibilidadView.tsx
- Diseño: resumen de seguridad, tarjetas de “quién puede ver” y delegaciones, preview con grid.
- El carnet se deriva de `idUsuario` (`user?.idUsuario?.toString()`), con comentario de suposición en el código.

## clarity-pwa/src/pages/Hoy/views/MatrixView.tsx
- Diseño: matriz Eisenhower con quick move y quick add.
- La ruta está comentada en App; no hay acceso desde navegación.

## clarity-pwa/src/pages/Pendientes/PendientesPage.tsx
- Diseño: creación rápida, filtros (búsqueda/proyecto/prioridad), tabla con menú contextual y paginación.
- Menú contextual se posiciona con `window.innerWidth` y no se recalcula en resize/scroll.

## clarity-pwa/src/pages/Archive/ArchivePage.tsx
- Diseño: tabla histórica con buscador, badge de estado, acción “Reutilizar” y modal de clonación.
- `CloneModal` envía `idProyecto: task.idProyecto || 0` cuando no existe proyecto.

## clarity-pwa/src/pages/Planning/ProyectosPage.tsx
- Diseño: listado con filtros por estado/gerencia/subgerencia/área, paginación y modal de creación/edición.
- Si la API principal devuelve 0 y no hay filtros, usa `planningService.getMyProjects()` como fallback.

## clarity-pwa/src/pages/Planning/PlanTrabajoPage.tsx
- Diseño: vistas list/board/gantt/roadmap, modales de creación/aprobación y asignación rápida.
- `LockedField` muestra campos bloqueados con botón de solicitud; no hay resumen en esta vista de solicitudes pendientes.

## clarity-pwa/src/pages/Planning/TimelinePage.tsx
- Diseño: Gantt con timeline por días, sidebar de tareas, vistas tablero/lista y modales.
- `getProjectHealth` usa fórmula fija (10 puntos por tarea atrasada).

## clarity-pwa/src/pages/Planning/TeamPlanningPage.tsx
- Diseño: KPIs, lista de tareas y sidebar para miembro.
- Datos cargados con `setTimeout` y tareas hardcodeadas (no API).

## clarity-pwa/src/pages/Planning/ProjectSimulationPage.tsx
- Diseño: selector de proyecto, vistas table/board/gantt, panel lateral con auditoría.
- `handleExport` solo dispara toast (sin export real).

## clarity-pwa/src/pages/Planning/ApprovalsPage.tsx
- Diseño: lista de solicitudes con diff visual y acciones aprobar/rechazar.

## clarity-pwa/src/pages/Planning/RoadmapPage.tsx
- Diseño: roadmap anual por trimestres con cards.
- `progress` y `health` se generan como valores fijos (0 y `OnTrack`).

## clarity-pwa/src/pages/Planning/WorkloadPage.tsx
- Diseño: planificador semanal con heatmap por usuario y agrupación.
- Agrupa por `u.rol?.nombre` como “departamento” (comentario lo indica).

## clarity-pwa/src/pages/Automation/AutomationPage.tsx
- Diseño: cards por rol con reglas, CTA y bloque informativo.
- “Configurar Nueva Regla” y “Ejecutar Ahora” solo muestran toast.

## clarity-pwa/src/pages/Notes/MeetingNotesPage.tsx
- Diseño: editor con sidebar, panel de tareas detectadas y creación de tareas.
- Persistencia de notas en `localStorage` (sin backend).

## clarity-pwa/src/pages/Reports/ReportsPage.tsx
- Diseño: tabs con widgets de productividad, bloqueos y performance, con manejo de errores.

## clarity-pwa/src/pages/Tutorial/TutorialPage.tsx
- Diseño: tutorial modular con navegación por lecciones.
- Contenido es estático en `TUTORIAL_MODULES`.

## clarity-pwa/src/pages/Equipo/MemberAgendaPage.tsx
- Diseño: tabs de agenda y banner “Modo Supervisor”.
- Si falta `userId`, renderiza “Usuario no especificado”.

## clarity-pwa/src/pages/Equipo/EquipoBloqueosPage.tsx
- Diseño: tablero de bloqueos con filtros, buscador, lista y modal.
- `useEffect` declara `mounted` sin uso.

## clarity-pwa/src/pages/Equipo/ManagerDashboard.tsx
- Diseño: dashboard con KPIs, tabla por área y drilldown.
- Si la API no trae datos, inyecta datos mock en `loadData`.
- Usa clases dinámicas `bg-${kpi.color}-50`/`text-${kpi.color}-600` en KPIs.

## clarity-pwa/src/pages/Equipo/DashboardManager.tsx
- Diseño: portafolio de proyectos con KPIs, buscador y tabla.

## clarity-pwa/src/pages/Equipo/MiEquipoPage.tsx
- Diseño: vista 360° con lista, tabs por empleado y vista de carga semanal.
- Si falla `getEmpleadoPorCorreo`, se setea `error` y no se carga equipo.

## clarity-pwa/src/pages/Admin/UsersPage.tsx
- Diseño: usuarios con vista lista/jerarquía y modales de gestión.

## clarity-pwa/src/pages/Admin/LogsPage.tsx
- Diseño: tabs de actividad/sistema/errores con filtros y KPIs.

## clarity-pwa/src/pages/Admin/Audit/AuditLogsPage.tsx
- Diseño: auditoría con filtros, agrupación por fecha y diff.

## clarity-pwa/src/pages/Admin/Roles/RolesPage.tsx
- Diseño: sidebar de roles, editor de permisos y menú default.

## clarity-pwa/src/pages/Admin/Import/ImportPage.tsx
- Diseño: consola de importación con tabs, editor JSON y estadísticas.
- Pestaña Excel marcada como “Próximamente”.

## clarity-pwa/src/pages/Admin/SecurityManagementPage.tsx
- Diseño: listado de usuarios con filtros por tipo de menú y acciones.

## clarity-pwa/src/pages/Admin/Acceso/PermisosPage.tsx
- Diseño: tabs para permisos por área/empleado/delegación.

## clarity-pwa/src/pages/Admin/Acceso/VisibilidadPage.tsx
- Diseño: buscador por carnet, tarjetas de resultados y verificación de visibilidad.
