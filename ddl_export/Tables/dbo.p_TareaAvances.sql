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
