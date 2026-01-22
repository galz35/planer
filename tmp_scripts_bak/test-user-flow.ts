
const API_URL = 'http://localhost:3000/api';
const EMAIL = 'gerente@rrhh.demo';
const PASS = '123456';

async function testUserFlow() {
    console.log(`🔹 Probando flujo para: ${EMAIL}`);

    try {
        // 1. Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: EMAIL, password: PASS })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const { access_token, user } = loginData;
        console.log(`   ✅ Login Exitoso! Usuario: ${user.nombre}`);

        const authHeaders = {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
        };

        // 2. Dashboard Data
        const miDiaRes = await fetch(`${API_URL}/mi-dia`, { headers: authHeaders });
        const data = await miDiaRes.json();
        const count = (data.tareasDisponibles?.length || 0) + (data.arrastrados?.length || 0);
        console.log(`   ✅ Dashboard cargado. Tareas Disponibles + Arrastradas: ${count}`);

        // 3. Projects List
        const projectsRes = await fetch(`${API_URL}/proyectos`, { headers: authHeaders });
        const projects = await projectsRes.json();
        console.log(`   ✅ Proyectos: ${projects.length}`);

        if (projects.length > 0) {
            const pId = projects[0].idProyecto;
            // 5. Verify Team Load Endpoint
            console.log(`   🔍 Verificando tareas del proyecto ${pId}...`);
            const pTasksRes = await fetch(`${API_URL}/proyectos/${pId}/tareas`, { headers: authHeaders });
            const pTasks = await pTasksRes.json();
            console.log(`   ✅ Tareas recuperadas: ${pTasks.length}`);
        }

        console.log('\n✨ PRUEBA DE USUARIO COMPLETADA EXITOSAMENTE');

    } catch (e: any) {
        console.error('❌ Error en la prueba:', e);
    }
}

testUserFlow();
