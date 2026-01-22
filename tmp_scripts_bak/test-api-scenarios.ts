
const BASE_URL = 'http://localhost:3000/api';

// Verificar fetch disponible (Node 18+)
if (typeof fetch === 'undefined') {
    console.error('Este script requiere Node.js v18+ con fetch nativo.');
    process.exit(1);
}

async function login(role: string, email: string) {
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: email, password: '123456' })
        });

        const json: any = await res.json();

        if (!res.ok) {
            console.error(`❌ Login FALLÓ para ${role} (${email}): ${res.status} - ${JSON.stringify(json)}`);
            return null;
        }

        // Adjust for TransformInterceptor
        const token = json.data?.access_token || json.access_token;

        if (token) {
            console.log(`✅ Login EXITOSO para ${role} (${email})`);
            console.log('   User Details:', JSON.stringify(json.user || json.data?.user));
            return token;
        } else {
            console.error(`❌ No se encontró token en respuesta login:`, json);
            return null;
        }
    } catch (e) {
        console.error(`❌ Error de conexión login ${role}:`, e);
        return null;
    }
}

async function testAdminStats(token: string, role: string) {
    try {
        const res = await fetch(`${BASE_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 200) console.log(`✅ ${role}: Acceso a /admin/stats PERMITIDO (Esperado para Admin)`);
        else if (res.status === 403) console.log(`✅ ${role}: Acceso a /admin/stats DENEGADO (Esperado para No-Admin)`);
        else console.log(`⚠️ ${role}: Respuesta inesperada en /admin/stats: ${res.status}`);
    } catch (e) { console.error(e); }
}

async function testMiDia(token: string, role: string) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${BASE_URL}/mi-dia?fecha=${today}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 200 || res.status === 201) console.log(`✅ ${role}: Acceso a /clarity/mi-dia EXITOSO`);
        else console.log(`❌ ${role}: Falló acceso a /clarity/mi-dia: ${res.status}`);
    } catch (e) { console.error(e); }
}

async function run() {
    console.log('--- INICIANDO PRUEBAS DE ESCENARIO ---');
    console.log('Target:', BASE_URL);

    // 1. ADMIN
    const adminToken = await login('ADMIN', 'gustavo.lira@claro.com.ni');
    if (adminToken) {
        await testAdminStats(adminToken, 'ADMIN');
        await testMiDia(adminToken, 'ADMIN');
    } else {
        console.log('⚠️ Saltando pruebas ADMIN por fallo login');
    }

    console.log('---');

    // 2. JEFE
    const jefeToken = await login('JEFE', 'lenin.gonzalez@claro.com.ni');
    if (jefeToken) {
        await testAdminStats(jefeToken, 'JEFE');
        await testMiDia(jefeToken, 'JEFE');
    } else {
        console.log('⚠️ Saltando pruebas JEFE por fallo login');
    }

    console.log('---');

    // 3. USER
    const userToken = await login('USER', 'ana.guillen@claro.com.ni');
    if (userToken) {
        await testAdminStats(userToken, 'USER');
        await testMiDia(userToken, 'USER');
    } else {
        console.log('⚠️ Saltando pruebas USER por fallo login');
    }
}

run();
