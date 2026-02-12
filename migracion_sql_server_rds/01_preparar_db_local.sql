/* 
   PEGA ESTO AL INICIO DE TU ARCHIVO .SQL GENERADO
   Sirve para que los datos entren sin errores de llaves foráneas.
*/

PRINT '--- DESACTIVANDO RESTRICCIONES TEMPORALMENTE ---'
EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'
GO

/* 
   PEGA ESTO AL FINAL DE TU ARCHIVO .SQL GENERADO
   Sirve para volver a activar la seguridad de la base de datos.
*/

PRINT '--- REACTIVANDO RESTRICCIONES ---'
EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'
GO
PRINT '--- MIGRACIÓN COMPLETADA CON ÉXITO ---'
