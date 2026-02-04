
USE master;
GO

DECLARE @DatabaseName nvarchar(50) = 'Bdplaner';
DECLARE @SQL varchar(max) = '';

SELECT @SQL = @SQL + 'KILL ' + CAST(session_id AS varchar(5)) + ';'
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID(@DatabaseName)
  AND session_id <> @@SPID;

PRINT 'Matando sesiones: ' + @SQL;
EXEC(@SQL);
GO
