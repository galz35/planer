IF OBJECT_ID('[dbo].[p_LogSistema]', 'U') IS NOT NULL DROP TABLE [dbo].[p_LogSistema]
GO
CREATE TABLE [dbo].[p_LogSistema] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NULL,
    [accion] nvarchar(100) NOT NULL,
    [entidad] nvarchar(100) NULL,
    [entidadId] nvarchar(50) NULL,
    [datos] nvarchar(max) NULL,
    [ip] nvarchar(50) NULL,
    [fecha] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_LogSis__3213E83F8947B106] PRIMARY KEY ([id])
);
GO
