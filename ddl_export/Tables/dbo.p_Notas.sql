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
