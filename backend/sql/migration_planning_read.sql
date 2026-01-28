
/* =========================================================
   6) MIGRACIÓN PLANNING: SPS DE LECTURA DE PROYECTOS
   ========================================================= */

-- 6.1 sp_Proyecto_ObtenerVisibles (Reemplaza consulta compleja con IN dinámico)
--     Usa TVP para filtrar por lista de usuarios subordinados (evita dynamic SQL 'IN (1,2,3)')
--     O mejor, usa la lógica del carnet directamente en el SP si es posible, o acepta el TVP calculado.
--     Dado que obtenerProyectosVisibles calcula idsEquipo en backend basado en jerarquía, 
--     podemos mover esa lógica de jerarquía al SP también si tenemos la tabla de usuarios.
--     Pero para mantener consistencia con el cache del backend, pasaremos TVP de idsEquipo.

IF TYPE_ID(N'TVP_IntList') IS NULL
BEGIN
    CREATE TYPE dbo.TVP_IntList AS TABLE (Id INT NOT NULL PRIMARY KEY);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Proyecto_ObtenerVisibles
(
    @idUsuario INT,
    @idsEquipo dbo.TVP_IntList READONLY, -- Lista de IDs (Yo + Subordinados)
    @nombre    NVARCHAR(100) = NULL,
    @estado    NVARCHAR(50) = NULL,
    @gerencia  NVARCHAR(100) = NULL,
    @area      NVARCHAR(100) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Filtros dinámicos manejados con lógica segura
    SELECT DISTINCT p.*,
        progreso = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM dbo.p_Proyectos p
    WHERE 
        (
            p.idCreador = @idUsuario
            OR EXISTS (
                SELECT 1
                FROM dbo.p_Tareas t
                INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                INNER JOIN @idsEquipo team ON team.Id = ta.idUsuario
                WHERE t.idProyecto = p.idProyecto
            )
        )
        AND (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@area IS NULL OR p.area = @area)
    ORDER BY p.fechaCreacion DESC;
END
GO

/* =========================================================
   7) SP Auxiliar: sp_Jerarquia_ObtenerEquipo (Opcional, futuro reemplazo del cache TS)
   ========================================================= */
CREATE OR ALTER PROCEDURE dbo.sp_Jerarquia_ObtenerEquipo
(
    @idUsuario INT,
    @carnet    NVARCHAR(50)
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Devuelve el mismo usuario + subordinados directos e indirectos (hasta nivel 4)
    SELECT u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.idUsuario = @idUsuario
       OR (
           @carnet IS NOT NULL AND @carnet <> '' AND
           (u.jefeCarnet = @carnet OR u.carnet_jefe2 = @carnet OR u.carnet_jefe3 = @carnet OR u.carnet_jefe4 = @carnet)
          );
END
GO
