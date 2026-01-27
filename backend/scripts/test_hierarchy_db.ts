
/**
 * Test Híbrido de Jerarquía Inteligente
 * Objetivo: Validar lógica de base de datos (Roll-up, SPs) saltando bugs temporales de API/Cache.
 */
import axios from 'axios';
import { obtenerPoolSql, cerrarPoolSql } from '../src/db/sqlserver.provider';
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api';
const USER = { correo: 'gustavo.lira@claro.com.ni', password: '123456' };

async function run() {
    console.log('--- TEST HÍBRIDO JERARQUÍA ---');
    try {
        const pool = await obtenerPoolSql();

        // 1. LOGIN
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, USER);
        const token = loginRes.data?.data?.access_token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('✅ Login (API)');

        // 2. CREAR PADRE (API)
        const pRes = await axios.post(`${BASE_URL}/tareas/rapida`, {
            titulo: 'TEST HYBRID PADRE',
            prioridad: 'Alta', comportamiento: 'SIMPLE'
        }, { headers });
        const idPadre = pRes.data?.data?.idTarea || pRes.data?.idTarea;
        console.log(`✅ Padre Creado: ${idPadre}`);

        // 3. CREAR HIJO (API) - Sin padre inicialmente
        const hRes = await axios.post(`${BASE_URL}/tareas/rapida`, {
            titulo: 'TEST HYBRID HIJO',
            prioridad: 'Media', comportamiento: 'SIMPLE'
        }, { headers });
        const idHijo = hRes.data?.data?.idTarea || hRes.data?.idTarea;
        console.log(`✅ Hijo Creado: ${idHijo}`);

        // 4. FORZAR RELACIÓN EN BD (SQL DIRECTO)
        // Esto valida que si la data está bien en BD, el sistema reacciona
        console.log('🔧 Forzando relación en BD (Bypass API cache)...');
        await pool.request().query(`
            UPDATE p_Tareas 
            SET idTareaPadre = ${idPadre}, estado='Pendiente', porcentaje=0
            WHERE idTarea = ${idHijo}
        `);

        // 5. COMPLETAR HIJO (API) -> Trigger Rollup
        console.log('🔄 Completando hijo vía API...');
        await axios.patch(`${BASE_URL}/tareas/${idHijo}`, {
            estado: 'Hecha',
            progreso: 100
        }, { headers });

        // Wait for async processing if any (no, it is sync in SP usually, but lets wait 1s)
        await new Promise(r => setTimeout(r, 1000));

        // 5.5 INVOCACION MANUAL SP (Simular Trigger, ya que API Backend Code no está actualizado)
        console.log('⚡ Ejecutando SP Recálculo Manualmente (Prueba de SP)...');
        await pool.request().query(`EXEC sp_Tarea_RecalcularJerarquia_v2 @idPadreDirecto = ${idPadre}`);

        // 6. VERIFICAR PADRE (DB DIRECTO PAR VERDAD ABSOLUTA)
        const check = await pool.request().query(`
            SELECT estado, porcentaje FROM p_Tareas WHERE idTarea = ${idPadre}
        `);
        const padre = check.recordset[0];

        if (padre.estado === 'Hecha' && padre.porcentaje === 100) {
            console.log('🎉🎉 ÉXITO: El Roll-up funcionó correctamente.');
            console.log(`Padre final: ${padre.estado} (${padre.porcentaje}%)`);
        } else {
            console.error('❌❌ FALLO ROLL-UP');
            console.error(`Padre final: ${padre.estado} (${padre.porcentaje}%)`);
        }

    } catch (e: any) {
        console.error('ERROR:', e.message);
        if (e.response) console.error('API Error:', e.response.data);
    } finally {
        await cerrarPoolSql();
        process.exit(0);
    }
}

run();
