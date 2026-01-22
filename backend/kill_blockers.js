
const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER || process.env.DB_USER,
    password: process.env.MSSQL_PASSWORD || process.env.DB_PASSWORD,
    server: process.env.MSSQL_HOST || process.env.DB_HOST || 'localhost',
    database: 'master', // Connect to master to kill sessions
    port: parseInt(process.env.MSSQL_PORT || process.env.DB_PORT || '1433'),
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 5000,
        requestTimeout: 5000
    },
};

async function killBlockers() {
    console.log('Connecting to MASTER to check for blockers...');
    try {
        const pool = await sql.connect(config);
        console.log('Connected.');

        // Find sleeping sessions with open transactions
        const query = `
            SELECT 
                s.session_id,
                s.login_name,
                s.status,
                t.transaction_id,
                s.last_request_start_time
            FROM sys.dm_exec_sessions s
            JOIN sys.dm_tran_session_transactions t ON s.session_id = t.session_id
            WHERE s.status = 'sleeping' AND s.session_id > 50;
        `;

        const result = await pool.request().query(query);

        if (result.recordset.length === 0) {
            console.log('No sleeping sessions with open transactions found.');
        } else {
            console.log('Sleeping sessions with open transactions:', result.recordset);

            for (const row of result.recordset) {
                const spid = row.session_id;
                console.log(`Killing sleeping session ${spid} (User: ${row.login_name})...`);
                try {
                    await pool.request().query(`KILL ${spid}`);
                    console.log(`Killed ${spid}.`);
                } catch (e) {
                    console.error(`Failed to kill ${spid}: ${e.message}`);
                }
            }
        }

        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

killBlockers();
