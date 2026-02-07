/* 
   SP para creación de usuarios administrativos
   Objetivo: Crear un usuario en p_Usuarios y asignar su rol inicial.
*/

SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.sp_Admin_Usuario_Crear', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_Admin_Usuario_Crear;
GO

CREATE PROCEDURE dbo.sp_Admin_Usuario_Crear
    @nombre    NVARCHAR(200),
    @correo    NVARCHAR(200),
    @carnet    NVARCHAR(50) = NULL,
    @cargo     NVARCHAR(100) = NULL,
    @telefono  NVARCHAR(50) = NULL,
    @rol       NVARCHAR(50) = 'Colaborador'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Validaciones
    IF EXISTS (SELECT 1 FROM dbo.p_Usuarios WHERE correo = @correo)
    BEGIN
        RAISERROR('El correo electrónico ya está registrado.', 16, 1);
        RETURN;
    END

    IF @carnet IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.p_Usuarios WHERE carnet = @carnet)
    BEGIN
        RAISERROR('El carnet ya está registrado por otro usuario.', 16, 1);
        RETURN;
    END

    -- 2. Obtener idRol basado en el nombre del rol (opcional, fallback a rolGlobal)
    DECLARE @idRol INT = NULL;
    SELECT TOP 1 @idRol = idRol FROM dbo.p_Roles WHERE nombre = @rol OR nombre = 'Empleado';

    BEGIN TRAN;
        INSERT INTO dbo.p_Usuarios (
            nombre, 
            correo, 
            carnet, 
            cargo, 
            telefono, 
            rolGlobal, 
            idRol, 
            activo, 
            fechaCreacion,
            pais
        )
        VALUES (
            @nombre, 
            @correo, 
            @carnet, 
            @cargo, 
            @telefono, 
            @rol, 
            @idRol, 
            1, 
            GETDATE(),
            'NI'
        );

        DECLARE @newId INT = SCOPE_IDENTITY();

        -- 3. Crear registro de configuración básica
        IF NOT EXISTS (SELECT 1 FROM dbo.p_UsuariosConfig WHERE idUsuario = @newId)
        BEGIN
            INSERT INTO dbo.p_UsuariosConfig (idUsuario, fechaActualizacion)
            VALUES (@newId, GETDATE());
        END

        -- 4. Si el password no se maneja aquí (se asume reset después), 
        -- podríamos insertar un hash temporal o dejar que el sistema pida reset.
        -- Por ahora, p_UsuariosCredenciales se inicializa con password vacío o nulo
        -- para que el usuario use la opción de "olvidé mi contraseña" o el admin le asigne una.

    COMMIT TRAN;

    -- Retornar el usuario creado
    SELECT * FROM dbo.p_Usuarios WHERE idUsuario = @newId;
END;
GO

PRINT 'SP sp_Admin_Usuario_Crear creado correctamente.'
