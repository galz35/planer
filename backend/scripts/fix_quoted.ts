
import * as fs from 'fs';
import * as path from 'path';
import { obtenerPoolSql, cerrarPoolSql } from '../src/db/sqlserver.provider';
// Intentar cargar dotenv si existe
try { require('dotenv').config(); } catch (e) { }

async function run() {
    console.log('--- APLICANDO FIX QUOTED_IDENTIFIER ---');
    try {
        // 1. Conectar
        const pool = await obtenerPoolSql();

        // 2. Leer SQL
        const sqlPath = path.join(__dirname, '../sql/fix_quoted_identifier.sql');
        console.log(`Leyendo: ${sqlPath}`);

        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Archivo no encontrado: ${sqlPath}`);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // 3. Separar por GO (Case insensitive, palabra completa)
        const batches = sqlContent
            .split(/^\s*GO\s*$/im) // Regex estricta para GO en linea sola
            .map(b => b.trim())
            .filter(b => b.length > 0);

        console.log(`Encontrados ${batches.length} batches.`);

        // 4. Ejecutar
        let i = 1;
        for (const batch of batches) {
            console.log(`Ejecutando Batch ${i++}...`);
            try {
                // Limpiar SET QUOTED_IDENTIFIER si viene en el batch y usar connection options?
                // No, el DDL ALTER PROCEDURE debe llevarlo.
                await pool.request().batch(batch);
            } catch (err: any) {
                console.error(`❌ Error en Batch ${i - 1}:`, err.message);
                throw err;
            }
        }

        console.log('✅ FIX APLICADO EXITOSAMENTE');
        await cerrarPoolSql();
        process.exit(0);

    } catch (e: any) {
        console.error('❌ ERROR FATAL:', e.message);
        process.exit(1);
    }
}

run();
