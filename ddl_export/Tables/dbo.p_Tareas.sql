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
