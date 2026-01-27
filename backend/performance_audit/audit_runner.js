const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Configuration matches the user's environment
const config = {
    user: 'plan',
    password: 'admin123',
    server: '54.146.235.205',
    database: 'Bdplaner',
    options: {
        encrypt: false, // For self-signed certs or local dev usually false/true depending on setup. Assuming false for this IP.
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

const TARGET_USER_CARNET = '500708';
const OUTPUT_FILE = path.join(__dirname, `audit_results_${Date.now()}.md`);

async function runAudit() {
    console.log(`Starting Performance Audit for User Carnet: ${TARGET_USER_CARNET}`);

    let pool;
    try {
        pool = await sql.connect(config);
        console.log('Connected to Database.');

        const results = [];

        // 1. Get User Details
        const userRes = await pool.request()
            .input('carnet', sql.NVarChar, TARGET_USER_CARNET)
            .query('SELECT idUsuario, carnet FROM p_Usuarios WHERE carnet = @carnet');

        if (userRes.recordset.length === 0) {
            throw new Error(`User with carnet ${TARGET_USER_CARNET} not found.`);
        }
        const user = userRes.recordset[0];
        console.log(`User Found: ID ${user.idUsuario}`);

        // 2. Get Team for Context (for team-based SPs)
        const teamRes = await pool.request()
            .input('carnet', sql.NVarChar, TARGET_USER_CARNET)
            .query('SELECT carnet FROM p_Usuarios WHERE jefeCarnet = @carnet AND activo = 1');

        const teamCarnets = teamRes.recordset.map(u => u.carnet);
        teamCarnets.push(TARGET_USER_CARNET); // Include self
        const teamCarnetsStr = teamCarnets.join(',');
        console.log(`Team Context: ${teamCarnets.length} members.`);

        // --- DEFINITION OF TESTS ---
        const tests = [
            {
                name: 'sp_ObtenerProyectos (Personal Projects)',
                run: async () => {
                    return await pool.request()
                        .input('carnet', sql.NVarChar, TARGET_USER_CARNET)
                        .execute('sp_ObtenerProyectos');
                }
            },
            {
                name: 'sp_Tareas_ObtenerPorUsuario (My Tasks)',
                run: async () => {
                    return await pool.request()
                        .input('carnet', sql.NVarChar, TARGET_USER_CARNET)
                        .input('estado', sql.NVarChar, null)
                        .input('idProyecto', sql.Int, null)
                        .input('query', sql.NVarChar, null)
                        .input('startDate', sql.DateTime, null)
                        .input('endDate', sql.DateTime, null)
                        .execute('sp_Tareas_ObtenerPorUsuario');
                }
            },
            {
                name: 'sp_Dashboard_Kpis (Personal KPIs)',
                run: async () => {
                    return await pool.request()
                        .input('carnet', sql.NVarChar, TARGET_USER_CARNET)
                        .execute('sp_Dashboard_Kpis');
                }
            },
            {
                name: 'sp_Planning_ObtenerPlanes (Current Month Plan)',
                run: async () => {
                    const date = new Date();
                    return await pool.request()
                        .input('carnet', sql.NVarChar, TARGET_USER_CARNET)
                        .input('mes', sql.Int, date.getMonth() + 1)
                        .input('anio', sql.Int, date.getFullYear())
                        .execute('sp_Planning_ObtenerPlanes');
                }
            },
            {
                name: 'sp_Equipo_ObtenerInforme (Team Report)',
                run: async () => {
                    return await pool.request()
                        .input('carnetsList', sql.NVarChar, teamCarnetsStr)
                        .input('fecha', sql.Date, new Date())
                        .execute('sp_Equipo_ObtenerInforme');
                }
            },
            {
                name: 'sp_Notas_Obtener (My Notes)',
                run: async () => {
                    return await pool.request()
                        .input('carnet', sql.NVarChar, TARGET_USER_CARNET)
                        .execute('sp_Notas_Obtener');
                }
            },
            // --- NEW OPTIMIZED SPS ---
            {
                name: 'sp_Checkins_ObtenerPorEquipoFecha (Optimized)',
                run: async () => {
                    return await pool.request()
                        .input('carnetsList', sql.NVarChar, teamCarnetsStr)
                        .input('fecha', sql.Date, new Date())
                        .execute('sp_Checkins_ObtenerPorEquipoFecha');
                }
            },
            {
                name: 'sp_Usuarios_ObtenerPorLista (Optimized)',
                run: async () => {
                    return await pool.request()
                        .input('carnetsList', sql.NVarChar, teamCarnetsStr)
                        .execute('sp_Usuarios_ObtenerPorLista');
                }
            },
            {
                name: 'sp_Proyectos_Listar (Optimized List)',
                run: async () => {
                    return await pool.request()
                        .input('pageNumber', sql.Int, 1)
                        .input('pageSize', sql.Int, 10)
                        .execute('sp_Proyectos_Listar');
                }
            },
            // Direct Query Tests (Inline Checks)
            {
                name: 'Inline Query: p_Usuarios (Profile Check)',
                run: async () => {
                    return await pool.request()
                        .input('carnet', sql.NVarChar, TARGET_USER_CARNET)
                        .query('SELECT * FROM p_Usuarios WHERE carnet = @carnet');
                }
            }
        ];

        // --- EXECUTION ---
        let mdContent = `# SQL Performance Audit Results\n\n`;
        mdContent += `**Date:** ${new Date().toLocaleString()}\n`;
        mdContent += `**User:** ${TARGET_USER_CARNET} (ID: ${user.idUsuario})\n`;
        mdContent += `**Team Size:** ${teamCarnets.length}\n\n`;
        mdContent += `| Test Name | Duration (ms) | Rows Returned | Status |\n`;
        mdContent += `|---|---|---|---|\n`;

        console.log('\nRunning Tests...');

        for (const test of tests) {
            process.stdout.write(`Testing ${test.name}... `);
            const start = process.hrtime();

            try {
                const res = await test.run();
                const diff = process.hrtime(start);
                const durationMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

                // Handle both SP/Query result structures
                const rowCount = res.recordset ? res.recordset.length : (res.rowsAffected ? res.rowsAffected[0] : 0);

                console.log(`DONE (${durationMs}ms)`);
                results.push({ name: test.name, duration: durationMs, rows: rowCount, error: null });

                let statusIcon = '🟢';
                if (durationMs > 1000) statusIcon = '🔴';
                else if (durationMs > 500) statusIcon = '🟡';

                mdContent += `| ${test.name} | ${durationMs} | ${rowCount} | ${statusIcon} |\n`;

            } catch (err) {
                console.log(`ERROR`);
                console.error(err.message);
                results.push({ name: test.name, duration: -1, rows: 0, error: err.message });
                mdContent += `| ${test.name} | ERROR | - | ❌ |\n`;
            }
        }

        // Save Results
        fs.writeFileSync(OUTPUT_FILE, mdContent);
        console.log(`\nAudit Complete. Results saved to: ${OUTPUT_FILE}`);

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        if (pool) await pool.close();
    }
}

runAudit();
