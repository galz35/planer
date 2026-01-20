const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();

        // Verificar columnas de p_PlanesTrabajo
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'p_PlanesTrabajo'
            ORDER BY ordinal_position
        `);

        console.log('📋 Columnas en p_PlanesTrabajo:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        // Verificar si existen las nuevas columnas
        const hasArea = result.rows.some(r => r.column_name === 'area');
        const hasSubgerencia = result.rows.some(r => r.column_name === 'subgerencia');
        const hasGerencia = result.rows.some(r => r.column_name === 'gerencia');

        console.log('\n✅ Estado de columnas organizacionales:');
        console.log(`  - area: ${hasArea ? '✓ Existe' : '✗ No existe'}`);
        console.log(`  - subgerencia: ${hasSubgerencia ? '✓ Existe' : '✗ No existe'}`);
        console.log(`  - gerencia: ${hasGerencia ? '✓ Existe' : '✗ No existe'}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
