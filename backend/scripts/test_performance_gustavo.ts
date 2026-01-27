
/**
 * Test de Rendimiento y Correctitud - Usuario Gustavo Lira
 * Carnet: 500708
 * Escenario: Crear Tarea -> Crear Subtarea -> Verificar Roll-up
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const USER_CREDENTIALS = {
    correo: 'gustavo.lira@claro.com.ni',
    password: '123456'
};

const timer = (label: string) => {
    const start = process.hrtime();
    return () => {
        const diff = process.hrtime(start);
        const ms = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
        console.log(`[PERF] ${label}: ${ms} ms`);
        return parseFloat(ms);
    };
};

async function runTest() {
    console.log('--- INICIANDO TEST DE RENDIMIENTO (GUSTAVO LIRA) ---');
    console.log(`Target: ${BASE_URL}`);

    try {
        // 1. LOGIN
        const endLogin = timer('Login');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, USER_CREDENTIALS);
        endLogin();

        const token = loginRes.data?.data?.access_token;
        if (!token) throw new Error('No se recibió access_token');
        const headers = { Authorization: `Bearer ${token}` };
        console.log('✅ Login Exitoso');

        // 2. CREAR TAREA PADRE (/tareas/rapida)
        const endCreateParent = timer('Crear Tarea Padre');
        const parentRes = await axios.post(`${BASE_URL}/tareas/rapida`, {
            titulo: 'TEST PERFORMANCE GUSTAVO - PADRE',
            prioridad: 'Alta',
            tipo: 'Administrativa',
            esfuerzo: 'M',
            comportamiento: 'SIMPLE',
            fechaObjetivo: new Date().toISOString()
        }, { headers });

        const idPadre = parentRes.data?.data?.idTarea || parentRes.data?.idTarea;
        if (!idPadre) throw new Error('No se recibió ID de Tarea Padre');

        endCreateParent();
        console.log(`✅ Tarea Padre Creada (ID: ${idPadre})`);

        // 3. CREAR SUBTAREA (/tareas/rapida con idTareaPadre)
        const endCreateSub = timer('Crear Subtarea');
        const subRes = await axios.post(`${BASE_URL}/tareas/rapida`, {
            titulo: 'TEST PERFORMANCE GUSTAVO - HIJO',
            idTareaPadre: idPadre,
            prioridad: 'Media',
            tipo: 'Administrativa',
            esfuerzo: 'S',
            comportamiento: 'SIMPLE',
            fechaObjetivo: new Date().toISOString()
        }, { headers });
        const idHijo = subRes.data?.data?.idTarea || subRes.data?.idTarea;
        endCreateSub();
        console.log(`✅ Subtarea Creada (ID: ${idHijo})`);

        // VERIFICACION INTERMEDIA: ¿Tiene padre asignado?
        const checkHijo = await axios.get(`${BASE_URL}/tareas/${idHijo}`, { headers });
        const hijoData = checkHijo.data?.data || checkHijo.data;
        if (hijoData.idPadre !== idPadre) {
            console.warn(`⚠️ Warning: La subtarea se creó sin padre (Bug Backend Cache?). Intentando asignar manualmente vía PATCH...`);

            // WORKAROUND: Asignar padre vía PATCH
            await axios.patch(`${BASE_URL}/tareas/${idHijo}`, { idTareaPadre: idPadre }, { headers });

            // Re-verificar
            const reCheck = await axios.get(`${BASE_URL}/tareas/${idHijo}`, { headers });
            const reData = reCheck.data?.data || reCheck.data;

            if (reData.idPadre !== idPadre) {
                console.error(`❌❌ ERROR CRÍTICO: Falló asignación de padre incluso vía PATCH. Jerarquía rota.`);
                throw new Error('Asignación de Padre fallida totalmente');
            }
            console.log(`✅ WORKAROUND EXITOSO: Padre asignado vía PATCH.`);
        } else {
            console.log(`✅ Verificación OK: Subtarea tiene idPadre=${hijoData.idPadre}`);
        }

        // 4. MARCAR SUBTAREA COMPLETADA (Dispara Roll-up)
        const endComplete = timer('Completar Subtarea (Roll-up)');
        await axios.patch(`${BASE_URL}/tareas/${idHijo}`, {
            estado: 'Hecha',
            progreso: 100
        }, { headers });
        endComplete();
        console.log('✅ Subtarea Completada');

        // 5. VERIFICAR ESTADO DEL PADRE (Consistencia)
        const endVerify = timer('Verificar Padre');
        const verifyRes = await axios.get(`${BASE_URL}/tareas/${idPadre}`, { headers });
        endVerify();

        const padre = verifyRes.data?.data || verifyRes.data;

        if (padre.estado === 'Hecha' && padre.progreso === 100) {
            console.log('✅✅ CONSISTENCIA OK: El padre se marcó como HECHA automáticamente.');
        } else {
            console.error('❌❌ ERROR CONSISTENCIA: El padre NO se actualizó correctamente.');
            console.error('Estado Padre:', padre.estado, 'Progreso:', padre.progreso);
        }

    } catch (error: any) {
        if (error.response) {
            console.error('❌ ERROR API:', error.response.status, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('❌ ERROR RED/CODE:', error.message);
        }
    }
}

runTest();
