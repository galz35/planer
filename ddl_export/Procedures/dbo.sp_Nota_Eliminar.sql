-- 11. SP para Eliminar Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Eliminar]
    @id INT -- idNota
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM p_Notas WHERE idNota = @id;
END
GO