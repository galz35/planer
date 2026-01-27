IF OBJECT_ID('[dbo].[p_Usuarios_OLD]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Usuarios_OLD]
GO
CREATE TABLE [dbo].[p_Usuarios_OLD] (
    [idUsuario] int NULL,
    [carnet] nvarchar(100) NULL,
    [nombre] nvarchar(255) NULL,
    [correo] nvarchar(255) NULL
);
GO
