/*
============================================================================
CLARITY - SCRIPT ÚNICO (VERSIÓN TEST + BENCHMARK)
Fecha: 2026-01-27

Qué hace:
1) Ajusta/crea índices clave (y corrige el de p_Usuarios si existe mal).
2) Crea Stored Procedures "TEST" (no pisa los productivos):
   - dbo.sp_ObtenerProyectos_test
   - dbo.sp_Tareas_ObtenerPorUsuario_test
   - dbo.sp_Dashboard_Kpis_test
   - dbo.sp_Planning_ObtenerPlanes_test
   - dbo.sp_Equipo_ObtenerInforme_test
   - dbo.sp_Notas_Obtener_test
   - dbo.sp_Checkins_ObtenerPorEquipoFecha_test
   - dbo.sp_Usuarios_ObtenerPorLista_test
   - dbo.sp_Proyectos_Listar_test
3) Al final ejecuta BENCHMARK y devuelve tabla con ms (avg/min/max).

Requisitos:
- SQL Server 2017+ (por STRING_SPLIT). Si es 2016, igual sirve STRING_SPLIT si compatibilidad lo permite.
============================================================================
*/

USE [Bdplaner];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
GO

PRINT '>>> INICIANDO SCRIPT TEST + BENCHMARK...';

--------------------------------------------------------------------------------
-- 1) ÍNDICES (críticos)
--------------------------------------------------------------------------------
PRINT '>>> [1/3] Verificando/creando índices...';

/* 1.1 p_TareaAsignados: carnet + idTarea */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_p_TareaAsignados_Carnet_Tarea' 
      AND object_id = OBJECT_ID('dbo.p_TareaAsignados')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_TareaAsignados_Carnet_Tarea
    ON dbo.p_TareaAsignados (carnet, idTarea)
    INCLUDE (esResponsable);
    PRINT '    + Index Creado: IX_p_TareaAsignados_Carnet_Tarea';
END

/* 1.2 p_Tareas: mejor para dashboards (activo + estado + fechaObjetivo) */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_p_Tareas_Activo_Estado_FechaObjetivo' 
      AND object_id = OBJECT_ID('dbo.p_Tareas')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Tareas_Activo_Estado_FechaObjetivo
    ON dbo.p_Tareas (activo, estado, fechaObjetivo)
    INCLUDE (idProyecto, nombre, porcentaje, fechaCompletado, creadorCarnet);
    PRINT '    + Index Creado: IX_p_Tareas_Activo_Estado_FechaObjetivo';
END

/* 1.3 p_Checkins: usuario + fecha */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_p_Checkins_Usuario_Fecha' 
      AND object_id = OBJECT_ID('dbo.p_Checkins')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Checkins_Usuario_Fecha
    ON dbo.p_Checkins (usuarioCarnet, fecha);
    PRINT '    + Index Creado: IX_p_Checkins_Usuario_Fecha';
END

/* 1.4 p_Usuarios: validar si el índice existente está bien (key = carnet).
   Si existe con el mismo nombre pero NO tiene carnet como columna clave #1, se recrea. */
IF EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_p_Usuarios_Carnet' 
      AND object_id = OBJECT_ID('dbo.p_Usuarios')
)
BEGIN
    DECLARE @carnetEsPrimeraClave BIT = 0;

    SELECT TOP (1)
        @carnetEsPrimeraClave = CASE WHEN c.name = 'carnet' THEN 1 ELSE 0 END
    FROM sys.indexes i
    JOIN sys.index_columns ic 
         ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c
         ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('dbo.p_Usuarios')
      AND i.name = 'IX_p_Usuarios_Carnet'
      AND ic.is_included_column = 0
    ORDER BY ic.key_ordinal ASC;

    IF (@carnetEsPrimeraClave = 0)
    BEGIN
        DROP INDEX IX_p_Usuarios_Carnet ON dbo.p_Usuarios;
        PRINT '    ! Index Re-creado: IX_p_Usuarios_Carnet (estaba mal definido)';

        CREATE NONCLUSTERED INDEX IX_p_Usuarios_Carnet
        ON dbo.p_Usuarios (carnet)
        INCLUDE (idUsuario, nombre, nombreCompleto, correo, idRol, activo, cargo, rolGlobal);
    END
    ELSE
    BEGIN
        PRINT '    = Index OK: IX_p_Usuarios_Carnet';
    END
END
ELSE
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Usuarios_Carnet
    ON dbo.p_Usuarios (carnet)
    INCLUDE (idUsuario, nombre, nombreCompleto, correo, idRol, activo, cargo, rolGlobal);
    PRINT '    + Index Creado: IX_p_Usuarios_Carnet';
END

/* 1.5 p_Proyectos: fechaCreacion desc para paginación */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_p_Proyectos_FechaCreacion' 
      AND object_id = OBJECT_ID('dbo.p_Proyectos')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Proyectos_FechaCreacion
    ON dbo.p_Proyectos (fechaCreacion DESC)
    INCLUDE (nombre, descripcion, estado, area, gerencia, subgerencia, tipo, responsableCarnet, creadorCarnet);
    PRINT '    + Index Creado: IX_p_Proyectos_FechaCreacion';
END

/* 1.6 p_Proyectos: filtros avanzados */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes 
    WHERE name = 'IX_p_Proyectos_Filtros_Composite' 
      AND object_id = OBJECT_ID('dbo.p_Proyectos')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Proyectos_Filtros_Composite
    ON dbo.p_Proyectos (estado, gerencia, subgerencia, area, tipo)
    INCLUDE (nombre, fechaCreacion, responsableCarnet, creadorCarnet);
    PRINT '    + Index Creado: IX_p_Proyectos_Filtros_Composite';
END
GO

--------------------------------------------------------------------------------
-- 2) STORED PROCEDURES (TEST)
--------------------------------------------------------------------------------
PRINT '>>> [2/3] Creando Stored Procedures _test...';
GO

/*--------------------------------------------------------------
  sp_ObtenerProyectos_test
  Mejora:
  - Resuelve @idUsuario 1 vez.
  - Evita subquery repetida.
--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_ObtenerProyectos_test
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

/*--------------------------------------------------------------
  sp_Tareas_ObtenerPorUsuario_test
  Mejora:
  - Evita MERGE (#IdsTareas) y usa INSERT NOT EXISTS (más estable).
  - Resuelve idUsuario 1 vez.
--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario_test
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
        t.idTarea, t.idProyecto,
        t.nombre AS titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje AS progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion AS fechaUltActualizacion,
        t.idTareaPadre,
        t.idPlan,
        p.nombre AS proyectoNombre
    FROM #IdsTareas x
    JOIN dbo.p_Tareas t ON t.idTarea = x.idTarea
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    ORDER BY t.fechaObjetivo ASC, t.idTarea ASC
    OPTION (RECOMPILE);

    DROP TABLE #IdsTareas;
END
GO

/*--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Dashboard_Kpis_test
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

/*--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Planning_ObtenerPlanes_test
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

/*--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Equipo_ObtenerInforme_test
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

/*--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Notas_Obtener_test
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

/*--------------------------------------------------------------
  sp_Checkins_ObtenerPorEquipoFecha_test
  Mejora:
  - Evita join directo a STRING_SPLIT sin TRIM.
  - Maneja si fecha en p_Checkins es DATETIME (rango por día).
--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Checkins_ObtenerPorEquipoFecha_test
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

/*--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ObtenerPorLista_test
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
        u.idUsuario,
        u.nombre,
        u.nombreCompleto,
        u.correo,
        u.carnet,
        u.idRol,
        u.cargo,
        r.nombre as rolNombre
    FROM dbo.p_Usuarios u
    LEFT JOIN dbo.p_Roles r ON u.idRol = r.idRol
    JOIN #Carnets L ON u.carnet = L.carnet
    WHERE u.activo = 1
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
GO

/*--------------------------------------------------------------*/
CREATE OR ALTER PROCEDURE dbo.sp_Proyectos_Listar_test
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
        p.idProyecto,
        p.nombre,
        p.descripcion,
        p.estado,
        p.prioridad,
        p.fechaInicio,
        p.fechaFin,
        p.fechaCreacion,
        p.area,
        p.gerencia,
        p.subgerencia,
        p.responsableCarnet,
        p.creadorCarnet,
        p.tipo,
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

--------------------------------------------------------------------------------
-- 3) BENCHMARK (ms)
--------------------------------------------------------------------------------
PRINT '>>> [3/3] Ejecutando BENCHMARK...';
GO

DECLARE @carnet NVARCHAR(50) = N'500708';
DECLARE @hoy DATE = CAST(GETDATE() AS DATE);
DECLARE @mes INT = MONTH(GETDATE());
DECLARE @anio INT = YEAR(GETDATE());
DECLARE @carnetsList NVARCHAR(MAX) = @carnet; -- si querés varios: '500708,500709,...'

IF OBJECT_ID('tempdb..#Bench') IS NOT NULL DROP TABLE #Bench;
CREATE TABLE #Bench(
    testName NVARCHAR(200) NOT NULL,
    runNum INT NOT NULL,
    ms INT NOT NULL
);

DECLARE @i INT;
DECLARE @t0 DATETIME2(7);

-- helper macro manual (3 corridas por SP)
-- 1) sp_ObtenerProyectos_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_ObtenerProyectos_test @carnet=@carnet, @filtroNombre=NULL, @filtroEstado=NULL;
    INSERT INTO #Bench(testName, runNum, ms)
    VALUES (N'sp_ObtenerProyectos_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- 2) sp_Tareas_ObtenerPorUsuario_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_Tareas_ObtenerPorUsuario_test @carnet=@carnet, @estado=NULL, @idProyecto=NULL, @query=NULL, @startDate=NULL, @endDate=NULL;
    INSERT INTO #Bench VALUES (N'sp_Tareas_ObtenerPorUsuario_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- 3) sp_Dashboard_Kpis_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_Dashboard_Kpis_test @carnet=@carnet;
    INSERT INTO #Bench VALUES (N'sp_Dashboard_Kpis_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- 4) sp_Planning_ObtenerPlanes_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_Planning_ObtenerPlanes_test @carnet=@carnet, @mes=@mes, @anio=@anio;
    INSERT INTO #Bench VALUES (N'sp_Planning_ObtenerPlanes_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- 5) sp_Equipo_ObtenerInforme_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_Equipo_ObtenerInforme_test @carnetsList=@carnetsList, @fecha=GETDATE();
    INSERT INTO #Bench VALUES (N'sp_Equipo_ObtenerInforme_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- 6) sp_Notas_Obtener_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_Notas_Obtener_test @carnet=@carnet;
    INSERT INTO #Bench VALUES (N'sp_Notas_Obtener_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- 7) sp_Checkins_ObtenerPorEquipoFecha_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_Checkins_ObtenerPorEquipoFecha_test @carnetsList=@carnetsList, @fecha=@hoy;
    INSERT INTO #Bench VALUES (N'sp_Checkins_ObtenerPorEquipoFecha_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- 8) sp_Usuarios_ObtenerPorLista_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_Usuarios_ObtenerPorLista_test @carnetsList=@carnetsList;
    INSERT INTO #Bench VALUES (N'sp_Usuarios_ObtenerPorLista_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- 9) sp_Proyectos_Listar_test
SET @i = 1;
WHILE @i <= 3
BEGIN
    SET @t0 = SYSDATETIME();
    EXEC dbo.sp_Proyectos_Listar_test
        @nombre=NULL, @estado=NULL, @gerencia=NULL, @subgerencia=NULL, @area=NULL, @tipo=NULL,
        @pageNumber=1, @pageSize=50;
    INSERT INTO #Bench VALUES (N'sp_Proyectos_Listar_test', @i, DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
    SET @i += 1;
END

-- Resultado final (AVG/MIN/MAX)
SELECT
    testName,
    AVG(CAST(ms AS FLOAT)) AS msAvg,
    MIN(ms) AS msMin,
    MAX(ms) AS msMax,
    COUNT(*) AS runs
FROM #Bench
GROUP BY testName
ORDER BY msAvg ASC;

PRINT '>>> BENCHMARK COMPLETADO.';
GO

/*
============================================================================
PARA GEMINI 3 (copiar/pegar):
- Ejecuta este script completo.
- Valida que los índices se creen sin error.
- Corre el BENCHMARK y compara msAvg vs tus procs actuales.
- Si msAvg baja y resultados funcionales son iguales => aprobar.
- Si hay diferencias de datos, revisar:
  1) sp_Checkins_ObtenerPorEquipoFecha_test: usa rango por día (fecha >= @inicio y < @fin).
  2) sp_Equipo_ObtenerInforme_test: planificadas usa >= hoy (coherente con "futuro o null").
============================================================================
tambien los indices propuesto revisar
*/
USE [Bdplaner];
GO
SET NOCOUNT ON;
PRINT '=== INICIO: AJUSTE DE INDICES (PROPUESTA) ===';

--------------------------------------------------------------------------------
-- p_Usuarios: dejar 1 índice bueno para lookup por carnet (Profile Check)
--------------------------------------------------------------------------------
PRINT '-> p_Usuarios';

-- (Opcional) quitar índice malo (llave gigante) si existe
--IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Usuarios_Carnet' AND object_id = OBJECT_ID('dbo.p_Usuarios'))
--    DROP INDEX IX_p_Usuarios_Carnet ON dbo.p_Usuarios;

-- (Opcional) quitar duplicado simple si ya existe el UNIQUE filtrado
--IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Usuarios_carnet' AND object_id = OBJECT_ID('dbo.p_Usuarios'))
--    DROP INDEX IX_Usuarios_carnet ON dbo.p_Usuarios;

-- Índice recomendado (seek por carnet + columnas típicas del “profile check”)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Usuarios_Carnet_Lookup' AND object_id = OBJECT_ID('dbo.p_Usuarios'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Usuarios_Carnet_Lookup
    ON dbo.p_Usuarios (carnet)
    INCLUDE (idUsuario, nombre, nombreCompleto, correo, idRol, activo, rolGlobal, cargo, departamento, orgDepartamento, orgGerencia, area);
    PRINT '   + Creado: IX_p_Usuarios_Carnet_Lookup';
END
ELSE PRINT '   = Existe: IX_p_Usuarios_Carnet_Lookup';

--------------------------------------------------------------------------------
-- p_Checkins: evitar redundancia; dejar UNIQUE (idUsuario,fecha) y (usuarioCarnet,fecha)
--------------------------------------------------------------------------------
PRINT '-> p_Checkins';

-- Ya tenés UX_p_Checkins_idUsuario_fecha (UNIQUE). Este suele sobrar:
--IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Checkins_idUsuario_fecha' AND object_id = OBJECT_ID('dbo.p_Checkins'))
--    DROP INDEX IX_Checkins_idUsuario_fecha ON dbo.p_Checkins;

-- (Opcional) si usuarioCarnet es NULL en muchos registros, mejor filtrado:
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Checkins_Usuario_Fecha' AND object_id = OBJECT_ID('dbo.p_Checkins'))
BEGIN
    -- deja el tuyo si te funciona; si querés filtrado, crea otro y luego drop del viejo
    PRINT '   = Existe: IX_p_Checkins_Usuario_Fecha';
END
ELSE
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Checkins_Usuario_Fecha
    ON dbo.p_Checkins (usuarioCarnet, fecha)
    WHERE usuarioCarnet IS NOT NULL;
    PRINT '   + Creado: IX_p_Checkins_Usuario_Fecha (filtrado)';
END

--------------------------------------------------------------------------------
-- p_Proyectos: paginación por fechaCreacion DESC + filtros por estado/gerencia/area/tipo
--------------------------------------------------------------------------------
PRINT '-> p_Proyectos';

-- Tus índices actuales tienen llaves poco ideales; recomendación:
-- (Opcional) drop si confirmás redundancia/ineficiencia
--IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Proyectos_FechaCreacion' AND object_id = OBJECT_ID('dbo.p_Proyectos'))
--    DROP INDEX IX_p_Proyectos_FechaCreacion ON dbo.p_Proyectos;

--IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Proyectos_Filtros_Composite' AND object_id = OBJECT_ID('dbo.p_Proyectos'))
--    DROP INDEX IX_p_Proyectos_Filtros_Composite ON dbo.p_Proyectos;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Proyectos_FechaCreacion_DESC' AND object_id = OBJECT_ID('dbo.p_Proyectos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Proyectos_FechaCreacion_DESC
    ON dbo.p_Proyectos (fechaCreacion DESC)
    INCLUDE (idProyecto, nombre, descripcion, estado, prioridad, fechaInicio, fechaFin, area, gerencia, subgerencia, tipo, responsableCarnet, creadorCarnet);
    PRINT '   + Creado: IX_p_Proyectos_FechaCreacion_DESC';
END
ELSE PRINT '   = Existe: IX_p_Proyectos_FechaCreacion_DESC';

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Proyectos_Filtros_Core' AND object_id = OBJECT_ID('dbo.p_Proyectos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Proyectos_Filtros_Core
    ON dbo.p_Proyectos (estado, gerencia, subgerencia, area, tipo, fechaCreacion DESC)
    INCLUDE (idProyecto, nombre, responsableCarnet, creadorCarnet, prioridad);
    PRINT '   + Creado: IX_p_Proyectos_Filtros_Core';
END
ELSE PRINT '   = Existe: IX_p_Proyectos_Filtros_Core';

--------------------------------------------------------------------------------
-- p_Tareas: dashboard/consulta por estado + fechaObjetivo + activo
--------------------------------------------------------------------------------
PRINT '-> p_Tareas';

-- Tu IX_p_Tareas_Estado_FechaObjetivo está con llaves mezcladas y include redundante.
-- (Opcional) drop si validás que no aporta
--IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Tareas_Estado_FechaObjetivo' AND object_id = OBJECT_ID('dbo.p_Tareas'))
--    DROP INDEX IX_p_Tareas_Estado_FechaObjetivo ON dbo.p_Tareas;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Tareas_Dashboard' AND object_id = OBJECT_ID('dbo.p_Tareas'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Tareas_Dashboard
    ON dbo.p_Tareas (estado, activo, fechaObjetivo, idProyecto)
    INCLUDE (idTarea, nombre, porcentaje, fechaCompletado, prioridad, tipo, idTareaPadre, orden, idPlan, creadorCarnet);
    PRINT '   + Creado: IX_p_Tareas_Dashboard';
END
ELSE PRINT '   = Existe: IX_p_Tareas_Dashboard';

--------------------------------------------------------------------------------
-- p_TareaAsignados: buscar por carnet rápido (y resolver responsables)
--------------------------------------------------------------------------------
PRINT '-> p_TareaAsignados';

-- El tuyo actual empieza por esResponsable; si lo normal es carnet-first, mejor este:
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_TareaAsignados_Carnet_Tarea_v2' AND object_id = OBJECT_ID('dbo.p_TareaAsignados'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_TareaAsignados_Carnet_Tarea_v2
    ON dbo.p_TareaAsignados (carnet, idTarea)
    INCLUDE (esResponsable, idUsuario, tipo, fechaAsignacion);
    PRINT '   + Creado: IX_p_TareaAsignados_Carnet_Tarea_v2';
END
ELSE PRINT '   = Existe: IX_p_TareaAsignados_Carnet_Tarea_v2';

-- (Opcional) index filtrado para responsables (si se usa mucho esResponsable=1)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_TareaAsignados_Responsables' AND object_id = OBJECT_ID('dbo.p_TareaAsignados'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_TareaAsignados_Responsables
    ON dbo.p_TareaAsignados (idTarea)
    INCLUDE (carnet, idUsuario)
    WHERE esResponsable = 1;
    PRINT '   + Creado: IX_p_TareaAsignados_Responsables (filtrado)';
END
ELSE PRINT '   = Existe: IX_p_TareaAsignados_Responsables';

--------------------------------------------------------------------------------
-- p_Bloqueos: filtro típico por idTarea + estado
--------------------------------------------------------------------------------
PRINT '-> p_Bloqueos';

-- (Opcional) drop del índice actual si confirmás que no sirve
--IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Bloqueos_idTarea_estado' AND object_id = OBJECT_ID('dbo.p_Bloqueos'))
--    DROP INDEX IX_p_Bloqueos_idTarea_estado ON dbo.p_Bloqueos;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Bloqueos_Tarea_Estado' AND object_id = OBJECT_ID('dbo.p_Bloqueos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_p_Bloqueos_Tarea_Estado
    ON dbo.p_Bloqueos (idTarea, estado, creadoEn DESC)
    INCLUDE (idBloqueo, idUsuario, prioridad, categoria, idResueltoPor, fechaResolucion);
    PRINT '   + Creado: IX_p_Bloqueos_Tarea_Estado';
END
ELSE PRINT '   = Existe: IX_p_Bloqueos_Tarea_Estado';

--------------------------------------------------------------------------------
-- MINI-BATERIA DE TEST (para Gemini 3): medir y comparar
--------------------------------------------------------------------------------
PRINT '=== TEST: MEDICION RAPIDA (Gemini 3 debe correr esto y comparar IO/TIME) ===';

-- IMPORTANTE: correr en entorno de prueba o fuera de pico.
SET STATISTICS IO ON;
SET STATISTICS TIME ON;

DECLARE @carnet NVARCHAR(50) = N'500708';
DECLARE @hoy DATE = CAST(GETDATE() AS DATE);

-- 1) Profile check (la “Inline Query: p_Usuarios”)
SELECT TOP (1)
    u.idUsuario, u.nombre, u.nombreCompleto, u.correo, u.carnet, u.idRol, u.activo
FROM dbo.p_Usuarios u
WHERE u.carnet = @carnet;

-- 2) Checkin lookup por usuarioCarnet + fecha (si aplica)
SELECT TOP (1) *
FROM dbo.p_Checkins c
WHERE c.usuarioCarnet = @carnet AND c.fecha = @hoy;

-- 3) Tareas KPI-ish (estado/activo/fechaObjetivo)
SELECT TOP (50)
    t.idTarea, t.nombre, t.estado, t.fechaObjetivo, t.porcentaje
FROM dbo.p_Tareas t
WHERE t.activo = 1 AND t.estado IN ('Pendiente','EnCurso','Bloqueada')
ORDER BY t.fechaObjetivo;

SET STATISTICS IO OFF;
SET STATISTICS TIME OFF;

PRINT '=== FIN: AJUSTE DE INDICES (PROPUESTA) ===';
GO

