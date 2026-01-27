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