IF OBJECT_ID('[dbo].[p_Roles]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Roles]
GO
CREATE TABLE [dbo].[p_Roles] (
    [idRol] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(100) NOT NULL,
    [descripcion] nvarchar(500) NULL,
    [esSistema] bit NULL DEFAULT ((0)),
    [reglas] nvarchar(max) NULL DEFAULT ('[]'),
    [defaultMenu] nvarchar(max) NULL,
    [fechaActualizacion] datetime NULL,
    CONSTRAINT [PK__p_Roles__3C872F76707155A9] PRIMARY KEY ([idRol])
);
GO
