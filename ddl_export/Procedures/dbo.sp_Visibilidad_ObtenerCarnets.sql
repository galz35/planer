CREATE PROCEDURE [dbo].[sp_Visibilidad_ObtenerCarnets] @carnetSolicitante NVARCHAR(50) AS BEGIN SET NOCOUNT ON; SELECT DISTINCT carnet FROM p_Usuarios WHERE carnet IS NOT NULL AND carnet <> '' END
GO