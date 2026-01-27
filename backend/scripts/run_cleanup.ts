
import { obtenerPoolSql, cerrarPoolSql } from '../src/db/sqlserver.provider';
import * as fs from 'fs';
import * as path from 'path';
require('dotenv').config();

async function run() {
    console.log('--- LIMPIEZA DE DATOS ---');
    try {
        const pool = await obtenerPoolSql();
        const sqlPath = path.join(__dirname, '../sql/clean_test_data.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove GO
        const batches = sql.split(/\bGO\b/i).map(b => b.trim()).filter(b => b);

        for (const batch of batches) {
            await pool.request().query(batch);
        }
        console.log('✅ Datos de prueba eliminados.');
        await cerrarPoolSql();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
