/* ========================================================================
   2. SP UTILITARIOS (Resolución ID <-> Carnet)
   ======================================================================== */

CREATE   PROCEDURE dbo.sp_Usuarios_ObtenerIdPorCarnet
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    -- CORRECCION: Usamos 'rolGlobal' en vez de 'rol'
    SELECT idUsuario, nombreCompleto, correo, rolGlobal as rol
    FROM dbo.p_Usuarios 
    WHERE carnet = @carnet;
END
GO