IF OBJECT_ID('[dbo].[p_SeguridadPerfiles]', 'U') IS NOT NULL DROP TABLE [dbo].[p_SeguridadPerfiles]
GO
CREATE TABLE [dbo].[p_SeguridadPerfiles] (
    [id] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(100) NOT NULL,
    [permisos] nvarchar(max) NULL,
    [activo] bit NULL DEFAULT ((1)),
    [fechaActualizacion] datetime NULL,
    CONSTRAINT [PK__p_Seguri__3213E83F1A7B9A05] PRIMARY KEY ([id])
);
GO
