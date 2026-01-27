const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
    user: 'plan',
    password: 'admin123',
    server: '54.146.235.205',
    database: 'Bdplaner',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

const spList = [
    'sp_ObtenerProyectos',
    'sp_Tareas_ObtenerPorUsuario',
    'sp_Dashboard_Kpis',
    'sp_Planning_ObtenerPlanes',
    'sp_Equipo_ObtenerInforme',
    'sp_Notas_Obtener',
    'sp_Checkins_ObtenerPorEquipoFecha',
    'sp_Usuarios_ObtenerPorLista',
    'sp_Proyectos_Listar'
];

const OUTPUT_FILE = path.join(__dirname, 'sp_definitions_dump.sql');

async function fetchDefinitions() {
    console.log('Fetching SP Definitions...');

    let pool;
    try {
        pool = await sql.connect(config);

        let fullScript = '';

        for (const sp of spList) {
            console.log(`Fetching ${sp}...`);
            try {
                const res = await pool.request().query(`sp_helptext '${sp}'`);
                const definition = res.recordset.map(row => row.Text).join('');

                fullScript += `-- =============================================\n`;
                fullScript += `-- Definition for: ${sp}\n`;
                fullScript += `-- =============================================\n`;
                // Add "CREATE OR ALTER" just in case it's missing or to be safe, 
                // but usually sp_helptext returns the CREATE statement.
                // We'll trust the DB source but ensure it ends with GO.

                // Simple hygiene:
                // Replace "CREATE PROCEDURE" with "CREATE OR ALTER PROCEDURE" if we want it to be re-runnable easily,
                // but regex replacement is risky directly.
                // We will just append the raw text and a GO.

                fullScript += definition + '\nGO\n\n';

            } catch (e) {
                console.error(`Error fetching ${sp}: ${e.message}`);
                fullScript += `-- ERROR Fetching ${sp}: ${e.message}\n\n`;
            }
        }

        fs.writeFileSync(OUTPUT_FILE, fullScript);
        console.log(`Definitions saved to ${OUTPUT_FILE}`);

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        if (pool) await pool.close();
    }
}

fetchDefinitions();
