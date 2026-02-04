
const sql = require('mssql');
require('dotenv').config({ path: '../.env' });

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true'
    }
};

async function createFastSP() {
    try {
        const pool = await sql.connect(config);

        console.log('Creating sp_Auditoria_Equipo_PorCarnet_FAST with TITLES...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Equipo_PorCarnet_FAST
            (
                @carnetSolicitante VARCHAR(20),
                @searchTerm        NVARCHAR(100) = NULL,
                @page              INT = 1,
                @pageSize          INT = 50
            )
            AS
            BEGIN
                SET NOCOUNT ON;
                SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

                -- 1. Inputs y Equipo
                SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));
                SET @searchTerm = NULLIF(LTRIM(RTRIM(@searchTerm)), '');

                IF @page < 1 SET @page = 1;
                IF @pageSize < 1 SET @pageSize = 500; -- Permitir mas filas si piden

                CREATE TABLE #Equipo (carnet VARCHAR(20) NOT NULL PRIMARY KEY);
                INSERT INTO #Equipo (carnet) EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;
                IF NOT EXISTS (SELECT 1 FROM #Equipo) INSERT INTO #Equipo VALUES (@carnetSolicitante);

                -- 2. Identificar IDs Paginados (Lógica Filtro + Paginación)
                --    Esto es lo único pesado, el resto es ligero.
                
                CREATE TABLE #PagedIds (id BIGINT PRIMARY KEY, rowNum INT);

                IF @searchTerm IS NULL
                BEGIN
                    INSERT INTO #PagedIds (id, rowNum)
                    SELECT id, ROW_NUMBER() OVER (ORDER BY a.fecha DESC)
                    FROM dbo.p_Auditoria a
                    INNER JOIN #Equipo e ON e.carnet = a.carnet
                    WHERE a.accion <> 'USUARIO_LOGIN'
                    ORDER BY a.fecha DESC
                    OFFSET (@page - 1) * @pageSize ROWS
                    FETCH NEXT @pageSize ROWS ONLY;
                END
                ELSE
                BEGIN
                    -- Lógica dinámica incrustada para máximo performance
                    DECLARE @entidadIdNum BIGINT = TRY_CONVERT(BIGINT, @searchTerm);
                    
                    INSERT INTO #PagedIds (id, rowNum)
                    SELECT a.id, ROW_NUMBER() OVER (ORDER BY a.fecha DESC)
                    FROM dbo.p_Auditoria a
                    INNER JOIN #Equipo e ON e.carnet = a.carnet
                    WHERE a.accion <> 'USUARIO_LOGIN'
                    AND (
                        (@entidadIdNum IS NOT NULL AND a.entidadId = @entidadIdNum)
                        OR 
                        (@entidadIdNum IS NULL AND (
                             (LEN(@searchTerm) <= 20 AND a.carnet = @searchTerm)
                             OR a.accion LIKE '%' + @searchTerm + '%' 
                             OR a.entidad LIKE '%' + @searchTerm + '%'
                        ))
                    )
                    ORDER BY a.fecha DESC
                    OFFSET (@page - 1) * @pageSize ROWS
                    FETCH NEXT @pageSize ROWS ONLY;
                END

                -- 3. Enriquecimiento Final (JOINs solo para las N filas encontradas)
                SELECT 
                    a.id AS idAuditLog,
                    a.carnet,
                    u.nombreCompleto AS usuario,
                    a.accion,
                    a.entidad AS recurso,
                    a.entidadId AS recursoId,
                    LEFT(a.datosNuevos, 500) AS datosNuevos,
                    -- Columnas separadas para UX
                    CASE WHEN a.entidad = 'Tarea' THEN t.nombre ELSE NULL END as tareaTitulo,
                    COALESCE(pt.nombre, p.nombre) as proyectoTitulo
                FROM #PagedIds pi
                INNER JOIN dbo.p_Auditoria a ON a.id = pi.id
                LEFT JOIN dbo.p_Usuarios u ON u.carnet = a.carnet
                
                -- JOIN Tareas y su Proyecto padre
                LEFT JOIN dbo.p_Tareas t ON a.entidad = 'Tarea' AND t.idTarea = TRY_CAST(a.entidadId AS BIGINT)
                LEFT JOIN dbo.p_Proyectos pt ON t.idProyecto = pt.idProyecto 
                
                -- JOIN Proyectos directos
                LEFT JOIN dbo.p_Proyectos p ON a.entidad = 'Proyecto' AND p.idProyecto = TRY_CAST(a.entidadId AS BIGINT)
                
                ORDER BY pi.rowNum;

                DROP TABLE #Equipo;
                DROP TABLE #PagedIds;
            END
        `);
        console.log('SP Updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
}

createFastSP();
