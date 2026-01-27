-- 7. SP para Crear Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Crear]
    @carnet NVARCHAR(50),
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    IF @idUsuario IS NULL RETURN;

    INSERT INTO p_Notas(idUsuario, titulo, contenido, fechaCreacion, fechaModificacion)
    VALUES(@idUsuario, @titulo, @contenido, GETDATE(), GETDATE());
END
GO