const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    console.log('Altering p_permiso_area to make idorg_raiz nullable...');
    await sql.query("ALTER TABLE p_permiso_area ALTER COLUMN idorg_raiz BIGINT NULL");

    console.log('Inserting permission for Juan again...');
    const res = await sql.query(`
        IF NOT EXISTS (SELECT 1 FROM p_permiso_area WHERE carnet_recibe = '300042' AND nombre_area = 'NI GERENCIA DE RECURSOS HUMANOS')
        BEGIN
            INSERT INTO p_permiso_area (carnet_recibe, nombre_area, tipo_nivel, alcance, activo, creado_en, motivo)
            VALUES ('300042', 'NI GERENCIA DE RECURSOS HUMANOS', 'GERENCIA', 'SUBARBOL', 1, GETDATE(), 'Permiso RRHH');
            SELECT 'Inserted' as status;
        END
        ELSE
        BEGIN
            SELECT 'Already exists' as status;
        END
    `);
    console.log('Status:', res.recordset[0]?.status);

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
