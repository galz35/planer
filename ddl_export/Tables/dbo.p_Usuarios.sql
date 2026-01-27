IF OBJECT_ID('[dbo].[p_Usuarios]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Usuarios]
GO
CREATE TABLE [dbo].[p_Usuarios] (
    [idUsuario] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(200) NULL,
    [nombreCompleto] nvarchar(300) NULL,
    [correo] nvarchar(200) NOT NULL,
    [activo] bit NULL DEFAULT ((1)),
    [rolGlobal] nvarchar(50) NULL DEFAULT ('Empleado'),
    [idRol] int NULL,
    [carnet] nvarchar(50) NULL,
    [cargo] nvarchar(200) NULL,
    [departamento] nvarchar(200) NULL,
    [orgDepartamento] nvarchar(200) NULL,
    [orgGerencia] nvarchar(200) NULL,
    [idOrg] nvarchar(50) NULL,
    [jefeCarnet] nvarchar(50) NULL,
    [jefeNombre] nvarchar(200) NULL,
    [jefeCorreo] nvarchar(200) NULL,
    [fechaIngreso] datetime NULL,
    [genero] nvarchar(20) NULL,
    [primer_nivel] nvarchar(200) NULL,
    [gerencia] nvarchar(200) NULL,
    [ogerencia] nvarchar(200) NULL,
    [subgerencia] nvarchar(200) NULL,
    [pais] nvarchar(10) NULL DEFAULT ('NI'),
    [telefono] nvarchar(50) NULL,
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [username] nvarchar(100) NULL,
    [cedula] nvarchar(50) NULL,
    [area] nvarchar(200) NULL,
    [direccion] nvarchar(max) NULL,
    [empresa] nvarchar(200) NULL,
    [ubicacion] nvarchar(200) NULL,
    [tipo_empleado] nvarchar(100) NULL,
    [tipo_contrato] nvarchar(100) NULL,
    [fuente_datos] nvarchar(50) NULL,
    [segundo_nivel] nvarchar(200) NULL,
    [tercer_nivel] nvarchar(200) NULL,
    [cuarto_nivel] nvarchar(200) NULL,
    [quinto_nivel] nvarchar(200) NULL,
    [sexto_nivel] nvarchar(200) NULL,
    [carnet_jefe2] nvarchar(50) NULL,
    [carnet_jefe3] nvarchar(50) NULL,
    [carnet_jefe4] nvarchar(50) NULL,
    [fechaActualizacion] datetime NULL,
    CONSTRAINT [PK__p_Usuari__645723A657F1DA48] PRIMARY KEY ([idUsuario])
);
GO
ALTER TABLE [dbo].[p_Usuarios] ADD CONSTRAINT [FK__p_Usuario__idRol__44CB02C7] FOREIGN KEY ([idRol]) REFERENCES [dbo].[p_Roles] ([idRol]);
GO
CREATE NONCLUSTERED INDEX [IX_p_Usuarios_Carnet] ON [dbo].[p_Usuarios] (idUsuario, nombre, correo, idRol, activo, carnet) INCLUDE (idUsuario, nombre, correo, idRol, activo);
GO
CREATE NONCLUSTERED INDEX [IX_Usuarios_carnet] ON [dbo].[p_Usuarios] (carnet);
GO
CREATE NONCLUSTERED INDEX [IX_Usuarios_correo] ON [dbo].[p_Usuarios] (correo);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ__p_Usuari__2A586E0B9156554C] ON [dbo].[p_Usuarios] (correo);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_p_Usuarios_carnet] ON [dbo].[p_Usuarios] (carnet) WHERE ([carnet] IS NOT NULL);
GO
