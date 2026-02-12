const http = require('http');

const CONFIG = {
    hostname: 'localhost',
    port: 3000,
    path: '/api',
};

function request(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.hostname,
            port: CONFIG.port,
            path: CONFIG.path + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    try {
        console.log('--- DIAGNÓSTICO DE AGENDA: GUSTAVO ---');

        // 1. LOGIN
        console.log('1. Iniciando sesión...');
        const loginRes = await request('POST', '/auth/login', {
            correo: 'gustavo.lira@claro.com.ni',
            password: '123456'
        });

        if (!loginRes.data || !loginRes.data.access_token) {
            console.error('❌ Error de Login:', loginRes);
            return;
        }

        const token = loginRes.data.access_token;
        const user = loginRes.data.user;
        console.log(`✅ Login OK. Carnet: ${user.carnet}`);

        // 2. GET MI DIA
        const today = new Date().toISOString().split('T')[0];
        console.log(`\n2. Consultando Agenda (/mi-dia?fecha=${today})...`);
        const resAgenda = await request('GET', `/mi-dia?fecha=${today}`, null, token);

        if (!resAgenda.data || !resAgenda.data.tareasSugeridas) {
            console.error('❌ Respuesta extraña de API:', resAgenda);
            return;
        }

        const agenda = resAgenda.data;

        console.log('--- RESULTADOS ---');
        console.log(`📅 Checkin Hoy: ${agenda.checkinHoy ? 'SÍ (Ya hiciste checkin hoy)' : 'NO'}`);

        console.log(`\n📋 Tareas Sugeridas (Total: ${agenda.tareasSugeridas.length})`);
        agenda.tareasSugeridas.forEach(t => {
            console.log(`   - [${t.estado}] ${t.titulo} (${t.fechaObjetivo || 'Sin Fecha'})`);
        });

        console.log(`\n🔥 Backlog / Vencidas (Total: ${agenda.backlog.length})`);
        agenda.backlog.forEach(t => {
            console.log(`   - [${t.estado}] ${t.titulo} (Venció: ${t.fechaObjetivo})`);
        });

        console.log('\n--- FIN ---');

    } catch (e) {
        console.error('❌ Error fatal:', e);
    }
}

run();
