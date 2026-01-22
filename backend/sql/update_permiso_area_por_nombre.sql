USE Bdplaner;
GO

-- ============================================================
-- MIGRACIÓN: Permiso por Área basado en NOMBRE de Gerencia
-- Permite otorgar permisos usando ogerencia, subgerencia o area
-- ============================================================

-- 1. Agregar columna nombre_area a p_permiso_area si no existe
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_permiso_area' AND COLUMN_NAME = 'nombre_area')
BEGIN
    ALTER TABLE p_permiso_area ADD nombre_area NVARCHAR(255) NULL;
    PRINT 'Columna nombre_area agregada a p_permiso_area';
END
GO

-- 2. Agregar columna tipo_nivel (GERENCIA, SUBGERENCIA, AREA, DEPARTAMENTO)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_permiso_area' AND COLUMN_NAME = 'tipo_nivel')
BEGIN
    ALTER TABLE p_permiso_area ADD tipo_nivel NVARCHAR(50) NULL DEFAULT 'GERENCIA';
    PRINT 'Columna tipo_nivel agregada a p_permiso_area';
END
GO

-- 3. Insertar permiso para juan.ortuno@claro.com.ni
DECLARE @carnetJuan NVARCHAR(50);
SELECT @carnetJuan = carnet FROM p_Usuarios WHERE correo = 'juan.ortuno@claro.com.ni';

IF @carnetJuan IS NOT NULL
BEGIN
    -- Verificar si ya existe
    IF NOT EXISTS (
        SELECT 1 FROM p_permiso_area 
        WHERE carnet_recibe = @carnetJuan 
        AND nombre_area = 'NI GERENCIA DE RECURSOS HUMANOS'
        AND activo = 1
    )
    BEGIN
        INSERT INTO p_permiso_area (carnet_recibe, nombre_area, tipo_nivel, alcance, activo, creado_en, motivo)
        VALUES (@carnetJuan, 'NI GERENCIA DE RECURSOS HUMANOS', 'GERENCIA', 'SUBARBOL', 1, GETDATE(), 'Permiso administrativo para ver RRHH');
        
        PRINT 'Permiso de área creado para juan.ortuno => NI GERENCIA DE RECURSOS HUMANOS';
    END
    ELSE
        PRINT 'Permiso ya existía para juan.ortuno';
END
ELSE
    PRINT 'Usuario juan.ortuno@claro.com.ni no encontrado';
GO

-- 4. Actualizar SP de Visibilidad para usar nombre de área
CREATE OR ALTER PROCEDURE sp_Visibilidad_ObtenerCarnets
    @carnetSolicitante NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    WITH IsAdmin AS (
        SELECT 1 AS EsAdmin 
        FROM p_Usuarios 
        WHERE carnet = @carnetSolicitante 
          AND (rolGlobal IN ('ADMIN', 'ROOT', 'Admin', 'Administrador', 'SuperAdmin') OR idRol = 1)
    ),
    Actores AS (
        SELECT carnet, idUsuario, idOrg 
        FROM p_Usuarios 
        WHERE carnet = @carnetSolicitante
    ),
    Subordinados AS (
        SELECT carnet
        FROM p_Usuarios
        WHERE jefeCarnet = @carnetSolicitante AND activo = 1
    ),
    VisiblesPuntual AS (
        SELECT carnet_delegante AS carnet
        FROM p_delegacion_visibilidad
        WHERE carnet_delegado = @carnetSolicitante AND activo = 1
        AND (fecha_inicio IS NULL OR fecha_inicio <= GETDATE())
        AND (fecha_fin IS NULL OR fecha_fin >= GETDATE())
        UNION ALL
        SELECT carnet_objetivo AS carnet
        FROM p_permiso_empleado
        WHERE carnet_recibe = @carnetSolicitante AND activo = 1 
        AND tipo_acceso = 'ALLOW'
    ),
    -- NUEVO: Permisos por Nombre de Área (Gerencia/Subgerencia/Area)
    VisiblesAreaNombre AS (
        SELECT u.carnet
        FROM p_Usuarios u
        JOIN p_permiso_area pa ON pa.carnet_recibe = @carnetSolicitante AND pa.activo = 1
            AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CAST(GETDATE() AS DATE))
            AND pa.nombre_area IS NOT NULL
        WHERE u.activo = 1
          AND (
              -- Nivel Gerencia: ogerencia O gerencia = nombre_area
              (pa.tipo_nivel = 'GERENCIA' AND (u.ogerencia = pa.nombre_area OR u.gerencia = pa.nombre_area))
              -- Nivel Subgerencia
              OR (pa.tipo_nivel = 'SUBGERENCIA' AND u.subgerencia = pa.nombre_area)
              -- Nivel Area (primer_nivel)
              OR (pa.tipo_nivel = 'AREA' AND (u.area = pa.nombre_area OR u.departamento = pa.nombre_area))
              -- Nivel Departamento (segundo_nivel / orgDepartamento)
              OR (pa.tipo_nivel = 'DEPARTAMENTO' AND (u.orgDepartamento = pa.nombre_area OR u.departamento = pa.nombre_area))
          )
    ),
    -- LEGACY: Permisos por idOrg (para backwards compatibility)
    NodosPermitidos AS (
        SELECT CAST(pa.idorg_raiz AS NVARCHAR(50)) as idorg
        FROM p_permiso_area pa
        JOIN Actores a ON a.carnet = pa.carnet_recibe
        WHERE pa.activo = 1 
        AND pa.idorg_raiz IS NOT NULL
        AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CAST(GETDATE() AS DATE))
        
        UNION ALL
        
        SELECT CAST(n.id AS NVARCHAR(50))
        FROM p_OrganizacionNodos n
        JOIN NodosPermitidos np ON CAST(n.idPadre AS NVARCHAR(50)) = np.idorg
        WHERE n.activo = 1
    ),
    VisiblesAreaIdOrg AS (
        SELECT u.carnet
        FROM p_Usuarios u
        JOIN NodosPermitidos np ON CAST(u.idOrg AS NVARCHAR(50)) = np.idorg
        WHERE u.activo = 1
    ),
    Excluidos AS (
        SELECT pe.carnet_objetivo AS carnet
        FROM p_permiso_empleado pe
        JOIN Actores a ON a.carnet = pe.carnet_recibe
        WHERE pe.activo = 1
        AND pe.tipo_acceso = 'DENY'
    ),
    TodoVisible AS (
        SELECT carnet FROM Actores
        UNION ALL
        SELECT carnet FROM Subordinados
        UNION ALL
        SELECT carnet FROM VisiblesPuntual
        UNION ALL
        SELECT carnet FROM VisiblesAreaNombre  -- NUEVO
        UNION ALL
        SELECT carnet FROM VisiblesAreaIdOrg   -- LEGACY
        UNION ALL
        SELECT carnet FROM p_Usuarios WHERE activo = 1 AND EXISTS (SELECT 1 FROM IsAdmin)
    )
    SELECT DISTINCT tv.carnet
    FROM TodoVisible tv
    WHERE tv.carnet IS NOT NULL AND tv.carnet <> ''
    AND (EXISTS (SELECT 1 FROM IsAdmin) OR NOT EXISTS (
        SELECT 1 FROM Excluidos e WHERE e.carnet = tv.carnet
    ));
END
GO

PRINT '✅ SP sp_Visibilidad_ObtenerCarnets actualizado con soporte para nombre de área';
GO

-- 5. Verificar estructura de p_Usuarios (columnas requeridas)
SELECT 
    'Verificando columnas existentes en p_Usuarios:' as info;
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'p_Usuarios' 
AND COLUMN_NAME IN ('ogerencia', 'gerencia', 'subgerencia', 'area', 'departamento', 'orgDepartamento');
GO
