/*
    ============================================================================
    SCRIPT MAESTRO DE OPTIMIZACIÓN - BACKEND CLARITY
    ============================================================================
    Fecha Generación: 2026-01-27
    Descripción: Este archivo contiene TODOS los Stored Procedures y Consultas 
    Estratégicas que utiliza el Backend y que han sido validadas en la auditoría 
    de rendimiento de menos de 200ms.
    
    CONTENIDO:
    1. Índices (Performance Tuning)
    2. Stored Procedures (Lógica de Negocio Optimizada)
       - sp_ObtenerProyectos (Listado Personal)
       - sp_Tareas_ObtenerPorUsuario (Tareas Propias + Delegadas)
       - sp_Dashboard_Kpis (Métricas Rápidas)
       - sp_Planning_ObtenerPlanes (Gestión Mensual)
       - sp_Equipo_ObtenerInforme (Reporte Diario del Equipo)
       - sp_Notas_Obtener (Notas Personales)
       - sp_Checkins_ObtenerPorEquipoFecha (Status Diario)
       - sp_Usuarios_ObtenerPorLista (Bulk User Lookups - OPTIMIZADO)
       - sp_Proyectos_Listar (Listado Global Paginado - OPTIMIZADO)
       - sp_Tarea_CrearCompleta_v2 (Creación Atómica con Jerarquía) [NUEVO]
       - sp_Tarea_RecalcularJerarquia_v2 (Motor de Roll-up Inteligente) [NUEVO]

    ============================================================================
*/

USE [Bdplaner];
GO

-- Configuración de seguridad y compatibilidad
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
GO

PRINT '>>> INICIANDO APLICACIÓN DE SCRIPT MAESTRO DE RENDIMIENTO...';

-- ============================================================================
-- SECCIÓN 1: ÍNDICES (CRÍTICOS PARA VELOCIDAD)
-- ============================================================================

PRINT '>>> [1/10] Verificando Índices...';

-- 1.1 TareasAsignados: Búsqueda eficiente de responsables
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_TareaAsignados_Carnet_Tarea' AND object_id = OBJECT_ID('p_TareaAsignados'))
BEGIN
    CREATE INDEX IX_p_TareaAsignados_Carnet_Tarea ON p_TareaAsignados (carnet, idTarea) INCLUDE (esResponsable);
    PRINT '    + Index Creado: IX_p_TareaAsignados_Carnet_Tarea';
END

-- 1.2 Tareas: Filtrado por Estado y fecha (Dashboards)
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Tareas_Estado_FechaObjetivo' AND object_id = OBJECT_ID('p_Tareas'))
BEGIN
    CREATE INDEX IX_p_Tareas_Estado_FechaObjetivo ON p_Tareas (estado, fechaObjetivo) INCLUDE (idProyecto, activo, nombre); 
    PRINT '    + Index Creado: IX_p_Tareas_Estado_FechaObjetivo';
END

-- 1.3 Checkins: Eliminar Full Scans al buscar por Usuario+Fecha
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Checkins_Usuario_Fecha' AND object_id = OBJECT_ID('p_Checkins'))
BEGIN
    CREATE INDEX IX_p_Checkins_Usuario_Fecha ON p_Checkins (usuarioCarnet, fecha);
    PRINT '    + Index Creado: IX_p_Checkins_Usuario_Fecha';
END

-- 1.4 Usuarios: Lookup rápido por Carnet (Fundamental para Auth)
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Usuarios_Carnet' AND object_id = OBJECT_ID('p_Usuarios'))
BEGIN
    CREATE INDEX IX_p_Usuarios_Carnet ON p_Usuarios (carnet) INCLUDE (idUsuario, nombre, correo, idRol, activo);
    PRINT '    + Index Creado: IX_p_Usuarios_Carnet';
END

-- 1.5 Proyectos: Ordenamiento para paginación
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Proyectos_FechaCreacion' AND object_id = OBJECT_ID('p_Proyectos'))
BEGIN
    CREATE INDEX IX_p_Proyectos_FechaCreacion ON p_Proyectos (fechaCreacion DESC) INCLUDE (nombre, descripcion, estado);
    PRINT '    + Index Creado: IX_p_Proyectos_FechaCreacion';
END

-- 1.6 Proyectos: Índice Compuesto para Filtros Avanzados
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Proyectos_Filtros_Composite' AND object_id = OBJECT_ID('p_Proyectos'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_p_Proyectos_Filtros_Composite] ON [dbo].[p_Proyectos]
    (
        [estado] ASC,
        [gerencia] ASC,
        [subgerencia] ASC,
        [area] ASC,
        [tipo] ASC
    )
    INCLUDE ([nombre], [fechaCreacion], [responsableCarnet], [creadorCarnet])
    PRINT '    + Index Creado: IX_p_Proyectos_Filtros_Composite';
END

-- ============================================================================
-- SECCIÓN 2: STORED PROCEDURES (CORE DEL SISTEMA)
-- ============================================================================

PRINT '>>> [2/10] Actualizando sp_ObtenerProyectos...';
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_ObtenerProyectos]
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- Lógica Carnet-First: Busca proyectos donde soy Creador, Responsable o Asignado
    SELECT DISTINCT p.*,
        progreso = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea 
    WHERE (
        p.creadorCarnet = @carnet 
        OR p.responsableCarnet = @carnet
        OR ta.carnet = @carnet
        -- Fallback de compatibilidad legado
        OR p.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) 
    )
    AND (@filtroNombre IS NULL OR p.nombre LIKE '%' + @filtroNombre + '%')
    AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC;
END;
GO


PRINT '>>> [3/10] Actualizando sp_Tareas_ObtenerPorUsuario...';
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

    -- Obtener ID numérico una sola vez
    DECLARE @idUsuario INT;
    SELECT TOP (1) @idUsuario = u.idUsuario FROM dbo.p_Usuarios u WHERE u.carnet = @carnet;

    CREATE TABLE #IdsTareas(idTarea INT NOT NULL PRIMARY KEY);

    -- 1. Tareas creadas por mí
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

    -- 2. Tareas asignadas a mí (Merge para evitar duplicados)
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

    -- 3. Fallback ID Numérico (Legacy)
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

    -- Selección Final con JOINs necesarios
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


PRINT '>>> [4/10] Actualizando sp_Dashboard_Kpis...';
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Dashboard_Kpis]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    -- KPIs Personales para la página de inicio
    
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
        OR ta.carnet = @carnet
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


PRINT '>>> [5/10] Actualizando sp_Planning_ObtenerPlanes...';
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_ObtenerPlanes]
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

    -- 2. Fallback
    IF @idPlan IS NULL
        SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
        WHERE idUsuario = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
          AND mes = @mes AND anio = @anio;

    IF @idPlan IS NULL 
    BEGIN
        SELECT NULL as idPlan;
    END
    ELSE
    BEGIN
        -- Devolver Plan
        SELECT * FROM p_PlanesTrabajo WHERE idPlan = @idPlan;
        -- Devolver Tareas del Plan
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC;
    END
END
GO


PRINT '>>> [6/10] Actualizando sp_Equipo_ObtenerInforme...';
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Equipo_ObtenerInforme]
    @carnetsList NVARCHAR(MAX),
    @fecha DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fechaDate DATE = CAST(@fecha AS DATE);

    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    INSERT INTO #Carnets (carnet) SELECT DISTINCT TRIM(value) FROM STRING_SPLIT(@carnetsList, ',') WHERE TRIM(value) <> '';

    SELECT 
        c.carnet,
        -- RETRASADAS: Activas y Vencidas
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision') AND CAST(t.fechaObjetivo AS DATE) < @fechaDate THEN 1 ELSE 0 END), 0) as retrasadas,
        -- PLANIFICADAS: Activas y (Vencen hoy o Futuro cercano o Null)
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision', 'Pausa') AND (t.fechaObjetivo IS NULL OR CAST(t.fechaObjetivo AS DATE) <= @fechaDate) THEN 1 ELSE 0 END), 0) as planificadas,
        -- HECHAS: Completadas HOY
        ISNULL(SUM(CASE WHEN t.estado = 'Hecha' AND CAST(t.fechaCompletado AS DATE) = @fechaDate THEN 1 ELSE 0 END), 0) as hechas,
        -- EN CURSO
        ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' THEN 1 ELSE 0 END), 0) as enCurso,
        -- BLOQUEADAS
        ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END), 0) as bloqueadas,
        -- DESCARTADAS
        ISNULL(SUM(CASE WHEN t.estado = 'Descartada' AND CAST(t.fechaActualizacion AS DATE) = @fechaDate THEN 1 ELSE 0 END), 0) as descartadas
    FROM #Carnets c
    LEFT JOIN dbo.p_TareaAsignados ta ON ta.carnet = c.carnet
    LEFT JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea AND t.activo = 1
    GROUP BY c.carnet
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
GO


PRINT '>>> [7/10] Actualizando sp_Notas_Obtener...';
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Notas_Obtener]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    SELECT * FROM p_Notas 
    WHERE idUsuario = @idUsuario 
    ORDER BY fechaModificacion DESC, fechaCreacion DESC;
END
GO


PRINT '>>> [8/10] Actualizando sp_Checkins_ObtenerPorEquipoFecha...';
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Checkins_ObtenerPorEquipoFecha]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    -- Optimizado para evitar CAST en WHERE. Usa Índice directo.
    SELECT 
        c.idCheckin, c.usuarioCarnet, c.fecha, c.estadoAnimo, c.nota, c.entregableTexto,
        c.prioridad1, c.prioridad2, c.prioridad3, c.energia, c.linkEvidencia
    FROM p_Checkins c
    INNER JOIN STRING_SPLIT(@carnetsList, ',') s ON c.usuarioCarnet = s.value
    WHERE c.fecha = @fecha;
END
GO


PRINT '>>> [9/10] Actualizando sp_Usuarios_ObtenerPorLista...';
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Usuarios_ObtenerPorLista]
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    -- Optimizado para evitar Inline SQL con joins complejos
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
    OPTION (RECOMPILE);
END
GO


PRINT '>>> [10/10] Actualizando sp_Proyectos_Listar...';
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Proyectos_Listar]
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
        progreso = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
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
    OPTION (RECOMPILE); 
END;
GO
CREATE OR ALTER PROCEDURE dbo.sp_Tarea_CrearCompleta_v2
(
    @nombre NVARCHAR(255),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @idResponsable INT = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(50) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(50) = NULL,
    @requiereEvidencia BIT = 0,
    @idEntregable INT = NULL,
    @semana INT = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;
        
        -- Defaults
        IF @fechaObjetivo IS NULL SET @fechaObjetivo = GETDATE();
        
        -- Validacion %
        IF @porcentaje < 0 OR @porcentaje > 100
             THROW 50020, 'El porcentaje debe estar entre 0 y 100.', 1;

        -- Normalizacion Hecha
        IF @estado = 'Hecha' SET @porcentaje = 100;

        -- Validaciones de Padre
        IF @idTareaPadre IS NOT NULL
        BEGIN
            -- Existencia
            IF NOT EXISTS (SELECT 1 FROM dbo.p_Tareas WHERE idTarea = @idTareaPadre AND activo = 1)
                THROW 50021, 'La tarea padre no existe o no está activa.', 1;

            -- Consistencia Proyecto
            IF @idProyecto IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dbo.p_Tareas WHERE idTarea = @idTareaPadre AND idProyecto = @idProyecto)
                    THROW 50022, 'La tarea padre debe pertenecer al mismo proyecto.', 1;
            END
        END

        INSERT INTO dbo.p_Tareas (
            nombre, idCreador, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
            fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, comportamiento,
            idTareaPadre, requiereEvidencia, idEntregable, fechaCreacion, activo, semana
        )
        VALUES (
            @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
            @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento,
            @idTareaPadre, @requiereEvidencia, @idEntregable, GETDATE(), 1, @semana
        );

        DECLARE @idTarea INT = SCOPE_IDENTITY();

        -- Asignacion Responsable
        IF @idResponsable IS NOT NULL AND @idResponsable <> @idUsuario
        BEGIN
            INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
            VALUES (@idTarea, @idResponsable, 'Responsable', GETDATE());
        END

        COMMIT;
        SELECT @idTarea AS idTarea;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO


PRINT '>>> [12/12] Agregando sp_Tarea_RecalcularJerarquia_v2...';
GO
CREATE OR ALTER PROCEDURE dbo.sp_Tarea_RecalcularJerarquia_v2
(
    @idTareaInicio INT = NULL,
    @idPadreDirecto INT = NULL,
    @maxDepth INT = 10
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- El INDEX FILTRADO requiere estas opciones (aseguradas por script principal)
    -- SET QUOTED_IDENTIFIER ON 
    
    DECLARE @idActual INT;
    DECLARE @nivel INT = 0;
    
    IF @idPadreDirecto IS NOT NULL
        SET @idActual = @idPadreDirecto;
    ELSE
        SELECT @idActual = idTareaPadre FROM dbo.p_Tareas WHERE idTarea = @idTareaInicio;

    -- Si no tiene padre, salir rapido
    IF @idActual IS NULL RETURN;

    BEGIN TRY
        DECLARE @localTran BIT = 0;
        IF @@TRANCOUNT = 0 
        BEGIN
            BEGIN TRAN;
            SET @localTran = 1;
        END

        WHILE @idActual IS NOT NULL AND @nivel < @maxDepth
        BEGIN
             -- 1. Bloquear padre
            DECLARE @idPadreDeActual INT;
            DECLARE @estadoActual NVARCHAR(50);
            DECLARE @porcentajeActual INT;

            SELECT 
                @idPadreDeActual = idTareaPadre,
                @estadoActual = estado,
                @porcentajeActual = porcentaje
            FROM dbo.p_Tareas WITH (UPDLOCK, HOLDLOCK)
            WHERE idTarea = @idActual;

            If @@ROWCOUNT = 0 BREAK; -- Padre borrado o inexistente

            -- 2. Calcular hijos
            DECLARE @total INT = 0;
            DECLARE @sumNorm FLOAT = 0; -- Float para precision
            DECLARE @totalHechas INT = 0;

            SELECT 
                @total = COUNT(1),
                @sumNorm = SUM(
                    CASE 
                        WHEN estado = 'Hecha' THEN 100.0
                        ELSE ISNULL(CAST(porcentaje AS FLOAT), 0)
                    END
                ),
                @totalHechas = SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END)
            FROM dbo.p_Tareas 
            WHERE idTareaPadre = @idActual
              AND activo = 1 
              AND estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada');

            IF @total = 0 
            BEGIN
                -- Padre sin hijos validos (hijos borrados?). No recalcular.
                SET @idActual = @idPadreDeActual;
                SET @nivel += 1;
                CONTINUE; 
            END

            -- 3. Nuevos valores
            DECLARE @nuevoPromedio INT = ROUND(@sumNorm / @total, 0);
            IF @nuevoPromedio > 100 SET @nuevoPromedio = 100;

            DECLARE @nuevoEstado NVARCHAR(50) = 'Pendiente';
            
            IF @totalHechas = @total 
                SET @nuevoEstado = 'Hecha';
            ELSE IF @sumNorm > 0 OR EXISTS(SELECT 1 FROM dbo.p_Tareas WHERE idTareaPadre = @idActual AND estado = 'EnCurso')
                SET @nuevoEstado = 'EnCurso';

            -- 4. Update
            IF @porcentajeActual <> @nuevoPromedio OR @estadoActual <> @nuevoEstado
            BEGIN
                UPDATE dbo.p_Tareas
                SET porcentaje = @nuevoPromedio,
                    estado = @nuevoEstado
                WHERE idTarea = @idActual;
            END

            -- 5. Subir
            SET @idActual = @idPadreDeActual;
            SET @nivel += 1;
        END

        IF @localTran = 1 COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 AND @localTran = 1 ROLLBACK TRAN;
        THROW;
    END CATCH
END
GO
