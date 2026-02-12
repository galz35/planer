USE [Planer]
GO

/****** Object:  StoredProcedure [dbo].[sp_Clarity_MiDia_Get_Carnet]    Script Date: 12/02/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 3.3 sp_Clarity_MiDia_Get_Carnet
CREATE OR ALTER PROCEDURE [dbo].[sp_Clarity_MiDia_Get_Carnet]
    @carnet NVARCHAR(50),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @carnet;

    -- CORRECCION: Incluir tareas donde soy ASIGNADO, no solo Creador.
    -- (t.idAsignado = @idUsuario OR (t.idAsignado IS NULL AND t.idCreador = @idUsuario))
    
    SELECT t.*, p.nombre as nombreProyecto
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    WHERE (t.idAsignado = @idUsuario OR (t.idAsignado IS NULL AND t.idCreador = @idUsuario))
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
