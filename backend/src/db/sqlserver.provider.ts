/**
 * SQL Server Provider - Pool Singleton
 * Maneja la conexión global a SQL Server usando mssql (tedious)
 */
import * as sql from 'mssql';
import { ConfigService } from '@nestjs/config';

let pool: sql.ConnectionPool | null = null;
let poolPromise: Promise<sql.ConnectionPool> | null = null;

/**
 * Configuración del pool de conexiones
 */
function getConfig(configService?: ConfigService): sql.config {
    return {
        server: configService?.get('MSSQL_HOST') || process.env.MSSQL_HOST || 'localhost',
        port: parseInt(configService?.get('MSSQL_PORT') || process.env.MSSQL_PORT || '1433'),
        user: configService?.get('MSSQL_USER') || process.env.MSSQL_USER,
        password: configService?.get('MSSQL_PASSWORD') || process.env.MSSQL_PASSWORD,
        database: configService?.get('MSSQL_DATABASE') || process.env.MSSQL_DATABASE,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            enableArithAbort: true,
        },
        pool: {
            max: 20,
            min: 0,
            idleTimeoutMillis: 30000,
        },
        connectionTimeout: 15000,
        requestTimeout: 60000,
    };
}

/**
 * Obtiene el pool de conexiones (singleton)
 * Si no existe, lo crea. Si ya existe, lo reutiliza.
 */
export async function obtenerPoolSql(configService?: ConfigService): Promise<sql.ConnectionPool> {
    if (pool?.connected) {
        return pool;
    }

    if (!poolPromise) {
        const config = getConfig(configService);
        console.log('[DB] Creando pool de conexiones SQL Server...');

        poolPromise = new sql.ConnectionPool(config)
            .connect()
            .then((p) => {
                pool = p;
                console.log('[DB] ✅ Pool SQL Server conectado');

                // FORCE: QUOTED_IDENTIFIER ON para soportar índices filtrados y columnas calculadas
                p.request().query('SET QUOTED_IDENTIFIER ON')
                    .then(() => console.log('[DB] 🔧 SET QUOTED_IDENTIFIER ON aplicado'))
                    .catch(e => console.error('[DB] ⚠️ Falló SET QUOTED_IDENTIFIER:', e.message));

                // Manejar errores del pool
                pool.on('error', (err) => {
                    console.error('[DB] ❌ Error en pool SQL Server:', err.message);
                    pool = null;
                    poolPromise = null;
                });

                return pool;
            })
            .catch((err) => {
                console.error(`[DB] ❌ Error conectando a SQL Server (${config.server}):`, err.message);
                if (err.code) console.error(`[DB] Código de Error: ${err.code}`);
                poolPromise = null;
                throw err;
            });
    }

    return poolPromise;
}

/**
 * Cierra el pool de conexiones (para shutdown)
 */
export async function cerrarPoolSql(): Promise<void> {
    if (pool) {
        console.log('[DB] Cerrando pool SQL Server...');
        await pool.close();
        pool = null;
        poolPromise = null;
        console.log('[DB] Pool cerrado');
    }
}

/**
 * Verifica si el pool está conectado
 */
export function isPoolConnected(): boolean {
    return pool?.connected ?? false;
}

// Exportar tipos de mssql para uso en repos
export { sql };
