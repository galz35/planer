-- 3.3 sp_Clarity_MiDia_Get_Carnet
CREATE   PROCEDURE dbo.sp_Clarity_MiDia_Get_Carnet
    @carnet NVARCHAR(50),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @carnet;

    -- CORRECCION: Usamos 'fechaCompletado' en lugar de 'fechaFinalizacion'
    -- Y agregamos ISNULL para evitar fallos si fechaCompletado es nulo
    SELECT t.*, p.nombre as nombreProyecto
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    WHERE t.idCreador = @idUsuario
      AND t.activo = 1
      AND (
          (t.estado NOT IN ('Hecha', 'Archivada') AND cast(t.fechaObjetivo as date) <= @fecha)
          OR
          (t.estado = 'Hecha' AND cast(t.fechaCompletado as date) = @fecha)
      )
    ORDER BY t.prioridad DESC, t.fechaObjetivo ASC;

    SELECT * FROM dbo.p_Checkins WHERE idUsuario = @idUsuario AND cast(fecha as date) = @fecha;
END
GO