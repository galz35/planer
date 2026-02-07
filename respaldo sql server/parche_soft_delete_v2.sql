/*
   Script para habilitar Soft Delete y Remover usuarios de nodos (Corregido SET OPTIONS)
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
GO

-- 1. Agregar columna eliminado a p_Usuarios si no existe
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'eliminado' AND Object_ID = Object_ID(N'dbo.p_Usuarios'))
BEGIN
    ALTER TABLE dbo.p_Usuarios ADD eliminado BIT NOT NULL DEFAULT 0;
END
GO

-- 3. SP para Soft Delete
IF OBJECT_ID('dbo.sp_Admin_Usuario_Eliminar', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_Admin_Usuario_Eliminar;
GO

CREATE PROCEDURE dbo.sp_Admin_Usuario_Eliminar
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    -- Verificar si existe la columna eliminado antes de updatear (por seguridad si falla el alter)
    IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'eliminado' AND Object_ID = Object_ID(N'dbo.p_Usuarios'))
    BEGIN
        UPDATE dbo.p_Usuarios 
        SET eliminado = 1, 
            activo = 0, 
            fechaActualizacion = GETDATE()
        WHERE idUsuario = @idUsuario;
    END
    ELSE
    BEGIN
        -- Fallback si no hay columna eliminado
        UPDATE dbo.p_Usuarios 
        SET activo = 0, 
            fechaActualizacion = GETDATE()
        WHERE idUsuario = @idUsuario;
    END
END;
GO

-- 4. SP para Remover Usuario de Nodo
IF OBJECT_ID('dbo.sp_Admin_Usuario_RemoverNodo', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_Admin_Usuario_RemoverNodo;
GO

CREATE PROCEDURE dbo.sp_Admin_Usuario_RemoverNodo
    @idUsuario INT,
    @idNodo INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.p_UsuariosOrganizacion 
    WHERE idUsuario = @idUsuario AND idNodo = @idNodo;
END;
GO
