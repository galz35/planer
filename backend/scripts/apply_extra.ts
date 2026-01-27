
import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE || 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        requestTimeout: 60000
    }
};

async function applyExtra() {
    const sqlPath = path.join(__dirname, '../performance_audit/EXTRA_OPTIMIZATION.sql');

    if (!fs.existsSync(sqlPath)) {
        console.error("❌ El archivo SQL no existe:", sqlPath);
        process.exit(1);
    }

    console.log(`📜 Leyendo script EXTRA: ${sqlPath}`);
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log("🔌 Conectando a SQL Server...");
        const pool = await sql.connect(config);

        const batches = sqlContent.split(/^\s*GO\s*$/gmi);

        console.log(`🚀 Aplicando optimizaciones EXTRA (${batches.length} lotes)...`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch.length > 0) {
                try {
                    await pool.request().query(batch);
                } catch (e: any) {
                    console.error(`   ❌ Error en lote ${i + 1}:`, e.message);
                }
            }
        }

        await pool.close();
        console.log("\n✅ ¡Optimización EXTRA aplicada!");

    } catch (err) {
        console.error("Error fatal:", err);
        process.exit(1);
    }
}
applyExtra();
