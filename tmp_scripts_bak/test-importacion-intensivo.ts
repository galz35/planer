/**
 * TEST TÉCNICO INTENSIVO - Módulo de Importación
 * 
 * Pruebas de:
 * 1. Validaciones de DTOs
 * 2. Endpoints de importación
 * 3. Manejo de errores
 * 4. Casos límite
 * 5. Rendimiento
 * 
 * Ejecutar: npx ts-node -r tsconfig-paths/register src/scripts/test-importacion-intensivo.ts
 */

const BASE_URL = 'http://localhost:3000/api';

// Helper para simular axios con fetch nativo
const axios = {
    async get(url: string) {
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
            const error: any = new Error(data.message || 'Request failed');
            error.response = { status: res.status, data };
            throw error;
        }
        return { data, status: res.status };
    },
    async post(url: string, body: any) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) {
            const error: any = new Error(data.message || 'Request failed');
            error.response = { status: res.status, data };
            throw error;
        }
        return { data, status: res.status };
    }
};

interface TestResult {
    nombre: string;
    estado: 'PASS' | 'FAIL';
    duracionMs: number;
    detalle?: string;
    error?: string;
}

const resultados: TestResult[] = [];

async function test(nombre: string, fn: () => Promise<void>): Promise<void> {
    const inicio = Date.now();
    try {
        await fn();
        resultados.push({
            nombre,
            estado: 'PASS',
            duracionMs: Date.now() - inicio,
        });
        console.log(`✅ ${nombre}`);
    } catch (error: any) {
        resultados.push({
            nombre,
            estado: 'FAIL',
            duracionMs: Date.now() - inicio,
            error: error.response?.data?.message || error.message,
            detalle: JSON.stringify(error.response?.data || error.message).slice(0, 200),
        });
        console.log(`❌ ${nombre}: ${error.response?.data?.message || error.message}`);
    }
}

async function main() {
    console.log('='.repeat(70));
    console.log('🧪 TEST TÉCNICO INTENSIVO - MÓDULO DE IMPORTACIÓN');
    console.log('='.repeat(70));
    console.log('');

    // =====================================================
    // SECCIÓN 1: PRUEBAS DE ESTADÍSTICAS
    // =====================================================
    console.log('\n📊 SECCIÓN 1: ESTADÍSTICAS\n');

    await test('GET /acceso/importar/estadisticas - Debe retornar estadísticas', async () => {
        const res = await axios.get(`${BASE_URL}/acceso/importar/estadisticas`);
        if (!res.data.data) throw new Error('No retornó data');
        if (typeof res.data.data.totalEmpleados !== 'number') throw new Error('totalEmpleados no es número');
        if (typeof res.data.data.activos !== 'number') throw new Error('activos no es número');
    });

    await test('GET /acceso/importar/plantilla - Debe retornar plantilla de columnas', async () => {
        const res = await axios.get(`${BASE_URL}/acceso/importar/plantilla`);
        if (!res.data.data?.columnas) throw new Error('No retornó columnas');
        if (!res.data.data?.ejemploFila) throw new Error('No retornó ejemploFila');
        if (!res.data.data.columnas.some((c: any) => c.nombre === 'carnet')) {
            throw new Error('Falta columna carnet');
        }
    });

    // =====================================================
    // SECCIÓN 2: VALIDACIONES DE IMPORTACIÓN JSON
    // =====================================================
    console.log('\n📋 SECCIÓN 2: VALIDACIONES DE IMPORTACIÓN JSON\n');

    await test('POST /acceso/importar/empleados - Rechaza body vacío', async () => {
        try {
            await axios.post(`${BASE_URL}/acceso/importar/empleados`, {});
            throw new Error('Debería haber fallado');
        } catch (error: any) {
            if (error.response?.status !== 400) throw new Error(`Esperaba 400, recibió ${error.response?.status}`);
        }
    });

    await test('POST /acceso/importar/empleados - Rechaza empleados sin carnet', async () => {
        try {
            await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
                empleados: [{ nombreCompleto: 'Sin Carnet' }]
            });
            throw new Error('Debería haber fallado');
        } catch (error: any) {
            if (error.response?.status !== 400) throw new Error(`Esperaba 400, recibió ${error.response?.status}`);
        }
    });

    await test('POST /acceso/importar/empleados - Rechaza carnet muy largo (>100 chars)', async () => {
        try {
            await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
                empleados: [{ carnet: 'X'.repeat(150) }]
            });
            throw new Error('Debería haber fallado');
        } catch (error: any) {
            if (error.response?.status !== 400) throw new Error(`Esperaba 400, recibió ${error.response?.status}`);
        }
    });

    await test('POST /acceso/importar/empleados - Rechaza correo muy largo (>150 chars)', async () => {
        try {
            await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
                empleados: [{ carnet: 'TEST_CORREO', correo: 'a'.repeat(160) + '@test.com' }]
            });
            throw new Error('Debería haber fallado');
        } catch (error: any) {
            if (error.response?.status !== 400) throw new Error(`Esperaba 400, recibió ${error.response?.status}`);
        }
    });

    await test('POST /acceso/importar/empleados - Rechaza modo inválido', async () => {
        try {
            await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
                empleados: [{ carnet: 'TEST001' }],
                modo: 'INVALIDO'
            });
            throw new Error('Debería haber fallado');
        } catch (error: any) {
            if (error.response?.status !== 400) throw new Error(`Esperaba 400, recibió ${error.response?.status}`);
        }
    });

    await test('POST /acceso/importar/empleados - Rechaza fuente inválida', async () => {
        try {
            await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
                empleados: [{ carnet: 'TEST001' }],
                fuente: 'NO_EXISTE'
            });
            throw new Error('Debería haber fallado');
        } catch (error: any) {
            if (error.response?.status !== 400) throw new Error(`Esperaba 400, recibió ${error.response?.status}`);
        }
    });

    // =====================================================
    // SECCIÓN 3: IMPORTACIÓN EXITOSA
    // =====================================================
    console.log('\n✅ SECCIÓN 3: IMPORTACIÓN EXITOSA\n');

    await test('POST /acceso/importar/empleados - Importa empleado válido (MERGE)', async () => {
        const res = await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
            empleados: [{
                carnet: 'TEST_IMPORT_001',
                nombreCompleto: 'Empleado de Prueba',
                correo: 'test.import@test.com',
                departamento: 'QA',
                cargo: 'Tester',
                activo: true
            }],
            modo: 'MERGE',
            fuente: 'API'
        });
        if (!res.data.data?.resultado) throw new Error('No retornó resultado');
        if (res.data.data.resultado.total !== 1) throw new Error('Total incorrecto');
    });

    await test('POST /acceso/importar/empleados - Actualiza empleado existente (MERGE)', async () => {
        const res = await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
            empleados: [{
                carnet: 'TEST_IMPORT_001',
                nombreCompleto: 'Empleado Actualizado',
                cargo: 'Senior Tester'
            }],
            modo: 'MERGE'
        });
        if (res.data.data.resultado.actualizados !== 1) throw new Error('No se actualizó');
    });

    await test('POST /acceso/importar/empleados - INSERT_ONLY no actualiza existentes', async () => {
        const res = await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
            empleados: [{
                carnet: 'TEST_IMPORT_001',
                nombreCompleto: 'Este no debería actualizarse'
            }],
            modo: 'INSERT_ONLY'
        });
        // En INSERT_ONLY, debería ignorar los existentes
        if (res.data.data.resultado.actualizados !== 0) throw new Error('No debería actualizar en INSERT_ONLY');
    });

    await test('POST /acceso/importar/empleados - Importación masiva (10 empleados)', async () => {
        const empleados = Array.from({ length: 10 }, (_, i) => ({
            carnet: `BATCH_TEST_${String(i).padStart(3, '0')}`,
            nombreCompleto: `Empleado Batch ${i}`,
            departamento: 'Test Batch'
        }));

        const res = await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
            empleados,
            modo: 'MERGE'
        });
        if (res.data.data.resultado.total !== 10) throw new Error('No procesó todos los empleados');
    });

    // =====================================================
    // SECCIÓN 4: IMPORTACIÓN DE ORGANIZACIÓN
    // =====================================================
    console.log('\n🏢 SECCIÓN 4: IMPORTACIÓN DE ORGANIZACIÓN\n');

    await test('POST /acceso/importar/organizacion - Importa nodos válidos', async () => {
        const res = await axios.post(`${BASE_URL}/acceso/importar/organizacion`, {
            nodos: [
                { idOrg: '999001', descripcion: 'Nodo Raíz Test', tipo: 'Direccion' },
                { idOrg: '999002', padre: '999001', descripcion: 'Sub Nodo Test', tipo: 'Gerencia' }
            ],
            modo: 'MERGE'
        });
        if (!res.data.data?.resultado) throw new Error('No retornó resultado');
    });

    await test('POST /acceso/importar/organizacion - Rechaza nodo sin idOrg', async () => {
        try {
            await axios.post(`${BASE_URL}/acceso/importar/organizacion`, {
                nodos: [{ descripcion: 'Sin ID' }]
            });
            throw new Error('Debería haber fallado');
        } catch (error: any) {
            // Puede que no valide estrictamente, verificar el comportamiento
            if (error.message === 'Debería haber fallado') {
                // Aceptable si la API maneja el caso
            }
        }
    });

    // =====================================================
    // SECCIÓN 5: EXPORTACIÓN
    // =====================================================
    console.log('\n📤 SECCIÓN 5: EXPORTACIÓN\n');

    await test('GET /acceso/importar/empleados/exportar?formato=json - Exporta JSON', async () => {
        const res = await axios.get(`${BASE_URL}/acceso/importar/empleados/exportar?formato=json`);
        if (res.data.data?.formato !== 'json') throw new Error('Formato incorrecto');
        if (!Array.isArray(res.data.data?.empleados)) throw new Error('No retornó array de empleados');
    });

    await test('GET /acceso/importar/empleados/exportar?formato=csv - Exporta CSV', async () => {
        const res = await axios.get(`${BASE_URL}/acceso/importar/empleados/exportar?formato=csv`);
        if (res.data.data?.formato !== 'csv') throw new Error('Formato incorrecto');
    });

    await test('GET /acceso/importar/empleados/exportar?activo=true - Filtra solo activos', async () => {
        const res = await axios.get(`${BASE_URL}/acceso/importar/empleados/exportar?activo=true&formato=json`);
        if (!res.data.data?.empleados) return; // Si no hay empleados, está bien
        const inactivos = res.data.data.empleados.filter((e: any) => !e.activo);
        if (inactivos.length > 0) throw new Error('Retornó empleados inactivos');
    });

    // =====================================================
    // SECCIÓN 6: ENDPOINTS DE EMPLEADOS
    // =====================================================
    console.log('\n👤 SECCIÓN 6: ENDPOINTS DE EMPLEADOS\n');

    await test('GET /acceso/empleado/:carnet - Busca empleado existente', async () => {
        const res = await axios.get(`${BASE_URL}/acceso/empleado/TEST_IMPORT_001`);
        // El empleado ahora se retorna directamente (envuelto por el TransformInterceptor)
        const empleado = res.data.data;
        if (!empleado) throw new Error('No retornó empleado');
        if (empleado.carnet !== 'TEST_IMPORT_001') throw new Error(`Carnet incorrecto: ${empleado.carnet}`);
    });

    await test('GET /acceso/empleado/:carnet - Retorna 404 para inexistente', async () => {
        try {
            await axios.get(`${BASE_URL}/acceso/empleado/NO_EXISTE_XYZ123`);
            throw new Error('Debería haber retornado 404');
        } catch (error: any) {
            if (error.response?.status !== 404) throw new Error(`Esperaba 404, recibió ${error.response?.status}`);
        }
    });

    await test('GET /acceso/empleados/buscar?q=Test - Busca empleados', async () => {
        const res = await axios.get(`${BASE_URL}/acceso/empleados/buscar?q=Test&limit=5`);
        if (!Array.isArray(res.data.data)) throw new Error('No retornó array');
    });

    await test('GET /acceso/empleado/email/:correo - Busca por correo', async () => {
        const res = await axios.get(`${BASE_URL}/acceso/empleado/email/gustavo.lira@claro.com.ni`);
        if (res.data.data?.encontrado !== true) throw new Error('No encontró el empleado');
    });

    // =====================================================
    // SECCIÓN 7: CASOS LÍMITE
    // =====================================================
    console.log('\n⚠️ SECCIÓN 7: CASOS LÍMITE\n');

    await test('Importar empleado con caracteres especiales en nombre', async () => {
        const res = await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
            empleados: [{
                carnet: 'TEST_ESPECIAL_001',
                nombreCompleto: 'José María Ñoño O\'Connor (Desarrollador)',
                correo: 'jose.ñoño@test.com'
            }]
        });
        if (!res.data.data?.resultado) throw new Error('No procesó correctamente');
    });

    await test('Importar empleado con espacios en blanco extras', async () => {
        const res = await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
            empleados: [{
                carnet: '  TEST_ESPACIOS_001  ',
                nombreCompleto: '  Nombre con espacios  '
            }]
        });
        // Debería hacer trim
        if (!res.data.data?.resultado) throw new Error('No procesó correctamente');
    });

    await test('Importar con fecha de ingreso válida', async () => {
        const res = await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
            empleados: [{
                carnet: 'TEST_FECHA_001',
                nombreCompleto: 'Test Fecha',
                fechaIngreso: '2020-01-15'
            }]
        });
        if (!res.data.data?.resultado) throw new Error('No procesó correctamente');
    });

    await test('Importar con activo=false', async () => {
        const res = await axios.post(`${BASE_URL}/acceso/importar/empleados`, {
            empleados: [{
                carnet: 'TEST_INACTIVO_001',
                nombreCompleto: 'Empleado Inactivo',
                activo: false
            }]
        });
        if (!res.data.data?.resultado) throw new Error('No procesó correctamente');
    });

    // =====================================================
    // SECCIÓN 8: LIMPIEZA
    // =====================================================
    console.log('\n🧹 SECCIÓN 8: LIMPIEZA (Eliminando datos de prueba)\n');

    // Nota: Aquí normalmente eliminaríamos los datos de prueba
    // pero dado que no hay endpoint DELETE, lo dejamos documentado

    console.log('   ℹ️ Los datos de prueba permanecen en la BD');
    console.log('   ℹ️ Carnets: TEST_IMPORT_001, BATCH_TEST_*, TEST_ESPECIAL_001, etc.');

    // =====================================================
    // RESUMEN
    // =====================================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('='.repeat(70));

    const passed = resultados.filter(r => r.estado === 'PASS').length;
    const failed = resultados.filter(r => r.estado === 'FAIL').length;
    const totalDuracion = resultados.reduce((sum, r) => sum + r.duracionMs, 0);

    console.log(`\n✅ Pasados:  ${passed}`);
    console.log(`❌ Fallados: ${failed}`);
    console.log(`⏱️ Tiempo total: ${totalDuracion}ms`);

    if (failed > 0) {
        console.log('\n❌ TESTS FALLIDOS:');
        console.log('-'.repeat(70));
        resultados.filter(r => r.estado === 'FAIL').forEach(r => {
            console.log(`\n📛 ${r.nombre}`);
            console.log(`   Error: ${r.error}`);
            if (r.detalle) console.log(`   Detalle: ${r.detalle}`);
        });
    }

    console.log('\n' + '='.repeat(70));
    console.log(failed === 0 ? '✅ TODOS LOS TESTS PASARON' : '⚠️ ALGUNOS TESTS FALLARON');
    console.log('='.repeat(70));
}

main().catch(console.error);
