# Revisión de procedimientos y consultas inline (detalle y performance)

## Stored Procedures SQL Server (05_Stored_Procedures_Code.sql)

### dbo.sp_Clarity_UsuariosVisibles
- Query principal: CTE recursiva sobre `p_UsuariosOrganizacion` y `p_OrganizacionNodos`.
- Mejora:
  - Índices en `p_UsuariosOrganizacion(IdUsuario, RolEnNodo, FechaInicio, FechaFin, IdNodo)`.
  - Índices en `p_OrganizacionNodos(IdPadre, IdNodo, Activo)` para la recursión.

### dbo.sp_Clarity_MiDia_Get
- Query 1: `p_Checkins` por `IdUsuario` + `Fecha`.
- Mejora: índice en `p_Checkins(IdUsuario, Fecha)`.
- Query 2: `p_CheckinTareas` → `p_Tareas` para arrastrados.
- Mejora: índices en `p_CheckinTareas(IdCheckin, IdTarea)` y `p_Tareas(IdTarea, Estado, Prioridad, FechaUltActualizacion)`.
- Query 3: `p_Bloqueos` por `IdOrigenUsuario` y `Estado` con joins a `p_Usuarios` y `p_Tareas`.
- Mejora: índices en `p_Bloqueos(IdOrigenUsuario, Estado, FechaCreacion)` y claves de join en `p_Usuarios(IdUsuario)`/`p_Tareas(IdTarea)`.
- Query 4: selector de tareas con `p_Tareas` + `p_TareaAsignados` + `p_Proyectos`.
- Mejora: índices en `p_TareaAsignados(IdUsuario, IdTarea)` y `p_Tareas(Estado, Prioridad, FechaObjetivo, IdProyecto)`.

### dbo.sp_Clarity_Checkin_Upsert
- `SELECT`/`UPDATE`/`INSERT` en `p_Checkins`; `DELETE` + `INSERT` en `p_CheckinTareas`.
- Mejora:
  - Índice en `p_Checkins(IdUsuario, Fecha)` para el lookup.
  - Índice en `p_CheckinTareas(IdCheckin)` para el delete masivo.
  - Insert por `OPENJSON` sin validación de duplicados; si existen duplicados, revisar constraints.

### dbo.sp_Clarity_Tarea_Revalidar
- `UPDATE` en `p_Tareas` por `IdTarea`, `DELETE`/`INSERT` en `p_TareaAsignados`.
- Mejora:
  - Índice en `p_Tareas(IdTarea)`.
  - Índice en `p_TareaAsignados(IdTarea, Tipo)`.

### dbo.sp_Clarity_Tarea_CrearRapida
- `INSERT` en `p_Tareas` y `p_TareaAsignados`.
- Mejora:
  - Índices en `p_TareaAsignados(IdTarea, IdUsuario)` para consultas posteriores.

### dbo.sp_Clarity_Tareas_MisTareas
- `p_Tareas` + `p_TareaAsignados` + `p_Proyectos` con filtros por `IdUsuario`, `Estado`, `IdProyecto`.
- Mejora:
  - Índices en `p_TareaAsignados(IdUsuario, IdTarea)`.
  - Índices en `p_Tareas(IdProyecto, Estado, FechaUltActualizacion)`.

### dbo.sp_Clarity_Tarea_Actualizar
- `UPDATE p_Tareas` por `IdTarea`.
- Mejora: índice en `p_Tareas(IdTarea)`.

### dbo.sp_Clarity_Bloqueo_Crear
- `INSERT` en `p_Bloqueos`.
- Mejora: índices en `p_Bloqueos(IdOrigenUsuario, Estado, FechaCreacion)` para lecturas posteriores.

### dbo.sp_Clarity_Bloqueo_Resolver
- `UPDATE p_Bloqueos` por `IdBloqueo`, `INSERT` en `p_Comentarios`.
- Mejora: índice en `p_Bloqueos(IdBloqueo)`.

### dbo.sp_Clarity_EquipoHoy
- `@Visible` + joins con `p_Usuarios`, `p_Checkins`, CTE `BloqueosActivos`.
- Mejora:
  - Índices en `p_Bloqueos(Estado, IdOrigenUsuario)`.
  - Índice en `p_Checkins(IdUsuario, Fecha)`.

### dbo.sp_Clarity_Equipo_Bloqueos
- `@Visible` + `p_Bloqueos` + joins a `p_Usuarios`, `p_Tareas`, `p_Proyectos`.
- Mejora:
  - Índices en `p_Bloqueos(Estado, IdOrigenUsuario, FechaCreacion)`.
  - Índices en `p_Tareas(IdTarea, IdProyecto)`.

### dbo.sp_Clarity_Equipo_Backlog
- CTE `TareasEquipo` y agregación `STRING_AGG`.
- Mejora:
  - Índices en `p_TareaAsignados(IdUsuario, IdTarea)` y `p_Tareas(IdTarea, Estado, Prioridad, FechaUltActualizacion)`.
  - Si crece `STRING_AGG`, considerar pre-aggregación o paginación.

### dbo.sp_Clarity_Gerencia_Resumen
- CTEs `Participacion`, `BloqueosNodo`, `WipNodo` + resumen por proyecto.
- Mejora:
  - Índices en `p_Checkins(IdUsuario, Fecha)` y `p_Bloqueos(Estado, IdOrigenUsuario)`.
  - Índices en `p_TareaAsignados(IdUsuario, IdTarea)` y `p_Tareas(IdTarea, Estado, FechaHecha, IdProyecto)`.
  - En `HechasHoy`, `CAST(t.FechaHecha AS DATE)` puede impedir uso de índices; usar rango de fechas (`>= @Fecha` y `< DATEADD(day,1,@Fecha)`).

### dbo.sp_Clarity_Auth_LoginGet
- `p_Usuarios` + `p_UsuariosCredenciales` + `p_UsuariosRoles`/`p_Roles`.
- Mejora:
  - Índices en `p_Usuarios(Correo, Activo)` y `p_UsuariosCredenciales(IdUsuario)`.
  - `STUFF/FOR XML PATH` puede ser costoso; revisar si roles se consultan por separado o con pre-join.

### dbo.sp_Clarity_Auth_MarcarLogin
- `UPDATE p_UsuariosCredenciales` por `IdUsuario`.
- Mejora: índice en `p_UsuariosCredenciales(IdUsuario)`.

## Funciones PostgreSQL (05_Stored_Procedures_PostgreSQL.sql)

### public.sp_Clarity_UsuariosVisibles
- CTE recursiva `p_UsuariosOrganizacion` + `p_OrganizacionNodos`.
- Mejora: índices en `p_UsuariosOrganizacion("IdUsuario", "RolEnNodo", "FechaInicio", "FechaFin", "IdNodo")` y `p_OrganizacionNodos("IdPadre", "IdNodo", "Activo")`.

### public.sp_Clarity_Auth_LoginGet
- `p_Usuarios` + `p_UsuariosCredenciales` + `p_UsuariosRoles`/`p_Roles` con `STRING_AGG`.
- Mejora: índices en `p_Usuarios("Correo", "Activo")` y `p_UsuariosCredenciales("IdUsuario")`.

### public.sp_Clarity_Auth_MarcarLogin
- `UPDATE p_UsuariosCredenciales` por `IdUsuario`.
- Mejora: índice en `p_UsuariosCredenciales("IdUsuario")`.

### public.sp_Clarity_MiDia_CheckinHoy
- `p_Checkins` por `IdUsuario` + `Fecha`.
- Mejora: índice en `p_Checkins("IdUsuario", "Fecha")`.

### public.sp_Clarity_MiDia_Arrastrados
- `p_Checkins` → `p_CheckinTareas` → `p_Tareas`.
- Mejora: índices en `p_CheckinTareas("IdCheckin", "IdTarea")` y `p_Tareas("IdTarea", "Estado", "Prioridad", "FechaUltActualizacion")`.

### public.sp_Clarity_MiDia_BloqueosActivos
- `p_Bloqueos` por `IdOrigenUsuario` + `Estado` con joins a `p_Usuarios`, `p_Tareas`.
- Mejora: índice en `p_Bloqueos("IdOrigenUsuario", "Estado", "FechaCreacion")`.

### public.sp_Clarity_MiDia_TareasDisponibles
- `p_Tareas` + `p_TareaAsignados` + `p_Proyectos` con filtros de estado.
- Mejora: índices en `p_TareaAsignados("IdUsuario", "IdTarea")` y `p_Tareas("Estado", "Prioridad", "FechaObjetivo", "IdProyecto")`.

### public.sp_Clarity_Checkin_Upsert
- `SELECT`/`UPDATE`/`INSERT` en `p_Checkins` + `DELETE`/`INSERT` en `p_CheckinTareas`.
- Mejora: índice en `p_Checkins("IdUsuario", "Fecha")` y `p_CheckinTareas("IdCheckin")`.

### public.sp_Clarity_Tarea_CrearRapida
- `INSERT` en `p_Tareas` y `p_TareaAsignados`.
- Mejora: índice en `p_TareaAsignados("IdTarea", "IdUsuario")`.

### public.sp_Clarity_Bloqueo_Crear
- `INSERT` en `p_Bloqueos`.
- Mejora: índice en `p_Bloqueos("IdOrigenUsuario", "Estado", "FechaCreacion")`.

### public.sp_Clarity_EquipoHoy
- `Visible` + joins `p_Usuarios`, `p_Checkins`, CTE `BloqueosActivos`.
- Mejora: índices en `p_Checkins("IdUsuario", "Fecha")` y `p_Bloqueos("Estado", "IdOrigenUsuario")`.

### public.sp_Clarity_Tareas_MisTareas
- `p_Tareas` + `p_TareaAsignados` + `p_Proyectos`.
- Mejora: índices en `p_TareaAsignados("IdUsuario", "IdTarea")` y `p_Tareas("IdProyecto", "Estado", "FechaUltActualizacion")`.

### public.sp_Clarity_Tarea_Actualizar
- `UPDATE p_Tareas` por `IdTarea`.
- Mejora: índice en `p_Tareas("IdTarea")`.

### public.sp_Clarity_Tarea_Revalidar
- `UPDATE`/`DELETE`/`INSERT` en `p_Tareas` y `p_TareaAsignados`.
- Mejora: índice en `p_TareaAsignados("IdTarea", "Tipo")`.

### public.sp_Clarity_Bloqueo_Resolver
- `UPDATE p_Bloqueos` por `IdBloqueo`.
- Mejora: índice en `p_Bloqueos("IdBloqueo")`.

### public.sp_Clarity_Equipo_Bloqueos
- `Visible` + `p_Bloqueos` + joins a `p_Usuarios`, `p_Tareas`, `p_Proyectos`.
- Mejora: índices en `p_Bloqueos("Estado", "IdOrigenUsuario", "FechaCreacion")`.

### public.sp_Clarity_Equipo_Backlog
- `TareasEquipo` + `STRING_AGG` con múltiples joins.
- Mejora: índices en `p_TareaAsignados("IdUsuario", "IdTarea")` y `p_Tareas("IdTarea", "Estado", "Prioridad", "FechaUltActualizacion")`.

### public.sp_Clarity_Gerencia_Resumen_Nodos
- CTEs `Participacion`, `BloqueosNodo`, `WipNodo`.
- Mejora: índices en `p_Checkins("IdUsuario", "Fecha")`, `p_Bloqueos("Estado", "IdOrigenUsuario")`, `p_TareaAsignados("IdUsuario", "IdTarea")`.

### public.sp_Clarity_Gerencia_Resumen_Proyectos
- `TareasVisibles` + `p_Tareas` + `p_Proyectos` con `CAST("FechaHecha" AS DATE)`.
- Mejora: usar rango de fechas en lugar de `CAST` para aprovechar índices; índice en `p_Tareas("Estado", "FechaHecha", "IdProyecto")`.

## Consultas inline en backend/src (todas las encontradas)

### backend/src/admin/admin.repo.ts
- `SELECT u.*, ISNULL(sc.subordinateCount, 0) ...` (listado usuarios + subquery subordinados).
  - Mejora: índice en `p_Usuarios(jefeCarnet, activo)` y `p_UsuariosConfig(idUsuario)`.
- `SELECT * FROM p_UsuariosConfig WHERE idUsuario = @id`.
  - Mejora: índice en `p_UsuariosConfig(idUsuario)`.
- `SELECT * FROM p_SeguridadPerfiles WHERE activo = 1 ORDER BY nombre ASC`.
  - Mejora: índice en `p_SeguridadPerfiles(activo, nombre)`.
- `SELECT u.*, r.nombre as rolNombre ... ORDER BY ... OFFSET/FETCH`.
  - Mejora: índice en `p_Usuarios(nombre)` y `p_Usuarios(idRol)`.
- `SELECT COUNT(*) as total FROM p_Usuarios`.
- `SELECT COUNT(*) ... activos/inactivos FROM p_Usuarios`.
- `SELECT * FROM p_Roles ORDER BY nombre ASC`.
  - Mejora: índice en `p_Roles(nombre)`.
- `SELECT * FROM p_Logs ORDER BY fecha DESC OFFSET/FETCH`.
  - Mejora: índice en `p_Logs(fecha)`.
- `SELECT * FROM p_OrganizacionNodos WHERE activo = 1`.
  - Mejora: índice en `p_OrganizacionNodos(activo)`.
- `UPDATE p_UsuariosConfig SET menuPersonalizado = @menu WHERE idUsuario = @id`.
- `INSERT INTO p_UsuariosConfig ...`.
- `UPDATE p_Usuarios SET rolGlobal = @rolGlobal, idRol = @idRol ... WHERE idUsuario = @idUsuario`.
- `INSERT INTO p_Roles ...`.
- `UPDATE p_Roles SET ... WHERE idRol = @idRol`.
- `DELETE FROM p_Roles WHERE idRol = @idRol`.
- `INSERT INTO p_Logs ...`.
- `INSERT INTO p_OrganizacionNodos ... OUTPUT INSERTED.id ...`.
- `INSERT INTO p_UsuariosOrganizacion ...`.
- `countQuery`: `SELECT COUNT(*) as total FROM p_Logs WHERE ${whereClause}`.
  - Mejora: índice en `p_Logs(idUsuario, accion, entidad, fecha)` según filtros usados.
- `dataQuery`: `SELECT l.*, u.nombre as nombreUsuario ... WHERE ${whereClause} ORDER BY l.fecha DESC OFFSET/FETCH`.
  - Mejora: índice en `p_Logs(fecha)` y `p_Usuarios(idUsuario)`.

### backend/src/admin/import.service.ts
- `SELECT idUsuario FROM p_Usuarios WHERE correo = @correo`.
  - Mejora: índice en `p_Usuarios(correo)`.
- `INSERT INTO p_Usuarios ... OUTPUT INSERTED.idUsuario`.
- `UPDATE p_Usuarios SET nombre = @nombre, activo = @activo WHERE correo = @correo`.
  - Mejora: índice en `p_Usuarios(correo)`.
- `INSERT INTO p_UsuariosCredenciales (idUsuario, passwordHash) ...`.
  - Mejora: índice en `p_UsuariosCredenciales(idUsuario)`.
- `SELECT id FROM p_OrganizacionNodos WHERE nombre = @nombre`.
  - Mejora: índice en `p_OrganizacionNodos(nombre)`.
- `UPDATE p_OrganizacionNodos SET tipo = @tipo, activo = @activo WHERE nombre = @nombre`.
  - Mejora: índice en `p_OrganizacionNodos(nombre)`.
- `INSERT INTO p_OrganizacionNodos (nombre, tipo, activo) ...`.
- `SELECT COUNT(*) as total FROM p_Usuarios`.
- `SELECT COUNT(*) as total FROM p_Usuarios WHERE activo = 1`.
- `SELECT COUNT(*) as total FROM p_OrganizacionNodos`.

### backend/src/diagnostico/diagnostico.controller.ts
- `SELECT 1 AS ok`.
- `SELECT COUNT(*) as cnt FROM ${tabla}`.
  - Mejora: evitar interpolación de nombre de tabla si hay entrada externa.
- `SELECT DB_NAME() AS db, @@SERVERNAME AS server, ...`.
- `SELECT TOP 1 idTarea, nombre, idCreador FROM p_Tareas`.
  - Mejora: índice en `p_Tareas(idTarea)` ya suele ser PK.

### backend/src/clarity/organizacion.controller.ts
- `SELECT DISTINCT LTRIM/RTRIM(...) FROM p_Usuarios WHERE activo = 1 ...` (con filtro de no nulos y no vacíos).
- `SELECT DISTINCT ... FROM p_Usuarios WHERE activo = 1 ORDER BY 1,2,3`.
  - Mejora: funciones `LTRIM/RTRIM` impiden uso de índices; si se busca performance, normalizar datos en origen o usar columnas normalizadas.

### backend/src/clarity/recurrencia.repo.ts
- `INSERT INTO p_TareaRecurrencia ... OUTPUT INSERTED.id ...`.
- `SELECT * FROM p_TareaRecurrencia WHERE idTarea = @idTarea AND activo = 1`.
  - Mejora: índice en `p_TareaRecurrencia(idTarea, activo)`.
- `UPDATE p_TareaRecurrencia SET activo = 0 WHERE id = @id`.
- `INSERT INTO p_TareaInstancia ... OUTPUT INSERTED.id ...`.
- `SELECT TOP (@limit) * FROM p_TareaInstancia WHERE idTarea = @idTarea ORDER BY fechaProgramada DESC`.
  - Mejora: índice en `p_TareaInstancia(idTarea, fechaProgramada DESC)`.
- `SELECT * FROM p_TareaInstancia WHERE idTarea = @idTarea AND fechaProgramada = @fecha`.
  - Mejora: índice en `p_TareaInstancia(idTarea, fechaProgramada)`.
- `UPDATE p_TareaInstancia SET ... WHERE id = @id`.
- CTE con `Inst` + `RecAplica` + `p_Tareas` (consulta de instancias/recurrencias).
  - Mejora: índices en `p_TareaInstancia(fechaProgramada, idTarea)`, `p_TareaRecurrencia(activo, fechaInicioVigencia, fechaFinVigencia, tipoRecurrencia, diasSemana, diaMes)`, `p_Tareas(idCreador, comportamiento)`.

### backend/src/clarity/reports.service.ts
- `SELECT TOP 50 b.* ... FROM p_Bloqueos b LEFT JOIN ... ORDER BY b.creadoEn DESC`.
  - Mejora: índice en `p_Bloqueos(creadoEn)` y columnas de join (`idOrigenUsuario`, `idDestinoUsuario`, `idTarea`).

### backend/src/clarity/tasks.service.ts
- `SELECT b.*, u.nombre ... FROM p_Bloqueos b ... WHERE b.idUsuario IN (${idsStr}) ORDER BY b.fechaCreacion DESC`.
  - Mejora: índice en `p_Bloqueos(idUsuario, fechaCreacion)`.

### backend/src/clarity/clarity.repo.ts
- `UPDATE p_Tareas SET comportamiento = @c WHERE idTarea = @t`.
- `SELECT 1 FROM p_TareaAsignados WHERE idTarea = @t AND idUsuario = @u`.
  - Mejora: índice en `p_TareaAsignados(idTarea, idUsuario)`.
- `INSERT INTO p_TareaAsignados ...`.
- `DELETE FROM p_TareaAsignados WHERE idTarea = @t AND tipo = 'Responsable'`.
  - Mejora: índice en `p_TareaAsignados(idTarea, tipo)`.
- `getTareasUsuario` (SQL dinámico):
  - Base: `p_Tareas` + `p_Proyectos` + `p_TareaAsignados` con filtros por `idCreador`/`idUsuario` + `estado`/`idProyecto`.
  - Mejora: índices en `p_TareaAsignados(idUsuario, idTarea)`, `p_Tareas(idCreador, idProyecto, estado, fechaObjetivo, orden)`.
- `obtenerTareasMultiplesUsuarios`: `p_Tareas` + `p_Proyectos` + `p_TareaAsignados` con `IN (${idsStr})`.
  - Mejora: índice en `p_TareaAsignados(idUsuario, idTarea)`.
- `SELECT u.*, r.nombre as rolNombre FROM p_Usuarios ... WHERE u.idUsuario IN (${idsStr}) AND u.activo = 1`.
  - Mejora: índice en `p_Usuarios(idUsuario, activo)`.
- `SELECT * FROM p_Checkins WHERE idUsuario IN (${idsStr}) AND CAST(fecha AS DATE) = CAST(@fecha AS DATE)`.
  - Mejora: usar rango de fechas para evitar `CAST`; índice en `p_Checkins(idUsuario, fecha)`.
- `SELECT ... SUM(CASE ...) FROM p_Tareas t JOIN p_TareaAsignados ta ... WHERE ta.idUsuario IN (${idsStr}) ...` (estadísticas de tareas del equipo).
  - Mejora: índices en `p_TareaAsignados(idUsuario, idTarea)` y `p_Tareas(idTarea, estado, fechaObjetivo, fechaCompletado)`.
- `DELETE FROM p_CheckinTareas WHERE idCheckin = @id`.
- `INSERT INTO p_CheckinTareas ...`.
- `SELECT * FROM p_Checkins WHERE idUsuario = @idUsuario AND CAST(fecha AS DATE) = CAST(@fecha AS DATE)`.
  - Mejora: rango de fechas + índice `p_Checkins(idUsuario, fecha)`.
- `SELECT ct.idTarea, ct.tipo, t.nombre as titulo, t.estado FROM p_CheckinTareas ct JOIN p_Tareas t ...`.
  - Mejora: índice en `p_CheckinTareas(idCheckin, idTarea)`.
- `INSERT INTO p_Bloqueos ...` y `UPDATE p_Tareas SET estado = 'Bloqueada' WHERE idTarea = @id`.
- `SELECT ... FROM p_Tareas t LEFT JOIN p_TareaAsignados ta ... WHERE t.idCreador = @uid OR ta.idUsuario = @uid` (KPIs globales).
  - Mejora: índices en `p_Tareas(idCreador)` y `p_TareaAsignados(idUsuario, idTarea)`.
- `SELECT p.nombre, p.area, COUNT(t.idTarea) ... GROUP BY p.nombre, p.area` (KPIs por proyecto).
  - Mejora: índice en `p_Tareas(idProyecto, estado)`.
- `SELECT ... FROM p_Tareas t LEFT JOIN ... WHERE t.idProyecto = @pid ORDER BY t.orden ASC, t.fechaObjetivo ASC` (tareas por proyecto).
  - Mejora: índice en `p_Tareas(idProyecto, orden, fechaObjetivo)`.
- `obtenerTareasHistorico` (SQL con DISTINCT y ORDER BY):
  - Mejora: índices en `p_Tareas(idCreador, fechaCreacion, fechaCompletado)`, `p_Checkins(fecha)`, `p_CheckinTareas(idTarea, idCheckin)`.

### backend/src/common/audit.repo.ts
- `SELECT * FROM p_Logs WHERE ${whereClause} ORDER BY fecha DESC OFFSET/FETCH`.
  - Mejora: índice en `p_Logs(fecha)` y columnas de filtro (`idUsuario`, `accion`, `entidad`).
- `SELECT COUNT(*) as total FROM p_Logs`.
- `SELECT a.*, u.nombre ... FROM p_Auditoria a LEFT JOIN p_Usuarios u ... WHERE ${whereClause} ORDER BY a.fecha DESC OFFSET/FETCH`.
  - Mejora: índice en `p_Auditoria(fecha)` y `p_Auditoria(idUsuario)`.
- `SELECT COUNT(*) as total FROM p_Auditoria`.
- `INSERT INTO p_Logs ...`.
- `INSERT INTO p_Auditoria ...`.

### backend/src/software/software.service.ts
- `queryProjects` (subqueries con `p_Tareas`/`p_TareaAsignados` para stats por proyecto).
  - Mejora: índices en `p_Tareas(idProyecto, estado, fechaObjetivo)` y `p_TareaAsignados(idUsuario, idTarea)`; los subqueries se benefician de índices por `idProyecto`.
- `queryTasks` (tareas por usuario con estado y fecha).
  - Mejora: índice en `p_TareaAsignados(idUsuario, idTarea)` y `p_Tareas(estado, fechaObjetivo)`.
- `SELECT TOP 10 ... FROM p_Tareas ... WHERE ta.idUsuario IN (${idsStr}) ... CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE)`.
  - Mejora: usar rango de fechas para evitar `CAST`.
- `SELECT TOP 20 ... FROM p_Bloqueos ... WHERE b.idUsuario IN (${idsStr}) AND b.estado = 'Activo'`.
  - Mejora: índice en `p_Bloqueos(idUsuario, estado, fechaCreacion)`.

### backend/src/acceso/acceso.repo.ts
- `SELECT u.idUsuario, u.carnet, ... FROM p_Usuarios u LEFT JOIN p_Roles r ... WHERE LTRIM(RTRIM(u.carnet)) IN (${paramNames.join(',')})`.
  - Mejora: evitar `LTRIM/RTRIM` en filtro; usar campo normalizado o trimming en entrada; índice en `p_Usuarios(carnet)`.
- `SELECT carnet FROM p_Usuarios WHERE idUsuario = @id`.
- `SELECT * FROM p_delegacion_visibilidad WHERE carnet_delegado = @carnet AND activo = 1 AND (fecha_inicio ... fecha_fin ...)`.
  - Mejora: índice en `p_delegacion_visibilidad(carnet_delegado, activo, fecha_inicio, fecha_fin)`.
- `SELECT * FROM p_permiso_area WHERE carnet_recibe = @carnet AND activo = 1`.
  - Mejora: índice en `p_permiso_area(carnet_recibe, activo)`.
- `SELECT * FROM p_permiso_empleado WHERE carnet_recibe = @carnet AND activo = 1`.
  - Mejora: índice en `p_permiso_empleado(carnet_recibe, activo)`.
- `SELECT id as idorg, nombre, tipo, idPadre as padre, orden, activo FROM p_OrganizacionNodos WHERE id = @id`.
- `SELECT * FROM p_permiso_area WHERE activo = 1 ORDER BY creado_en DESC`.
- `SELECT * FROM p_permiso_empleado WHERE activo = 1 ORDER BY creado_en DESC`.
- `SELECT * FROM p_delegacion_visibilidad WHERE activo = 1 ORDER BY creado_en DESC`.
  - Mejora: índice en `creado_en` para las tres tablas.
- `SELECT * FROM p_delegacion_visibilidad WHERE carnet_delegante = @carnet ORDER BY creado_en DESC`.
- `SELECT * FROM p_Usuarios WHERE carnet = @carnet`.
- `SELECT * FROM p_Usuarios WHERE correo = @correo`.
- `SELECT * FROM p_Usuarios WHERE activo = 1 ORDER BY nombre ASC`.
- `SELECT TOP (@limite) * FROM p_Usuarios WHERE (LOWER(nombre) LIKE LOWER(@t) OR carnet LIKE @t OR LOWER(correo) LIKE LOWER(@t)) AND activo = 1 ORDER BY nombre ASC`.
  - Mejora: `LOWER()` evita índices; considerar columnas normalizadas o `CI` collation.
- `SELECT TOP 50 ... FROM p_OrganizacionNodos WHERE LOWER(nombre) LIKE LOWER(@t)`.
  - Mejora: `LOWER()` evita índices; considerar `CI` collation.
- `SELECT idOrg, COUNT(*) as count FROM p_Usuarios WHERE activo = 1 AND idOrg IS NOT NULL GROUP BY idOrg`.
- `WITH NodosSub AS (...) SELECT TOP (@limite) u.idUsuario ... FROM p_Usuarios u JOIN NodosSub ... WHERE u.activo = 1`.
- `WITH NodosSub AS (...) SELECT COUNT(*) as total FROM p_Usuarios u JOIN NodosSub ... WHERE u.activo = 1`.
  - Mejora: índices en `p_OrganizacionNodos(idPadre, id)` y `p_Usuarios(idOrg, activo)`.
- `SELECT TOP (@limite) * FROM p_Usuarios WHERE idOrg = @id AND activo = 1 ORDER BY nombre ASC`.
- `SELECT COUNT(*) as total FROM p_Usuarios WHERE idOrg = @id AND activo = 1`.
- `INSERT INTO p_delegacion_visibilidad ...`.
- `INSERT INTO p_permiso_area ...`.
- `UPDATE p_permiso_area SET activo = 0 WHERE id = @id`.
- `INSERT INTO p_permiso_empleado ...`.
- `UPDATE p_permiso_empleado SET activo = 0 WHERE id = @id`.
- `UPDATE p_delegacion_visibilidad SET activo = 0 WHERE id = @id`.

### backend/src/planning/grupo.repo.ts
- `SELECT * FROM p_Tareas WHERE idGrupo = @idGrupo ORDER BY numeroParte`.
- `SELECT idGrupo, numeroParte FROM p_Tareas WHERE idTarea = @idTarea AND idGrupo IS NOT NULL`.
- `SELECT COUNT(*) as total FROM p_Tareas WHERE idGrupo = @idGrupo`.
  - Mejora: índice en `p_Tareas(idGrupo, numeroParte)`.

### backend/src/planning/avance-mensual.repo.ts
- `SELECT ... FROM p_TareaAvanceMensual WHERE idTarea = @idTarea ORDER BY anio, mes`.
- `SELECT ISNULL(SUM(porcentajeMes), 0) AS acumulado FROM p_TareaAvanceMensual WHERE idTarea = @idTarea`.
  - Mejora: índice en `p_TareaAvanceMensual(idTarea, anio, mes)`.

### backend/src/planning/analytics.service.ts
- `queryRaw` (UNION ALL) con `p_Proyectos`, `p_Tareas`, `p_TareaAsignados` y `CAST(t.fechaObjetivo AS DATE)`.
  - Mejora: índices en `p_Tareas(idProyecto, estado, fechaObjetivo)` y `p_TareaAsignados(idUsuario, idTarea)`; evitar `CAST` con rango de fechas.
- `allTasksRaw`: `p_Tareas` + `p_TareaAsignados` + `p_Usuarios`.
  - Mejora: índices en `p_TareaAsignados(idUsuario, idTarea)` y `p_Tareas(estado, fechaObjetivo)`.
- `topDelays`: `p_Tareas` + `p_TareaAsignados` + `p_Usuarios` con `CAST(fechaObjetivo)`.
  - Mejora: usar rango de fechas.
- `usersWithActiveTasks`: `SELECT DISTINCT ta.idUsuario ... WHERE ta.idUsuario IN (...) AND t.estado IN (...)`.
  - Mejora: índice en `p_TareaAsignados(idUsuario, idTarea)` y `p_Tareas(estado)`.
- `blockersDetail`: `p_Bloqueos` + joins.
  - Mejora: índice en `p_Bloqueos(idUsuario, estado, fechaCreacion)`.

### backend/src/planning/planning.repo.ts
- `SELECT DISTINCT p.* FROM p_Proyectos p ...` (por usuario).
  - Mejora: evitar `SELECT *` si solo se usan columnas; índices en `p_TareaAsignados(idUsuario, idTarea)`.
- `SELECT * FROM p_Proyectos ORDER BY fechaCreacion DESC`.
  - Mejora: índice en `p_Proyectos(fechaCreacion)`.
- `obtenerProyectosVisibles` (UNION de 5 bloques sobre `p_Proyectos` + `p_Tareas` + `p_TareaAsignados` + `p_Usuarios`).
  - Mejora: índices en `p_Usuarios(jefeCarnet, carnet_jefe2, carnet_jefe3, carnet_jefe4)` y `p_TareaAsignados(idUsuario, idTarea)`.
- `INSERT INTO p_Proyectos ... OUTPUT INSERTED.idProyecto`.
- `UPDATE p_Proyectos SET ${sets.join(', ')} WHERE idProyecto = @idProyecto`.
- `DELETE FROM p_Proyectos WHERE idProyecto = @idProyecto`.
- `SELECT * FROM p_Proyectos WHERE idProyecto = @idProyecto`.
- `SELECT t.*, p.tipo ... FROM p_Tareas t LEFT JOIN p_Proyectos p ... WHERE t.idTarea = @idTarea`.
- `UPDATE p_Tareas SET ${sets.join(', ')} WHERE idTarea = @idTarea`.
- `INSERT INTO p_SolicitudCambios ...`.
- `SELECT s.*, t.nombre ... FROM p_SolicitudCambios s ... WHERE s.estado = 'Pendiente'`.
  - Mejora: índice en `p_SolicitudCambios(estado, fechaSolicitud)`.
- `SELECT s.*, t.nombre ... WHERE s.carnetSolicitante IN (${carnetsStr}) AND s.estado = 'Pendiente'`.
  - Mejora: índice en `p_SolicitudCambios(carnetSolicitante, estado)`.
- `SELECT * FROM p_SolicitudCambios WHERE id = @id`.
- `UPDATE p_SolicitudCambios SET ... WHERE id = @idSolicitud`.
- `SELECT * FROM p_PlanesTrabajo WHERE idUsuario = @idUsuario AND mes = @mes AND anio = @anio`.
  - Mejora: índice en `p_PlanesTrabajo(idUsuario, mes, anio)`.
- `SELECT t.*, p.nombre ... FROM p_Tareas t ... WHERE t.idPlan = @idPlan ORDER BY t.orden ASC`.
  - Mejora: índice en `p_Tareas(idPlan, orden)`.
- `SELECT idPlan FROM p_PlanesTrabajo WHERE idUsuario = @idUsuario AND mes = @mes AND anio = @anio`.
- `UPDATE p_PlanesTrabajo SET objetivos = @objetivos, estado = @estado ... WHERE idPlan = @idPlan`.
- `INSERT INTO p_PlanesTrabajo ... OUTPUT INSERTED.idPlan`.
- `SELECT idNodo FROM p_UsuariosOrganizacion WHERE idUsuario = @idUsuario AND rol IN ('Lider', 'Gerente', 'Director')`.
  - Mejora: índice en `p_UsuariosOrganizacion(idUsuario, rol)`.
- `SELECT idNodo FROM p_OrganizacionNodos WHERE idPadre IN (${idsStr})`.
  - Mejora: índice en `p_OrganizacionNodos(idPadre)`.
- `SELECT idUsuario FROM p_UsuariosOrganizacion WHERE idNodo IN (${idsStr})`.
  - Mejora: índice en `p_UsuariosOrganizacion(idNodo)`.
- `SELECT u.*, r.nombre ... FROM p_Usuarios u LEFT JOIN p_Roles r ... WHERE u.jefeCarnet = @carnetJefe AND u.activo = 1`.
  - Mejora: índice en `p_Usuarios(jefeCarnet, activo)`.

