/*
    ============================================================================
    EXTRA OPTIMIZATION - ORGANIZACIÓN Y CHECKINS
    ============================================================================
    Objetivo: Resolver queries lentas (25s) en combos de organización y checkins.
    Estrategia: 
    1. Crear índice 'covering' para columnas de organización.
    2. Crear SPs optimizados que eviten funciones escalares en cláusulas WHERE/GROUP BY.
    3. SPs utilitarios para Checkins por fecha.
    ============================================================================
*/

USE [Bdplaner];
GO

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '>>> [1/4] Creando Índice para Organización...';

-- Índice cubriente para evitar Table Scan en queries de combos de filtros
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Usuarios_Organizacion' AND object_id = OBJECT_ID('dbo.p_Usuarios'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Usuarios_Organizacion
    ON dbo.p_Usuarios (activo)
    INCLUDE (ogerencia, subgerencia, area, primer_nivel);
    PRINT '    + Index Creado: IX_p_Usuarios_Organizacion';
END
GO

PRINT '>>> [2/4] sp_Organizacion_ObtenerCatalogo...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_ObtenerCatalogo
AS
BEGIN
    SET NOCOUNT ON;
    -- SE ELIMINAN LTRIM/RTRIM del WHERE para permitir uso de índice
    SELECT DISTINCT 
        LTRIM(RTRIM(ogerencia)) AS ogerencia,
        LTRIM(RTRIM(subgerencia)) AS subgerencia,
        LTRIM(RTRIM(area)) AS area
    FROM dbo.p_Usuarios
    WHERE activo = 1
      AND ogerencia IS NOT NULL AND ogerencia <> ''
      AND subgerencia IS NOT NULL AND subgerencia <> ''
      AND area IS NOT NULL AND area <> ''
    ORDER BY 1, 2, 3
    OPTION (RECOMPILE);
END
GO

PRINT '>>> [3/4] sp_Organizacion_ObtenerEstructura...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_ObtenerEstructura
AS
BEGIN
    SET NOCOUNT ON;
    -- Agrupamos por columnas RAW para aprovechar índice
    SELECT
        LTRIM(RTRIM(ISNULL(ogerencia, '')))      AS gerencia,
        LTRIM(RTRIM(ISNULL(subgerencia, '')))    AS subgerencia,
        LTRIM(RTRIM(ISNULL(primer_nivel, '')))   AS area
    FROM dbo.p_Usuarios
    WHERE activo = 1
    GROUP BY
        ogerencia, subgerencia, primer_nivel
    ORDER BY 1,2,3
    OPTION (RECOMPILE);
END
GO

PRINT '>>> [4/4] sp_Checkins_ObtenerPorUsuarioFecha...';
GO
-- Para reemplazar query inline con CAST. Recibe DATETIME pero busca por día exacto.
CREATE OR ALTER PROCEDURE dbo.sp_Checkins_ObtenerPorUsuarioFecha
    @carnet NVARCHAR(50),
    @fecha DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @fechaDia DATE = CAST(@fecha AS DATE);
    DECLARE @inicio DATETIME = CAST(@fechaDia AS DATETIME);
    DECLARE @fin DATETIME = DATEADD(DAY, 1, @inicio);

    -- Busca rango >= inicio AND < fin para usar índice de fecha correctamente
    SELECT TOP (1) *
    FROM dbo.p_Checkins
    WHERE usuarioCarnet = @carnet
      AND fecha >= @inicio 
      AND fecha < @fin;
END
GO

PRINT '>>> OPTIMIZACIÓN EXTRA COMPLETADA.';
GO
