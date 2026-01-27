/*
    ============================================================================
    SCRIPT DE APLICACIÓN FINAL - OPTIMIZACIÓN CLARITY
    ============================================================================
    Descripción: Aplica las versiones optimizadas de los Stored Procedures 
    seleccionados tras benchmark comparativo.
    
    MEJORAS CLAVE:
    - Uso de Tablas Temporales para evitar Parameter Sniffing.
    - Eliminación de JOINS redundantes.
    - Índices Filtrados (ya aplicados previamente, aquí se asume su existencia).
    ============================================================================
*/

USE [Bdplaner];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '>>> [1/9] Actualizando sp_ObtenerProyectos...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerProyectos
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    ;WITH ProyectosBase AS (
        SELECT p.idProyecto
        FROM dbo.p_Proyectos p
        WHERE p.creadorCarnet = @carnet
           OR p.responsableCarnet = @carnet
           OR (@idUsuario IS NOT NULL AND p.idCreador = @idUsuario)

        UNION

        SELECT DISTINCT p2.idProyecto
        FROM dbo.p_Proyectos p2
        JOIN dbo.p_Tareas t ON t.idProyecto = p2.idProyecto AND t.activo = 1
        JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
        WHERE ta.carnet = @carnet
    )
    SELECT p.*
    FROM dbo.p_Proyectos p
    JOIN ProyectosBase b ON b.idProyecto = p.idProyecto
    WHERE (@filtroNombre IS NULL OR p.nombre LIKE N'%' + @filtroNombre + N'%')
      AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC
    OPTION (RECOMPILE);
END
GO


PRINT '>>> [2/9] Actualizando sp_Tareas_ObtenerPorUsuario...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario
    @carnet     NVARCHAR(50),
    @estado     NVARCHAR(50) = NULL,
    @idProyecto INT         = NULL,
    @query      NVARCHAR(100)= NULL,
    @startDate  DATETIME    = NULL,
    @endDate    DATETIME    = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF (@query IS NOT NULL AND LTRIM(RTRIM(@query)) = N'') SET @query = NULL;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    CREATE TABLE #IdsTareas(
        idTarea INT NOT NULL PRIMARY KEY
    );

    -- 1) creadas por carnet
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_Tareas t
    WHERE t.activo = 1
      AND t.creadorCarnet = @carnet
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (
            @query IS NULL OR
            (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%')
          )
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
    OPTION (RECOMPILE);

    -- 2) asignadas por carnet
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_TareaAsignados ta
    JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND ta.carnet = @carnet
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (
            @query IS NULL OR
            (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%')
          )
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
      AND NOT EXISTS (SELECT 1 FROM #IdsTareas x WHERE x.idTarea = t.idTarea)
    OPTION (RECOMPILE);

    -- 3) fallback legacy por idCreador
    IF (@idUsuario IS NOT NULL)
    BEGIN
        INSERT INTO #IdsTareas (idTarea)
        SELECT t.idTarea
        FROM dbo.p_Tareas t
        WHERE t.activo = 1
          AND t.idCreador = @idUsuario
          AND (@estado IS NULL OR t.estado = @estado)
          AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
          AND (
                @query IS NULL OR
                (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%')
              )
          AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
          AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
          AND NOT EXISTS (SELECT 1 FROM #IdsTareas x WHERE x.idTarea = t.idTarea)
        OPTION (RECOMPILE);
    END

    SELECT
        t.idTarea, t.idProyecto, t.nombre AS titulo, t.descripcion, 
        t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado, t.porcentaje AS progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada, t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion AS fechaUltActualizacion, t.idTareaPadre, t.idPlan,
        p.nombre AS proyectoNombre
    FROM #IdsTareas x
    JOIN dbo.p_Tareas t ON t.idTarea = x.idTarea
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    ORDER BY t.fechaObjetivo ASC, t.idTarea ASC
    OPTION (RECOMPILE);

    DROP TABLE #IdsTareas;
END
GO


PRINT '>>> [3/9] Actualizando sp_Dashboard_Kpis...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_Kpis
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    -- 1) Resumen Global
    SELECT
        COUNT_BIG(*) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas,
        SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END) as bloqueadas,
        AVG(CAST(COALESCE(t.porcentaje, 0) AS FLOAT)) as promedioAvance
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND (
            (@idUsuario IS NOT NULL AND t.idCreador = @idUsuario)
            OR ta.carnet = @carnet
          )
    OPTION (RECOMPILE);

    -- 2) Resumen por Proyecto
    SELECT
        p.nombre as proyecto,
        p.area,
        COUNT_BIG(t.idTarea) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas
    FROM dbo.p_Tareas t
    JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND (
            (@idUsuario IS NOT NULL AND t.idCreador = @idUsuario)
            OR ta.carnet = @carnet
          )
    GROUP BY p.nombre, p.area
    OPTION (RECOMPILE);
END
GO


PRINT '>>> [4/9] Actualizando sp_Planning_ObtenerPlanes...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Planning_ObtenerPlanes
    @carnet NVARCHAR(50),
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    DECLARE @idPlan INT = NULL;

    SELECT TOP (1) @idPlan = pt.idPlan
    FROM dbo.p_PlanesTrabajo pt
    WHERE pt.carnet = @carnet AND pt.mes = @mes AND pt.anio = @anio;

    IF (@idPlan IS NULL AND @idUsuario IS NOT NULL)
    BEGIN
        SELECT TOP (1) @idPlan = pt.idPlan
        FROM dbo.p_PlanesTrabajo pt
        WHERE pt.idUsuario = @idUsuario AND pt.mes = @mes AND pt.anio = @anio;
    END

    IF (@idPlan IS NULL)
    BEGIN
        SELECT NULL as idPlan;
        RETURN;
    END

    SELECT * FROM dbo.p_PlanesTrabajo WHERE idPlan = @idPlan;

    SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idPlan = @idPlan
    ORDER BY t.orden ASC
    OPTION (RECOMPILE);
END
GO


PRINT '>>> [5/9] Actualizando sp_Equipo_ObtenerInforme...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Equipo_ObtenerInforme
    @carnetsList NVARCHAR(MAX),
    @fecha DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fechaDate DATE = CAST(@fecha AS DATE);

    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT LTRIM(RTRIM(value))
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE LTRIM(RTRIM(value)) <> N'';

    SELECT
        c.carnet,
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente','EnCurso','Bloqueada','Revision')
                        AND t.fechaObjetivo IS NOT NULL
                        AND CAST(t.fechaObjetivo AS DATE) < @fechaDate
                        THEN 1 ELSE 0 END), 0) as retrasadas,
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente','EnCurso','Bloqueada','Revision','Pausa')
                        AND (t.fechaObjetivo IS NULL OR CAST(t.fechaObjetivo AS DATE) >= @fechaDate)
                        THEN 1 ELSE 0 END), 0) as planificadas,
        ISNULL(SUM(CASE WHEN t.estado = 'Hecha'
                        AND t.fechaCompletado IS NOT NULL
                        AND CAST(t.fechaCompletado AS DATE) = @fechaDate
                        THEN 1 ELSE 0 END), 0) as hechas,
        ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' THEN 1 ELSE 0 END), 0) as enCurso,
        ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END), 0) as bloqueadas,
        ISNULL(SUM(CASE WHEN t.estado = 'Descartada'
                        AND t.fechaActualizacion IS NOT NULL
                        AND CAST(t.fechaActualizacion AS DATE) = @fechaDate
                        THEN 1 ELSE 0 END), 0) as descartadas
    FROM #Carnets c
    LEFT JOIN dbo.p_TareaAsignados ta ON ta.carnet = c.carnet
    LEFT JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea AND t.activo = 1
    GROUP BY c.carnet
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
GO


PRINT '>>> [6/9] Actualizando sp_Notas_Obtener...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Notas_Obtener
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = idUsuario
    FROM dbo.p_Usuarios
    WHERE carnet = @carnet;

    SELECT *
    FROM dbo.p_Notas
    WHERE idUsuario = @idUsuario
    ORDER BY fechaModificacion DESC, fechaCreacion DESC
    OPTION (RECOMPILE);
END
GO


PRINT '>>> [7/9] Actualizando sp_Checkins_ObtenerPorEquipoFecha...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Checkins_ObtenerPorEquipoFecha
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT LTRIM(RTRIM(value))
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE LTRIM(RTRIM(value)) <> N'';

    DECLARE @inicio DATETIME = CAST(@fecha AS DATETIME);
    DECLARE @fin    DATETIME = DATEADD(DAY, 1, @inicio);

    SELECT
        c.idCheckin, c.usuarioCarnet, c.fecha, c.estadoAnimo, c.nota, c.entregableTexto,
        c.prioridad1, c.prioridad2, c.prioridad3, c.energia, c.linkEvidencia
    FROM dbo.p_Checkins c
    JOIN #Carnets x ON x.carnet = c.usuarioCarnet
    WHERE c.fecha >= @inicio
      AND c.fecha <  @fin
    OPTION (RECOMPILE);
    DROP TABLE #Carnets;
END
GO


PRINT '>>> [8/9] Actualizando sp_Usuarios_ObtenerPorLista...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ObtenerPorLista
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT LTRIM(RTRIM(value))
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE LTRIM(RTRIM(value)) <> N'';

    SELECT
        u.idUsuario, u.nombre, u.nombreCompleto, u.correo, u.carnet, u.idRol, u.cargo,
        r.nombre as rolNombre
    FROM dbo.p_Usuarios u
    LEFT JOIN dbo.p_Roles r ON u.idRol = r.idRol
    JOIN #Carnets L ON u.carnet = L.carnet
    WHERE u.activo = 1
    OPTION (RECOMPILE);
    DROP TABLE #Carnets;
END
GO


PRINT '>>> [9/9] Actualizando sp_Proyectos_Listar...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Proyectos_Listar
    @nombre NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @gerencia NVARCHAR(100) = NULL,
    @subgerencia NVARCHAR(100) = NULL,
    @area NVARCHAR(100) = NULL,
    @tipo NVARCHAR(50) = NULL,
    @pageNumber INT = 1,
    @pageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @offset INT = (@pageNumber - 1) * @pageSize;

    SELECT
        p.idProyecto, p.nombre, p.descripcion, p.estado, p.prioridad,
        p.fechaInicio, p.fechaFin, p.fechaCreacion, p.area, p.gerencia,
        p.subgerencia, p.responsableCarnet, p.creadorCarnet, p.tipo,
        porcentaje = (
            SELECT AVG(CAST(t.porcentaje AS FLOAT))
            FROM dbo.p_Tareas t
            WHERE t.idProyecto = p.idProyecto
              AND t.activo = 1
        )
    FROM dbo.p_Proyectos p
    WHERE (@nombre IS NULL OR p.nombre LIKE N'%' + @nombre + N'%')
      AND (@estado IS NULL OR p.estado = @estado)
      AND (@gerencia IS NULL OR p.gerencia = @gerencia)
      AND (@subgerencia IS NULL OR p.subgerencia = @subgerencia)
      AND (@area IS NULL OR p.area = @area)
      AND (@tipo IS NULL OR p.tipo = @tipo)
    ORDER BY p.fechaCreacion DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    OPTION (RECOMPILE);
END
GO

PRINT '>>> APLICACIÓN COMPLETADA EXITOSAMENTE.';
GO
