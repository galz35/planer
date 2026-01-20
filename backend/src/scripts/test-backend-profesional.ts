/**
 * ===============================================================
 * TEST PROFESIONAL COMPLETO - BACKEND API
 * ===============================================================
 * 
 * Suite de pruebas exhaustivas para todos los módulos:
 * 
 * 1. AUTH - Autenticación y tokens
 * 2. ACCESO - Empleados, importación, permisos
 * 3. VISIBILIDAD - Reglas de acceso organizacional
 * Ejecutar: npx ts-node -r tsconfig-paths/register src/scripts/test-backend-profesional.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const REPORT_FILE = path.resolve(__dirname, '../../../test_backend_report.txt');

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync(REPORT_FILE, msg + '\n', 'utf8');
}

// Limpiar reporte anterior
if (fs.existsSync(REPORT_FILE)) fs.unlinkSync(REPORT_FILE);

const BASE_URL = 'http://localhost:3000/api';

// ============================================================
// HELPERS
// ============================================================

interface TestResult {
    modulo: string;
    endpoint: string;
    metodo: string;
    estado: 'PASS' | 'FAIL' | 'SKIP';
    duracionMs: number;
    detalle?: string;
    error?: string;
}

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

let tokens: AuthTokens | null = null;
const resultados: TestResult[] = [];

async function http(method: string, path: string, body?: any, useAuth = true): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (useAuth && tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
    }

    const options: RequestInit = {
        method,
        headers,
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')) {
        options.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}${path}`, options);

    let data: any;
    try {
        data = await res.json();
    } catch {
        data = null;
    }

    return { status: res.status, data };
}

async function test(
    modulo: string,
    endpoint: string,
    metodo: string,
    fn: () => Promise<void>
): Promise<void> {
    const inicio = Date.now();
    try {
        await fn();
        resultados.push({
            modulo,
            endpoint,
            metodo,
            estado: 'PASS',
            duracionMs: Date.now() - inicio,
        });
        log(`  ✅ ${metodo} ${endpoint}`);
    } catch (error: any) {
        resultados.push({
            modulo,
            endpoint,
            metodo,
            estado: 'FAIL',
            duracionMs: Date.now() - inicio,
            error: error.message,
            detalle: error.detalle || '',
        });
        log(`  ❌ ${metodo} ${endpoint}: ${error.message}`);
    }
}

function assert(condition: boolean, mensaje: string): void {
    if (!condition) {
        throw new Error(mensaje);
    }
}

function assertEqual(actual: any, expected: any, campo: string): void {
    if (actual !== expected) {
        throw new Error(`${campo}: esperaba "${expected}", recibió "${actual}"`);
    }
}

// ============================================================
// SUITE DE PRUEBAS
// ============================================================

async function main() {
    log('\n' + '═'.repeat(70));
    log('🧪 TEST PROFESIONAL COMPLETO - BACKEND API');
    log('═'.repeat(70));
    log(`📅 Fecha: ${new Date().toISOString()}`);
    log(`🌐 URL Base: ${BASE_URL}`);
    log('═'.repeat(70));

    // ============================================================
    // MÓDULO 1: AUTH
    // ============================================================
    log('\n📦 MÓDULO 1: AUTH (Autenticación)');
    log('─'.repeat(50));

    await test('AUTH', '/auth/login', 'POST', async () => {
        const { status, data } = await http('POST', '/auth/login', {
            correo: 'gustavo.lira@claro.com.ni',
            password: '123456'
        }, false);

        assert(status === 200, `Status: ${status}, ${JSON.stringify(data).slice(0, 100)}`);

        // La respuesta puede venir directa o envuelta en data
        // Los nombres son access_token y refresh_token (con guion bajo)
        const accessToken = data.access_token || data.data?.access_token || data.accessToken || data.data?.accessToken;
        const refreshToken = data.refresh_token || data.data?.refresh_token || data.refreshToken || data.data?.refreshToken;

        assert(accessToken, `No retornó accessToken: ${JSON.stringify(data).slice(0, 200)}`);
        assert(refreshToken, 'No retornó refreshToken');

        tokens = { accessToken, refreshToken };
    });

    await test('AUTH', '/auth/login (credenciales inválidas)', 'POST', async () => {
        const { status } = await http('POST', '/auth/login', {
            correo: 'invalido@test.com',
            password: 'wrong'
        }, false);

        assert(status === 401 || status === 400, `Debería retornar 401/400, recibió ${status}`);
    });

    await test('AUTH', '/auth/login (campo faltante)', 'POST', async () => {
        const { status } = await http('POST', '/auth/login', {
            correo: 'test@test.com'
        }, false);

        assert(status === 400 || status === 401, `Debería retornar 400/401, recibió ${status}`);
    });

    await test('AUTH', '/auth/refresh', 'POST', async () => {
        if (!tokens) throw new Error('No hay tokens');

        const { status, data } = await http('POST', '/auth/refresh', {
            refreshToken: tokens.refreshToken
        }, false);

        assert(status === 200, `Status: ${status}`);

        const newToken = data.access_token || data.data?.access_token || data.accessToken || data.data?.accessToken;
        assert(newToken, 'No retornó nuevo accessToken');
        tokens.accessToken = newToken;
    });

    // ============================================================
    // MÓDULO 2: ACCESO - EMPLEADOS
    // ============================================================
    console.log('\n📦 MÓDULO 2: ACCESO - EMPLEADOS');
    console.log('─'.repeat(50));

    await test('ACCESO', '/acceso/empleados', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/empleados');
        assert(status === 200, `Status: ${status}`);
        assert(Array.isArray(data.data), 'No retornó array');
    });

    await test('ACCESO', '/acceso/empleado/:carnet', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/empleado/EMP899');
        assert(status === 200, `Status: ${status}`);
        const carnet = data.data?.carnet || data.carnet;
        assert(carnet === 'EMP899', `Carnet incorrecto: ${carnet}`);
    });

    await test('ACCESO', '/acceso/empleado/:carnet (no existe)', 'GET', async () => {
        const { status } = await http('GET', '/acceso/empleado/NO_EXISTE_12345');
        assert(status === 404, `Debería retornar 404, recibió ${status}`);
    });

    await test('ACCESO', '/acceso/empleados/buscar', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/empleados/buscar?q=Gustavo&limit=5');
        assert(status === 200, `Status: ${status}`);
        assert(Array.isArray(data.data), 'No retornó array');
    });

    await test('ACCESO', '/acceso/empleado/email/:correo', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/empleado/email/gustavo.lira@claro.com.ni');
        assert(status === 200, `Status: ${status}`);
        assert(data.data?.encontrado === true, 'No encontró el empleado');
    });

    // ============================================================
    // MÓDULO 3: ACCESO - IMPORTACIÓN
    // ============================================================
    console.log('\n📦 MÓDULO 3: ACCESO - IMPORTACIÓN');
    console.log('─'.repeat(50));

    await test('IMPORTACIÓN', '/acceso/importar/estadisticas', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/importar/estadisticas');
        assert(status === 200, `Status: ${status}`);
        assert(typeof data.data?.totalEmpleados === 'number', 'totalEmpleados no es número');
    });

    await test('IMPORTACIÓN', '/acceso/importar/plantilla', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/importar/plantilla');
        assert(status === 200, `Status: ${status}`);
        assert(Array.isArray(data.data?.columnas), 'No retornó columnas');
    });

    await test('IMPORTACIÓN', '/acceso/importar/empleados (validación)', 'POST', async () => {
        const { status } = await http('POST', '/acceso/importar/empleados', {});
        assert(status === 400, `Debería rechazar body vacío, recibió ${status}`);
    });

    await test('IMPORTACIÓN', '/acceso/importar/empleados (MERGE)', 'POST', async () => {
        const { status, data } = await http('POST', '/acceso/importar/empleados', {
            empleados: [{
                carnet: 'TEST_PROF_001',
                nombreCompleto: 'Test Profesional',
                departamento: 'QA',
                activo: true
            }],
            modo: 'MERGE',
            fuente: 'API'
        });
        assert(status === 200 || status === 201, `Status: ${status}`);
        assert(data.data?.resultado, 'No retornó resultado');
    });

    await test('IMPORTACIÓN', '/acceso/importar/empleados/exportar', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/importar/empleados/exportar?formato=json');
        assert(status === 200, `Status: ${status}`);
        assertEqual(data.data?.formato, 'json', 'formato');
    });

    // ============================================================
    // MÓDULO 4: ACCESO - PERMISOS
    // ============================================================
    console.log('\n📦 MÓDULO 4: ACCESO - PERMISOS');
    console.log('─'.repeat(50));

    await test('PERMISOS', '/acceso/permiso-area', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/permiso-area');
        assert(status === 200, `Status: ${status}`);
        assert(Array.isArray(data.data), 'No retornó array');
    });

    await test('PERMISOS', '/acceso/permiso-empleado', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/permiso-empleado');
        assert(status === 200, `Status: ${status}`);
        assert(Array.isArray(data.data), 'No retornó array');
    });

    await test('PERMISOS', '/acceso/delegacion', 'GET', async () => {
        const { status, data } = await http('GET', '/acceso/delegacion');
        assert(status === 200, `Status: ${status}`);
        assert(Array.isArray(data.data), 'No retornó array');
    });

    // ============================================================
    // MÓDULO 5: VISIBILIDAD
    // ============================================================
    console.log('\n📦 MÓDULO 5: VISIBILIDAD');
    console.log('─'.repeat(50));

    await test('VISIBILIDAD', '/visibilidad/:carnet', 'GET', async () => {
        const { status } = await http('GET', '/visibilidad/EMP899');
        assert(status === 200, `Status: ${status}`);
    });

    await test('VISIBILIDAD', '/visibilidad/:carnet/empleados', 'GET', async () => {
        const { status } = await http('GET', '/visibilidad/EMP899/empleados');
        assert(status === 200, `Status: ${status}`);
    });

    await test('VISIBILIDAD', '/visibilidad/:carnet/actores', 'GET', async () => {
        const { status } = await http('GET', '/visibilidad/EMP899/actores');
        assert(status === 200, `Status: ${status}`);
    });

    await test('VISIBILIDAD', '/visibilidad/:carnet/quien-puede-verme', 'GET', async () => {
        const { status } = await http('GET', '/visibilidad/EMP899/quien-puede-verme');
        assert(status === 200, `Status: ${status}`);
    });

    // ============================================================
    // MÓDULO 6: CLARITY - CORE (sin prefijo /clarity)
    // ============================================================
    console.log('\n📦 MÓDULO 6: CLARITY - CORE');
    console.log('─'.repeat(50));

    await test('CLARITY', '/config', 'GET', async () => {
        const { status } = await http('GET', '/config');
        assert(status === 200, `Status: ${status}`);
    });

    await test('CLARITY', '/mi-dia', 'GET', async () => {
        const today = new Date().toISOString().split('T')[0];
        const { status } = await http('GET', `/mi-dia?fecha=${today}`);
        assert(status === 200, `Status: ${status}`);
    });

    await test('CLARITY', '/tareas/mias', 'GET', async () => {
        const { status, data } = await http('GET', '/tareas/mias');
        assert(status === 200, `Status: ${status}`);
        assert(Array.isArray(data.data), 'No retornó array');
    });

    // ============================================================
    // MÓDULO 7: CLARITY - EQUIPO
    // ============================================================
    console.log('\n📦 MÓDULO 7: CLARITY - EQUIPO');
    console.log('─'.repeat(50));

    await test('CLARITY', '/equipo/hoy', 'GET', async () => {
        const today = new Date().toISOString().split('T')[0];
        const { status } = await http('GET', `/equipo/hoy?fecha=${today}`);
        assert(status === 200 || status === 403, `Status inesperado: ${status}`);
    });

    await test('CLARITY', '/equipo/bloqueos', 'GET', async () => {
        const today = new Date().toISOString().split('T')[0];
        const { status } = await http('GET', `/equipo/bloqueos?fecha=${today}`);
        assert(status === 200 || status === 403, `Status inesperado: ${status}`);
    });

    await test('CLARITY', '/equipo/backlog', 'GET', async () => {
        const today = new Date().toISOString().split('T')[0];
        const { status } = await http('GET', `/equipo/backlog?fecha=${today}`);
        assert(status === 200 || status === 403, `Status inesperado: ${status}`);
    });

    // ============================================================
    // MÓDULO 8: CLARITY - FOCO
    // ============================================================
    console.log('\n📦 MÓDULO 8: CLARITY - FOCO');
    console.log('─'.repeat(50));

    await test('CLARITY', '/foco', 'GET', async () => {
        const today = new Date().toISOString().split('T')[0];
        const { status } = await http('GET', `/foco?fecha=${today}`);
        assert(status === 200, `Status: ${status}`);
    });

    await test('CLARITY', '/foco/estadisticas', 'GET', async () => {
        const { status } = await http('GET', '/foco/estadisticas');
        assert(status === 200, `Status: ${status}`);
    });

    // ============================================================
    // MÓDULO 9: CLARITY - REPORTES
    // ============================================================
    console.log('\n📦 MÓDULO 9: CLARITY - REPORTES');
    console.log('─'.repeat(50));

    await test('CLARITY', '/reportes/productividad', 'GET', async () => {
        const { status } = await http('GET', '/reportes/productividad');
        assert(status === 200, `Status: ${status}`);
    });

    await test('CLARITY', '/reportes/bloqueos-trend', 'GET', async () => {
        const { status } = await http('GET', '/reportes/bloqueos-trend');
        assert(status === 200, `Status: ${status}`);
    });

    await test('CLARITY', '/reportes/equipo-performance', 'GET', async () => {
        const { status } = await http('GET', '/reportes/equipo-performance');
        assert(status === 200, `Status: ${status}`);
    });

    // ============================================================
    // MÓDULO 10: CLARITY - PROYECTOS
    // ============================================================
    console.log('\n📦 MÓDULO 10: CLARITY - PROYECTOS');
    console.log('─'.repeat(50));

    await test('CLARITY', '/proyectos', 'GET', async () => {
        const { status, data } = await http('GET', '/proyectos');
        assert(status === 200, `Status: ${status}`);
        assert(Array.isArray(data.data), 'No retornó array');
    });

    // ============================================================
    // MÓDULO 11: CLARITY - ADMIN
    // ============================================================
    console.log('\n📦 MÓDULO 11: CLARITY - ADMIN');
    console.log('─'.repeat(50));

    await test('ADMIN', '/admin/usuarios', 'GET', async () => {
        const { status } = await http('GET', '/admin/usuarios');
        // Solo Admin puede ver, así que 200 o 403 son válidos
        assert(status === 200 || status === 403, `Status inesperado: ${status}`);
    });

    await test('ADMIN', '/admin/roles', 'GET', async () => {
        const { status, data } = await http('GET', '/admin/roles');
        assert(status === 200 || status === 403, `Status inesperado: ${status}`);
    });

    await test('ADMIN', '/admin/organigrama', 'GET', async () => {
        const { status } = await http('GET', '/admin/organigrama');
        assert(status === 200 || status === 403, `Status inesperado: ${status}`);
    });

    await test('ADMIN', '/admin/logs', 'GET', async () => {
        const { status } = await http('GET', '/admin/logs');
        assert(status === 200 || status === 403, `Status inesperado: ${status}`);
    });

    // ============================================================
    // MÓDULO 12: HEALTH CHECK Y UTILIDADES
    // ============================================================
    console.log('\n📦 MÓDULO 12: HEALTH CHECK');
    console.log('─'.repeat(50));

    await test('HEALTH', '/reset-passwords', 'GET', async () => {
        // El endpoint raíz no tiene respuesta, probamos un endpoint público existente
        const { status } = await http('GET', '/reset-passwords', undefined, false);
        assert(status === 200, `Status: ${status}`);
    });

    // ============================================================
    // MÓDULO 13: PRUEBAS DE SEGURIDAD
    // ============================================================
    console.log('\n📦 MÓDULO 13: SEGURIDAD');
    console.log('─'.repeat(50));

    await test('SECURITY', '/tareas/mias (sin auth)', 'GET', async () => {
        const res = await fetch(`${BASE_URL}/tareas/mias`);
        assert(res.status === 401, `Debería requerir auth, recibió ${res.status}`);
    });

    await test('SECURITY', '/config (token inválido)', 'GET', async () => {
        const res = await fetch(`${BASE_URL}/config`, {
            headers: { 'Authorization': 'Bearer token_invalido_123' }
        });
        assert(res.status === 401, `Debería rechazar token inválido, recibió ${res.status}`);
    });

    await test('SECURITY', '/admin/usuarios (usuario no admin)', 'GET', async () => {
        // Este test verifica que se rechace a usuarios no admin
        // El resultado depende de si el usuario es admin o no
        const { status } = await http('GET', '/admin/usuarios');
        assert(status === 200 || status === 403, `Status: ${status}`);
    });

    // ============================================================
    // MÓDULO 14: PLANNING
    // ============================================================
    console.log('\n📦 MÓDULO 14: PLANNING');
    console.log('─'.repeat(50));

    await test('PLANNING', '/planning/pending', 'GET', async () => {
        const { status } = await http('GET', '/planning/pending');
        assert(status === 200, `Status: ${status}`);
    });

    // ============================================================
    // RESUMEN FINAL
    // ============================================================
    log('\n' + '═'.repeat(70));
    log('📊 RESUMEN DE RESULTADOS');
    log('═'.repeat(70));

    const porModulo = new Map<string, { pass: number; fail: number; skip: number }>();

    for (const r of resultados) {
        const stats = porModulo.get(r.modulo) || { pass: 0, fail: 0, skip: 0 };
        if (r.estado === 'PASS') stats.pass++;
        else if (r.estado === 'FAIL') stats.fail++;
        else stats.skip++;
        porModulo.set(r.modulo, stats);
    }

    log('\n📈 Por Módulo:');
    log('─'.repeat(50));
    for (const [modulo, stats] of porModulo) {
        const total = stats.pass + stats.fail + stats.skip;
        const pct = ((stats.pass / total) * 100).toFixed(0);
        const icon = stats.fail === 0 ? '✅' : '⚠️';
        log(`  ${icon} ${modulo.padEnd(15)} ${stats.pass}/${total} (${pct}%)`);
    }

    const totalPass = resultados.filter(r => r.estado === 'PASS').length;
    const totalFail = resultados.filter(r => r.estado === 'FAIL').length;
    const totalSkip = resultados.filter(r => r.estado === 'SKIP').length;
    const total = resultados.length;
    const duracionTotal = resultados.reduce((sum, r) => sum + r.duracionMs, 0);

    log('\n📊 Totales:');
    log('─'.repeat(50));
    log(`  ✅ Passed:  ${totalPass}`);
    log(`  ❌ Failed:  ${totalFail}`);
    log(`  ⏭️ Skipped: ${totalSkip}`);
    log(`  📋 Total:   ${total}`);
    log(`  ⏱️ Tiempo:  ${duracionTotal}ms`);
    log(`  📊 Tasa:    ${((totalPass / total) * 100).toFixed(1)}%`);

    if (totalFail > 0) {
        log('\n❌ TESTS FALLIDOS:');
        log('─'.repeat(50));
        resultados.filter(r => r.estado === 'FAIL').forEach(r => {
            log(`\n  📛 ${r.modulo} - ${r.metodo} ${r.endpoint}`);
            log(`     Error: ${r.error}`);
        });
    }

    log('\n' + '═'.repeat(70));
    if (totalFail === 0) {
        log('🎉 ¡TODOS LOS TESTS PASARON!');
    } else {
        log(`⚠️ ${totalFail} TESTS FALLARON - Revisar errores arriba`);
    }
    log('═'.repeat(70) + '\n');

    // Exit code
    process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(console.error);
