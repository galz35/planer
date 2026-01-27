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
