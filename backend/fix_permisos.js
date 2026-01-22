const sql = require('mssql');

async function run() {
    await sql.connect({
        user: 'plan',
        password: 'admin123',
        server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
        database: 'Bdplaner',
        options: { encrypt: true, trustServerCertificate: true }
    });

    console.log('Checking p_permiso_area schema...');
    const cols = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_permiso_area'");
    console.log('Columns:', cols.recordset.map(c => c.COLUMN_NAME).join(', '));

    if (!cols.recordset.find(c => c.COLUMN_NAME === 'nombre_area')) {
        console.log('Missing nombre_area column. Adding it...');
        await sql.query("ALTER TABLE p_permiso_area ADD nombre_area NVARCHAR(255) NULL");
    }
    if (!cols.recordset.find(c => c.COLUMN_NAME === 'tipo_nivel')) {
        console.log('Missing tipo_nivel column. Adding it...');
        await sql.query("ALTER TABLE p_permiso_area ADD tipo_nivel NVARCHAR(50) NULL");
    }

    console.log('Inserting permission for Juan...');
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

    const check = await sql.query("SELECT * FROM p_permiso_area");
    console.log('Total permits now:', check.recordset.length);

    await sql.close();
}

run().catch(e => { console.error(e); sql.close(); });
