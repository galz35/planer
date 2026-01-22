const fetch = require('node-fetch');

async function check() {
    try {
        const r = await fetch('http://localhost:3000/api/diagnostico/contexto');
        if (r.status === 404) {
            console.log('🔴 Endpoint /contexto NO existe. El servidor NO ha recargado el código nuevo.');
        } else {
            console.log('🟢 Endpoint /contexto existe:', await r.json());
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}
check();
