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