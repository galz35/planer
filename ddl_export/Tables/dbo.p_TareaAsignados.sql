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
