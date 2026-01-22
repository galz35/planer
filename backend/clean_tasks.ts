
import * as mssql from 'mssql';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const config: mssql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

const TABLES_TO_TRUNCATE = [
    'p_Tarea', // Main task table
    'p_Checkin', // Checkins
    'p_Bloqueo', // Blockers
    'p_FocoDiario', // Daily focus
    'p_Nota', // Notes
    'p_CheckinTarea', // Checkin-Task relation
    'p_TareaAsignacionLog', // Assignment history
    'p_TareaAvanceMensual', // Monthly progress
    'p_AuditLog', // Audit trail
    'p_LogSistema' // System logs
];

async function cleanTasks() {
    console.log('🚀 Starting Database Task Cleanup...');
    let pool: mssql.ConnectionPool | null = null;

    try {
        pool = await new mssql.ConnectionPool(config).connect();
        console.log('✅ Connected to Database');

        // Confirm
        console.log('⚠️  WARNING: This will DELETE ALL tasks and related data.');
        console.log('Using database:', config.database);

        // Execute cleanup transaction
        const transaction = new mssql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new mssql.Request(transaction);

            // 1. Disable constraints to allow truncating/deleting
            console.log('1. Disabling constraints...');
            await request.query(`EXEC sp_msforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all"`);

            // 2. Truncate/Delete tables
            console.log('2. Cleaning tables...');
            for (const table of TABLES_TO_TRUNCATE) {
                try {
                    // Try truncate first (faster), fallback to delete if foreign keys prevent truncate even with nocheck
                    // Actually, with NOCHECK CONSTRAINT, delete is safer for FKs if we don't drop them. 
                    // But truncate is cleaner for resetting identity. 
                    // Let's use DELETE FROM for safety in script, or TRUNCATE if we are sure order doesn't matter (with constraints disabled, order matters less but TRUNCATE still checks referenced tables unless we drop FKs).
                    // Best way to reset is DELETE FROM and DBCC CHECKIDENT (reset identity).

                    await request.query(`DELETE FROM ${table}`);
                    // Reset identity seed to 0
                    try {
                        await request.query(`DBCC CHECKIDENT ('${table}', RESEED, 0)`);
                    } catch (e) {
                        // Ignore if table has no identity column
                    }
                    console.log(`   - Cleaned ${table}`);
                } catch (err: any) {
                    console.warn(`   ⚠️  Could not clean ${table} (might not exist or skipped): ${err.message}`);
                }
            }

            // 3. Re-enable constraints
            console.log('3. Re-enabling constraints...');
            await request.query(`EXEC sp_msforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all"`);

            await transaction.commit();
            console.log('✨ Cleanup SUCCESSFUL');

        } catch (err) {
            await transaction.rollback();
            console.error('❌ Transaction FAILED. Rolled back changes.');
            throw err;
        }

    } catch (err) {
        console.error('❌ Error during cleanup:', err);
    } finally {
        if (pool) await pool.close();
    }
}

cleanTasks();
