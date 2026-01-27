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