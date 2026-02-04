
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

async function updateProcedures() {
    try {
        const pool = await sql.connect(config);

        console.log('Updating SP sp_Auditoria_Equipo_PorCarnet (Optimized)...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Equipo_PorCarnet
            (
                @carnetSolicitante VARCHAR(20),
                @searchTerm        NVARCHAR(100) = NULL,
                @page              INT = 1,
                @pageSize          INT = 50
            )
            AS
            BEGIN
                SET NOCOUNT ON;

                SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));
                SET @searchTerm = NULLIF(LTRIM(RTRIM(@searchTerm)), '');

                IF @page < 1 SET @page = 1;
                IF @pageSize < 1 SET @pageSize = 50;
                -- Max limit safety
                IF @pageSize > 500 SET @pageSize = 500;

                CREATE TABLE #Equipo (
                    carnet VARCHAR(20) NOT NULL PRIMARY KEY
                );

                INSERT INTO #Equipo (carnet)
                EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;

                IF NOT EXISTS (SELECT 1 FROM #Equipo)
                BEGIN
                    INSERT INTO #Equipo (carnet)
                    VALUES (@carnetSolicitante);
                END

                SELECT
                    a.id AS idAuditLog,
                    a.carnet,
                    u.nombreCompleto AS usuario,
                    u.correo AS correoUsuario,
                    a.accion,
                    a.entidad AS recurso,
                    a.entidadId AS recursoId,
                    a.datosAnteriores,
                    a.datosNuevos,
                    a.fecha,
                    u.carnet AS carnetUsuario
                FROM dbo.p_Auditoria a
                INNER JOIN #Equipo e ON e.carnet = a.carnet
                LEFT JOIN dbo.p_Usuarios u ON a.carnet = u.carnet
                WHERE
                    @searchTerm IS NULL
                    OR u.nombreCompleto LIKE '%' + @searchTerm + '%'
                    OR a.accion LIKE '%' + @searchTerm + '%'
                    OR a.entidadId LIKE '%' + @searchTerm + '%'
                    OR a.carnet LIKE '%' + @searchTerm + '%'
                ORDER BY a.fecha DESC
                OFFSET (@page - 1) * @pageSize ROWS
                FETCH NEXT @pageSize ROWS ONLY
                OPTION (RECOMPILE);
            END
        `);
        console.log('SP sp_Auditoria_Equipo_PorCarnet updated.');

        console.log('Updating SP sp_Auditoria_Equipo_PorCarnet_Contar (Optimized)...');
        await pool.request().query(`
            CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Equipo_PorCarnet_Contar
            (
                @carnetSolicitante VARCHAR(20),
                @searchTerm        NVARCHAR(100) = NULL
            )
            AS
            BEGIN
                SET NOCOUNT ON;
                SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));
                SET @searchTerm = NULLIF(LTRIM(RTRIM(@searchTerm)), '');

                CREATE TABLE #Equipo (
                    carnet VARCHAR(20) NOT NULL PRIMARY KEY
                );

                INSERT INTO #Equipo (carnet)
                EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;

                IF NOT EXISTS (SELECT 1 FROM #Equipo)
                BEGIN
                    INSERT INTO #Equipo (carnet)
                    VALUES (@carnetSolicitante);
                END

                SELECT COUNT(*) as total
                FROM dbo.p_Auditoria a
                INNER JOIN #Equipo e ON e.carnet = a.carnet
                LEFT JOIN dbo.p_Usuarios u ON a.carnet = u.carnet
                WHERE
                    @searchTerm IS NULL
                    OR u.nombreCompleto LIKE '%' + @searchTerm + '%' 
                    OR a.accion LIKE '%' + @searchTerm + '%'
                    OR a.entidadId LIKE '%' + @searchTerm + '%'
                    OR a.carnet LIKE '%' + @searchTerm + '%'
                OPTION (RECOMPILE);
            END
        `);
        console.log('SP sp_Auditoria_Equipo_PorCarnet_Contar updated.');

        process.exit(0);
    } catch (err) {
        console.error('Update failed:', err);
        process.exit(1);
    }
}

updateProcedures();
