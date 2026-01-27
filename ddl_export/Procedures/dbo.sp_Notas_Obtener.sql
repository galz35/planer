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