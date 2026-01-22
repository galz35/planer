const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    console.log('=== ANALISIS DE VARIACIONES DE NOMBRES EN RRHH ===');
    const r = await sql.query("SELECT DISTINCT ogerencia FROM p_Usuarios WHERE ogerencia LIKE '%RECURSOS%'");
    console.log('Nombres encontrados en la base de datos:');
    r.recordset.forEach(row => {
        console.log(`- "${row.ogerencia}" (Largo: ${row.ogerencia?.length})`);
    });

    console.log('\n=== AJUSTANDO SP PARA MAYOR FLEXIBILIDAD ===');
    const updateSP = `
    CREATE OR ALTER PROCEDURE sp_Visibilidad_ObtenerCarnets
        @carnetSolicitante NVARCHAR(50)
    AS
    BEGIN
        SET NOCOUNT ON;

        WITH IsAdmin AS (
            SELECT 1 AS EsAdmin 
            FROM p_Usuarios 
            WHERE carnet = @carnetSolicitante 
              AND (rolGlobal IN ('ADMIN', 'ROOT', 'Admin', 'Administrador', 'SuperAdmin') OR idRol = 1)
        ),
        Actores AS (
            SELECT carnet, idUsuario, idOrg 
            FROM p_Usuarios 
            WHERE carnet = @carnetSolicitante
        ),
        Subordinados AS (
            SELECT carnet
            FROM p_Usuarios
            WHERE jefeCarnet = @carnetSolicitante AND activo = 1
        ),
        VisiblesPuntual AS (
            SELECT carnet_delegante AS carnet
            FROM p_delegacion_visibilidad
            WHERE carnet_delegado = @carnetSolicitante AND activo = 1
            AND (fecha_inicio IS NULL OR fecha_inicio <= GETDATE())
            AND (fecha_fin IS NULL OR fecha_fin >= GETDATE())
            UNION ALL
            SELECT carnet_objetivo AS carnet
            FROM p_permiso_empleado
            WHERE carnet_recibe = @carnetSolicitante AND activo = 1 
            AND tipo_acceso = 'ALLOW'
        ),
        VisiblesAreaNombre AS (
            SELECT u.carnet
            FROM p_Usuarios u
            JOIN p_permiso_area pa ON pa.carnet_recibe = @carnetSolicitante AND pa.activo = 1
                AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CAST(GETDATE() AS DATE))
                AND pa.nombre_area IS NOT NULL
            WHERE u.activo = 1
              AND (
                  -- Comparación flexible: Trim y Upper
                  (pa.tipo_nivel = 'GERENCIA' AND (UPPER(LTRIM(RTRIM(u.ogerencia))) = UPPER(LTRIM(RTRIM(pa.nombre_area))) OR UPPER(LTRIM(RTRIM(u.gerencia))) = UPPER(LTRIM(RTRIM(pa.nombre_area)))))
                  OR (pa.tipo_nivel = 'SUBGERENCIA' AND UPPER(LTRIM(RTRIM(u.subgerencia))) = UPPER(LTRIM(RTRIM(pa.nombre_area))))
                  OR (pa.tipo_nivel = 'AREA' AND (UPPER(LTRIM(RTRIM(u.area))) = UPPER(LTRIM(RTRIM(pa.nombre_area))) OR UPPER(LTRIM(RTRIM(u.departamento))) = UPPER(LTRIM(RTRIM(pa.nombre_area)))))
                  OR (pa.tipo_nivel = 'DEPARTAMENTO' AND (UPPER(LTRIM(RTRIM(u.orgDepartamento))) = UPPER(LTRIM(RTRIM(pa.nombre_area))) OR UPPER(LTRIM(RTRIM(u.departamento))) = UPPER(LTRIM(RTRIM(pa.nombre_area)))))
              )
        ),
        NodosPermitidos AS (
            SELECT CAST(pa.idorg_raiz AS NVARCHAR(50)) as idorg
            FROM p_permiso_area pa
            JOIN Actores a ON a.carnet = pa.carnet_recibe
            WHERE pa.activo = 1 
            AND pa.idorg_raiz IS NOT NULL
            AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CAST(GETDATE() AS DATE))
            
            UNION ALL
            
            SELECT CAST(n.id AS NVARCHAR(50))
            FROM p_OrganizacionNodos n
            JOIN NodosPermitidos np ON CAST(n.idPadre AS NVARCHAR(50)) = np.idorg
            WHERE n.activo = 1
        ),
        VisiblesAreaIdOrg AS (
            SELECT u.carnet
            FROM p_Usuarios u
            JOIN NodosPermitidos np ON CAST(u.idOrg AS NVARCHAR(50)) = np.idorg
            WHERE u.activo = 1
        ),
        Excluidos AS (
            SELECT pe.carnet_objetivo AS carnet
            FROM p_permiso_empleado pe
            JOIN Actores a ON a.carnet = pe.carnet_recibe
            WHERE pe.activo = 1
            AND pe.tipo_acceso = 'DENY'
        ),
        TodoVisible AS (
            SELECT carnet FROM Actores
            UNION ALL
            SELECT carnet FROM Subordinados
            UNION ALL
            SELECT carnet FROM VisiblesPuntual
            UNION ALL
            SELECT carnet FROM VisiblesAreaNombre
            UNION ALL
            SELECT carnet FROM VisiblesAreaIdOrg
            UNION ALL
            SELECT carnet FROM p_Usuarios WHERE activo = 1 AND EXISTS (SELECT 1 FROM IsAdmin)
        )
        SELECT DISTINCT tv.carnet
        FROM TodoVisible tv
        WHERE tv.carnet IS NOT NULL AND tv.carnet <> ''
        AND (EXISTS (SELECT 1 FROM IsAdmin) OR NOT EXISTS (
            SELECT 1 FROM Excluidos e WHERE e.carnet = tv.carnet
        ));
    END
    `;
    await sql.query(updateSP);
    console.log('SP actualizado con comparaciones flexibles.');

    // Volver a probar para Juan
    const ju = await sql.query("SELECT carnet FROM p_Usuarios WHERE correo='juan.ortuno@claro.com.ni'");
    const carnet = ju.recordset[0]?.carnet;
    if (carnet) {
        const req = new sql.Request();
        req.input('carnetSolicitante', carnet);
        const vis = await req.execute('sp_Visibilidad_ObtenerCarnets');
        console.log('\n=== RESULTADO FINAL PARA JUAN ORTUÑO ===');
        console.log('Carnets visibles tras el ajuste:', vis.recordset.length);

        const match = await sql.query(`
            SELECT COUNT(*) as cnt FROM p_Usuarios 
            WHERE ogerencia LIKE '%RECURSOS%' AND carnet IN (SELECT carnet FROM p_Usuarios WHERE carnet IS NOT NULL)
        `);
        console.log('Total empleados RRHH en base:', match.recordset[0].cnt);
    }

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
