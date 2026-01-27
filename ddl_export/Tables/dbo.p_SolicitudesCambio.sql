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
