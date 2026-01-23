/**
 * Base Repository "tipo Dapper" (Node + mssql)
 * - Pool singleton (evita reconectar)
 * - Parametros estilo Dapper (obj simple) o tipados (compat)
 * - Transacciones limpias
 * - Slow log con cola (no bloqueante)
 * 
 * MANTIENE COMPATIBILIDAD CON NOMBRES ANTERIORES:
 * - ejecutarQuery
 * - ejecutarSP
 * - conTransaccion
 */

import { sql, obtenerPoolSql } from './sqlserver.provider';

// ============================
// Configuración
// ============================
const SLOW_QUERY_THRESHOLD_MS = 1000;
const SLOW_LOG_FLUSH_MS = 2000;
const MAX_SLOW_QUEUE = 500;

// ============================
// Pool Singleton
// ============================
let poolPromise: Promise<sql.ConnectionPool> | null = null;

async function pool(): Promise<sql.ConnectionPool> {
    if (!poolPromise) {
        poolPromise = obtenerPoolSql();
    }
    return poolPromise;
}

// ============================
// Helpers de Parámetros
// ============================

export type ParamDapper =
    | any
    | {
        valor: any;
        tipo?: sql.ISqlType;
    };

export type ParamsDapper = Record<string, ParamDapper>;

function normalizar(v: any) {
    return v === undefined ? null : v;
}

function esTipado(x: any): x is { valor: any; tipo?: sql.ISqlType } {
    return x && typeof x === 'object' && 'valor' in x;
}

function aplicarParams(req: sql.Request, params?: ParamsDapper) {
    if (!params) return;

    for (const [k, v] of Object.entries(params)) {
        if (esTipado(v)) {
            const valor = normalizar(v.valor);
            if (v.tipo) req.input(k, v.tipo, valor);
            else req.input(k, valor);
        } else {
            req.input(k, normalizar(v));
        }
    }
}

// ============================
// Slow Query Logger (con buffer)
// ============================

type SlowItem = {
    duracion: number;
    tipo: 'Query' | 'SP';
    sqlText: string;
    parametros: any;
    origen?: string;
    fecha: Date;
};

const slowQueue: SlowItem[] = [];
let slowFlushTimer: NodeJS.Timeout | null = null;

function simplificarParams(params?: ParamsDapper) {
    if (!params) return null;
    const o: any = {};
    for (const [k, v] of Object.entries(params)) {
        o[k] = esTipado(v) ? (v as any).valor : v;
    }
    return o;
}

function enqueueSlow(item: SlowItem) {
    if (slowQueue.length >= MAX_SLOW_QUEUE) slowQueue.shift();
    slowQueue.push(item);

    if (!slowFlushTimer) {
        slowFlushTimer = setTimeout(() => {
            slowFlushTimer = null;
            flushSlow().catch(() => { });
        }, SLOW_LOG_FLUSH_MS);
    }
}

async function flushSlow() {
    if (slowQueue.length === 0) return;
    const batch = slowQueue.splice(0, slowQueue.length);

    try {
        const p = await pool();
        const req = p.request();

        for (const it of batch) {
            req.parameters = {};
            req.input('duracion', sql.Int, it.duracion);
            req.input('sqlText', sql.NVarChar(sql.MAX), it.sqlText);
            req.input('tipo', sql.NVarChar(20), it.tipo);
            req.input('parametros', sql.NVarChar(sql.MAX), JSON.stringify(it.parametros));
            req.input('origen', sql.NVarChar(200), it.origen || null);

            await req.query(`
        IF OBJECT_ID('dbo.p_SlowQueries','U') IS NOT NULL
        BEGIN
          INSERT INTO dbo.p_SlowQueries (duracionMS, sqlText, tipo, parametros, fecha, origen)
          VALUES (@duracion, @sqlText, @tipo, @parametros, GETDATE(), @origen)
        END
      `);
        }
    } catch (e: any) {
        console.error('[DB-LOG] ❌ Error al procesar logs de queries lentas:', e.message);
    }
}

// ============================
// API PRINCIPAL
// ============================

/**
 * query / ejecutarQuery: Ejecuta SQL y devuelve recordset
 */
export async function query<T = any>(
    sqlText: string,
    params?: ParamsDapper,
    tx?: sql.Transaction,
    origen?: string
): Promise<T[]> {
    const inicio = Date.now();
    try {
        const p = await pool();
        const req = tx ? new sql.Request(tx) : p.request();
        aplicarParams(req, params);

        const res = await req.query<T>(sqlText);

        const ms = Date.now() - inicio;
        if (ms > SLOW_QUERY_THRESHOLD_MS) {
            enqueueSlow({ duracion: ms, tipo: 'Query', sqlText, parametros: simplificarParams(params), origen, fecha: new Date() });
        }
        return res.recordset || [];
    } catch (e: any) {
        console.error('[DB] ❌ Error en query:', e.message);
        throw e;
    }
}

// Alias para compatibilidad con código existente
export { query as ejecutarQuery };

/**
 * exec / ejecutarSP: Ejecuta Store Procedure
 */
export async function exec<T = any>(
    nombreSP: string,
    params?: ParamsDapper,
    tx?: sql.Transaction,
    origen?: string
): Promise<T[]> {
    const inicio = Date.now();
    try {
        const p = await pool();
        const req = tx ? new sql.Request(tx) : p.request();
        aplicarParams(req, params);

        const res = await req.execute<T>(nombreSP);

        const ms = Date.now() - inicio;
        if (ms > SLOW_QUERY_THRESHOLD_MS) {
            enqueueSlow({ duracion: ms, tipo: 'SP', sqlText: `EXEC ${nombreSP}`, parametros: simplificarParams(params), origen, fecha: new Date() });
        }
        return res.recordset || [];
    } catch (e: any) {
        console.error('[DB] ❌ Error en SP:', nombreSP, '|', e.message);
        throw e;
    }
}

// Alias para compatibilidad con código existente
export { exec as ejecutarSP };

/**
 * transaction / conTransaccion
 */
export async function transaction<T>(fn: (tx: sql.Transaction) => Promise<T>): Promise<T> {
    const p = await pool();
    const tx = new sql.Transaction(p);
    await tx.begin();
    try {
        const r = await fn(tx);
        await tx.commit();
        return r;
    } catch (e) {
        try { await tx.rollback(); } catch { }
        throw e;
    }
}

// Alias para compatibilidad con código existente
export { transaction as conTransaccion };

/**
 * Obtiene un solo valor (ExecuteScalar)
 */
export async function scalar<T = any>(
    sqlText: string,
    params?: ParamsDapper,
    tx?: sql.Transaction
): Promise<T | null> {
    const rows = await query<any>(sqlText, params, tx);
    if (!rows || rows.length === 0) return null;
    return (rows[0][Object.keys(rows[0])[0]] as T) ?? null;
}

/**
 * Ejecuta y devuelve filas afectadas
 */
export async function execute(
    sqlText: string,
    params?: ParamsDapper,
    tx?: sql.Transaction
): Promise<number> {
    const p = await pool();
    const req = tx ? new sql.Request(tx) : p.request();
    aplicarParams(req, params);
    const res = await req.query(sqlText);
    return (res.rowsAffected && res.rowsAffected[0]) ? res.rowsAffected[0] : 0;
}

/**
 * Helper para crear un Request manual si es necesario
 */
export async function crearRequest(): Promise<sql.Request> {
    const p = await pool();
    return p.request();
}

// Re-exportación de tipos SQL
export { sql };
export const VarChar = sql.VarChar;
export const NVarChar = sql.NVarChar;
export const Int = sql.Int;
export const BigInt = sql.BigInt;
export const Bit = sql.Bit;
export const DateTime = sql.DateTime;
export const SqlDate = sql.Date;
export const Decimal = sql.Decimal;
export const Float = sql.Float;
export const Text = sql.Text;
export const NText = sql.NText;
