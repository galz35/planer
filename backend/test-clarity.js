async function run() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                correo: 'juan.ortuno@claro.com.ni',
                password: '123456'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.data?.access_token;

        if (!token) {
            console.error('Login failed', loginData);
            return;
        }
        console.log('✅ Login OK.');

        // 2. Mis Tareas
        console.log('Getting Mis Tareas...');
        const tareasRes = await fetch('http://localhost:3000/api/clarity/tareas/mias', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const tareasData = await tareasRes.json();
        console.log('✅ Tareas:', tareasData);

        // 3. Crear Tarea Rápida
        console.log('Creando tarea rápida...');
        const nuevaRes = await fetch('http://localhost:3000/api/clarity/tareas/rapida', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo: 'Tarea Test Migración ' + new Date().toISOString(),
                tipo: 'Administrativa',
                prioridad: 'Media'
            })
        });
        const nuevaData = await nuevaRes.json();
        console.log('✅ Tarea creada:', JSON.stringify(nuevaData, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

run();
