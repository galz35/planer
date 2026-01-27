IF OBJECT_ID('[dbo].[p_permiso_empleado]', 'U') IS NOT NULL DROP TABLE [dbo].[p_permiso_empleado]
GO
CREATE TABLE [dbo].[p_permiso_empleado] (
    [id] bigint IDENTITY(1,1) NOT NULL,
    [carnet_otorga] nvarchar(100) NULL,
    [carnet_recibe] nvarchar(100) NOT NULL,
    [carnet_objetivo] nvarchar(100) NOT NULL,
    [activo] bit NULL DEFAULT ((1)),
    [fecha_inicio] date NULL,
    [fecha_fin] date NULL,
    [motivo] nvarchar(300) NULL,
    [creado_en] datetime NULL DEFAULT (getdate()),
    [tipo_acceso] nvarchar(20) NULL DEFAULT ('ALLOW'),
    CONSTRAINT [PK__p_permis__3213E83FF8B18ACC] PRIMARY KEY ([id])
);
GO
