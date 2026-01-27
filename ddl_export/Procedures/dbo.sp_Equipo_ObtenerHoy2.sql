/**
 * SP: sp_Equipo_ObtenerHoy (OPTIMIZADO)
 * Claves de rendimiento:
 *  - Parsear @carnetsList a #Carnets (PK) para joins rápidos
 *  - Quitar CAST(col AS DATE) (mata índices) y usar rangos [@d0, @d1)
 *  - Filtrar Hecha/Descartada solo para el día (reduce lectura)
 *  - OPTION(RECOMPILE) para evitar planes malos por tamaños variables de lista
 *
 * Índices recomendados (si no existen):
 *  1) p_TareaAsignados:  IX_p_TareaAsignados_Carnet_IdTarea (carnet, idTarea)
 *  2) p_Tareas:          IX_p_Tareas_Activo_Estado_FechaObj (activo, estado, fechaObjetivo) INCLUDE(idTarea)
 *  3) p_Tareas:          IX_p_Tareas_Hecha_FechaComp        (estado, fechaCompletado) INCLUDE(activo, idTarea)
 *  4) p_Tareas:          IX_p_Tareas_Desc_FechaAct          (estado, fechaActualizacion) INCLUDE(activo, idTarea)
 *  5) p_Usuarios:        UX/IX_p_Usuarios_Carnet            (carnet) INCLUDE(idUsuario)
 */
create PROCEDURE dbo.sp_Equipo_ObtenerHoy2
    @carnetsList NVARCHAR(MAX),
    @fecha       DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @d0 DATETIME2(0) = CONVERT(DATETIME2(0), @fecha);
    DECLARE @d1 DATETIME2(0) = DATEADD(DAY, 1, @d0);

    -- 1) Lista de carnets a una tabla temporal con índice (rápido para JOIN)
    CREATE TABLE #Carnets
    (
        carnet VARCHAR(20) NOT NULL PRIMARY KEY
    );

    INSERT INTO #Carnets(carnet)
    SELECT DISTINCT CONVERT(VARCHAR(20), LTRIM(RTRIM(s.value)))
    FROM STRING_SPLIT(@carnetsList, ',') s
    WHERE LTRIM(RTRIM(s.value)) <> '';

    -- 2) Base de usuarios (para devolver 0s aunque no tengan tareas)
    ;WITH UsuariosFiltrados AS
    (
        SELECT u.idUsuario, u.carnet
        FROM p_Usuarios u
        INNER JOIN #Carnets c ON c.carnet = u.carnet
    )
    SELECT
        uf.idUsuario,
        uf.carnet,

        -- Retrasadas: estados activos con fechaObjetivo < hoy
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
                 AND t.fechaObjetivo < @d0
                THEN 1 ELSE 0
            END) AS retrasadas,

        -- Planificadas: estados activos con fechaObjetivo >= hoy
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
                 AND t.fechaObjetivo >= @d0
                THEN 1 ELSE 0
            END) AS planificadas,

        -- Hechas HOY
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Hecha'
                 AND t.fechaCompletado >= @d0
                 AND t.fechaCompletado <  @d1
                THEN 1 ELSE 0
            END) AS hechas,

        -- EnCurso (histórico activo)
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'EnCurso'
                THEN 1 ELSE 0
            END) AS enCurso,

        -- Bloqueadas (histórico activo)
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Bloqueada'
                THEN 1 ELSE 0
            END) AS bloqueadas,

        -- Descartadas HOY
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Descartada'
                 AND t.fechaActualizacion >= @d0
                 AND t.fechaActualizacion <  @d1
                THEN 1 ELSE 0
            END) AS descartadas

    FROM UsuariosFiltrados uf
    LEFT JOIN p_TareaAsignados ta
        ON ta.carnet = uf.carnet
    LEFT JOIN p_Tareas t
        ON t.idTarea = ta.idTarea
       AND t.activo = 1
       AND (
            t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
            OR (t.estado = 'Hecha'       AND t.fechaCompletado   >= @d0 AND t.fechaCompletado   < @d1)
            OR (t.estado = 'Descartada'  AND t.fechaActualizacion>= @d0 AND t.fechaActualizacion< @d1)
       )
    GROUP BY uf.idUsuario, uf.carnet
    OPTION (RECOMPILE);
END
GO