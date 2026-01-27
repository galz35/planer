
import { obtenerPoolSql, cerrarPoolSql } from '../src/db/sqlserver.provider';
require('dotenv').config();

async function run() {
    console.log('--- REMOVIENDO INDICE FILTRADO (FIX QUOTED_IDENTIFIER) ---');
    try {
        const pool = await obtenerPoolSql();

        console.log('Borrando índice filtrado...');
        await pool.request().query("DROP INDEX IF EXISTS IX_p_Tareas_Jerarquia ON dbo.p_Tareas");

        console.log('Recreando índice estándar (sin filtro)...');
        // Quitamos el WHERE para evitar requisitos de SET QUOTED_IDENTIFIER ON estrictos en cada conexión
        await pool.request().query(`
            CREATE INDEX IX_p_Tareas_Jerarquia
            ON dbo.p_Tareas (idTareaPadre, activo)
            INCLUDE (idTarea, estado, porcentaje, idProyecto, orden)
        `);

        console.log('✅ FIX APLICADO: Índice recreado sin filtro.');
        await cerrarPoolSql();
        process.exit(0);

    } catch (e: any) {
        console.error('❌ ERROR:', e.message);
        process.exit(1);
    }
}
run();
