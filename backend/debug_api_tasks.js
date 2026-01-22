const axios = require('axios');
const fs = require('fs');

async function testApi() {
    try {
        // Primero login para obtener token (usando lo que sabemos de sesiones anteriores)
        console.log('🔐 Intentando login...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            correo: 'admin@test.com', // O el carnet que funcione
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('✅ Token obtenido.');

        const res = await axios.get('http://localhost:3000/api/proyectos/55/tareas', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Tareas obtenidas.');
        fs.writeFileSync('api_tasks_debug.json', JSON.stringify(res.data, null, 2));
        console.log('📄 Resultados guardados en api_tasks_debug.json');

    } catch (err) {
        console.error('❌ Error:', err.response?.data || err.message);

        // Intentar sin auth si falló el login
        try {
            console.log('🔄 Intentando sin auth...');
            const res = await axios.get('http://localhost:3000/api/proyectos/55/tareas');
            console.log('✅ Tareas obtenidas (sin auth).');
            fs.writeFileSync('api_tasks_debug.json', JSON.stringify(res.data, null, 2));
        } catch (e) {
            console.error('❌ Falló también sin auth.');
        }
    }
}

testApi();
