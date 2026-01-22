const fetch = require('node-fetch');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api';
const CREDENTIALS = { correo: 'juan.ortuno@claro.com.ni', password: '123456' };

async function runTest() {
    fs.writeFileSync('error_log.txt', 'DEBUG LOG\n');

    try {
        console.log('Login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CREDENTIALS)
        });
        if (!loginRes.ok) throw new Error(await loginRes.text());
        const token = (await loginRes.json()).data.access_token;
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        // Tarea
        console.log('Test Tarea...');
        const tRes = await fetch(`${BASE_URL}/tareas/rapida`, {
            method: 'POST', headers, body: JSON.stringify({ titulo: 'TestLog' })
        });
        if (!tRes.ok) {
            const txt = await tRes.text();
            fs.appendFileSync('error_log.txt', `TAREA ERROR:\n${txt}\n\n`);
            console.log('Tarea FAIL 500');
        } else console.log('Tarea OK');

        // Checkin
        console.log('Test Checkin...');
        const cRes = await fetch(`${BASE_URL}/checkins`, {
            method: 'POST', headers, body: JSON.stringify({
                entregableTexto: 'Log',
                estadoAnimo: 'Bien',
                fecha: new Date().toISOString().split('T')[0] // YYYY-MM-DD
            })
        });
        if (!cRes.ok) {
            const txt = await cRes.text();
            fs.appendFileSync('error_log.txt', `CHECKIN ERROR:\n${txt}\n\n`);
            console.log('Checkin FAIL');
        } else console.log('Checkin OK');

        // Tree
        console.log('Test Tree...');
        const trRes = await fetch(`${BASE_URL}/acceso/organizacion/tree`, { headers });
        if (!trRes.ok) {
            const txt = await trRes.text();
            fs.appendFileSync('error_log.txt', `TREE ERROR:\n${txt}\n\n`);
            console.log('Tree FAIL');
        } else console.log('Tree OK');

    } catch (e) {
        fs.appendFileSync('error_log.txt', `EXCEPTION: ${e.message}\n`);
        console.error(e);
    }
}
runTest();
