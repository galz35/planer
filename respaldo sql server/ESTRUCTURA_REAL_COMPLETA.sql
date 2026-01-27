-- ESTRUCTURA COMPLETA DE LA BASE DE DATOS: Bdplaner
-- Fecha: 2026-01-27T15:01:54.445Z

USE [Bdplaner];
GO

-- ******************************************************
-- TABLA: [dbo].[p_AuditLog]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_AuditLog]', 'U') IS NOT NULL DROP TABLE [dbo].[p_AuditLog]
GO
CREATE TABLE [dbo].[p_AuditLog] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NULL,
    [accion] nvarchar(100) NOT NULL,
    [entidad] nvarchar(100) NULL,
    [entidadId] nvarchar(50) NULL,
    [datosAnteriores] nvarchar(max) NULL,
    [datosNuevos] nvarchar(max) NULL,
    [fecha] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_AuditL__3213E83F0D0706DF] PRIMARY KEY ([id])
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Auditoria]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Auditoria]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Auditoria]
GO
CREATE TABLE [dbo].[p_Auditoria] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NULL,
    [accion] nvarchar(100) NOT NULL,
    [entidad] nvarchar(100) NULL,
    [entidadId] nvarchar(50) NULL,
    [datosAnteriores] nvarchar(max) NULL,
    [datosNuevos] nvarchar(max) NULL,
    [fecha] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_Audito__3213E83FF2F10FCA] PRIMARY KEY ([id])
);
GO
CREATE NONCLUSTERED INDEX [IX_p_Auditoria_Fecha] ON [dbo].[p_Auditoria] (fecha);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Bloqueos]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Bloqueos]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Bloqueos]
GO
CREATE TABLE [dbo].[p_Bloqueos] (
    [idBloqueo] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [descripcion] nvarchar(max) NOT NULL,
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [fechaResolucion] datetime NULL,
    [estado] nvarchar(50) NULL DEFAULT ('Activo'),
    [resolucion] nvarchar(max) NULL,
    [idResueltoPor] int NULL,
    [prioridad] nvarchar(20) NULL DEFAULT ('Media'),
    [categoria] nvarchar(50) NULL,
    [idTarea] int NULL,
    [creadoEn] datetime NULL DEFAULT (getdate()),
    [idOrigenUsuario] int NULL,
    [idDestinoUsuario] int NULL,
    [destinoTexto] nvarchar(200) NULL,
    [motivo] nvarchar(1000) NULL,
    [accionMitigacion] nvarchar(1000) NULL,
    [origenCarnet] nvarchar(50) NULL,
    [destinoCarnet] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Bloque__AF4E22516BA517D9] PRIMARY KEY ([idBloqueo])
);
GO
ALTER TABLE [dbo].[p_Bloqueos] ADD CONSTRAINT [FK__p_Bloqueo__idUsu__6CD8F421] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_Bloqueos] ADD CONSTRAINT [FK__p_Bloqueo__idRes__6DCD185A] FOREIGN KEY ([idResueltoPor]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
CREATE NONCLUSTERED INDEX [IX_p_Bloqueos_idTarea_estado] ON [dbo].[p_Bloqueos] (creadoEn, idBloqueo, idTarea, estado) INCLUDE (creadoEn, idBloqueo);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Checkins]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Checkins]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Checkins]
GO
CREATE TABLE [dbo].[p_Checkins] (
    [idCheckin] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [fecha] date NOT NULL,
    [prioridad1] nvarchar(500) NULL,
    [prioridad2] nvarchar(500) NULL,
    [prioridad3] nvarchar(500) NULL,
    [estado] nvarchar(50) NULL DEFAULT ('pendiente'),
    [energia] int NULL DEFAULT ((3)),
    [creadoEn] datetime NULL DEFAULT (getdate()),
    [comentarios] nvarchar(max) NULL,
    [entregableTexto] nvarchar(max) NULL,
    [nota] nvarchar(max) NULL,
    [linkEvidencia] nvarchar(max) NULL,
    [estadoAnimo] nvarchar(50) NULL,
    [idNodo] int NULL,
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [usuarioCarnet] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Checki__91D15F12BEF1CD39] PRIMARY KEY ([idCheckin])
);
GO
ALTER TABLE [dbo].[p_Checkins] ADD CONSTRAINT [FK__p_Checkin__idUsu__67201ACB] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
CREATE NONCLUSTERED INDEX [IX_Checkins_idUsuario_fecha] ON [dbo].[p_Checkins] (idUsuario, fecha);
GO
CREATE NONCLUSTERED INDEX [IX_p_Checkins_Usuario_Fecha] ON [dbo].[p_Checkins] (usuarioCarnet, fecha);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_p_Checkins_idUsuario_fecha] ON [dbo].[p_Checkins] (idUsuario, fecha);
GO


-- ******************************************************
-- TABLA: [dbo].[p_CheckinTareas]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_CheckinTareas]', 'U') IS NOT NULL DROP TABLE [dbo].[p_CheckinTareas]
GO
CREATE TABLE [dbo].[p_CheckinTareas] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idCheckin] int NOT NULL,
    [idTarea] int NULL,
    [descripcion] nvarchar(500) NULL,
    [completado] bit NULL DEFAULT ((0)),
    [orden] int NULL DEFAULT ((0)),
    [tipo] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Checki__3213E83FC0973B57] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_CheckinTareas] ADD CONSTRAINT [FK__p_Checkin__idTar__6BAFC5BE] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
ALTER TABLE [dbo].[p_CheckinTareas] ADD CONSTRAINT [FK__p_Checkin__idChe__6ABBA185] FOREIGN KEY ([idCheckin]) REFERENCES [dbo].[p_Checkins] ([idCheckin]);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_p_CheckinTareas_Checkin_Tarea_Tipo] ON [dbo].[p_CheckinTareas] (idCheckin, idTarea, tipo);
GO


-- ******************************************************
-- TABLA: [dbo].[p_delegacion_visibilidad]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_delegacion_visibilidad]', 'U') IS NOT NULL DROP TABLE [dbo].[p_delegacion_visibilidad]
GO
CREATE TABLE [dbo].[p_delegacion_visibilidad] (
    [id] bigint IDENTITY(1,1) NOT NULL,
    [carnet_delegante] nvarchar(100) NOT NULL,
    [carnet_delegado] nvarchar(100) NOT NULL,
    [activo] bit NULL DEFAULT ((1)),
    [fecha_inicio] date NULL,
    [fecha_fin] date NULL,
    [motivo] nvarchar(300) NULL,
    [creado_en] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_delega__3213E83F306A8791] PRIMARY KEY ([id])
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_FocoDiario]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_FocoDiario]', 'U') IS NOT NULL DROP TABLE [dbo].[p_FocoDiario]
GO
CREATE TABLE [dbo].[p_FocoDiario] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [fecha] date NOT NULL,
    [foco] nvarchar(500) NOT NULL,
    [completado] bit NULL DEFAULT ((0)),
    [creadoEn] datetime NULL DEFAULT (getdate()),
    [carnet] nvarchar(50) NULL,
    CONSTRAINT [PK__p_FocoDi__3213E83F0D2423B3] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_FocoDiario] ADD CONSTRAINT [FK__p_FocoDia__idUsu__70747ADB] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Logs]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Logs]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Logs]
GO
CREATE TABLE [dbo].[p_Logs] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NULL,
    [accion] nvarchar(100) NOT NULL,
    [entidad] nvarchar(100) NULL,
    [entidadId] nvarchar(50) NULL,
    [datos] nvarchar(max) NULL,
    [ip] nvarchar(50) NULL,
    [fecha] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_Logs__3213E83F955A1596] PRIMARY KEY ([id])
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_LogSistema]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_LogSistema]', 'U') IS NOT NULL DROP TABLE [dbo].[p_LogSistema]
GO
CREATE TABLE [dbo].[p_LogSistema] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NULL,
    [accion] nvarchar(100) NOT NULL,
    [entidad] nvarchar(100) NULL,
    [entidadId] nvarchar(50) NULL,
    [datos] nvarchar(max) NULL,
    [ip] nvarchar(50) NULL,
    [fecha] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_LogSis__3213E83F8947B106] PRIMARY KEY ([id])
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Notas]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Notas]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Notas]
GO
CREATE TABLE [dbo].[p_Notas] (
    [idNota] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [titulo] nvarchar(300) NULL,
    [contenido] nvarchar(max) NULL,
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [fechaModificacion] datetime NULL,
    [tipo] nvarchar(50) NULL DEFAULT ('nota'),
    [fechaActualizacion] datetime NULL,
    [etiquetas] nvarchar(500) NULL,
    [procesado] bit NULL DEFAULT ((0)),
    [carnet] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Notas__AD5F462E6C80C802] PRIMARY KEY ([idNota])
);
GO
ALTER TABLE [dbo].[p_Notas] ADD CONSTRAINT [FK__p_Notas__idUsuar__7291CD77] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO


-- ******************************************************
-- TABLA: [dbo].[p_organizacion_nodos]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_organizacion_nodos]', 'U') IS NOT NULL DROP TABLE [dbo].[p_organizacion_nodos]
GO
CREATE TABLE [dbo].[p_organizacion_nodos] (
    [idorg] bigint NOT NULL,
    [padre] bigint NULL,
    [descripcion] nvarchar(100) NULL,
    [tipo] nvarchar(50) NULL,
    [estado] nvarchar(50) NULL,
    [nivel] nvarchar(200) NULL,
    [updated_at] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_organi__04F659101A69F2E7] PRIMARY KEY ([idorg])
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_OrganizacionNodos]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_OrganizacionNodos]', 'U') IS NOT NULL DROP TABLE [dbo].[p_OrganizacionNodos]
GO
CREATE TABLE [dbo].[p_OrganizacionNodos] (
    [id] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(200) NOT NULL,
    [tipo] nvarchar(50) NULL,
    [idPadre] int NULL,
    [orden] int NULL DEFAULT ((0)),
    [activo] bit NULL DEFAULT ((1)),
    CONSTRAINT [PK__p_Organi__3213E83F2ABCD4F7] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_OrganizacionNodos] ADD CONSTRAINT [FK__p_Organiz__idPad__458A1CD6] FOREIGN KEY ([idPadre]) REFERENCES [dbo].[p_OrganizacionNodos] ([id]);
GO


-- ******************************************************
-- TABLA: [dbo].[p_permiso_area]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_permiso_area]', 'U') IS NOT NULL DROP TABLE [dbo].[p_permiso_area]
GO
CREATE TABLE [dbo].[p_permiso_area] (
    [id] bigint IDENTITY(1,1) NOT NULL,
    [carnet_otorga] nvarchar(100) NULL,
    [carnet_recibe] nvarchar(100) NOT NULL,
    [idorg_raiz] bigint NULL,
    [alcance] nvarchar(20) NULL DEFAULT ('SUBARBOL'),
    [activo] bit NULL DEFAULT ((1)),
    [fecha_inicio] date NULL,
    [fecha_fin] date NULL,
    [motivo] nvarchar(300) NULL,
    [creado_en] datetime NULL DEFAULT (getdate()),
    [nombre_area] nvarchar(255) NULL,
    [tipo_nivel] nvarchar(50) NULL DEFAULT ('GERENCIA'),
    CONSTRAINT [PK__p_permis__3213E83FE5608946] PRIMARY KEY ([id])
);
GO
CREATE NONCLUSTERED INDEX [IX_permiso_area_carnet] ON [dbo].[p_permiso_area] (carnet_recibe, activo);
GO


-- ******************************************************
-- TABLA: [dbo].[p_permiso_empleado]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_permiso_empleado]', 'U') IS NOT NULL DROP TABLE [dbo].[p_permiso_empleado]
GO
CREATE TABLE [dbo].[p_permiso_empleado] (
    [id] bigint IDENTITY(1,1) NOT NULL,
    [carnet_otorga] nvarchar(100) NULL,
    [carnet_recibe] nvarchar(100) NOT NULL,
    [carnet_objetivo] nvarchar(100) NOT NULL,
    [activo] bit NULL DEFAULT ((1)),
    [fecha_inicio] date NULL,
    [fecha_fin] date NULL,
    [motivo] nvarchar(300) NULL,
    [creado_en] datetime NULL DEFAULT (getdate()),
    [tipo_acceso] nvarchar(20) NULL DEFAULT ('ALLOW'),
    CONSTRAINT [PK__p_permis__3213E83FF8B18ACC] PRIMARY KEY ([id])
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_PlanesTrabajo]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_PlanesTrabajo]', 'U') IS NOT NULL DROP TABLE [dbo].[p_PlanesTrabajo]
GO
CREATE TABLE [dbo].[p_PlanesTrabajo] (
    [idPlan] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [mes] int NOT NULL,
    [anio] int NOT NULL,
    [estado] nvarchar(50) NULL DEFAULT ('Borrador'),
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [fechaAprobacion] datetime NULL,
    [idAprobador] int NULL,
    [observaciones] nvarchar(max) NULL,
    [fechaActualizacion] datetime NULL,
    [comentarios] nvarchar(max) NULL,
    [carnet] nvarchar(50) NULL,
    [objetivos] nvarchar(max) NULL,
    CONSTRAINT [PK__p_Planes__3213E83F2970402F] PRIMARY KEY ([idPlan])
);
GO
ALTER TABLE [dbo].[p_PlanesTrabajo] ADD CONSTRAINT [FK__p_PlanesT__idUsu__5E55CAA0] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_PlanesTrabajo] ADD CONSTRAINT [FK__p_PlanesT__idApr__5F49EED9] FOREIGN KEY ([idAprobador]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Proyectos]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Proyectos]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Proyectos]
GO
CREATE TABLE [dbo].[p_Proyectos] (
    [idProyecto] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(300) NOT NULL,
    [descripcion] nvarchar(max) NULL,
    [idNodoDuenio] int NULL,
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [pais] nvarchar(10) NULL DEFAULT ('NI'),
    [tipo] nvarchar(50) NULL DEFAULT ('Operativo'),
    [estado] nvarchar(50) NULL DEFAULT ('Borrador'),
    [requiereAprobacion] bit NULL DEFAULT ((0)),
    [enllavado] bit NULL DEFAULT ((0)),
    [fechaInicio] datetime NULL,
    [fechaFin] datetime NULL,
    [area] nvarchar(200) NULL,
    [subgerencia] nvarchar(200) NULL,
    [gerencia] nvarchar(200) NULL,
    [idCreador] int NULL,
    [idResponsable] int NULL,
    [prioridad] nvarchar(20) NULL DEFAULT ('Media'),
    [fechaActualizacion] datetime NULL,
    [creadorCarnet] nvarchar(50) NULL,
    [responsableCarnet] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Proyec__D0AF4CB45AF8B027] PRIMARY KEY ([idProyecto])
);
GO
CREATE NONCLUSTERED INDEX [IX_p_Proyectos_FechaCreacion] ON [dbo].[p_Proyectos] (nombre, descripcion, estado, fechaCreacion) INCLUDE (nombre, descripcion, estado);
GO
CREATE NONCLUSTERED INDEX [IX_p_Proyectos_Filtros_Composite] ON [dbo].[p_Proyectos] (nombre, fechaCreacion, responsableCarnet, creadorCarnet, estado, gerencia, subgerencia, area, tipo) INCLUDE (nombre, fechaCreacion, responsableCarnet, creadorCarnet);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Roles]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Roles]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Roles]
GO
CREATE TABLE [dbo].[p_Roles] (
    [idRol] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(100) NOT NULL,
    [descripcion] nvarchar(500) NULL,
    [esSistema] bit NULL DEFAULT ((0)),
    [reglas] nvarchar(max) NULL DEFAULT ('[]'),
    [defaultMenu] nvarchar(max) NULL,
    [fechaActualizacion] datetime NULL,
    CONSTRAINT [PK__p_Roles__3C872F76707155A9] PRIMARY KEY ([idRol])
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_SeguridadPerfiles]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_SeguridadPerfiles]', 'U') IS NOT NULL DROP TABLE [dbo].[p_SeguridadPerfiles]
GO
CREATE TABLE [dbo].[p_SeguridadPerfiles] (
    [id] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(100) NOT NULL,
    [permisos] nvarchar(max) NULL,
    [activo] bit NULL DEFAULT ((1)),
    [fechaActualizacion] datetime NULL,
    CONSTRAINT [PK__p_Seguri__3213E83F1A7B9A05] PRIMARY KEY ([id])
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_SlowQueries]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_SlowQueries]', 'U') IS NOT NULL DROP TABLE [dbo].[p_SlowQueries]
GO
CREATE TABLE [dbo].[p_SlowQueries] (
    [id] int IDENTITY(1,1) NOT NULL,
    [fecha] datetime NULL DEFAULT (getdate()),
    [duracionMS] int NOT NULL,
    [sqlText] nvarchar(max) NOT NULL,
    [parametros] nvarchar(max) NULL,
    [tipo] nvarchar(50) NULL,
    [origen] nvarchar(200) NULL,
    CONSTRAINT [PK__p_SlowQu__3213E83F6D9FC0DF] PRIMARY KEY ([id])
);
GO
CREATE NONCLUSTERED INDEX [IX_SlowQueries_Fecha] ON [dbo].[p_SlowQueries] (fecha);
GO


-- ******************************************************
-- TABLA: [dbo].[p_SolicitudCambios]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_SolicitudCambios]', 'U') IS NOT NULL DROP TABLE [dbo].[p_SolicitudCambios]
GO
CREATE TABLE [dbo].[p_SolicitudCambios] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [idSolicitante] int NOT NULL,
    [tipo] nvarchar(50) NOT NULL,
    [descripcion] nvarchar(max) NULL,
    [estado] nvarchar(50) NULL DEFAULT ('Pendiente'),
    [fechaSolicitud] datetime NULL DEFAULT (getdate()),
    [fechaRespuesta] datetime NULL,
    [idResponsable] int NULL,
    [respuesta] nvarchar(max) NULL,
    [carnetSolicitante] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Solici__3213E83F768D2389] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_SolicitudCambios] ADD CONSTRAINT [FK__p_Solicit__idRes__65F6EC68] FOREIGN KEY ([idResponsable]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_SolicitudCambios] ADD CONSTRAINT [FK__p_Solicit__idSol__6502C82F] FOREIGN KEY ([idSolicitante]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_SolicitudCambios] ADD CONSTRAINT [FK__p_Solicit__idTar__640EA3F6] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO


-- ******************************************************
-- TABLA: [dbo].[p_SolicitudesCambio]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_SolicitudesCambio]', 'U') IS NOT NULL DROP TABLE [dbo].[p_SolicitudesCambio]
GO
CREATE TABLE [dbo].[p_SolicitudesCambio] (
    [idSolicitud] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [idUsuarioSolicitante] int NOT NULL,
    [campo] nvarchar(50) NOT NULL,
    [valorAnterior] nvarchar(max) NULL,
    [valorNuevo] nvarchar(max) NULL,
    [motivo] nvarchar(max) NULL,
    [estado] nvarchar(20) NULL DEFAULT ('Pendiente'),
    [fechaSolicitud] datetime NULL DEFAULT (getdate()),
    [fechaResolucion] datetime NULL,
    [idUsuarioResolutor] int NULL,
    [comentarioResolucion] nvarchar(max) NULL,
    CONSTRAINT [PK__p_Solici__D801DDB854DDADA9] PRIMARY KEY ([idSolicitud])
);
GO
ALTER TABLE [dbo].[p_SolicitudesCambio] ADD CONSTRAINT [FK_Solicitudes_Usuario] FOREIGN KEY ([idUsuarioSolicitante]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_SolicitudesCambio] ADD CONSTRAINT [FK_Solicitudes_Tareas] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
CREATE NONCLUSTERED INDEX [IX_Solicitudes_Estado] ON [dbo].[p_SolicitudesCambio] (estado);
GO
CREATE NONCLUSTERED INDEX [IX_Solicitudes_Tarea] ON [dbo].[p_SolicitudesCambio] (idTarea);
GO


-- ******************************************************
-- TABLA: [dbo].[p_TareaAsignacionLog]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_TareaAsignacionLog]', 'U') IS NOT NULL DROP TABLE [dbo].[p_TareaAsignacionLog]
GO
CREATE TABLE [dbo].[p_TareaAsignacionLog] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [idUsuarioAnterior] int NULL,
    [idUsuarioNuevo] int NULL,
    [idEjecutor] int NOT NULL,
    [tipoAccion] nvarchar(50) NOT NULL,
    [motivo] nvarchar(500) NULL,
    [fecha_inicio] datetime NULL DEFAULT (getdate()),
    [fecha_fin] datetime NULL,
    [activo] bit NULL DEFAULT ((1)),
    CONSTRAINT [PK__p_TareaA__3213E83FD819E39F] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_TareaAsignacionLog] ADD CONSTRAINT [FK__p_TareaAs__idEje__54CC6066] FOREIGN KEY ([idEjecutor]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_TareaAsignacionLog] ADD CONSTRAINT [FK__p_TareaAs__idUsu__53D83C2D] FOREIGN KEY ([idUsuarioNuevo]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_TareaAsignacionLog] ADD CONSTRAINT [FK__p_TareaAs__idUsu__52E417F4] FOREIGN KEY ([idUsuarioAnterior]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_TareaAsignacionLog] ADD CONSTRAINT [FK__p_TareaAs__idTar__51EFF3BB] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO


-- ******************************************************
-- TABLA: [dbo].[p_TareaAsignados]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_TareaAsignados]', 'U') IS NOT NULL DROP TABLE [dbo].[p_TareaAsignados]
GO
CREATE TABLE [dbo].[p_TareaAsignados] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [idUsuario] int NOT NULL,
    [esResponsable] bit NULL DEFAULT ((0)),
    [fechaAsignacion] datetime NULL DEFAULT (getdate()),
    [tipo] nvarchar(50) NULL DEFAULT ('Responsable'),
    [carnet] nvarchar(50) NULL,
    CONSTRAINT [PK__p_TareaA__3213E83F0EFDC460] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_TareaAsignados] ADD CONSTRAINT [FK__p_TareaAs__idUsu__61674175] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_TareaAsignados] ADD CONSTRAINT [FK__p_TareaAs__idTar__60731D3C] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
CREATE NONCLUSTERED INDEX [IX_p_TareaAsignados_Carnet_Tarea] ON [dbo].[p_TareaAsignados] (esResponsable, carnet, idTarea) INCLUDE (esResponsable);
GO


-- ******************************************************
-- TABLA: [dbo].[p_TareaAvanceMensual]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_TareaAvanceMensual]', 'U') IS NOT NULL DROP TABLE [dbo].[p_TareaAvanceMensual]
GO
CREATE TABLE [dbo].[p_TareaAvanceMensual] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [mes] int NOT NULL,
    [anio] int NOT NULL,
    [porcentajeMes] decimal(5,2) NOT NULL DEFAULT ((0)),
    [comentario] nvarchar(max) NULL,
    [idUsuarioActualizador] int NOT NULL,
    [fechaActualizacion] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_TareaA__3213E83F6FA65021] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_TareaAvanceMensual] ADD CONSTRAINT [FK__p_TareaAv__idUsu__20238DFD] FOREIGN KEY ([idUsuarioActualizador]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_TareaAvanceMensual] ADD CONSTRAINT [FK__p_TareaAv__idTar__1F2F69C4] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
CREATE NONCLUSTERED INDEX [IX_TareaAvanceMensual_periodo] ON [dbo].[p_TareaAvanceMensual] (anio, mes);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ_TareaAvanceMensual] ON [dbo].[p_TareaAvanceMensual] (idTarea, mes, anio);
GO


-- ******************************************************
-- TABLA: [dbo].[p_TareaAvances]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_TareaAvances]', 'U') IS NOT NULL DROP TABLE [dbo].[p_TareaAvances]
GO
CREATE TABLE [dbo].[p_TareaAvances] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [idUsuario] int NOT NULL,
    [porcentajeAnterior] int NULL,
    [porcentajeNuevo] int NOT NULL,
    [comentario] nvarchar(max) NULL,
    [fecha] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_TareaA__3213E83FEE11F5DD] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_TareaAvances] ADD CONSTRAINT [FK__p_TareaAv__idUsu__59911583] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_TareaAvances] ADD CONSTRAINT [FK__p_TareaAv__idTar__589CF14A] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO


-- ******************************************************
-- TABLA: [dbo].[p_TareaInstancia]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_TareaInstancia]', 'U') IS NOT NULL DROP TABLE [dbo].[p_TareaInstancia]
GO
CREATE TABLE [dbo].[p_TareaInstancia] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [idRecurrencia] int NULL,
    [fechaProgramada] date NOT NULL,
    [fechaEjecucion] date NULL,
    [estadoInstancia] nvarchar(30) NULL DEFAULT ('PENDIENTE'),
    [comentario] nvarchar(max) NULL,
    [idUsuarioEjecutor] int NULL,
    [fechaRegistro] datetime NULL DEFAULT (getdate()),
    [fechaReprogramada] date NULL,
    CONSTRAINT [PK__p_TareaI__3213E83F81C4262C] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_TareaInstancia] ADD CONSTRAINT [FK__p_TareaIn__idRec__178E47FC] FOREIGN KEY ([idRecurrencia]) REFERENCES [dbo].[p_TareaRecurrencia] ([id]);
GO
ALTER TABLE [dbo].[p_TareaInstancia] ADD CONSTRAINT [FK__p_TareaIn__idUsu__18826C35] FOREIGN KEY ([idUsuarioEjecutor]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_TareaInstancia] ADD CONSTRAINT [FK__p_TareaIn__idTar__169A23C3] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
CREATE NONCLUSTERED INDEX [IX_TareaInstancia_fecha] ON [dbo].[p_TareaInstancia] (fechaProgramada, estadoInstancia);
GO
CREATE NONCLUSTERED INDEX [IX_TareaInstancia_idTarea] ON [dbo].[p_TareaInstancia] (idTarea);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ_TareaInstancia] ON [dbo].[p_TareaInstancia] (idTarea, fechaProgramada);
GO


-- ******************************************************
-- TABLA: [dbo].[p_TareaRecurrencia]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_TareaRecurrencia]', 'U') IS NOT NULL DROP TABLE [dbo].[p_TareaRecurrencia]
GO
CREATE TABLE [dbo].[p_TareaRecurrencia] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [tipoRecurrencia] nvarchar(20) NOT NULL,
    [diasSemana] nvarchar(20) NULL,
    [diaMes] int NULL,
    [fechaInicioVigencia] date NOT NULL,
    [fechaFinVigencia] date NULL,
    [activo] bit NULL DEFAULT ((1)),
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [idCreador] int NOT NULL,
    CONSTRAINT [PK__p_TareaR__3213E83F9FB2AAE5] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_TareaRecurrencia] ADD CONSTRAINT [FK__p_TareaRe__idCre__11D56EA6] FOREIGN KEY ([idCreador]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_TareaRecurrencia] ADD CONSTRAINT [FK__p_TareaRe__idTar__10E14A6D] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
CREATE NONCLUSTERED INDEX [IX_TareaRecurrencia_vigencia] ON [dbo].[p_TareaRecurrencia] (fechaInicioVigencia, fechaFinVigencia, activo);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Tareas]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Tareas]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Tareas]
GO
CREATE TABLE [dbo].[p_Tareas] (
    [idTarea] int IDENTITY(1,1) NOT NULL,
    [idProyecto] int NULL,
    [nombre] nvarchar(500) NOT NULL,
    [descripcion] nvarchar(max) NULL,
    [estado] nvarchar(50) NULL DEFAULT ('Pendiente'),
    [prioridad] nvarchar(20) NULL DEFAULT ('Media'),
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [fechaObjetivo] datetime NULL,
    [fechaCompletado] datetime NULL,
    [porcentaje] int NULL DEFAULT ((0)),
    [idPadre] int NULL,
    [orden] int NULL DEFAULT ((0)),
    [esHito] bit NULL DEFAULT ((0)),
    [idAsignado] int NULL,
    [tipoTarea] nvarchar(50) NULL DEFAULT ('tarea'),
    [fechaActualizacion] datetime NULL,
    [idCreador] int NULL,
    [fechaInicioPlanificada] datetime NULL,
    [tipo] nvarchar(50) NULL DEFAULT ('Administrativa'),
    [esfuerzo] nvarchar(20) NULL,
    [fechaInicioReal] datetime NULL,
    [fechaFinReal] datetime NULL,
    [comportamiento] nvarchar(20) NULL DEFAULT ('SIMPLE'),
    [idGrupo] int NULL,
    [numeroParte] int NULL DEFAULT ((1)),
    [linkEvidencia] nvarchar(max) NULL,
    [activo] bit NOT NULL DEFAULT ((1)),
    [motivoDeshabilitacion] nvarchar(max) NULL,
    [deshabilitadoPor] int NULL,
    [fechaDeshabilitacion] datetime NULL,
    [idTareaPadre] int NULL,
    [requiereEvidencia] bit NULL DEFAULT ((0)),
    [idEntregable] int NULL,
    [creadorCarnet] nvarchar(50) NULL,
    [asignadoCarnet] nvarchar(50) NULL,
    [idPlan] int NULL,
    [semana] int NULL,
    CONSTRAINT [PK__p_Tareas__756A54020939B421] PRIMARY KEY ([idTarea])
);
GO
ALTER TABLE [dbo].[p_Tareas] ADD CONSTRAINT [FK__p_Tareas__idAsig__5BAE681F] FOREIGN KEY ([idAsignado]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_Tareas] ADD CONSTRAINT [FK__p_Tareas__idProy__59C61FAD] FOREIGN KEY ([idProyecto]) REFERENCES [dbo].[p_Proyectos] ([idProyecto]);
GO
ALTER TABLE [dbo].[p_Tareas] ADD CONSTRAINT [FK_Tareas_Padre] FOREIGN KEY ([idTareaPadre]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
ALTER TABLE [dbo].[p_Tareas] ADD CONSTRAINT [FK_p_Tareas_Padre] FOREIGN KEY ([idTareaPadre]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
ALTER TABLE [dbo].[p_Tareas] ADD CONSTRAINT [FK__p_Tareas__idPadr__5ABA43E6] FOREIGN KEY ([idPadre]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
CREATE NONCLUSTERED INDEX [IX_p_Tareas_Estado_FechaObjetivo] ON [dbo].[p_Tareas] (idProyecto, activo, nombre, estado, fechaObjetivo) INCLUDE (idProyecto, activo, nombre);
GO
CREATE NONCLUSTERED INDEX [IX_p_Tareas_Jerarquia] ON [dbo].[p_Tareas] (idTarea, estado, porcentaje, idProyecto, orden, idTareaPadre, activo) INCLUDE (idTarea, estado, porcentaje, idProyecto, orden);
GO
CREATE NONCLUSTERED INDEX [IX_Tareas_comportamiento] ON [dbo].[p_Tareas] (comportamiento);
GO
CREATE NONCLUSTERED INDEX [IX_Tareas_idAsignado] ON [dbo].[p_Tareas] (idAsignado);
GO
CREATE NONCLUSTERED INDEX [IX_Tareas_idGrupo] ON [dbo].[p_Tareas] (idGrupo);
GO
CREATE NONCLUSTERED INDEX [IX_Tareas_idProyecto] ON [dbo].[p_Tareas] (idProyecto);
GO


-- ******************************************************
-- TABLA: [dbo].[p_UsuarioCredenciales]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_UsuarioCredenciales]', 'U') IS NOT NULL DROP TABLE [dbo].[p_UsuarioCredenciales]
GO
CREATE TABLE [dbo].[p_UsuarioCredenciales] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [passwordHash] nvarchar(500) NOT NULL,
    [ultimoCambio] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_Usuari__3213E83F4289905F] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_UsuarioCredenciales] ADD CONSTRAINT [FK__p_Usuario__idUsu__498FB7E4] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ__p_Usuari__645723A7E1BB7E8A] ON [dbo].[p_UsuarioCredenciales] (idUsuario);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Usuarios]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Usuarios]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Usuarios]
GO
CREATE TABLE [dbo].[p_Usuarios] (
    [idUsuario] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(200) NULL,
    [nombreCompleto] nvarchar(300) NULL,
    [correo] nvarchar(200) NOT NULL,
    [activo] bit NULL DEFAULT ((1)),
    [rolGlobal] nvarchar(50) NULL DEFAULT ('Empleado'),
    [idRol] int NULL,
    [carnet] nvarchar(50) NULL,
    [cargo] nvarchar(200) NULL,
    [departamento] nvarchar(200) NULL,
    [orgDepartamento] nvarchar(200) NULL,
    [orgGerencia] nvarchar(200) NULL,
    [idOrg] nvarchar(50) NULL,
    [jefeCarnet] nvarchar(50) NULL,
    [jefeNombre] nvarchar(200) NULL,
    [jefeCorreo] nvarchar(200) NULL,
    [fechaIngreso] datetime NULL,
    [genero] nvarchar(20) NULL,
    [primer_nivel] nvarchar(200) NULL,
    [gerencia] nvarchar(200) NULL,
    [ogerencia] nvarchar(200) NULL,
    [subgerencia] nvarchar(200) NULL,
    [pais] nvarchar(10) NULL DEFAULT ('NI'),
    [telefono] nvarchar(50) NULL,
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [username] nvarchar(100) NULL,
    [cedula] nvarchar(50) NULL,
    [area] nvarchar(200) NULL,
    [direccion] nvarchar(max) NULL,
    [empresa] nvarchar(200) NULL,
    [ubicacion] nvarchar(200) NULL,
    [tipo_empleado] nvarchar(100) NULL,
    [tipo_contrato] nvarchar(100) NULL,
    [fuente_datos] nvarchar(50) NULL,
    [segundo_nivel] nvarchar(200) NULL,
    [tercer_nivel] nvarchar(200) NULL,
    [cuarto_nivel] nvarchar(200) NULL,
    [quinto_nivel] nvarchar(200) NULL,
    [sexto_nivel] nvarchar(200) NULL,
    [carnet_jefe2] nvarchar(50) NULL,
    [carnet_jefe3] nvarchar(50) NULL,
    [carnet_jefe4] nvarchar(50) NULL,
    [fechaActualizacion] datetime NULL,
    CONSTRAINT [PK__p_Usuari__645723A657F1DA48] PRIMARY KEY ([idUsuario])
);
GO
ALTER TABLE [dbo].[p_Usuarios] ADD CONSTRAINT [FK__p_Usuario__idRol__44CB02C7] FOREIGN KEY ([idRol]) REFERENCES [dbo].[p_Roles] ([idRol]);
GO
CREATE NONCLUSTERED INDEX [IX_p_Usuarios_Carnet] ON [dbo].[p_Usuarios] (idUsuario, nombre, correo, idRol, activo, carnet) INCLUDE (idUsuario, nombre, correo, idRol, activo);
GO
CREATE NONCLUSTERED INDEX [IX_Usuarios_carnet] ON [dbo].[p_Usuarios] (carnet);
GO
CREATE NONCLUSTERED INDEX [IX_Usuarios_correo] ON [dbo].[p_Usuarios] (correo);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ__p_Usuari__2A586E0B9156554C] ON [dbo].[p_Usuarios] (correo);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_p_Usuarios_carnet] ON [dbo].[p_Usuarios] (carnet) WHERE ([carnet] IS NOT NULL);
GO


-- ******************************************************
-- TABLA: [dbo].[p_Usuarios_OLD]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_Usuarios_OLD]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Usuarios_OLD]
GO
CREATE TABLE [dbo].[p_Usuarios_OLD] (
    [idUsuario] int NULL,
    [carnet] nvarchar(100) NULL,
    [nombre] nvarchar(255) NULL,
    [correo] nvarchar(255) NULL
);
GO


-- ******************************************************
-- TABLA: [dbo].[p_UsuariosConfig]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_UsuariosConfig]', 'U') IS NOT NULL DROP TABLE [dbo].[p_UsuariosConfig]
GO
CREATE TABLE [dbo].[p_UsuariosConfig] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [menuPersonalizado] nvarchar(max) NULL,
    [temasPreferidos] nvarchar(500) NULL,
    [notificaciones] bit NULL DEFAULT ((1)),
    [fechaActualizacion] datetime NULL,
    [idioma] nvarchar(10) NULL DEFAULT ('es'),
    [tema] nvarchar(20) NULL DEFAULT ('light'),
    CONSTRAINT [PK__p_Usuari__3213E83F4132E030] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_UsuariosConfig] ADD CONSTRAINT [FK__p_Usuario__idUsu__40C567B9] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ__p_Usuari__645723A70DB90953] ON [dbo].[p_UsuariosConfig] (idUsuario);
GO


-- ******************************************************
-- TABLA: [dbo].[p_UsuariosCredenciales]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_UsuariosCredenciales]', 'U') IS NOT NULL DROP TABLE [dbo].[p_UsuariosCredenciales]
GO
CREATE TABLE [dbo].[p_UsuariosCredenciales] (
    [idCredencial] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [passwordHash] nvarchar(500) NOT NULL,
    [ultimoCambio] datetime NULL DEFAULT (getdate()),
    [ultimoLogin] datetime NULL,
    [refreshTokenHash] nvarchar(500) NULL,
    CONSTRAINT [PK__p_Usuari__3213E83F269A63BB] PRIMARY KEY ([idCredencial])
);
GO
ALTER TABLE [dbo].[p_UsuariosCredenciales] ADD CONSTRAINT [FK__p_Usuario__idUsu__3C00B29C] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ__p_Usuari__645723A723082B44] ON [dbo].[p_UsuariosCredenciales] (idUsuario);
GO


-- ******************************************************
-- TABLA: [dbo].[p_UsuariosOrganizacion]
-- ******************************************************
IF OBJECT_ID('[dbo].[p_UsuariosOrganizacion]', 'U') IS NOT NULL DROP TABLE [dbo].[p_UsuariosOrganizacion]
GO
CREATE TABLE [dbo].[p_UsuariosOrganizacion] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [idNodo] int NOT NULL,
    [esResponsable] bit NULL DEFAULT ((0)),
    CONSTRAINT [PK__p_Usuari__3213E83F1D2EB007] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_UsuariosOrganizacion] ADD CONSTRAINT [FK__p_Usuario__idUsu__495AADBA] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_UsuariosOrganizacion] ADD CONSTRAINT [FK__p_Usuario__idNod__4A4ED1F3] FOREIGN KEY ([idNodo]) REFERENCES [dbo].[p_OrganizacionNodos] ([id]);
GO


-- FUNCION: [dbo].[fn_SplitCsv_NVarChar]
/* =========================
   Helper: split CSV -> tabla
   ========================= */
CREATE   FUNCTION dbo.fn_SplitCsv_NVarChar
(
  @csv NVARCHAR(MAX)
)
RETURNS TABLE
AS
RETURN
(
  SELECT DISTINCT LTRIM(RTRIM(value)) AS item
  FROM STRING_SPLIT(ISNULL(@csv, N''), N',')
  WHERE LTRIM(RTRIM(value)) <> N''
);
GO

-- PROCEDIMIENTO: [dbo].[sp_Acceso_ObtenerArbol]
CREATE    PROCEDURE sp_Acceso_ObtenerArbol
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id AS idorg, nombre, tipo, idPadre AS padre, orden, activo 
    FROM p_OrganizacionNodos WHERE activo = 1;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_ActualizarTarea]
CREATE PROCEDURE [dbo].[sp_ActualizarTarea] @idTarea INT, @titulo NVARCHAR(500) = NULL, @descripcion NVARCHAR(MAX) = NULL, @estado NVARCHAR(50) = NULL, @prioridad NVARCHAR(50) = NULL, @progreso INT = NULL, @fechaObjetivo DATETIME = NULL, @fechaInicioPlanificada DATETIME = NULL, @linkEvidencia NVARCHAR(MAX) = NULL AS BEGIN SET NOCOUNT ON; DECLARE @fechaActual DATETIME = GETDATE(); UPDATE p_Tareas SET nombre = COALESCE(@titulo, nombre), descripcion = COALESCE(@descripcion, descripcion), estado = CASE WHEN @estado IS NOT NULL THEN @estado WHEN @progreso = 100 THEN 'Hecha' ELSE estado END, prioridad = COALESCE(@prioridad, prioridad), porcentaje = CASE WHEN @progreso IS NOT NULL THEN @progreso WHEN @estado = 'Hecha' THEN 100 ELSE porcentaje END, fechaObjetivo = COALESCE(@fechaObjetivo, fechaObjetivo), fechaInicioPlanificada = COALESCE(@fechaInicioPlanificada, fechaInicioPlanificada), linkEvidencia = COALESCE(@linkEvidencia, linkEvidencia), fechaActualizacion = @fechaActual, fechaCompletado = CASE WHEN (@estado = 'Hecha' OR @progreso = 100) AND fechaCompletado IS NULL THEN @fechaActual WHEN (@estado IS NOT NULL AND @estado != 'Hecha' AND @progreso != 100) THEN NULL ELSE fechaCompletado END WHERE idTarea = @idTarea; END
GO

-- PROCEDIMIENTO: [dbo].[sp_AgregarFaseGrupo]
-- 5.3 SP: Agregar Fase a Grupo (Plan de Trabajo)
CREATE   PROCEDURE sp_AgregarFaseGrupo
    @idGrupo INT,
    @idTareaNueva INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @n INT;
    SELECT @n = ISNULL(MAX(numeroParte), 0) + 1
    FROM p_Tareas WHERE idGrupo = @idGrupo;

    UPDATE p_Tareas
    SET idGrupo = @idGrupo, numeroParte = @n
    WHERE idTarea = @idTareaNueva;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Bloqueo_Crear]
/* =========================================================
   3) SP Mejorado: sp_Bloqueo_Crear
   ========================================================= */
CREATE   PROCEDURE dbo.sp_Bloqueo_Crear
(
    @idTarea          INT,
    @idOrigenUsuario  INT,
    @idDestinoUsuario INT = NULL,
    @destinoTexto     NVARCHAR(200) = NULL,
    @motivo           NVARCHAR(1000),
    @accionMitigacion NVARCHAR(1000) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idBloqueo INT;

        SELECT TOP (1) @idBloqueo = b.idBloqueo
        FROM dbo.p_Bloqueos b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.idTarea = @idTarea AND b.estado <> 'Resuelto'
        ORDER BY b.creadoEn DESC;

        IF @idBloqueo IS NULL
        BEGIN
            INSERT INTO dbo.p_Bloqueos
            (idTarea, idOrigenUsuario, idDestinoUsuario, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
            VALUES
            (@idTarea, @idOrigenUsuario, @idDestinoUsuario, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

            SET @idBloqueo = SCOPE_IDENTITY();
        END

        SELECT @idBloqueo AS idBloqueo;
        
        -- Actualizar estado tarea (fuera del INSERT para asegurar que se ejecute incluso si devolvimos bloqueo existente, aunque la regla de negocio podria variar)
        -- En este caso, aseguramos que la tarea se marque bloqueada.
        UPDATE dbo.p_Tareas
        SET estado = 'Bloqueada'
        WHERE idTarea = @idTarea
          AND activo = 1
          AND estado NOT IN ('Hecha', 'Archivada');

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Bloqueo_Crear_Carnet]
CREATE   PROCEDURE dbo.sp_Bloqueo_Crear_Carnet
(
    @idTarea          INT,
    @origenCarnet     NVARCHAR(50),
    @destinoCarnet    NVARCHAR(50) = NULL,
    @destinoTexto     NVARCHAR(200) = NULL,
    @motivo           NVARCHAR(1000),
    @accionMitigacion NVARCHAR(1000) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Resolver IDs
    DECLARE @idOrigen INT;
    DECLARE @idDestino INT = NULL;

    SELECT @idOrigen = idUsuario FROM dbo.p_Usuarios WHERE carnet = @origenCarnet;
    
    IF @idOrigen IS NULL 
    BEGIN
        THROW 50001, 'Usuario Origen no encontrado por carnet.', 1;
    END

    IF @destinoCarnet IS NOT NULL
    BEGIN
        SELECT @idDestino = idUsuario FROM dbo.p_Usuarios WHERE carnet = @destinoCarnet;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idBloqueo INT;

        -- Evitar duplicados activos
        SELECT TOP (1) @idBloqueo = b.idBloqueo
        FROM dbo.p_Bloqueos b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.idTarea = @idTarea AND b.estado <> 'Resuelto'
        ORDER BY b.creadoEn DESC;

        IF @idBloqueo IS NULL
        BEGIN
            INSERT INTO dbo.p_Bloqueos
            (idTarea, idOrigenUsuario, idDestinoUsuario, origenCarnet, destinoCarnet, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
            VALUES
            (@idTarea, @idOrigen, @idDestino, @origenCarnet, @destinoCarnet, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

            SET @idBloqueo = SCOPE_IDENTITY();
        END
        
        -- Actualizar Tarea a 'Bloqueada'
        UPDATE dbo.p_Tareas
        SET estado = 'Bloqueada', fechaActualizacion = GETDATE()
        WHERE idTarea = @idTarea
          AND activo = 1
          AND estado NOT IN ('Hecha', 'Archivada');

        COMMIT;
        SELECT @idBloqueo AS idBloqueo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Checkin_Crear]
CREATE   PROCEDURE sp_Checkin_Crear
    @idUsuario INT,
    @fecha DATE,
    @entregableTexto NVARCHAR(MAX),
    @nota NVARCHAR(MAX) = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @estadoAnimo NVARCHAR(50) = NULL,
    @idNodo INT = NULL,
    @energia INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Upsert simple: Si ya existe checkin para ese usuario/fecha, actualizar. Si no, insertar.
    MERGE p_Checkins AS target
    USING (SELECT @idUsuario, @fecha) AS source (idUsuario, fecha)
    ON (target.idUsuario = source.idUsuario AND target.fecha = source.fecha)
    WHEN MATCHED THEN
        UPDATE SET 
            entregableTexto = @entregableTexto,
            nota = @nota,
            linkEvidencia = @linkEvidencia,
            estadoAnimo = @estadoAnimo,
            idNodo = @idNodo,
            energia = @energia,
            fechaCreacion = GETDATE() -- o fechaActualizacion si existiera
    WHEN NOT MATCHED THEN
        INSERT (idUsuario, fecha, entregableTexto, nota, linkEvidencia, estadoAnimo, idNodo, energia, fechaCreacion)
        VALUES (@idUsuario, @fecha, @entregableTexto, @nota, @linkEvidencia, @estadoAnimo, @idNodo, @energia, GETDATE());
    
    -- Devolver ID (si insertó) o buscarlo
    SELECT idCheckin FROM p_Checkins WHERE idUsuario = @idUsuario AND fecha = @fecha;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Checkin_Upsert]
/* =========================================================
   2) SP Mejorado: sp_Checkin_Upsert
   ========================================================= */
CREATE   PROCEDURE dbo.sp_Checkin_Upsert
(
    @idUsuario        INT,
    @fecha            DATE,
    @entregableTexto  NVARCHAR(4000),
    @nota             NVARCHAR(4000) = NULL,
    @linkEvidencia    NVARCHAR(1000) = NULL,
    @estadoAnimo      NVARCHAR(50) = NULL,
    @idNodo           INT = NULL,
    @tareas           dbo.TVP_CheckinTareas READONLY
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; 

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idCheckin INT;

        SELECT @idCheckin = c.idCheckin
        FROM dbo.p_Checkins c WITH (UPDLOCK, HOLDLOCK)
        WHERE c.idUsuario = @idUsuario AND c.fecha = @fecha;

        IF @idCheckin IS NULL
        BEGIN
            INSERT INTO dbo.p_Checkins(idUsuario, fecha, entregableTexto, nota, linkEvidencia, estadoAnimo, idNodo)
            VALUES(@idUsuario, @fecha, @entregableTexto, @nota, @linkEvidencia, @estadoAnimo, @idNodo);

            SET @idCheckin = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.p_Checkins
            SET entregableTexto = @entregableTexto,
                nota = @nota,
                linkEvidencia = @linkEvidencia,
                estadoAnimo = @estadoAnimo,
                idNodo = @idNodo
            WHERE idCheckin = @idCheckin;
        END

        DELETE FROM dbo.p_CheckinTareas WHERE idCheckin = @idCheckin;

        INSERT INTO dbo.p_CheckinTareas(idCheckin, idTarea, tipo)
        SELECT
            @idCheckin,
            x.idTarea,
            x.tipo
        FROM (
            SELECT DISTINCT idTarea, tipo
            FROM @tareas
        ) x
        INNER JOIN dbo.p_Tareas t ON t.idTarea = x.idTarea
        WHERE t.activo = 1;

        COMMIT;

        SELECT @idCheckin AS idCheckin;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Checkin_Upsert_v2]
/* ========================================================================
   3. SPs 'CARNET-FIRST' (Nuevas versiones alineadas)
   ======================================================================== */

-- 3.1 sp_Checkin_Upsert_v2
CREATE   PROCEDURE dbo.sp_Checkin_Upsert_v2
(
    @usuarioCarnet   NVARCHAR(50),
    @fecha           DATE,
    @prioridad1      NVARCHAR(255) = NULL,
    @prioridad2      NVARCHAR(255) = NULL,
    @prioridad3      NVARCHAR(255) = NULL,
    @entregableTexto NVARCHAR(MAX) = NULL,
    @nota            NVARCHAR(MAX) = NULL,
    @linkEvidencia   NVARCHAR(1000) = NULL,
    @estadoAnimo     NVARCHAR(50) = NULL,
    @energia         INT = NULL,
    @idNodo          INT = NULL,
    @tareas          dbo.TVP_CheckinTareas READONLY 
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @usuarioCarnet;

    IF @idUsuario IS NULL
    BEGIN
        THROW 50001, 'Usuario no encontrado por carnet.', 1;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idCheckin INT;

        SELECT @idCheckin = idCheckin 
        FROM dbo.p_Checkins WITH (UPDLOCK, HOLDLOCK)
        WHERE idUsuario = @idUsuario AND CAST(fecha AS DATE) = @fecha;

        IF @idCheckin IS NULL
        BEGIN
            INSERT INTO dbo.p_Checkins(
                idUsuario, usuarioCarnet, fecha, 
                prioridad1, prioridad2, prioridad3, 
                entregableTexto, nota, linkEvidencia, 
                estadoAnimo, energia, idNodo
            )
            VALUES(
                @idUsuario, @usuarioCarnet, @fecha,
                @prioridad1, @prioridad2, @prioridad3,
                @entregableTexto, @nota, @linkEvidencia,
                @estadoAnimo, @energia, @idNodo
            );
            SET @idCheckin = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.p_Checkins
            SET 
                prioridad1 = @prioridad1,
                prioridad2 = @prioridad2,
                prioridad3 = @prioridad3,
                entregableTexto = @entregableTexto,
                nota = @nota,
                linkEvidencia = @linkEvidencia,
                estadoAnimo = @estadoAnimo,
                energia = @energia,
                idNodo = @idNodo
            WHERE idCheckin = @idCheckin;
        END

        IF EXISTS (SELECT 1 FROM @tareas)
        BEGIN
             DELETE FROM dbo.p_CheckinTareas WHERE idCheckin = @idCheckin;
             
             INSERT INTO dbo.p_CheckinTareas(idCheckin, idTarea, tipo)
             SELECT @idCheckin, t.idTarea, t.tipo
             FROM @tareas t
             INNER JOIN dbo.p_Tareas pt ON pt.idTarea = t.idTarea
             WHERE pt.activo = 1;
        END

        COMMIT;
        SELECT @idCheckin as idCheckin;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Checkins_ObtenerPorEquipoFecha]
-- =============================================
-- 1. OPTIMIZED CHECKIN RETRIEVAL
-- Replace inline query in clarity.repo.ts
-- Addresses: CAST(fecha as DATE) issue and Inline SQL
-- =============================================
CREATE   PROCEDURE [dbo].[sp_Checkins_ObtenerPorEquipoFecha]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Use TVP or String Split safely
    -- Ensure index IX_p_Checkins_Usuario_Fecha is used
    -- fecha column is DATE, so no CAST needed on column side.
    
    SELECT 
        c.idCheckin,
        c.usuarioCarnet,
        c.fecha,
        c.estadoAnimo,
        c.nota,
        c.entregableTexto,
        c.prioridad1,
        c.prioridad2,
        c.prioridad3,
        c.energia,
        c.linkEvidencia
    FROM p_Checkins c
    INNER JOIN STRING_SPLIT(@carnetsList, ',') s ON c.usuarioCarnet = s.value
    WHERE c.fecha = @fecha;

END
GO

-- PROCEDIMIENTO: [dbo].[sp_Clarity_CrearTareaRapida]
CREATE    PROCEDURE sp_Clarity_CrearTareaRapida
    @titulo NVARCHAR(200),
    @idUsuario INT,
    @prioridad NVARCHAR(50) = 'Media',
    @tipo NVARCHAR(50) = 'Administrativa'
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO p_Tareas (nombre, idCreador, estado, prioridad, tipo, fechaCreacion, fechaActualizacion)
    VALUES (@titulo, @idUsuario, 'Pendiente', @prioridad, @tipo, GETDATE(), GETDATE());
    SELECT SCOPE_IDENTITY() AS idTarea;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Clarity_MiDia_Get]
CREATE   PROCEDURE dbo.sp_Clarity_MiDia_Get
(
  @IdUsuario INT,
  @Fecha     DATE
)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  -- Buscamos el ID del último check-in anterior para los arrastrados (Solución para fines de semana)
  DECLARE @IdUltimoCheckin INT;
  SELECT TOP (1) @IdUltimoCheckin = idCheckin
  FROM dbo.p_Checkins
  WHERE idUsuario = @IdUsuario AND fecha < @Fecha
  ORDER BY fecha DESC, creadoEn DESC;

  -----------------------------------------------------------------------
  -- 1) Check-in hoy (Datos de la jornada actual)
  -----------------------------------------------------------------------
  SELECT TOP (1)
      c.idCheckin,
      c.fecha,
      c.entregableTexto,
      c.nota,
      c.creadoEn AS fechaCreacion -- Alias para el frontend
  FROM dbo.p_Checkins c
  WHERE c.idUsuario = @IdUsuario
    AND c.fecha     = @Fecha
  ORDER BY c.creadoEn DESC;

  -----------------------------------------------------------------------
  -- 2) Arrastrados (Tareas de la jornada anterior no finalizadas)
  -----------------------------------------------------------------------
  SELECT
      t.idTarea,
      t.nombre AS Titulo, -- Mapeamos 'nombre' a 'Titulo' para el Front
      t.estado,
      t.prioridad,
      t.esfuerzo,
      ISNULL(t.fechaActualizacion, t.fechaCreacion) AS fechaActualizacion,
      t.fechaObjetivo,
      t.idProyecto
  FROM dbo.p_Tareas t
  INNER JOIN dbo.p_CheckinTareas ct ON ct.idTarea = t.idTarea
  WHERE ct.idCheckin = @IdUltimoCheckin
    AND t.estado NOT IN ('Hecha','Descartada')
  ORDER BY
      CASE t.estado 
        WHEN 'EnCurso' THEN 1 
        WHEN 'Bloqueada' THEN 2 
        WHEN 'Revision' THEN 3 
        ELSE 4 END,
      CASE t.prioridad -- Orden lógico: Alta, Media, Baja
        WHEN 'Alta' THEN 1 
        WHEN 'Media' THEN 2 
        WHEN 'Baja' THEN 3 
        ELSE 4 END,
      ISNULL(t.fechaObjetivo, '9999-12-31') ASC;

  -----------------------------------------------------------------------
  -- 3) Mis bloqueos activos
  -----------------------------------------------------------------------
  SELECT
      b.idBloqueo,
      b.idTarea,
      t.nombre AS Tarea,
      b.descripcion AS Motivo,
      u.nombre AS BloqueadoPor,
      b.fechaCreacion,
      b.estado
  FROM dbo.p_Bloqueos b
  LEFT JOIN dbo.p_Usuarios u ON u.idUsuario = b.idUsuario
  LEFT JOIN dbo.p_Tareas   t ON t.idTarea   = b.idTarea
  WHERE b.idUsuario = @IdUsuario
    AND b.estado = 'Activo'
  ORDER BY b.fechaCreacion DESC;

  -----------------------------------------------------------------------
  -- 4) Selector de tareas pendientes (Backlog)
  -----------------------------------------------------------------------
  SELECT
      t.idTarea,
      t.nombre AS Titulo,
      t.estado,
      t.prioridad,
      t.esfuerzo,
      ISNULL(p.nombre, '(Personal)') AS Proyecto,
      t.fechaObjetivo,
      t.idProyecto
  FROM dbo.p_Tareas t
  INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
  LEFT  JOIN dbo.p_Proyectos p       ON p.idProyecto = t.idProyecto
  WHERE ta.idUsuario = @IdUsuario
    AND t.estado IN ('Pendiente','EnCurso','Bloqueada','Revision')
  ORDER BY
      CASE t.estado WHEN 'EnCurso' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END,
      CASE t.prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      ISNULL(t.fechaObjetivo, '9999-12-31') ASC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Clarity_MiDia_Get_Carnet]
-- 3.3 sp_Clarity_MiDia_Get_Carnet
CREATE   PROCEDURE dbo.sp_Clarity_MiDia_Get_Carnet
    @carnet NVARCHAR(50),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @carnet;

    -- CORRECCION: Usamos 'fechaCompletado' en lugar de 'fechaFinalizacion'
    -- Y agregamos ISNULL para evitar fallos si fechaCompletado es nulo
    SELECT t.*, p.nombre as nombreProyecto
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    WHERE t.idCreador = @idUsuario
      AND t.activo = 1
      AND (
          (t.estado NOT IN ('Hecha', 'Archivada') AND cast(t.fechaObjetivo as date) <= @fecha)
          OR
          (t.estado = 'Hecha' AND cast(t.fechaCompletado as date) = @fecha)
      )
    ORDER BY t.prioridad DESC, t.fechaObjetivo ASC;

    SELECT * FROM dbo.p_Checkins WHERE idUsuario = @idUsuario AND cast(fecha as date) = @fecha;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_CrearGrupoInicial]
-- 5.2 SP: Crear Grupo Inicial (Plan de Trabajo)
CREATE   PROCEDURE sp_CrearGrupoInicial
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Tareas
    SET idGrupo = @idTarea, numeroParte = 1
    WHERE idTarea = @idTarea AND (idGrupo IS NULL OR idGrupo = 0);
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Dashboard_Kpis]
-- 5. SP para KPIs Dashboard
CREATE   PROCEDURE [dbo].[sp_Dashboard_Kpis]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Usamos ta.carnet directo para asignados.
    -- Para creador, seguimos dependiendo de JOIN o subquery si no hay columna en p_Tareas.
    
    -- 1. Resumen Global
    SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END) as hechas,
        SUM(CASE WHEN estado IN ('Pendiente', 'EnCurso') THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'Bloqueada' THEN 1 ELSE 0 END) as bloqueadas,
        AVG(CAST(COALESCE(porcentaje, 0) AS FLOAT)) as promedioAvance
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE (
        t.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) 
        OR ta.carnet = @carnet -- Uso directo de columna Carnet si existe
    )
      AND t.activo = 1;

    -- 2. Resumen por Proyecto
    SELECT
        p.nombre as proyecto,
        p.area,
        COUNT(t.idTarea) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas
    FROM p_Tareas t
    JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE (
        t.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
        OR ta.carnet = @carnet
    )
      AND t.activo = 1
    GROUP BY p.nombre, p.area;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_DelegacionVisibilidad_Crear]
CREATE   PROCEDURE dbo.sp_DelegacionVisibilidad_Crear
  @delegante NVARCHAR(50),
  @delegado  NVARCHAR(50),
  @motivo    NVARCHAR(500) = NULL,
  @fecha_inicio NVARCHAR(50) = NULL,
  @fecha_fin    NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @d1 NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@delegante, N'')));
  DECLARE @d2 NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@delegado,  N'')));

  IF (@d1 = N'' OR @d2 = N'')
  BEGIN
    RAISERROR('Delegante/Delegado requerido.', 16, 1);
    RETURN;
  END

  DECLARE @fi DATETIME = TRY_CONVERT(DATETIME, @fecha_inicio);
  DECLARE @ff DATETIME = TRY_CONVERT(DATETIME, @fecha_fin);

  INSERT INTO dbo.p_delegacion_visibilidad
    (carnet_delegante, carnet_delegado, motivo, activo, creado_en, fecha_inicio, fecha_fin)
  VALUES
    (@d1, @d2, @motivo, 1, GETDATE(), @fi, @ff);

  SELECT SCOPE_IDENTITY() AS id;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_DelegacionVisibilidad_Desactivar]
CREATE   PROCEDURE dbo.sp_DelegacionVisibilidad_Desactivar
  @id BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.p_delegacion_visibilidad
  SET activo = 0
  WHERE id = @id;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_DelegacionVisibilidad_ListarActivas]
CREATE   PROCEDURE dbo.sp_DelegacionVisibilidad_ListarActivas
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM dbo.p_delegacion_visibilidad
  WHERE activo = 1
  ORDER BY creado_en DESC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_DelegacionVisibilidad_ListarPorDelegante]
CREATE   PROCEDURE dbo.sp_DelegacionVisibilidad_ListarPorDelegante
  @carnetDelegante NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetDelegante, N'')));

  SELECT *
  FROM dbo.p_delegacion_visibilidad
  WHERE LTRIM(RTRIM(carnet_delegante)) = @c
  ORDER BY creado_en DESC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_DelegacionVisibilidad_ObtenerActivas]
/* ============================================
   DELEGACIÓN VISIBILIDAD
   ============================================ */

CREATE   PROCEDURE dbo.sp_DelegacionVisibilidad_ObtenerActivas
  @carnetDelegado NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetDelegado, N'')));

  SELECT *
  FROM dbo.p_delegacion_visibilidad
  WHERE LTRIM(RTRIM(carnet_delegado)) = @c
    AND activo = 1
    AND (fecha_inicio IS NULL OR fecha_inicio <= GETDATE())
    AND (fecha_fin    IS NULL OR fecha_fin    >= GETDATE())
  ORDER BY creado_en DESC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Equipo_ObtenerHoy]
CREATE PROCEDURE dbo.sp_Equipo_ObtenerHoy @carnetsList NVARCHAR(MAX), @fecha DATE AS BEGIN SET NOCOUNT ON; DECLARE @d0 DATETIME2(0) = CONVERT(DATETIME2(0), @fecha); DECLARE @d1 DATETIME2(0) = DATEADD(DAY, 1, @d0); CREATE TABLE #Carnets ( carnet VARCHAR(20) NOT NULL PRIMARY KEY ); INSERT INTO #Carnets(carnet) SELECT DISTINCT CONVERT(VARCHAR(20), LTRIM(RTRIM(s.value))) FROM STRING_SPLIT(@carnetsList, ',') s WHERE LTRIM(RTRIM(s.value)) <> ''; ;WITH UsuariosFiltrados AS ( SELECT u.idUsuario, u.carnet FROM p_Usuarios u INNER JOIN #Carnets c ON c.carnet = u.carnet ) SELECT uf.idUsuario, uf.carnet, SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') AND t.fechaObjetivo < @d0 THEN 1 ELSE 0 END) AS retrasadas, SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') AND t.fechaObjetivo >= @d0 THEN 1 ELSE 0 END) AS planificadas, SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Hecha' AND COALESCE(t.fechaCompletado, t.fechaActualizacion) >= @d0 AND COALESCE(t.fechaCompletado, t.fechaActualizacion) < @d1 THEN 1 ELSE 0 END) AS hechas, SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'EnCurso' THEN 1 ELSE 0 END) AS enCurso, SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Bloqueada' AND t.activo = 1 THEN 1 ELSE 0 END) AS bloqueadas, SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Descartada' AND t.fechaActualizacion >= @d0 AND t.fechaActualizacion < @d1 THEN 1 ELSE 0 END) AS descartadas FROM UsuariosFiltrados uf LEFT JOIN p_TareaAsignados ta ON ta.carnet = uf.carnet LEFT JOIN p_Tareas t ON t.idTarea = ta.idTarea AND t.activo = 1 AND ( t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') OR (t.estado = 'Hecha' AND COALESCE(t.fechaCompletado, t.fechaActualizacion) >= @d0 AND COALESCE(t.fechaCompletado, t.fechaActualizacion) < @d1) OR (t.estado = 'Descartada' AND t.fechaActualizacion >= @d0 AND t.fechaActualizacion < @d1) OR t.estado IN ('EnCurso', 'Bloqueada') ) GROUP BY uf.idUsuario, uf.carnet OPTION (RECOMPILE); END
GO

-- PROCEDIMIENTO: [dbo].[sp_Equipo_ObtenerHoy2]
/**
 * SP: sp_Equipo_ObtenerHoy (OPTIMIZADO)
 * Claves de rendimiento:
 *  - Parsear @carnetsList a #Carnets (PK) para joins rápidos
 *  - Quitar CAST(col AS DATE) (mata índices) y usar rangos [@d0, @d1)
 *  - Filtrar Hecha/Descartada solo para el día (reduce lectura)
 *  - OPTION(RECOMPILE) para evitar planes malos por tamaños variables de lista
 *
 * Índices recomendados (si no existen):
 *  1) p_TareaAsignados:  IX_p_TareaAsignados_Carnet_IdTarea (carnet, idTarea)
 *  2) p_Tareas:          IX_p_Tareas_Activo_Estado_FechaObj (activo, estado, fechaObjetivo) INCLUDE(idTarea)
 *  3) p_Tareas:          IX_p_Tareas_Hecha_FechaComp        (estado, fechaCompletado) INCLUDE(activo, idTarea)
 *  4) p_Tareas:          IX_p_Tareas_Desc_FechaAct          (estado, fechaActualizacion) INCLUDE(activo, idTarea)
 *  5) p_Usuarios:        UX/IX_p_Usuarios_Carnet            (carnet) INCLUDE(idUsuario)
 */
create PROCEDURE dbo.sp_Equipo_ObtenerHoy2
    @carnetsList NVARCHAR(MAX),
    @fecha       DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @d0 DATETIME2(0) = CONVERT(DATETIME2(0), @fecha);
    DECLARE @d1 DATETIME2(0) = DATEADD(DAY, 1, @d0);

    -- 1) Lista de carnets a una tabla temporal con índice (rápido para JOIN)
    CREATE TABLE #Carnets
    (
        carnet VARCHAR(20) NOT NULL PRIMARY KEY
    );

    INSERT INTO #Carnets(carnet)
    SELECT DISTINCT CONVERT(VARCHAR(20), LTRIM(RTRIM(s.value)))
    FROM STRING_SPLIT(@carnetsList, ',') s
    WHERE LTRIM(RTRIM(s.value)) <> '';

    -- 2) Base de usuarios (para devolver 0s aunque no tengan tareas)
    ;WITH UsuariosFiltrados AS
    (
        SELECT u.idUsuario, u.carnet
        FROM p_Usuarios u
        INNER JOIN #Carnets c ON c.carnet = u.carnet
    )
    SELECT
        uf.idUsuario,
        uf.carnet,

        -- Retrasadas: estados activos con fechaObjetivo < hoy
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
                 AND t.fechaObjetivo < @d0
                THEN 1 ELSE 0
            END) AS retrasadas,

        -- Planificadas: estados activos con fechaObjetivo >= hoy
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
                 AND t.fechaObjetivo >= @d0
                THEN 1 ELSE 0
            END) AS planificadas,

        -- Hechas HOY
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Hecha'
                 AND t.fechaCompletado >= @d0
                 AND t.fechaCompletado <  @d1
                THEN 1 ELSE 0
            END) AS hechas,

        -- EnCurso (histórico activo)
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'EnCurso'
                THEN 1 ELSE 0
            END) AS enCurso,

        -- Bloqueadas (histórico activo)
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Bloqueada'
                THEN 1 ELSE 0
            END) AS bloqueadas,

        -- Descartadas HOY
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Descartada'
                 AND t.fechaActualizacion >= @d0
                 AND t.fechaActualizacion <  @d1
                THEN 1 ELSE 0
            END) AS descartadas

    FROM UsuariosFiltrados uf
    LEFT JOIN p_TareaAsignados ta
        ON ta.carnet = uf.carnet
    LEFT JOIN p_Tareas t
        ON t.idTarea = ta.idTarea
       AND t.activo = 1
       AND (
            t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
            OR (t.estado = 'Hecha'       AND t.fechaCompletado   >= @d0 AND t.fechaCompletado   < @d1)
            OR (t.estado = 'Descartada'  AND t.fechaActualizacion>= @d0 AND t.fechaActualizacion< @d1)
       )
    GROUP BY uf.idUsuario, uf.carnet
    OPTION (RECOMPILE);
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Equipo_ObtenerInforme]
/*
  NOMBRE: sp_Equipo_ObtenerInforme
  DESCRIPCION: Obtiene estadÃ­sticas DETALLADAS de ejecuciÃ³n para 'Mi Equipo'.
  Separado de sp_Equipo_ObtenerHoy para evitar conflictos con Dashboards existentes.
  
  LOGICA (Solicitada por Usuario):
  1. Retrasadas: Tareas Activas (Pendiente, EnCurso, Bloqueada) con FechaObjetivo < @fecha.
  2. Planificadas (Activas): Tareas Activas con FechaObjetivo <= @fecha (Backlog activo + Hoy).
  3. EnCurso: Estado 'EnCurso'.
  4. Bloqueadas: Estado 'Bloqueada'.
  5. Hechas: Completadas HOY (comparaciÃ³n exacta de fecha).
  6. Descartadas: Descartadas HOY.
*/

CREATE   PROCEDURE [dbo].[sp_Equipo_ObtenerInforme]
    @carnetsList NVARCHAR(MAX),
    @fecha DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @fechaDate DATE = CAST(@fecha AS DATE);

    -- Tabla temporal para los carnets a consultar
    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    
    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT TRIM(value)
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE TRIM(value) <> '';

    -- Resultado final
    SELECT 
        c.carnet,
        
        -- RETRASADAS: Activas y FechaObjetivo < Hoy
        ISNULL(SUM(CASE 
            WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision') 
                 AND CAST(t.fechaObjetivo AS DATE) < @fechaDate 
            THEN 1 ELSE 0 END), 0) as retrasadas,

        -- PLANIFICADAS (Carga Activa): Activas y (FechaObjetivo <= Hoy O Null)
        ISNULL(SUM(CASE 
            WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision', 'Pausa') 
                 AND (t.fechaObjetivo IS NULL OR CAST(t.fechaObjetivo AS DATE) <= @fechaDate)
            THEN 1 ELSE 0 END), 0) as planificadas,

        -- HECHAS (Solo hoy)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Hecha' 
                 AND CAST(t.fechaCompletado AS DATE) = @fechaDate 
            THEN 1 ELSE 0 END), 0) as hechas,
            
        -- EN CURSO (Estado actual absoluto)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'EnCurso' 
            THEN 1 ELSE 0 END), 0) as enCurso,

        -- BLOQUEADAS (Estado actual absoluto)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Bloqueada' 
            THEN 1 ELSE 0 END), 0) as bloqueadas,

        -- DESCARTADAS (Solo hoy)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Descartada' 
                 AND CAST(t.fechaActualizacion AS DATE) = @fechaDate 
            THEN 1 ELSE 0 END), 0) as descartadas

    FROM #Carnets c
    LEFT JOIN dbo.p_TareaAsignados ta ON ta.carnet = c.carnet
    LEFT JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea AND t.activo = 1
    GROUP BY c.carnet
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Nota_Actualizar]
-- 10. SP para Actualizar Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Actualizar]
    @idNota INT,
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Notas 
    SET titulo = @titulo, 
        contenido = @contenido, 
        fechaModificacion = GETDATE()
    WHERE idNota = @idNota;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Nota_Crear]
-- 7. SP para Crear Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Crear]
    @carnet NVARCHAR(50),
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    IF @idUsuario IS NULL RETURN;

    INSERT INTO p_Notas(idUsuario, titulo, contenido, fechaCreacion, fechaModificacion)
    VALUES(@idUsuario, @titulo, @contenido, GETDATE(), GETDATE());
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Nota_Eliminar]
-- 11. SP para Eliminar Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Eliminar]
    @id INT -- idNota
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM p_Notas WHERE idNota = @id;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Notas_Obtener]
-- 6. SP para Obtener Notas
CREATE   PROCEDURE [dbo].[sp_Notas_Obtener]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    -- Notas usan idUsuario? Si p_Notas tiene idUsuario, necesitamos resolver.
    -- Si migramos p_Notas a usar carnet, cambiaríamos esto. Asumimos standard behavior.
    
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    SELECT * FROM p_Notas 
    WHERE idUsuario = @idUsuario 
    ORDER BY fechaModificacion DESC, fechaCreacion DESC;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_ObtenerProyectos]
-- =============================================
-- MIGRACIÃ“N CLARITY: SPs CARNET-FIRST FINAL
-- Fecha: 2026-01-26
-- =============================================

-- 1. SP: Obtener Proyectos
CREATE   PROCEDURE [dbo].[sp_ObtenerProyectos]
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DISTINCT p.*
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea 
    WHERE (
        p.creadorCarnet = @carnet 
        OR p.responsableCarnet = @carnet
        OR ta.carnet = @carnet
        OR p.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) -- Fallback
    )
    AND (@filtroNombre IS NULL OR p.nombre LIKE '%' + @filtroNombre + '%')
    AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Organizacion_BuscarNodoPorId]
CREATE   PROCEDURE dbo.sp_Organizacion_BuscarNodoPorId
  @idorg BIGINT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
    id          AS idorg,
    nombre,
    tipo,
    idPadre     AS padre,
    orden,
    activo
  FROM dbo.p_OrganizacionNodos
  WHERE id = @idorg;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Organizacion_BuscarNodos]
CREATE   PROCEDURE dbo.sp_Organizacion_BuscarNodos
  @termino NVARCHAR(200)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @t NVARCHAR(210) = N'%' + ISNULL(@termino, N'') + N'%';

  SELECT TOP 50
    id          AS idorg,
    nombre,
    tipo,
    idPadre     AS padre,
    orden,
    activo
  FROM dbo.p_OrganizacionNodos
  WHERE LOWER(nombre) LIKE LOWER(@t)
  ORDER BY nombre;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Organizacion_ContarEmpleadosNodoDirecto]
CREATE   PROCEDURE dbo.sp_Organizacion_ContarEmpleadosNodoDirecto
  @idOrg INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT COUNT(*) AS total
  FROM dbo.p_Usuarios u
  WHERE u.activo = 1
    AND u.idOrg = @idOrg;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Organizacion_ContarEmpleadosPorNodo]
CREATE   PROCEDURE dbo.sp_Organizacion_ContarEmpleadosPorNodo
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    CAST(u.idOrg AS NVARCHAR(50)) AS idOrg,
    COUNT(*) AS [count]
  FROM dbo.p_Usuarios u
  WHERE u.activo = 1
    AND u.idOrg IS NOT NULL
  GROUP BY u.idOrg;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Organizacion_ObtenerArbol]
/* ============================================
   ORGANIZACIÓN
   ============================================ */

CREATE   PROCEDURE dbo.sp_Organizacion_ObtenerArbol
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    id          AS idorg,
    nombre,
    tipo,
    idPadre     AS padre,
    orden,
    activo
  FROM dbo.p_OrganizacionNodos
  WHERE activo = 1
  ORDER BY orden, nombre;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Organizacion_ObtenerEmpleadosNodoDirecto]
CREATE   PROCEDURE dbo.sp_Organizacion_ObtenerEmpleadosNodoDirecto
  @idOrg INT,
  @limite INT = 50
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (@limite)
    u.idUsuario, u.carnet, u.nombre, u.nombreCompleto, u.correo,
    u.cargo, u.departamento, u.orgDepartamento, u.orgGerencia,
    u.idOrg, u.jefeCarnet, u.jefeNombre, u.jefeCorreo, u.activo,
    u.gerencia, u.subgerencia, u.idRol, u.rolGlobal
  FROM dbo.p_Usuarios u
  WHERE u.activo = 1
    AND u.idOrg = @idOrg
  ORDER BY u.nombreCompleto;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Organizacion_SubarbolContarEmpleados]
CREATE   PROCEDURE dbo.sp_Organizacion_SubarbolContarEmpleados
  @idOrgRaiz NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @id NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@idOrgRaiz, N'')));
  IF (@id = N'')
  BEGIN
    SELECT CAST(0 AS INT) AS total;
    RETURN;
  END

  ;WITH NodosSub AS
  (
    SELECT CAST(id AS NVARCHAR(50)) AS idorg
    FROM dbo.p_OrganizacionNodos
    WHERE CAST(id AS NVARCHAR(50)) = @id

    UNION ALL

    SELECT CAST(n.id AS NVARCHAR(50))
    FROM dbo.p_OrganizacionNodos n
    JOIN NodosSub ns ON CAST(n.idPadre AS NVARCHAR(50)) = ns.idorg
  )
  SELECT COUNT(*) AS total
  FROM dbo.p_Usuarios u
  JOIN NodosSub ns ON CAST(u.idOrg AS NVARCHAR(50)) = ns.idorg
  WHERE u.activo = 1;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Organizacion_SubarbolPreviewEmpleados]
CREATE   PROCEDURE dbo.sp_Organizacion_SubarbolPreviewEmpleados
  @idOrgRaiz NVARCHAR(50),
  @limite INT = 50
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @id NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@idOrgRaiz, N'')));
  IF (@id = N'')
  BEGIN
    SELECT TOP 0 * FROM dbo.p_Usuarios;
    RETURN;
  END

  ;WITH NodosSub AS
  (
    SELECT CAST(id AS NVARCHAR(50)) AS idorg
    FROM dbo.p_OrganizacionNodos
    WHERE CAST(id AS NVARCHAR(50)) = @id

    UNION ALL

    SELECT CAST(n.id AS NVARCHAR(50))
    FROM dbo.p_OrganizacionNodos n
    JOIN NodosSub ns ON CAST(n.idPadre AS NVARCHAR(50)) = ns.idorg
  )
  SELECT TOP (@limite)
    u.idUsuario, u.carnet, u.nombre, u.nombreCompleto, u.correo,
    u.cargo, u.departamento, u.orgDepartamento, u.orgGerencia,
    u.idOrg, u.jefeCarnet, u.jefeNombre, u.jefeCorreo, u.activo,
    u.gerencia, u.subgerencia, u.idRol, u.rolGlobal
  FROM dbo.p_Usuarios u
  JOIN NodosSub ns ON CAST(u.idOrg AS NVARCHAR(50)) = ns.idorg
  WHERE u.activo = 1
  ORDER BY u.nombreCompleto;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_PermisoArea_Crear]
CREATE   PROCEDURE dbo.sp_PermisoArea_Crear
  @otorga  NVARCHAR(50) = NULL,
  @recibe  NVARCHAR(50),
  @idorg   BIGINT,
  @alcance NVARCHAR(50) = N'SUBARBOL',
  @motivo  NVARCHAR(500) = NULL,
  @fecha_fin NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @r NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@recibe, N'')));
  IF (@r = N'')
  BEGIN
    RAISERROR('carnet_recibe requerido.', 16, 1);
    RETURN;
  END

  DECLARE @ff DATETIME = TRY_CONVERT(DATETIME, @fecha_fin);

  INSERT INTO dbo.p_permiso_area
    (carnet_otorga, carnet_recibe, idorg_raiz, alcance, motivo, activo, creado_en, fecha_fin)
  VALUES
    (NULLIF(LTRIM(RTRIM(@otorga)), N''), @r, @idorg, @alcance, @motivo, 1, GETDATE(), @ff);

  SELECT SCOPE_IDENTITY() AS id;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_PermisoArea_Desactivar]
CREATE   PROCEDURE dbo.sp_PermisoArea_Desactivar
  @id BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.p_permiso_area
  SET activo = 0
  WHERE id = @id;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_PermisoArea_ListarActivos]
CREATE   PROCEDURE dbo.sp_PermisoArea_ListarActivos
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM dbo.p_permiso_area
  WHERE activo = 1
  ORDER BY creado_en DESC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_PermisoArea_ObtenerActivosPorRecibe]
/* ============================================
   PERMISO ÁREA
   ============================================ */

CREATE   PROCEDURE dbo.sp_PermisoArea_ObtenerActivosPorRecibe
  @carnetRecibe NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetRecibe, N'')));

  SELECT *
  FROM dbo.p_permiso_area
  WHERE LTRIM(RTRIM(carnet_recibe)) = @c
    AND activo = 1
  ORDER BY creado_en DESC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_PermisoEmpleado_Crear]
CREATE   PROCEDURE dbo.sp_PermisoEmpleado_Crear
  @otorga  NVARCHAR(50) = NULL,
  @recibe  NVARCHAR(50),
  @objetivo NVARCHAR(50),
  @tipo    NVARCHAR(50) = N'ALLOW',
  @motivo  NVARCHAR(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @r NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@recibe, N'')));
  DECLARE @o NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@objetivo, N'')));

  IF (@r = N'' OR @o = N'')
  BEGIN
    RAISERROR('carnet_recibe y carnet_objetivo requeridos.', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.p_permiso_empleado
    (carnet_otorga, carnet_recibe, carnet_objetivo, tipo_acceso, motivo, activo, creado_en)
  VALUES
    (NULLIF(LTRIM(RTRIM(@otorga)), N''), @r, @o, @tipo, @motivo, 1, GETDATE());

  SELECT SCOPE_IDENTITY() AS id;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_PermisoEmpleado_Desactivar]
CREATE   PROCEDURE dbo.sp_PermisoEmpleado_Desactivar
  @id BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.p_permiso_empleado
  SET activo = 0
  WHERE id = @id;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_PermisoEmpleado_ListarActivos]
CREATE   PROCEDURE dbo.sp_PermisoEmpleado_ListarActivos
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM dbo.p_permiso_empleado
  WHERE activo = 1
  ORDER BY creado_en DESC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_PermisoEmpleado_ObtenerActivosPorRecibe]
/* ============================================
   PERMISO EMPLEADO
   ============================================ */

CREATE   PROCEDURE dbo.sp_PermisoEmpleado_ObtenerActivosPorRecibe
  @carnetRecibe NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetRecibe, N'')));

  SELECT *
  FROM dbo.p_permiso_empleado
  WHERE LTRIM(RTRIM(carnet_recibe)) = @c
    AND activo = 1
  ORDER BY creado_en DESC;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Planning_ObtenerPlanes]
-- SP: Obtener Planes de Trabajo (Carnet-First)
CREATE   PROCEDURE [dbo].[sp_Planning_ObtenerPlanes]
    @carnet NVARCHAR(50),
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idPlan INT;
    
    -- 1. Intentar buscar por carnet directo
    SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
    WHERE carnet = @carnet AND mes = @mes AND anio = @anio;

    -- 2. Fallback por si acaso (aunque la migraciÃ³n ya los llenÃ³)
    IF @idPlan IS NULL
    BEGIN
        SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
        WHERE idUsuario = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
          AND mes = @mes AND anio = @anio;
    END

    IF @idPlan IS NULL 
    BEGIN
        -- No existe, devolvemos resultset vacÃ­o o null
        SELECT NULL as idPlan;
    END
    ELSE
    BEGIN
        -- Devolver datos del plan
        SELECT * FROM p_PlanesTrabajo WHERE idPlan = @idPlan;
        
        -- Devolver tareas asociadas al plan
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC;
    END
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Proyecto_ObtenerVisibles]
-- 2. sp_Proyecto_ObtenerVisibles (Zero Inline SQL)
CREATE   PROCEDURE dbo.sp_Proyecto_ObtenerVisibles
(
    @idUsuario INT,
    @idsEquipo dbo.TVP_IntList READONLY, -- Lista de IDs (Yo + Subordinados)
    @nombre    NVARCHAR(100) = NULL,
    @estado    NVARCHAR(50) = NULL,
    @gerencia  NVARCHAR(100) = NULL,
    @area      NVARCHAR(100) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Filtra proyectos donde:
    -- A) Soy el creador
    -- B) Tengo tareas asignadas (yo o mi equipo subordinado)
    SELECT DISTINCT p.*
    FROM dbo.p_Proyectos p
    WHERE 
        (
            p.idCreador = @idUsuario
            OR EXISTS (
                SELECT 1
                FROM dbo.p_Tareas t
                INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                INNER JOIN @idsEquipo team ON team.Id = ta.idUsuario
                WHERE t.idProyecto = p.idProyecto
            )
        )
        AND (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@area IS NULL OR p.area = @area)
    ORDER BY p.fechaCreacion DESC;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Proyectos_Listar]
-- =============================================
-- 2. OPTIMIZED PROJECT LISTING
-- Replace inline query in planning.repo.ts -> obtenerTodosProyectos
-- Addresses: Table Scans, Excessive SELECT *, Lack of Pagination
-- =============================================
CREATE   PROCEDURE [dbo].[sp_Proyectos_Listar]
    @nombre NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @gerencia NVARCHAR(100) = NULL,
    @subgerencia NVARCHAR(100) = NULL,
    @area NVARCHAR(100) = NULL,
    @tipo NVARCHAR(50) = NULL,
    @pageNumber INT = 1,
    @pageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @offset INT = (@pageNumber - 1) * @pageSize;

    -- Dynamic SQL or sophisticated IF/ELSE is often needed for optional params to ensure index usage,
    -- but usually `(@p IS NULL OR col = @p)` is "okay" in modern SQL Server (Option Recompile).
    -- Given the simplicity, we'll stick to a clean query with OPTION (RECOMPILE).

    SELECT 
        idProyecto,
        nombre,
        descripcion,
        estado,
        prioridad,
        fechaInicio,
        fechaFin,
        fechaCreacion,
        area,
        gerencia,
        subgerencia,
        responsableCarnet,
        creadorCarnet,
        tipo,
        porcentaje = (SELECT AVG(porcentaje) FROM p_Tareas t WHERE t.idProyecto = p.idProyecto AND t.activo = 1) -- Keep efficient subquery or move to View if slow
    FROM p_Proyectos p
    WHERE 
        (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@subgerencia IS NULL OR p.subgerencia = @subgerencia)
        AND (@area IS NULL OR p.area = @area)
        AND (@tipo IS NULL OR p.tipo = @tipo)
    ORDER BY p.fechaCreacion DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    OPTION (RECOMPILE); -- Forces fresh plan for different parameter combinations (Critical for optional filters)

END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_AsignarResponsable]
-- 2. SP para Asignar Responsable (Usa Carnet)
CREATE   PROCEDURE [dbo].[sp_Tarea_AsignarResponsable]
    @idTarea INT,
    @carnetUsuario NVARCHAR(50),
    @tipo NVARCHAR(20) = 'Responsable',
    @esReasignacion BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Necesitamos el ID para mantener integridad FK si la columna idUsuario es NOT NULL
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnetUsuario;
    
    IF @idUsuario IS NULL RETURN;

    IF @esReasignacion = 1
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
    END

    IF NOT EXISTS (SELECT 1 FROM p_TareaAsignados WHERE idTarea = @idTarea AND carnet = @carnetUsuario)
    BEGIN
        -- Insertamos TANTO el ID como el CARNET para mantener consistencia
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
        VALUES (@idTarea, @idUsuario, @carnetUsuario, @tipo, GETDATE());
    END
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_Bloquear]
-- =============================================
-- MIGRACIÓN CLARITY: PAQUETE 2 (CORREGIDO V2 - CAMPOS CARNET NATIVOS)
-- Fecha: 2026-01-25
-- =============================================

-- 4. SP para Bloquear Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Bloquear]
    @idTarea INT,
    @carnetOrigen NVARCHAR(50),
    @carnetDestino NVARCHAR(50) = NULL,
    @motivo NVARCHAR(255),
    @destinoTexto NVARCHAR(255) = NULL,
    @accionMitigacion NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idOrigen INT, @idDestino INT;
    SELECT @idOrigen = idUsuario FROM p_Usuarios WHERE carnet = @carnetOrigen;
    
    IF @carnetDestino IS NOT NULL
        SELECT @idDestino = idUsuario FROM p_Usuarios WHERE carnet = @carnetDestino;

    IF @idOrigen IS NULL RETURN; 

    IF EXISTS (SELECT 1 FROM p_Bloqueos WHERE idTarea = @idTarea AND estado != 'Resuelto')
    BEGIN
        SELECT idBloqueo, 1 as yaExistia FROM p_Bloqueos WHERE idTarea = @idTarea AND estado != 'Resuelto';
        RETURN;
    END

    -- Insert
    INSERT INTO p_Bloqueos(idTarea, idOrigenUsuario, idDestinoUsuario, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
    VALUES(@idTarea, @idOrigen, @idDestino, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

    UPDATE p_Tareas SET estado = 'Bloqueada' WHERE idTarea = @idTarea;
    SELECT SCOPE_IDENTITY() as idBloqueo, 0 as yaExistia;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_Clonar]
-- 3. SP: Clonar Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Clonar]
    @idTareaFuente INT,
    @ejecutorCarnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewId INT;
    DECLARE @idEjecutor INT;
    SELECT @idEjecutor = idUsuario FROM p_Usuarios WHERE carnet = @ejecutorCarnet;

    INSERT INTO p_Tareas (
        nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, idCreador, creadorCarnet,
        fechaCreacion, porcentaje, comportamiento, linkEvidencia, activo, idPlan
    )
    SELECT 
        nombre + ' (Copia)', descripcion, idProyecto, 'Pendiente', prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, @idEjecutor, @ejecutorCarnet,
        GETDATE(), 0, comportamiento, linkEvidencia, 1, idPlan
    FROM p_Tareas
    WHERE idTarea = @idTareaFuente;

    SET @NewId = SCOPE_IDENTITY();

    -- Clonar asignados
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
    SELECT @NewId, idUsuario, carnet, tipo, GETDATE()
    FROM p_TareaAsignados
    WHERE idTarea = @idTareaFuente;

    SELECT @NewId as idTarea;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_Crear]
-- 2. SP: Crear Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Crear]
    @nombre NVARCHAR(500),
    @descripcion NVARCHAR(MAX) = NULL,
    @idProyecto INT = NULL,
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(20) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @idUsuario INT = 0, -- Legacy / Fallback
    @carnet NVARCHAR(50) = NULL, -- Creador Carnet
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(20) = 'SIMPLE',
    @idTareaPadre INT = NULL,
    @idPlan INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewId INT;
    DECLARE @idCreadorFinal INT = @idUsuario;
    DECLARE @carnetFinal NVARCHAR(50) = @carnet;

    -- Resolver ID si no viene
    IF @idCreadorFinal = 0 AND @carnetFinal IS NOT NULL
        SELECT @idCreadorFinal = idUsuario FROM p_Usuarios WHERE carnet = @carnetFinal;
    
    -- Resolver Carnet si no viene
    IF @carnetFinal IS NULL AND @idCreadorFinal <> 0
        SELECT @carnetFinal = carnet FROM p_Usuarios WHERE idUsuario = @idCreadorFinal;

    INSERT INTO p_Tareas (
        nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, idCreador, creadorCarnet,
        fechaCreacion, porcentaje, comportamiento, idTareaPadre, idPlan, orden, activo
    )
    VALUES (
        @nombre, @descripcion, @idProyecto, 'Pendiente', @prioridad, @esfuerzo, @tipo,
        @fechaInicioPlanificada, @fechaObjetivo, @idCreadorFinal, @carnetFinal,
        GETDATE(), @porcentaje, @comportamiento, @idTareaPadre, @idPlan, @orden, 1
    );

    SELECT SCOPE_IDENTITY() as idTarea;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_Crear_Carnet]
-- 3.2 sp_Tarea_Crear_Carnet
CREATE   PROCEDURE dbo.sp_Tarea_Crear_Carnet
(
    @creadorCarnet NVARCHAR(50),
    @titulo NVARCHAR(255),
    @descripcion NVARCHAR(MAX) = NULL,
    @idProyecto INT = NULL,
    @prioridad NVARCHAR(50) = 'Media',
    @fechaObjetivo DATETIME = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @creadorCarnet;

    IF @idUsuario IS NULL THROW 50001, 'Creador no encontrado.', 1;

    INSERT INTO dbo.p_Tareas(
        nombre, descripcion, idProyecto, 
        idCreador, creadorCarnet, 
        prioridad, fechaObjetivo, 
        estado, fechaCreacion, activo
    )
    VALUES(
        @titulo, @descripcion, @idProyecto,
        @idUsuario, @creadorCarnet,
        @prioridad, ISNULL(@fechaObjetivo, GETDATE()),
        'Pendiente', GETDATE(), 1
    );

    SELECT SCOPE_IDENTITY() as idTarea;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_CrearCompleta]
/* =========================================================
   4) SP Mejorado: sp_Tarea_CrearCompleta
   ========================================================= */
CREATE   PROCEDURE dbo.sp_Tarea_CrearCompleta
(
    @nombre NVARCHAR(255),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(50) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(50) = NULL,
    @idTareaPadre INT = NULL,
    @idResponsable INT = NULL,
    @requiereEvidencia BIT = 0,
    @idEntregable INT = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        IF @fechaObjetivo IS NULL
            SET @fechaObjetivo = GETDATE();

        IF @idTareaPadre IS NOT NULL
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM dbo.p_Tareas p
                WHERE p.idTarea = @idTareaPadre
                  AND p.activo = 1
            )
            BEGIN
                THROW 50001, 'idTareaPadre inválido o no existe.', 1;
            END
        END

        INSERT INTO dbo.p_Tareas (
            nombre, idCreador, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
            fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, comportamiento,
            idTareaPadre, requiereEvidencia, idEntregable, fechaCreacion, activo
        )
        VALUES (
            @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
            @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento,
            @idTareaPadre, @requiereEvidencia, @idEntregable, GETDATE(), 1
        );

        DECLARE @idTarea INT = SCOPE_IDENTITY();

        IF @idResponsable IS NOT NULL AND @idResponsable <> @idUsuario
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM dbo.p_TareaAsignados 
                WHERE idTarea = @idTarea AND idUsuario = @idResponsable AND tipo = 'Responsable'
            )
            BEGIN
                INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
                VALUES (@idTarea, @idResponsable, 'Responsable', GETDATE());
            END
        END

        COMMIT;
        SELECT @idTarea AS idTarea;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_CrearCompleta_v2]
-- 2.2 CreaciÃ³n Robusta (AtÃ³mica)
CREATE   PROCEDURE dbo.sp_Tarea_CrearCompleta_v2
(
    @nombre NVARCHAR(255),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @idResponsable INT = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(50) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(50) = NULL,
    @requiereEvidencia BIT = 0,
    @idEntregable INT = NULL,
    @semana INT = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;
        
        -- Defaults
        IF @fechaObjetivo IS NULL SET @fechaObjetivo = GETDATE();
        
        -- ValidaciÃ³n %
        IF @porcentaje < 0 OR @porcentaje > 100
             THROW 50020, 'El porcentaje debe estar entre 0 y 100.', 1;

        -- NormalizaciÃ³n Hecha
        IF @estado = 'Hecha' SET @porcentaje = 100;

        -- Validaciones de Padre
        IF @idTareaPadre IS NOT NULL
        BEGIN
            -- Existencia
            IF NOT EXISTS (SELECT 1 FROM dbo.p_Tareas WHERE idTarea = @idTareaPadre AND activo = 1)
                THROW 50021, 'La tarea padre no existe o no estÃ¡ activa.', 1;

            -- Consistencia Proyecto (Opcional segÃºn regla de negocio, aquÃ­ estricta)
            IF @idProyecto IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dbo.p_Tareas WHERE idTarea = @idTareaPadre AND idProyecto = @idProyecto)
                    THROW 50022, 'La tarea padre debe pertenecer al mismo proyecto.', 1;
            END
        END

        INSERT INTO dbo.p_Tareas (
            nombre, idCreador, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
            fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, comportamiento,
            idTareaPadre, requiereEvidencia, idEntregable, fechaCreacion, activo, semana
        )
        VALUES (
            @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
            @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento,
            @idTareaPadre, @requiereEvidencia, @idEntregable, GETDATE(), 1, @semana
        );

        DECLARE @idTarea INT = SCOPE_IDENTITY();

        -- AsignaciÃ³n Responsable (Si difiere de creador)
        IF @idResponsable IS NOT NULL AND @idResponsable <> @idUsuario
        BEGIN
            INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
            VALUES (@idTarea, @idResponsable, 'Responsable', GETDATE());
        END

        COMMIT;
        SELECT @idTarea AS idTarea;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_Eliminar]
-- 3. SP para Eliminar Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Eliminar]
    @idTarea INT,
    @carnetSolicitante NVARCHAR(50),
    @motivo NVARCHAR(255) = 'Eliminación manual'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @carnetCreador NVARCHAR(50);
    DECLARE @fechaCreacion DATETIME;
    DECLARE @idSolicitante INT; 

    -- Obtener usando JOIN a usuarios para estar seguros del creador
    SELECT @carnetCreador = u.carnet, @fechaCreacion = t.fechaCreacion 
    FROM p_Tareas t
    JOIN p_Usuarios u ON t.idCreador = u.idUsuario
    WHERE t.idTarea = @idTarea;
    
    -- Resolver ID sol (para logs de auditoria si piden ID)
    SELECT @idSolicitante = idUsuario FROM p_Usuarios WHERE carnet = @carnetSolicitante;

    IF @carnetCreador IS NULL RETURN; 

    -- SIEMPRE Soft Delete (Inactivación)
    -- Se elimina lógica de borrado físico para preservar historial y auditoría.
    
    UPDATE p_Tareas 
    SET activo = 0,
        deshabilitadoPor = @idSolicitante, -- Mantener ID aqui si la columna es FK int
        fechaDeshabilitacion = GETDATE(),
        motivoDeshabilitacion = @motivo
    WHERE idTarea = @idTarea;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_RecalcularJerarquia_v2]
-- =============================================
-- 1. sp_Tarea_RecalcularJerarquia_v2
-- =============================================
CREATE   PROCEDURE dbo.sp_Tarea_RecalcularJerarquia_v2
(
    @idTareaInicio INT = NULL,
    @idPadreDirecto INT = NULL,
    @maxDepth INT = 10
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- El indice filtrado requiere estas opciones seteadas
    -- SET QUOTED_IDENTIFIER ON (Ya seteado al crear)
    -- SET ANSI_NULLS ON (Ya seteado al crear)
    
    DECLARE @idActual INT;
    DECLARE @nivel INT = 0;
    
    IF @idPadreDirecto IS NOT NULL
        SET @idActual = @idPadreDirecto;
    ELSE
        SELECT @idActual = idTareaPadre FROM dbo.p_Tareas WHERE idTarea = @idTareaInicio;

    -- Si no tiene padre, salir rapido
    IF @idActual IS NULL RETURN;

    -- BEGIN TRY -- Simplificado para debug, reactivar manejo errores completo en prod si se desea, 
    -- pero el core logic es el mismo. Mantenemos estructura original.
    BEGIN TRY
        -- Usar transaccion explicita solo si no hay una activa, o gestionarla con cuidado
        DECLARE @localTran BIT = 0;
        IF @@TRANCOUNT = 0 
        BEGIN
            BEGIN TRAN;
            SET @localTran = 1;
        END

        WHILE @idActual IS NOT NULL AND @nivel < @maxDepth
        BEGIN
             -- 1. Bloquear padre
            DECLARE @idPadreDeActual INT;
            DECLARE @estadoActual NVARCHAR(50);
            DECLARE @porcentajeActual INT;

            SELECT 
                @idPadreDeActual = idTareaPadre,
                @estadoActual = estado,
                @porcentajeActual = porcentaje
            FROM dbo.p_Tareas WITH (UPDLOCK, HOLDLOCK)
            WHERE idTarea = @idActual;

            If @@ROWCOUNT = 0 BREAK; -- Padre borrado o inexistente

            -- 2. Calcular hijos
            DECLARE @total INT = 0;
            DECLARE @sumNorm FLOAT = 0; -- Float para precision
            DECLARE @totalHechas INT = 0;

            -- CTE o Consulta directa
            SELECT 
                @total = COUNT(1),
                @sumNorm = SUM(
                    CASE 
                        WHEN estado = 'Hecha' THEN 100.0
                        ELSE ISNULL(CAST(porcentaje AS FLOAT), 0)
                    END
                ),
                @totalHechas = SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END)
            FROM dbo.p_Tareas 
            WHERE idTareaPadre = @idActual
              AND activo = 1 
              AND estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada');

            IF @total = 0 
            BEGIN
                -- Padre sin hijos validos (hijos borrados?). No recalcular.
                SET @idActual = @idPadreDeActual;
                SET @nivel += 1;
                CONTINUE; 
            END

            -- 3. Nuevos valores
            DECLARE @nuevoPromedio INT = ROUND(@sumNorm / @total, 0);
            IF @nuevoPromedio > 100 SET @nuevoPromedio = 100;

            DECLARE @nuevoEstado NVARCHAR(50) = 'Pendiente';
            
            IF @totalHechas = @total 
                SET @nuevoEstado = 'Hecha';
            ELSE IF @sumNorm > 0 OR EXISTS(SELECT 1 FROM dbo.p_Tareas WHERE idTareaPadre = @idActual AND estado = 'EnCurso')
                SET @nuevoEstado = 'EnCurso';

            -- 4. Update
            IF @porcentajeActual <> @nuevoPromedio OR @estadoActual <> @nuevoEstado
            BEGIN
                UPDATE dbo.p_Tareas
                SET porcentaje = @nuevoPromedio,
                    estado = @nuevoEstado
                WHERE idTarea = @idActual;
            END

            -- 5. Subir
            SET @idActual = @idPadreDeActual;
            SET @nivel += 1;
        END

        IF @localTran = 1 COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 AND @localTran = 1 ROLLBACK TRAN;
        THROW;
    END CATCH
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tarea_ValidarNoCiclo]
-- ==============================================================================
-- 2. PROCEDIMIENTOS DE VALIDACIÃ“N E INSERCIÃ“N
-- ==============================================================================

-- 2.1 ValidaciÃ³n Anti-Ciclos (Profunda)
-- Detecta si al asignar un nuevo padre se crearÃ­a un ciclo indirecto (A->B->A)
CREATE   PROCEDURE dbo.sp_Tarea_ValidarNoCiclo
(
    @idTarea INT,
    @idNuevoPadre INT
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Caso trivial
    IF @idTarea = @idNuevoPadre
        THROW 50010, 'Ciclo detectado: una tarea no puede ser su propio padre.', 1;

    DECLARE @found BIT = 0;

    -- CTE Recursivo para verificar si @idNuevoPadre es descendiente de @idTarea
    ;WITH SubArbol AS (
        SELECT t.idTarea
        FROM dbo.p_Tareas t
        WHERE t.idTarea = @idTarea

        UNION ALL

        SELECT h.idTarea
        FROM dbo.p_Tareas h
        INNER JOIN SubArbol s ON h.idTareaPadre = s.idTarea
        WHERE h.activo = 1
    )
    SELECT TOP 1 @found = 1 FROM SubArbol WHERE idTarea = @idNuevoPadre;

    IF @found = 1
        THROW 50011, 'Ciclo detectado: el nuevo padre es descendiente de la tarea actual.', 1;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tareas_ObtenerMultiplesUsuarios]
CREATE   PROCEDURE [dbo].[sp_Tareas_ObtenerMultiplesUsuarios] @carnetsList NVARCHAR(MAX) AS BEGIN SET NOCOUNT ON; SELECT t.idTarea, t.nombre as titulo, t.descripcion, t.estado, t.prioridad, t.fechaInicioPlanificada, t.fechaObjetivo, t.porcentaje, t.idProyecto, ta.carnet as usuarioCarnet FROM p_Tareas t INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea INNER JOIN STRING_SPLIT(@carnetsList, ',') as L ON ta.carnet = L.value WHERE t.activo = 1; END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tareas_ObtenerPorProyecto]
-- =============================================
-- MIGRACIÓN CLARITY: PAQUETE 3 (Tareas Proyecto y Multiples)
-- Fecha: 2026-01-25
-- =============================================

-- 8. SP para Obtener Tareas de un Proyecto
CREATE   PROCEDURE [dbo].[sp_Tareas_ObtenerPorProyecto]
    @idProyecto INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.idTarea, t.idProyecto,
        t.nombre as titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje as progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion as fechaUltActualizacion,
        t.idTareaPadre,
        p.nombre as proyectoNombre,
        ta.idUsuario as idResponsable,
        u.nombreCompleto as responsableNombre,
        u.carnet as responsableCarnet
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    LEFT JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE t.idProyecto = @idProyecto
      AND t.activo = 1
    ORDER BY t.orden ASC, t.fechaObjetivo ASC;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tareas_ObtenerPorUsuario]
/*
  Optimized SP for Tasks by User
  Uses #Temp tables and avoids OR conditions that kill performance.
*/
CREATE   PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario
    @carnet     NVARCHAR(50),
    @estado     NVARCHAR(50) = NULL,
    @idProyecto INT         = NULL,
    @query      NVARCHAR(100)= NULL,
    @startDate  DATETIME    = NULL,
    @endDate    DATETIME    = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Normalize NULLs
    IF (@query IS NOT NULL AND LTRIM(RTRIM(@query)) = N'') SET @query = NULL;

    -- Get user ID once
    DECLARE @idUsuario INT;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    -- Temp table for unique IDs (faster than DISTINCT on wide rows)
    CREATE TABLE #IdsTareas(
        idTarea INT NOT NULL PRIMARY KEY
    );

    -- 1. Tasks Created by Carnet
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_Tareas t
    WHERE t.activo = 1
      AND t.creadorCarnet = @carnet
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate);

    -- 2. Tasks Assigned (Avoid duplicates with MERGE/Project check)
    -- Using simple LEFT JOIN exclusion or MERGE
    MERGE #IdsTareas AS target
    USING (
        SELECT t.idTarea
        FROM dbo.p_TareaAsignados ta
        INNER JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea
        WHERE t.activo = 1
          AND ta.carnet = @carnet
          AND (@estado IS NULL OR t.estado = @estado)
          AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
          AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
          AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
          AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
    ) AS source ON target.idTarea = source.idTarea
    WHEN NOT MATCHED THEN INSERT (idTarea) VALUES (source.idTarea)
    OPTION (RECOMPILE);

    -- 3. Tasks by Creator ID (Fallback)
    IF (@idUsuario IS NOT NULL)
    BEGIN
        MERGE #IdsTareas AS target
        USING (
            SELECT t.idTarea
            FROM dbo.p_Tareas t
            WHERE t.activo = 1
              AND t.idCreador = @idUsuario
              AND (@estado IS NULL OR t.estado = @estado)
              AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
              AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
              AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
              AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
        ) AS source ON target.idTarea = source.idTarea
        WHEN NOT MATCHED THEN INSERT (idTarea) VALUES (source.idTarea)
        OPTION (RECOMPILE);
    END

    -- Final Select Joining back
    SELECT
        t.idTarea, t.idProyecto,
        t.nombre AS titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje AS progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion AS fechaUltActualizacion,
        t.idTareaPadre,
        t.idPlan,
        p.nombre AS proyectoNombre
    FROM #IdsTareas x
    INNER JOIN dbo.p_Tareas t     ON t.idTarea = x.idTarea
    LEFT  JOIN dbo.p_Proyectos p  ON p.idProyecto = t.idProyecto
    ORDER BY t.fechaObjetivo ASC, t.idTarea ASC
    OPTION (RECOMPILE);

    DROP TABLE #IdsTareas;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Tareas_Reasignar_PorCarnet]
-- 4. SP: Reasignar Tareas masivamente
CREATE   PROCEDURE [dbo].[sp_Tareas_Reasignar_PorCarnet]
    @taskIdsCsv NVARCHAR(MAX),
    @toCarnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idDestino INT;
    SELECT @idDestino = idUsuario FROM p_Usuarios WHERE carnet = @toCarnet;

    IF @idDestino IS NULL RETURN;

    -- Eliminar asignaciones previas de tipo 'Responsable'
    DELETE FROM p_TareaAsignados 
    WHERE idTarea IN (SELECT value FROM STRING_SPLIT(@taskIdsCsv, ','))
      AND tipo = 'Responsable';

    -- Insertar nuevas asignaciones
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
    SELECT CAST(value AS INT), @idDestino, @toCarnet, 'Responsable', GETDATE()
    FROM STRING_SPLIT(@taskIdsCsv, ',');
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_UpsertAvanceMensual]
-- ============================================================
-- 5. STORED PROCEDURES
-- ============================================================

-- 5.1 SP: Upsert Avance Mensual (Plan de Trabajo)
CREATE   PROCEDURE sp_UpsertAvanceMensual
    @idTarea INT,
    @anio INT,
    @mes INT,
    @porcentajeMes DECIMAL(5,2),
    @comentario NVARCHAR(MAX) = NULL,
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;

    MERGE p_TareaAvanceMensual AS t
    USING (SELECT @idTarea idTarea, @anio anio, @mes mes) AS s
    ON (t.idTarea = s.idTarea AND t.anio = s.anio AND t.mes = s.mes)
    WHEN MATCHED THEN
        UPDATE SET porcentajeMes = @porcentajeMes,
                   comentario = @comentario,
                   idUsuarioActualizador = @idUsuario,
                   fechaActualizacion = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (idTarea, anio, mes, porcentajeMes, comentario, idUsuarioActualizador)
        VALUES (@idTarea, @anio, @mes, @porcentajeMes, @comentario, @idUsuario);

    -- Marca completada si acumulado >= 100
    DECLARE @acum DECIMAL(6,2);
    SELECT @acum = ISNULL(SUM(porcentajeMes), 0)
    FROM p_TareaAvanceMensual
    WHERE idTarea = @idTarea;

    -- Actualiza el porcentaje global en p_Tareas
    UPDATE p_Tareas 
    SET porcentaje = CASE WHEN @acum > 100 THEN 100 ELSE @acum END,
        estado = CASE WHEN @acum >= 100 THEN 'Hecha' ELSE estado END,
        fechaCompletado = CASE WHEN @acum >= 100 AND estado <> 'Hecha' THEN GETDATE() ELSE fechaCompletado END
    WHERE idTarea = @idTarea;

    COMMIT;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Usuarios_Buscar]
CREATE   PROCEDURE dbo.sp_Usuarios_Buscar
  @termino NVARCHAR(200),
  @limite  INT = 10
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @t NVARCHAR(210) = N'%' + ISNULL(@termino, N'') + N'%';

  SELECT TOP (@limite) *
  FROM dbo.p_Usuarios
  WHERE activo = 1
    AND (
         LOWER(nombreCompleto) LIKE LOWER(@t)
      OR LTRIM(RTRIM(carnet)) LIKE LTRIM(RTRIM(@t))
      OR LOWER(correo) LIKE LOWER(@t)
    )
  ORDER BY nombreCompleto;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Usuarios_BuscarPorCarnet]
CREATE   PROCEDURE dbo.sp_Usuarios_BuscarPorCarnet
  @carnet NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnet, N'')));

  SELECT TOP 1 *
  FROM dbo.p_Usuarios
  WHERE LTRIM(RTRIM(carnet)) = @c;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Usuarios_BuscarPorCorreo]
CREATE   PROCEDURE dbo.sp_Usuarios_BuscarPorCorreo
  @correo NVARCHAR(200)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(200) = LOWER(LTRIM(RTRIM(ISNULL(@correo, N''))));

  SELECT TOP 1 *
  FROM dbo.p_Usuarios
  WHERE LOWER(LTRIM(RTRIM(correo))) = @c;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Usuarios_ListarActivos]
CREATE   PROCEDURE dbo.sp_Usuarios_ListarActivos
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM dbo.p_Usuarios
  WHERE activo = 1
  ORDER BY nombreCompleto;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Usuarios_ObtenerCarnetPorId]
CREATE   PROCEDURE dbo.sp_Usuarios_ObtenerCarnetPorId
  @idUsuario INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1 u.carnet
  FROM dbo.p_Usuarios u
  WHERE u.idUsuario = @idUsuario;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Usuarios_ObtenerDetallesPorCarnets]
/* ============================================
   USUARIOS
   ============================================ */

CREATE   PROCEDURE dbo.sp_Usuarios_ObtenerDetallesPorCarnets
  @CarnetsCsv NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    u.idUsuario,
    u.carnet,
    u.nombre,
    u.nombreCompleto,
    u.correo,
    u.cargo,
    u.departamento,
    u.orgDepartamento,
    u.orgGerencia,
    u.idOrg,
    u.jefeCarnet,
    u.jefeNombre,
    u.jefeCorreo,
    u.activo,
    u.gerencia,
    u.subgerencia,
    u.idRol,
    u.rolGlobal,
    r.nombre AS rolNombre
  FROM dbo.p_Usuarios u
  LEFT JOIN dbo.p_Roles r ON r.idRol = u.idRol
  JOIN dbo.fn_SplitCsv_NVarChar(@CarnetsCsv) s
    ON LTRIM(RTRIM(u.carnet)) = s.item
  ORDER BY u.nombreCompleto;
END;
GO

-- PROCEDIMIENTO: [dbo].[sp_Usuarios_ObtenerIdPorCarnet]
/* ========================================================================
   2. SP UTILITARIOS (Resolución ID <-> Carnet)
   ======================================================================== */

CREATE   PROCEDURE dbo.sp_Usuarios_ObtenerIdPorCarnet
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    -- CORRECCION: Usamos 'rolGlobal' en vez de 'rol'
    SELECT idUsuario, nombreCompleto, correo, rolGlobal as rol
    FROM dbo.p_Usuarios 
    WHERE carnet = @carnet;
END
GO

-- PROCEDIMIENTO: [dbo].[sp_Usuarios_ObtenerPorLista]
CREATE   PROCEDURE [dbo].[sp_Usuarios_ObtenerPorLista]
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Retrieve user details for a list of carnets
    -- Optimizes the inline query: 
    -- SELECT u.*, r.nombre as rolNombre ... INNER JOIN STRING_SPLIT ...
    
    SELECT 
        u.idUsuario,
        u.nombre,
        u.nombreCompleto,
        u.correo,
        u.carnet,
        u.idRol,
        u.cargo,
        r.nombre as rolNombre
    FROM p_Usuarios u
    LEFT JOIN p_Roles r ON u.idRol = r.idRol
    INNER JOIN STRING_SPLIT(@carnetsList, ',') L ON u.carnet = L.value
    WHERE u.activo = 1
    OPTION (RECOMPILE); -- Optimize for the specific list size

END
GO

-- PROCEDIMIENTO: [dbo].[sp_Visibilidad_ObtenerCarnets]
CREATE PROCEDURE [dbo].[sp_Visibilidad_ObtenerCarnets] @carnetSolicitante NVARCHAR(50) AS BEGIN SET NOCOUNT ON; SELECT DISTINCT carnet FROM p_Usuarios WHERE carnet IS NOT NULL AND carnet <> '' END
GO

-- PROCEDIMIENTO: [dbo].[sp_Visibilidad_ObtenerMiEquipo]
/*==============================================================
  sp_Visibilidad_ObtenerMiEquipo  (Carnet-first)  FAST + SAFE
  FIX: evita "Error converting data type nvarchar to bigint"
       usando TRY_CONVERT(BIGINT, ...) y filtros.

  PERF:
  - Materializa usuarios activos en #UsuariosActivos (1 sola lectura)
  - Jerarquía sin OR (4 ramas UNION ALL) para mejor plan/index
==============================================================*/
CREATE   PROCEDURE dbo.sp_Visibilidad_ObtenerMiEquipo
(
    @idUsuario INT = NULL,
    @carnet    VARCHAR(20) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    /*--------------------------------------------
      1) Resolver carnet solicitante
    --------------------------------------------*/
    DECLARE @carnetSolicitante VARCHAR(20);
    SET @carnetSolicitante = NULLIF(LTRIM(RTRIM(@carnet)), '');

    IF @carnetSolicitante IS NULL AND @idUsuario IS NOT NULL
    BEGIN
        SELECT TOP (1)
            @carnetSolicitante = NULLIF(LTRIM(RTRIM(u.carnet)), '')
        FROM dbo.p_Usuarios u
        WHERE u.idUsuario = @idUsuario;
    END

    IF @carnetSolicitante IS NULL
    BEGIN
        SELECT
            CAST(NULL AS INT)           AS idUsuario,
            CAST(NULL AS VARCHAR(20))   AS carnet,
            CAST(NULL AS NVARCHAR(200)) AS nombreCompleto,
            CAST(NULL AS NVARCHAR(200)) AS correo,
            CAST(NULL AS NVARCHAR(200)) AS cargo,
            CAST(NULL AS NVARCHAR(200)) AS gerencia,
            CAST(NULL AS NVARCHAR(200)) AS orgGerencia,
            CAST(NULL AS NVARCHAR(200)) AS subgerencia,
            CAST(NULL AS NVARCHAR(200)) AS orgDepartamento,
            CAST(NULL AS NVARCHAR(200)) AS departamento,
            CAST(NULL AS BIGINT)        AS idOrg,
            CAST(NULL AS VARCHAR(20))   AS jefeCarnet,
            CAST(NULL AS INT)           AS nivel,
            CAST(NULL AS VARCHAR(30))   AS fuente
        WHERE 1 = 0;
        RETURN;
    END

    /*--------------------------------------------
      2) Cache de usuarios activos (1 lectura)
         - idOrgBigInt seguro con TRY_CONVERT
         - trims una sola vez (jefes/carnet)
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#UsuariosActivos') IS NOT NULL DROP TABLE #UsuariosActivos;
    CREATE TABLE #UsuariosActivos
    (
        idUsuario        INT           NOT NULL,
        carnet           VARCHAR(20)   NOT NULL,
        nombreCompleto   NVARCHAR(200) NULL,
        correo           NVARCHAR(200) NULL,
        cargo            NVARCHAR(200) NULL,
        gerencia         NVARCHAR(200) NULL,
        orgGerencia      NVARCHAR(200) NULL,
        ogerencia        NVARCHAR(200) NULL,
        subgerencia      NVARCHAR(200) NULL,
        orgDepartamento  NVARCHAR(200) NULL,
        departamento     NVARCHAR(200) NULL,
        area             NVARCHAR(200) NULL,
        idOrgBigInt      BIGINT        NULL,
        jefeCarnet       VARCHAR(20)   NULL,
        carnet_jefe2     VARCHAR(20)   NULL,
        carnet_jefe3     VARCHAR(20)   NULL,
        carnet_jefe4     VARCHAR(20)   NULL,
        rolGlobal        NVARCHAR(200) NULL,
        PRIMARY KEY CLUSTERED (carnet)
    );

    INSERT INTO #UsuariosActivos
    (
        idUsuario, carnet, nombreCompleto, correo, cargo, gerencia,
        orgGerencia, ogerencia, subgerencia, orgDepartamento, departamento, area,
        idOrgBigInt, jefeCarnet, carnet_jefe2, carnet_jefe3, carnet_jefe4, rolGlobal
    )
    SELECT
        u.idUsuario,
        NULLIF(LTRIM(RTRIM(u.carnet)), '')                                           AS carnet,
        u.nombreCompleto,
        u.correo,
        u.cargo,
        u.gerencia,
        u.orgGerencia,
        u.ogerencia,
        u.subgerencia,
        u.orgDepartamento,
        u.departamento,
        u.area,
        TRY_CONVERT(BIGINT, u.idOrg)                                                 AS idOrgBigInt, -- FIX
        NULLIF(LTRIM(RTRIM(u.jefeCarnet)), '')                                       AS jefeCarnet,
        NULLIF(LTRIM(RTRIM(u.carnet_jefe2)), '')                                     AS carnet_jefe2,
        NULLIF(LTRIM(RTRIM(u.carnet_jefe3)), '')                                     AS carnet_jefe3,
        NULLIF(LTRIM(RTRIM(u.carnet_jefe4)), '')                                     AS carnet_jefe4,
        u.rolGlobal
    FROM dbo.p_Usuarios u
    WHERE u.activo = 1
      AND NULLIF(LTRIM(RTRIM(u.carnet)), '') IS NOT NULL;

    -- Índices para jerarquía (mejor que OR)
    CREATE NONCLUSTERED INDEX IX_UA_Jefe1 ON #UsuariosActivos (jefeCarnet)   INCLUDE (carnet);
    CREATE NONCLUSTERED INDEX IX_UA_Jefe2 ON #UsuariosActivos (carnet_jefe2) INCLUDE (carnet);
    CREATE NONCLUSTERED INDEX IX_UA_Jefe3 ON #UsuariosActivos (carnet_jefe3) INCLUDE (carnet);
    CREATE NONCLUSTERED INDEX IX_UA_Jefe4 ON #UsuariosActivos (carnet_jefe4) INCLUDE (carnet);
    CREATE NONCLUSTERED INDEX IX_UA_IdOrg ON #UsuariosActivos (idOrgBigInt)  INCLUDE (carnet);

    /*--------------------------------------------
      3) Admin => devolver todos (activos)
    --------------------------------------------*/
    IF EXISTS (
        SELECT 1
        FROM #UsuariosActivos u
        WHERE u.carnet = @carnetSolicitante
          AND (u.rolGlobal = 'Admin' OR u.rolGlobal LIKE '%Admin%')
    )
    BEGIN
        SELECT
            u.idUsuario,
            u.carnet,
            u.nombreCompleto,
            u.correo,
            u.cargo,
            u.gerencia,
            COALESCE(u.orgGerencia, u.ogerencia, u.gerencia)                         AS orgGerencia,
            u.subgerencia,
            COALESCE(u.orgDepartamento, u.subgerencia, u.departamento)               AS orgDepartamento,
            COALESCE(u.area, u.departamento)                                         AS departamento,
            u.idOrgBigInt                                                           AS idOrg,       -- SAFE
            u.jefeCarnet,
            1                                                                        AS nivel,
            'ADMIN'                                                                  AS fuente
        FROM #UsuariosActivos u
        WHERE u.carnet <> @carnetSolicitante
        ORDER BY u.nombreCompleto;
        RETURN;
    END

    /*--------------------------------------------
      4) Raíces de visibilidad (solicitante + delegantes)
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#Raices') IS NOT NULL DROP TABLE #Raices;
    CREATE TABLE #Raices
    (
        carnetRaiz VARCHAR(20) NOT NULL PRIMARY KEY,
        fuente     VARCHAR(30) NOT NULL
    );

    INSERT INTO #Raices(carnetRaiz, fuente)
    VALUES (@carnetSolicitante, 'SOLICITANTE');

    INSERT INTO #Raices(carnetRaiz, fuente)
    SELECT DISTINCT
        NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), '') AS carnetRaiz,
        'DELEGACION'                                   AS fuente
    FROM dbo.p_delegacion_visibilidad dv
    WHERE dv.activo = 1
      AND NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), '') IS NOT NULL
      AND NULLIF(LTRIM(RTRIM(dv.carnet_delegado)), '')  = @carnetSolicitante
      AND NOT EXISTS (
          SELECT 1
          FROM #Raices r
          WHERE r.carnetRaiz = NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), '')
      );

    /*--------------------------------------------
      5) Acumulador carnets visibles
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#Carnets') IS NOT NULL DROP TABLE #Carnets;
    CREATE TABLE #Carnets
    (
        carnet VARCHAR(20) NOT NULL,
        nivel  INT         NULL,
        fuente VARCHAR(30) NOT NULL,
        CONSTRAINT PK_#Carnets PRIMARY KEY (carnet, fuente)
    );

    /*--------------------------------------------
      6) A) Jerarquía SIN OR (4 ramas) => más rápido
    --------------------------------------------*/
    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT x.carnet, MIN(x.nivel) AS nivel, 'JERARQUIA' AS fuente
    FROM
    (
        SELECT u.carnet, 1 AS nivel
        FROM #UsuariosActivos u
        INNER JOIN #Raices r ON u.jefeCarnet = r.carnetRaiz
        WHERE u.carnet <> @carnetSolicitante

        UNION ALL
        SELECT u.carnet, 2 AS nivel
        FROM #UsuariosActivos u
        INNER JOIN #Raices r ON u.carnet_jefe2 = r.carnetRaiz
        WHERE u.carnet <> @carnetSolicitante

        UNION ALL
        SELECT u.carnet, 3 AS nivel
        FROM #UsuariosActivos u
        INNER JOIN #Raices r ON u.carnet_jefe3 = r.carnetRaiz
        WHERE u.carnet <> @carnetSolicitante

        UNION ALL
        SELECT u.carnet, 4 AS nivel
        FROM #UsuariosActivos u
        INNER JOIN #Raices r ON u.carnet_jefe4 = r.carnetRaiz
        WHERE u.carnet <> @carnetSolicitante
    ) x
    GROUP BY x.carnet;

    /*--------------------------------------------
      7) B) Permisos por empleado (ALLOW)
    --------------------------------------------*/
    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT DISTINCT
        NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '') AS carnet,
        1                                          AS nivel,
        'PERMISO_EMPLEADO'                         AS fuente
    FROM dbo.p_permiso_empleado pe
    INNER JOIN #Raices r
        ON NULLIF(LTRIM(RTRIM(pe.carnet_recibe)), '') = r.carnetRaiz
    WHERE pe.activo = 1
      AND ISNULL(pe.tipo_acceso, 'ALLOW') = 'ALLOW'
      AND NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '') IS NOT NULL
      AND NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '') <> @carnetSolicitante;

    /*--------------------------------------------
      8) C) Permisos por área (SUBARBOL / SOLO)
         FIX: idorg_raiz seguro con TRY_CONVERT
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#OrgPermitidos') IS NOT NULL DROP TABLE #OrgPermitidos;
    CREATE TABLE #OrgPermitidos
    (
        idorg BIGINT NOT NULL PRIMARY KEY
    );

    ;WITH Permisos AS
    (
        SELECT
            TRY_CONVERT(BIGINT, pa.idorg_raiz)                  AS idorg_raiz, -- FIX
            UPPER(ISNULL(pa.alcance, 'SUBARBOL'))               AS alcance
        FROM dbo.p_permiso_area pa
        INNER JOIN #Raices r
            ON NULLIF(LTRIM(RTRIM(pa.carnet_recibe)), '') = r.carnetRaiz
        WHERE pa.activo = 1
          AND pa.idorg_raiz IS NOT NULL
          AND TRY_CONVERT(BIGINT, pa.idorg_raiz) IS NOT NULL    -- FIX
    ),
    Subarbol AS
    (
        -- SOLO: solo el nodo raíz
        SELECT p.idorg_raiz AS idorg
        FROM Permisos p
        WHERE p.alcance = 'SOLO'

        UNION ALL

        -- SUBARBOL: raíz (y luego descendientes)
        SELECT p.idorg_raiz AS idorg
        FROM Permisos p
        WHERE p.alcance <> 'SOLO'

        UNION ALL

        -- Descendientes
        SELECT n.idorg
        FROM dbo.p_organizacion_nodos n
        INNER JOIN Subarbol s ON n.padre = s.idorg
    )
    INSERT INTO #OrgPermitidos(idorg)
    SELECT DISTINCT s.idorg
    FROM Subarbol s
    OPTION (MAXRECURSION 200);

    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT DISTINCT
        u.carnet,
        1             AS nivel,
        'PERMISO_AREA' AS fuente
    FROM #UsuariosActivos u
    INNER JOIN #OrgPermitidos op
        ON u.idOrgBigInt = op.idorg           -- SAFE (ya es BIGINT)
    WHERE u.idOrgBigInt IS NOT NULL
      AND u.carnet <> @carnetSolicitante;

    /*--------------------------------------------
      9) DENY por empleado (quita de todo)
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#Denegados') IS NOT NULL DROP TABLE #Denegados;
    CREATE TABLE #Denegados
    (
        carnet VARCHAR(20) NOT NULL PRIMARY KEY
    );

    INSERT INTO #Denegados(carnet)
    SELECT DISTINCT
        NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '')
    FROM dbo.p_permiso_empleado pe
    INNER JOIN #Raices r
        ON NULLIF(LTRIM(RTRIM(pe.carnet_recibe)), '') = r.carnetRaiz
    WHERE pe.activo = 1
      AND pe.tipo_acceso = 'DENY'
      AND NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '') IS NOT NULL;

    DELETE c
    FROM #Carnets c
    INNER JOIN #Denegados d
        ON d.carnet = c.carnet;

    /*--------------------------------------------
      10) Unificar 1 fila por carnet (prioridad)
          JERARQUIA > PERMISO_EMPLEADO > PERMISO_AREA
    --------------------------------------------*/
    ;WITH Unicos AS
    (
        SELECT
            c.carnet,
            c.nivel,
            c.fuente,
            ROW_NUMBER() OVER
            (
                PARTITION BY c.carnet
                ORDER BY
                    CASE c.fuente
                        WHEN 'JERARQUIA'        THEN 1
                        WHEN 'PERMISO_EMPLEADO' THEN 2
                        WHEN 'PERMISO_AREA'     THEN 3
                        ELSE 9
                    END,
                    ISNULL(c.nivel, 999)
            ) AS rn
        FROM #Carnets c
    )
    SELECT
        u.idUsuario,
        u.carnet,
        u.nombreCompleto,
        u.correo,
        u.cargo,
        u.gerencia,
        COALESCE(u.orgGerencia, u.ogerencia, u.gerencia)                   AS orgGerencia,
        u.subgerencia,
               u.area as Area,
        COALESCE(u.orgDepartamento, u.subgerencia, u.departamento)         AS orgDepartamento,
        u.departamento                                AS departamento,
 
        u.idOrgBigInt                                                      AS idOrg,   -- SAFE
        u.jefeCarnet,
        x.nivel,
        x.fuente
    FROM Unicos x
    INNER JOIN #UsuariosActivos u
        ON u.carnet = x.carnet
    WHERE x.rn = 1
    ORDER BY u.nombreCompleto;
END
GO

