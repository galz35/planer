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
