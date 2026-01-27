IF OBJECT_ID('[dbo].[p_permiso_area]', 'U') IS NOT NULL DROP TABLE [dbo].[p_permiso_area]
GO
CREATE TABLE [dbo].[p_permiso_area] (
    [id] bigint IDENTITY(1,1) NOT NULL,
    [carnet_otorga] nvarchar(100) NULL,
    [carnet_recibe] nvarchar(100) NOT NULL,
    [idorg_raiz] bigint NULL,
    [alcance] nvarchar(20) NULL DEFAULT ('SUBARBOL'),
    [activo] bit NULL DEFAULT ((1)),
    [fecha_inicio] date NULL,
    [fecha_fin] date NULL,
    [motivo] nvarchar(300) NULL,
    [creado_en] datetime NULL DEFAULT (getdate()),
    [nombre_area] nvarchar(255) NULL,
    [tipo_nivel] nvarchar(50) NULL DEFAULT ('GERENCIA'),
    CONSTRAINT [PK__p_permis__3213E83FE5608946] PRIMARY KEY ([id])
);
GO
CREATE NONCLUSTERED INDEX [IX_permiso_area_carnet] ON [dbo].[p_permiso_area] (carnet_recibe, activo);
GO
