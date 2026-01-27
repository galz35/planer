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
