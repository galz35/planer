
const sql = require('mssql');
require('dotenv').config({ path: '../.env' }); // Adjust path to point to backend root

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

async function executeMigration() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('Connected!');

        // 1. Add carnet column if not exists
        console.log('Checking/Adding carnet column to p_Auditoria...');
        await pool.request().query(`
            IF COL_LENGTH('dbo.p_Auditoria', 'carnet') IS NULL
            BEGIN
                ALTER TABLE dbo.p_Auditoria ADD carnet NVARCHAR(50) NULL;
            END
        `);
        console.log('Column check done.');

        // 2. Backfill carnet from p_Usuarios
        console.log('Backfilling carnet data...');
        await pool.request().query(`
            UPDATE a
            SET a.carnet = u.carnet
            FROM dbo.p_Auditoria a
            INNER JOIN dbo.p_Usuarios u ON a.idUsuario = u.idUsuario
            WHERE a.carnet IS NULL;
        `);
        console.log('Backfill complete.');

        // 3. Create SP sp_Auditoria_Equipo_PorCarnet
        console.log('Creating SP sp_Auditoria_Equipo_PorCarnet...');
        const spScript = `
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
            
            -- Normalizar inputs
            SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));

            -- 1. Obtener "bolsa" de carnets visibles (Equipo + Permisos)
            DECLARE @Equipo TABLE (carnet VARCHAR(20) PRIMARY KEY);
                
            -- Usamos el SP de visibilidad existente para llenar la tabla temporal
            INSERT INTO @Equipo (carnet)
            EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;

            -- Si no hay equipo, al menos me incluyo a mí mismo
            IF NOT EXISTS (SELECT 1 FROM @Equipo)
            BEGIN
                INSERT INTO @Equipo VALUES (@carnetSolicitante);
            END

            -- 2. Query Principal: Join con p_Usuarios por CARNET
            SELECT 
                a.id as idAuditLog, 
                a.carnet,
                u.nombreCompleto as usuario, 
                u.correo as correoUsuario,
                a.accion,
                a.entidad as recurso,
                a.entidadId as recursoId,
                a.datosAnteriores,
                a.datosNuevos,
                a.fecha,
                u.carnet as carnetUsuario
            FROM dbo.p_Auditoria a
            LEFT JOIN dbo.p_Usuarios u ON a.carnet = u.carnet 
            WHERE a.carnet IN (SELECT carnet FROM @Equipo)
            AND (
                @searchTerm IS NULL 
                OR @searchTerm = ''
                OR u.nombreCompleto LIKE '%' + @searchTerm + '%' 
                OR a.accion LIKE '%' + @searchTerm + '%'
                OR a.entidadId LIKE '%' + @searchTerm + '%'
                OR a.carnet LIKE '%' + @searchTerm + '%'
            )
            ORDER BY a.fecha DESC
            OFFSET (@page - 1) * @pageSize ROWS FETCH NEXT @pageSize ROWS ONLY;
        END
        `;
        await pool.request().query(spScript);
        console.log('SP sp_Auditoria_Equipo_PorCarnet created.');

        // 4. Create Count SP
        console.log('Creating SP sp_Auditoria_Equipo_PorCarnet_Contar...');
        const countSpScript = `
        CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Equipo_PorCarnet_Contar
        (
            @carnetSolicitante VARCHAR(20),
            @searchTerm        NVARCHAR(100) = NULL
        )
        AS
        BEGIN
            SET NOCOUNT ON;
            SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));

            DECLARE @Equipo TABLE (carnet VARCHAR(20) PRIMARY KEY);
            INSERT INTO @Equipo (carnet)
            EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;

            IF NOT EXISTS (SELECT 1 FROM @Equipo) INSERT INTO @Equipo VALUES (@carnetSolicitante);

            SELECT COUNT(*) as total
            FROM dbo.p_Auditoria a
            LEFT JOIN dbo.p_Usuarios u ON a.carnet = u.carnet
            WHERE a.carnet IN (SELECT carnet FROM @Equipo)
            AND (
                @searchTerm IS NULL 
                OR @searchTerm = ''
                OR u.nombreCompleto LIKE '%' + @searchTerm + '%' 
                OR a.accion LIKE '%' + @searchTerm + '%'
                OR a.entidadId LIKE '%' + @searchTerm + '%'
                OR a.carnet LIKE '%' + @searchTerm + '%'
            );
        END
        `;
        await pool.request().query(countSpScript);
        console.log('SP sp_Auditoria_Equipo_PorCarnet_Contar created.');

        console.log('All migrations applied successfully!');
        process.exit(0);

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

executeMigration();
