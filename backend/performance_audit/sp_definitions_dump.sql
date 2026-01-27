-- =============================================
-- Definition for: sp_ObtenerProyectos
-- =============================================

-- =============================================
-- MIGRACIÃ“N CLARITY: SPs CARNET-FIRST FINAL
-- Fecha: 2026-01-26
-- =============================================

-- 1. SP: Obtener Proyectos
CREATE   PROCEDURE [dbo].[sp_ObtenerProyectos]
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DISTINCT p.*
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea 
    WHERE (
        p.creadorCarnet = @carnet 
        OR p.responsableCarnet = @carnet
        OR ta.carnet = @carnet
        OR p.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) -- Fallback
    )
    AND (@filtroNombre IS NULL OR p.nombre LIKE '%' + @filtroNombre + '%')
    AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC;
END;

GO

-- =============================================
-- Definition for: sp_Tareas_ObtenerPorUsuario
-- =============================================

/*
  Optimized SP for Tasks by User
  Uses #Temp tables and avoids OR conditions that kill performance.
*/
CREATE   PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario
    @carnet     NVARCHAR(50),
    @estado     NVARCHAR(50) = NULL,
    @idProyecto INT         = NULL,
    @query      NVARCHAR(100)= NULL,
    @startDate  DATETIME    = NULL,
    @endDate    DATETIME    = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Normalize NULLs
    IF (@query IS NOT NULL AND LTRIM(RTRIM(@query)) = N'') SET @query = NULL;

    -- Get user ID once
    DECLARE @idUsuario INT;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    -- Temp table for unique IDs (faster than DISTINCT on wide rows)
    CREATE TABLE #IdsTareas(
        idTarea INT NOT NULL PRIMARY KEY
    );

    -- 1. Tasks Created by Carnet
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_Tareas t
    WHERE t.activo = 1
      AND t.creadorCarnet = @carnet
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate);

    -- 2. Tasks Assigned (Avoid duplicates with MERGE/Project check)
    -- Using simple LEFT JOIN exclusion or MERGE
    MERGE #IdsTareas AS target
    USING (
        SELECT t.idTarea
        FROM dbo.p_TareaAsignados ta
        INNER JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea
        WHERE t.activo = 1
          AND ta.carnet = @carnet
          AND (@estado IS NULL OR t.estado = @estado)
          AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
          AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
          AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
          AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
    ) AS source ON target.idTarea = source.idTarea
    WHEN NOT MATCHED THEN INSERT (idTarea) VALUES (source.idTarea)
    OPTION (RECOMPILE);

    -- 3. Tasks by Creator ID (Fallback)
    IF (@idUsuario IS NOT NULL)
    BEGIN
        MERGE #IdsTareas AS target
        USING (
            SELECT t.idTarea
            FROM dbo.p_Tareas t
            WHERE t.activo = 1
              AND t.idCreador = @idUsuario
              AND (@estado IS NULL OR t.estado = @estado)
              AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
              AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
              AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
              AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
        ) AS source ON target.idTarea = source.idTarea
        WHEN NOT MATCHED THEN INSERT (idTarea) VALUES (source.idTarea)
        OPTION (RECOMPILE);
    END

    -- Final Select Joining back
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
    INNER JOIN dbo.p_Tareas t     ON t.idTarea = x.idTarea
    LEFT  JOIN dbo.p_Proyectos p  ON p.idProyecto = t.idProyecto
    ORDER BY t.fechaObjetivo ASC, t.idTarea ASC
    OPTION (RECOMPILE);

    DROP TABLE #IdsTareas;
END

GO

-- =============================================
-- Definition for: sp_Dashboard_Kpis
-- =============================================

-- 5. SP para KPIs Dashboard
CREATE   PROCEDURE [dbo].[sp_Dashboard_Kpis]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Usamos ta.carnet directo para asignados.
    -- Para creador, seguimos dependiendo de JOIN o subquery si no hay columna en p_Tareas.
    
    -- 1. Resumen Global
    SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END) as hechas,
        SUM(CASE WHEN estado IN ('Pendiente', 'EnCurso') THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'Bloqueada' THEN 1 ELSE 0 END) as bloqueadas,
        AVG(CAST(COALESCE(porcentaje, 0) AS FLOAT)) as promedioAvance
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE (
        t.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) 
        OR ta.carnet = @carnet -- Uso directo de columna Carnet si existe
    )
      AND t.activo = 1;

    -- 2. Resumen por Proyecto
    SELECT
        p.nombre as proyecto,
        p.area,
        COUNT(t.idTarea) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas
    FROM p_Tareas t
    JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE (
        t.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
        OR ta.carnet = @carnet
    )
      AND t.activo = 1
    GROUP BY p.nombre, p.area;
END

GO

-- =============================================
-- Definition for: sp_Planning_ObtenerPlanes
-- =============================================

-- SP: Obtener Planes de Trabajo (Carnet-First)
CREATE   PROCEDURE [dbo].[sp_Planning_ObtenerPlanes]
    @carnet NVARCHAR(50),
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idPlan INT;
    
    -- 1. Intentar buscar por carnet directo
    SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
    WHERE carnet = @carnet AND mes = @mes AND anio = @anio;

    -- 2. Fallback por si acaso (aunque la migraciÃ³n ya los llenÃ³)
    IF @idPlan IS NULL
    BEGIN
        SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
        WHERE idUsuario = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
          AND mes = @mes AND anio = @anio;
    END

    IF @idPlan IS NULL 
    BEGIN
        -- No existe, devolvemos resultset vacÃ­o o null
        SELECT NULL as idPlan;
    END
    ELSE
    BEGIN
        -- Devolver datos del plan
        SELECT * FROM p_PlanesTrabajo WHERE idPlan = @idPlan;
        
        -- Devolver tareas asociadas al plan
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC;
    END
END

GO

-- =============================================
-- Definition for: sp_Equipo_ObtenerInforme
-- =============================================

/*
  NOMBRE: sp_Equipo_ObtenerInforme
  DESCRIPCION: Obtiene estadÃ­sticas DETALLADAS de ejecuciÃ³n para 'Mi Equipo'.
  Separado de sp_Equipo_ObtenerHoy para evitar conflictos con Dashboards existentes.
  
  LOGICA (Solicitada por Usuario):
  1. Retrasadas: Tareas Activas (Pendiente, EnCurso, Bloqueada) con FechaObjetivo < @fecha.
  2. Planificadas (Activas): Tareas Activas con FechaObjetivo <= @fecha (Backlog activo + Hoy).
  3. EnCurso: Estado 'EnCurso'.
  4. Bloqueadas: Estado 'Bloqueada'.
  5. Hechas: Completadas HOY (comparaciÃ³n exacta de fecha).
  6. Descartadas: Descartadas HOY.
*/

CREATE   PROCEDURE [dbo].[sp_Equipo_ObtenerInforme]
    @carnetsList NVARCHAR(MAX),
    @fecha DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @fechaDate DATE = CAST(@fecha AS DATE);

    -- Tabla temporal para los carnets a consultar
    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    
    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT TRIM(value)
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE TRIM(value) <> '';

    -- Resultado final
    SELECT 
        c.carnet,
        
        -- RETRASADAS: Activas y FechaObjetivo < Hoy
        ISNULL(SUM(CASE 
            WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision') 
                 AND CAST(t.fechaObjetivo AS DATE) < @fechaDate 
            THEN 1 ELSE 0 END), 0) as retrasadas,

        -- PLANIFICADAS (Carga Activa): Activas y (FechaObjetivo <= Hoy O Null)
        ISNULL(SUM(CASE 
            WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision', 'Pausa') 
                 AND (t.fechaObjetivo IS NULL OR CAST(t.fechaObjetivo AS DATE) <= @fechaDate)
            THEN 1 ELSE 0 END), 0) as planificadas,

        -- HECHAS (Solo hoy)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Hecha' 
                 AND CAST(t.fechaCompletado AS DATE) = @fechaDate 
            THEN 1 ELSE 0 END), 0) as hechas,
            
        -- EN CURSO (Estado actual absoluto)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'EnCurso' 
            THEN 1 ELSE 0 END), 0) as enCurso,

        -- BLOQUEADAS (Estado actual absoluto)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Bloqueada' 
            THEN 1 ELSE 0 END), 0) as bloqueadas,

        -- DESCARTADAS (Solo hoy)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Descartada' 
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

-- =============================================
-- Definition for: sp_Notas_Obtener
-- =============================================

-- 6. SP para Obtener Notas
CREATE   PROCEDURE [dbo].[sp_Notas_Obtener]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    -- Notas usan idUsuario? Si p_Notas tiene idUsuario, necesitamos resolver.
    -- Si migramos p_Notas a usar carnet, cambiaríamos esto. Asumimos standard behavior.
    
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    SELECT * FROM p_Notas 
    WHERE idUsuario = @idUsuario 
    ORDER BY fechaModificacion DESC, fechaCreacion DESC;
END

GO

-- =============================================
-- Definition for: sp_Checkins_ObtenerPorEquipoFecha
-- =============================================

-- =============================================
-- 1. OPTIMIZED CHECKIN RETRIEVAL
-- Replace inline query in clarity.repo.ts
-- Addresses: CAST(fecha as DATE) issue and Inline SQL
-- =============================================
CREATE   PROCEDURE [dbo].[sp_Checkins_ObtenerPorEquipoFecha]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Use TVP or String Split safely
    -- Ensure index IX_p_Checkins_Usuario_Fecha is used
    -- fecha column is DATE, so no CAST needed on column side.
    
    SELECT 
        c.idCheckin,
        c.usuarioCarnet,
        c.fecha,
        c.estadoAnimo,
        c.nota,
        c.entregableTexto,
        c.prioridad1,
        c.prioridad2,
        c.prioridad3,
        c.energia,
        c.linkEvidencia
    FROM p_Checkins c
    INNER JOIN STRING_SPLIT(@carnetsList, ',') s ON c.usuarioCarnet = s.value
    WHERE c.fecha = @fecha;

END

GO

-- =============================================
-- Definition for: sp_Usuarios_ObtenerPorLista
-- =============================================

CREATE   PROCEDURE [dbo].[sp_Usuarios_ObtenerPorLista]
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Retrieve user details for a list of carnets
    -- Optimizes the inline query: 
    -- SELECT u.*, r.nombre as rolNombre ... INNER JOIN STRING_SPLIT ...
    
    SELECT 
        u.idUsuario,
        u.nombre,
        u.nombreCompleto,
        u.correo,
        u.carnet,
        u.idRol,
        u.cargo,
        r.nombre as rolNombre
    FROM p_Usuarios u
    LEFT JOIN p_Roles r ON u.idRol = r.idRol
    INNER JOIN STRING_SPLIT(@carnetsList, ',') L ON u.carnet = L.value
    WHERE u.activo = 1
    OPTION (RECOMPILE); -- Optimize for the specific list size

END

GO

-- =============================================
-- Definition for: sp_Proyectos_Listar
-- =============================================

-- =============================================
-- 2. OPTIMIZED PROJECT LISTING
-- Replace inline query in planning.repo.ts -> obtenerTodosProyectos
-- Addresses: Table Scans, Excessive SELECT *, Lack of Pagination
-- =============================================
CREATE   PROCEDURE [dbo].[sp_Proyectos_Listar]
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

    -- Dynamic SQL or sophisticated IF/ELSE is often needed for optional params to ensure index usage,
    -- but usually `(@p IS NULL OR col = @p)` is "okay" in modern SQL Server (Option Recompile).
    -- Given the simplicity, we'll stick to a clean query with OPTION (RECOMPILE).

    SELECT 
        idProyecto,
        nombre,
        descripcion,
        estado,
        prioridad,
        fechaInicio,
        fechaFin,
        fechaCreacion,
        area,
        gerencia,
        subgerencia,
        responsableCarnet,
        creadorCarnet,
        tipo,
        porcentaje = (SELECT AVG(porcentaje) FROM p_Tareas t WHERE t.idProyecto = p.idProyecto AND t.activo = 1) -- Keep efficient subquery or move to View if slow
    FROM p_Proyectos p
    WHERE 
        (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@subgerencia IS NULL OR p.subgerencia = @subgerencia)
        AND (@area IS NULL OR p.area = @area)
        AND (@tipo IS NULL OR p.tipo = @tipo)
    ORDER BY p.fechaCreacion DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    OPTION (RECOMPILE); -- Forces fresh plan for different parameter combinations (Critical for optional filters)

END

GO

