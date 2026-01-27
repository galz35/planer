IF OBJECT_ID('[dbo].[p_delegacion_visibilidad]', 'U') IS NOT NULL DROP TABLE [dbo].[p_delegacion_visibilidad]
GO
CREATE TABLE [dbo].[p_delegacion_visibilidad] (
    [id] bigint IDENTITY(1,1) NOT NULL,
    [carnet_delegante] nvarchar(100) NOT NULL,
    [carnet_delegado] nvarchar(100) NOT NULL,
    [activo] bit NULL DEFAULT ((1)),
    [fecha_inicio] date NULL,
    [fecha_fin] date NULL,
    [motivo] nvarchar(300) NULL,
    [creado_en] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_delega__3213E83F306A8791] PRIMARY KEY ([id])
);
GO
