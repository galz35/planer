-- 10. SP para Actualizar Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Actualizar]
    @idNota INT,
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Notas 
    SET titulo = @titulo, 
        contenido = @contenido, 
        fechaModificacion = GETDATE()
    WHERE idNota = @idNota;
END
GO