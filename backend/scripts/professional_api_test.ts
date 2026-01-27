
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'http://127.0.0.1:3000/api';
const USER = {
    correo: 'gustavo.lira@claro.com.ni',
    password: '123456'
};

async function testEndpoint(name: string, method: 'GET' | 'POST' | 'PATCH', path: string, token?: string, body?: any) {
    const start = Date.now();
    try {
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await axios({
            method,
            url: `${API_URL}${path}`,
            data: body,
            headers,
            timeout: 10000
        });

        const duration = Date.now() - start;
        const status = response.status;
        const innerData = response.data?.data || response.data;
        const dataCount = Array.isArray(innerData) ? innerData.length : (innerData?.miembros?.length || (innerData ? 1 : 0));

        console.log(`| ${name.padEnd(25)} | ${status} | ${duration.toString().padStart(6)}ms | ${dataCount.toString().padStart(8)} |`);
        return response.data;
    } catch (error: any) {
        const duration = Date.now() - start;
        const status = error.response?.status || 'ERR';
        console.log(`| ${name.padEnd(25)} | ${status} | ${duration.toString().padStart(6)}ms | ERROR    |`);
        if (error.response) {
            console.log(`   -> Status: ${error.response.status}`);
            console.log(`   -> Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.log(`   -> Message: ${error.message}`);
        }
    }
}

async function runTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 CLARITY PROFESSIONAL PERFORMANCE TEST');
    console.log('='.repeat(60));
    console.log(`| ${'Endpoint'.padEnd(25)} | Stat | Latency  | Records  |`);
    console.log('-'.repeat(60));

    // 1. LOGIN
    const loginResponse = await testEndpoint('Login', 'POST', '/auth/login', undefined, USER);
    if (!loginResponse || !loginResponse.data?.access_token) {
        console.log('\n❌ FATAL: Could not login. Response status: ' + (loginResponse ? 'OK but no token' : 'Failed'));
        if (loginResponse) console.log('Response keys:', Object.keys(loginResponse));
        return;
    }
    const token = loginResponse.data.access_token;

    // 2. KPIS
    await testEndpoint('Dashboard KPIs', 'GET', '/kpis/dashboard', token);

    // 3. CATALOGO ORGANIZACION (Optimized)
    await testEndpoint('Org: Catalogo', 'GET', '/organizacion/catalogo', token);

    // 4. ESTRUCTURA ORGANIZACION (Optimized)
    await testEndpoint('Org: Estructura', 'GET', '/organizacion/estructura-usuarios', token);

    // 5. MIS TAREAS (Optimized SP)
    await testEndpoint('Tareas: Mis Tareas', 'GET', '/tareas/mias', token);

    // 6. EQUIPO HOY
    await testEndpoint('Equipo: Hoy', 'GET', '/equipo/hoy?fecha=2026-01-27', token);

    // 7. MI DIA
    await testEndpoint('Personal: Mi Dia', 'GET', '/mi-dia?fecha=2026-01-27', token);

    // 8. NOTAS
    await testEndpoint('Personal: Notas', 'GET', '/notas', token);

    console.log('='.repeat(60));
    console.log('🏁 Test completed at ' + new Date().toLocaleTimeString() + '\n');
}

runTests();
