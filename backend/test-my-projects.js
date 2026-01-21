// Test de la API my-projects
// Simula una llamada con el ID de juan.ortuno

const fetch = require('node-fetch');

async function testMyProjects() {
    // Primero hacemos login para obtener token
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            correo: 'juan.ortuno@claro.com.ni',
            password: '123456'
        })
    });

    if (!loginRes.ok) {
        console.error('❌ Login failed:', await loginRes.text());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.data?.access_token || loginData.access_token;
    console.log('✅ Login exitoso para juan.ortuno');
    console.log('Token:', token?.substring(0, 50) + '...');

    // Ahora probamos my-projects
    const res = await fetch('http://localhost:3000/api/planning/my-projects', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        console.error('❌ API Error:', await res.text());
        return;
    }

    const data = await res.json();
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 RESPUESTA DE /planning/my-projects');
    console.log('═══════════════════════════════════════════════════════════');

    if (!data.data || data.data.length === 0) {
        console.log('⚠️ No se encontraron proyectos');
    } else {
        console.log(`✅ Proyectos encontrados: ${data.data.length}`);
        data.data.forEach((p, i) => {
            console.log(`\n${i + 1}. ${p.nombre}`);
            console.log(`   Progreso: ${p.progress}%`);
            console.log(`   Tareas: ${p.hechas}/${p.totalTasks} hechas`);
            console.log(`   Atrasadas: ${p.atrasadas}`);
        });
    }
}

testMyProjects().catch(console.error);
