/**
 * Base Repository - Funciones genéricas para ejecutar queries y SPs
 * Estilo Dapper: queries con parámetros, manejo de transacciones
 */
import { obtenerPoolSql, sql } from './sqlserver.provider';

// Umbral para logear queries lentas (ms)
const SLOW_QUERY_THRESHOLD = 1000;

/**
 * Registra una query lenta en la base de datos para auditoría
 */
async function registrarQueryLenta(
    duracion: number,
    sqlText: string,
    tipo: string,
    parametros?: any
) {
    try {
        // Importante: No usamos ejecutarQuery aquí para evitar bucles o sobrecarga
        const pool = await obtenerPoolSql();
        const request = pool.request();

        request.input('duracion', sql.Int, duracion);
        request.input('sqlText', sql.NVarChar(sql.MAX), sqlText);
        request.input('tipo', sql.NVarChar(50), tipo);

        let paramsLog: string | null = null;
        if (parametros) {
            try {
                // Si es el formato { nombre: { valor, tipo } }, extraemos solo los valores
                const simplifiedParams: any = {};
                for (const [key, obj] of Object.entries(parametros)) {
                    simplifiedParams[key] = (obj as any).valor;
                }
                paramsLog = JSON.stringify(simplifiedParams);
            } catch {
                paramsLog = 'Error serializando parámetros';
            }
        }
        request.input('parametros', sql.NVarChar(sql.MAX), paramsLog);

        await request.query(`
            IF EXISTS (SELECT * FROM sys.tables WHERE name = 'p_SlowQueries')
            BEGIN
                INSERT INTO p_SlowQueries (duracionMS, sqlText, tipo, parametros, fecha)
                VALUES (@duracion, @sqlText, @tipo, @parametros, GETDATE())
            END
        `);
    } catch (error) {
        console.error('[DB] ❌ Error registrando query lenta en BD:', error.message);
    }
}


/**
 * Ejecuta una query SQL con parámetros
 * @param sqlText - Query SQL (usar @param para parámetros)
 * @param parametros - Objeto con los parámetros { nombre: { valor, tipo } }
 * @param tx - Transacción opcional
 */
export async function ejecutarQuery<T = any>(
    sqlText: string,
    parametros?: Record<string, { valor: any; tipo: sql.ISqlType }>,
    tx?: sql.Transaction
): Promise<T[]> {
    const inicio = Date.now();

    try {
        const pool = await obtenerPoolSql();
        const request = tx ? new sql.Request(tx) : pool.request();

        // Agregar parámetros
        if (parametros) {
            for (const [nombre, { valor, tipo }] of Object.entries(parametros)) {
                request.input(nombre, tipo, valor);
            }
        }

        const result = await request.query<T>(sqlText);

        // Log de queries lentas
        const duracion = Date.now() - inicio;
        if (duracion > SLOW_QUERY_THRESHOLD) {
            console.warn(`[DB] ⚠️ Query lenta (${duracion}ms): ${sqlText.substring(0, 100)}...`);
            // Registrar en base de datos de forma asíncrona (fire and forget)
            registrarQueryLenta(duracion, sqlText, 'Query', parametros).catch(() => { });
        }


        return result.recordset;
    } catch (error: any) {
        console.error('[DB] ❌ Error en query:', error.message, '| Code:', error.code);
        throw error;
    }
}

/**
 * Ejecuta una query SQL simple (sin parámetros tipados)
 * Para queries sencillas como SELECT COUNT(*)
 */
export async function ejecutarQuerySimple<T = any>(
    sqlText: string,
    tx?: sql.Transaction
): Promise<T[]> {
    const inicio = Date.now();

    try {
        const pool = await obtenerPoolSql();
        const request = tx ? new sql.Request(tx) : pool.request();
        const result = await request.query<T>(sqlText);

        const duracion = Date.now() - inicio;
        if (duracion > SLOW_QUERY_THRESHOLD) {
            console.warn(`[DB] ⚠️ Query lenta (${duracion}ms): ${sqlText.substring(0, 100)}...`);
            registrarQueryLenta(duracion, sqlText, 'QuerySimple').catch(() => { });
        }


        return result.recordset;
    } catch (error: any) {
        console.error('[DB] ❌ Error en query simple:', error.message);
        throw error;
    }
}

/**
 * Ejecuta un Stored Procedure
 * @param nombreSP - Nombre del SP (ej: 'sp_Auth_Login')
 * @param parametros - Parámetros del SP
 * @param tx - Transacción opcional
 */
export async function ejecutarSP<T = any>(
    nombreSP: string,
    parametros?: Record<string, { valor: any; tipo: sql.ISqlType }>,
    tx?: sql.Transaction
): Promise<T[]> {
    const inicio = Date.now();

    try {
        const pool = await obtenerPoolSql();
        const request = tx ? new sql.Request(tx) : pool.request();

        if (parametros) {
            for (const [nombre, { valor, tipo }] of Object.entries(parametros)) {
                request.input(nombre, tipo, valor);
            }
        }

        const result = await request.execute<T>(nombreSP);

        const duracion = Date.now() - inicio;
        if (duracion > SLOW_QUERY_THRESHOLD) {
            console.warn(`[DB] ⚠️ SP lento (${duracion}ms): ${nombreSP}`);
            registrarQueryLenta(duracion, `EXEC ${nombreSP}`, 'SP', parametros).catch(() => { });
        }


        return result.recordset;
    } catch (error: any) {
        console.error('[DB] ❌ Error en SP:', nombreSP, '|', error.message);
        throw error;
    }
}

/**
 * Ejecuta una función dentro de una transacción
 * Si la función falla, hace rollback automático
 */
export async function conTransaccion<T>(
    fn: (tx: sql.Transaction) => Promise<T>
): Promise<T> {
    const pool = await obtenerPoolSql();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();
        const resultado = await fn(transaction);
        await transaction.commit();
        return resultado;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Helper para crear un Request con pool
 */
export async function crearRequest(): Promise<sql.Request> {
    const pool = await obtenerPoolSql();
    return pool.request();
}

// Re-exportar tipos SQL para uso en repos
export { sql };
export const VarChar = sql.VarChar;
export const NVarChar = sql.NVarChar;
export const Int = sql.Int;
export const BigInt = sql.BigInt;
export const Bit = sql.Bit;
export const DateTime = sql.DateTime;
export const SqlDate = sql.Date; // Renombrado para evitar conflicto con Date global
export const Text = sql.Text;
export const NText = sql.NText;
export const Decimal = sql.Decimal;
export const Float = sql.Float;

