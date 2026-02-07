/*
   Script para habilitar Soft Delete y Remover usuarios de nodos
*/

-- 1. Agregar columna eliminado a p_Usuarios si no existe
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'eliminado' AND Object_ID = Object_ID(N'dbo.p_Usuarios'))
BEGIN
    ALTER TABLE dbo.p_Usuarios ADD eliminado BIT NOT NULL DEFAULT 0;
END
GO

-- 2. Asegurar columna rol en p_UsuariosOrganizacion (si faltase, según código frontend usa 'rol', pero la tabla tiene 'esResponsable')
-- Investigar si el frontend usa 'rol' mapeado a 'esResponsable' o si falta la columna.
-- El DDL mostrado tiene 'esResponsable'. Asumiremos que el backend traduce.
-- Pero para remover, solo necesitamos ID.

-- 3. SP para Soft Delete
IF OBJECT_ID('dbo.sp_Admin_Usuario_Eliminar', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_Admin_Usuario_Eliminar;
GO

CREATE PROCEDURE dbo.sp_Admin_Usuario_Eliminar
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.p_Usuarios 
    SET eliminado = 1, 
        activo = 0, 
        fechaActualizacion = GETDATE()
    WHERE idUsuario = @idUsuario;
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
