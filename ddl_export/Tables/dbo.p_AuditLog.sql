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
