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
