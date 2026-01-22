const fetch = require('node-fetch');

// Configuración
const BASE_URL = 'http://localhost:3000/api';
// Usuario Admin para probar (ajustar credenciales si es necesario)
const CREDENTIALS = {
    correo: 'juan.ortuno@claro.com.ni',
    password: '123456'
};

async function runTest() {
    try {
        console.log('1. Autenticando (Login)...');
        // Usamos un endpoint de auth existente
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CREDENTIALS)
        });

        if (!loginRes.ok) {
            console.error('❌ Error Login:', loginRes.status, loginRes.statusText);
            const text = await loginRes.text();
            console.error('Response:', text);
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.data?.access_token || loginData.access_token;
        console.log('✅ Login OK. Token obtenido.');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 2. Test Listar Usuarios
        console.log('\n2. Probando GET /api/admin/usuarios...');
        const usersRes = await fetch(`${BASE_URL}/admin/usuarios?page=1&limit=5`, { headers });
        if (usersRes.ok) {
            const data = await usersRes.json();
            console.log('✅ Listar Usuarios OK:', data.total ? `${data.total} usuarios encontrados` : 'Success');
            if (data.datos && data.datos.length > 0) {
                console.log('   Muestra:', data.datos[0].nombre, '-', data.datos[0].correo);
            }
        } else {
            console.error('❌ Fail Listar Usuarios:', usersRes.status);
            console.log(await usersRes.text());
        }

        // 3. Test Listar Roles
        console.log('\n3. Probando GET /api/admin/roles...');
        const rolesRes = await fetch(`${BASE_URL}/admin/roles`, { headers });
        if (rolesRes.ok) {
            const data = await rolesRes.json();
            console.log('✅ Listar Roles OK:', Array.isArray(data) ? `${data.length} roles` : 'Success');
        } else {
            console.error('❌ Fail Listar Roles:', rolesRes.status);
            console.log(await rolesRes.text());
        }

        // 4. Test Listar Logs
        console.log('\n4. Probando GET /api/admin/logs...');
        const logsRes = await fetch(`${BASE_URL}/admin/logs?limit=5`, { headers });
        if (logsRes.ok) {
            const data = await logsRes.json();
            console.log('✅ Listar Logs OK:', data.total ? `${data.total} logs` : 'Success');
        } else {
            console.error('❌ Fail Listar Logs:', logsRes.status);
            console.log(await logsRes.text());
        }

    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
    }
}

runTest();
