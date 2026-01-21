/**
 * Test script para diagnosticar visibilidad de juan.ortuno
 * Ejecutar: node test-visibilidad.js
 */
const http = require('http');

const API_URL = 'http://localhost:3000';

async function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    console.log('=== DIAGNÓSTICO DE VISIBILIDAD ===\n');

    // 1. Login como juan.ortuno
    console.log('1. Haciendo login como juan.ortuno@claro.com.ni...');
    const loginRes = await request('POST', '/api/auth/login', {
        correo: 'juan.ortuno@claro.com.ni',
        password: '123456'
    });

    if (loginRes.status !== 201 && loginRes.status !== 200) {
        console.error('❌ Error de login:', loginRes.data);
        return;
    }

    const token = loginRes.data.access_token;
    const user = loginRes.data.user;

    console.log('\n✅ Login exitoso');
    console.log('   Usuario:', user?.nombre || user?.nombreCompleto);
    console.log('   rolGlobal:', user?.rolGlobal || 'NO DEFINIDO');
    console.log('   Carnet:', user?.carnet);
    console.log('   ID:', user?.idUsuario);

    // 2. Obtener equipo (Mi Equipo)
    console.log('\n2. Obteniendo equipo visible (API /planning/team)...');
    const teamRes = await request('GET', '/api/planning/team', null, token);

    if (teamRes.status === 200) {
        const team = teamRes.data;
        console.log('   Total miembros visibles:', team.length);
        if (team.length > 0 && team.length <= 10) {
            console.log('   Nombres:', team.map(m => m.nombre || m.nombreCompleto).join(', '));
        }
    } else {
        console.error('   ❌ Error:', teamRes.data);
    }

    // 3. Obtener equipo hoy (Dashboard)
    const hoy = new Date().toISOString().split('T')[0];
    console.log(`\n3. Obteniendo equipo hoy (API /equipo/hoy?fecha=${hoy})...`);
    const equipoHoyRes = await request('GET', `/api/equipo/hoy?fecha=${hoy}`, null, token);

    if (equipoHoyRes.status === 200) {
        const data = equipoHoyRes.data;
        const miembros = data.miembros || data || [];
        console.log('   Total miembros:', miembros.length);
    } else {
        console.error('   ❌ Error:', equipoHoyRes.data);
    }

    // Diagnóstico
    console.log('\n=== DIAGNÓSTICO ===');
    if (user?.rolGlobal === 'Admin' || user?.rolGlobal === 'Administrador' || user?.rolGlobal === 'SuperAdmin') {
        console.log('✅ El usuario ES Admin - debería ver TODO');
        console.log('   Si no ve todo, hay un BUG en la lógica');
    } else {
        console.log(`ℹ️ El usuario NO es Admin (rolGlobal = "${user?.rolGlobal}")`);
        console.log('   Solo verá según su jerarquía y permisos asignados');
        console.log('   Esto es comportamiento CORRECTO');
    }
}

main().catch(console.error);
