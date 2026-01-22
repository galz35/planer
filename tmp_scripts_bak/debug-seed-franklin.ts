
const API_URL = 'http://localhost:3000/api';
const EMAIL = 'franklin.flores@claro.com.ni';
const PASS = '123456';

async function main() {
    console.log(`Logging in as ${EMAIL}...`);
    try {
        const resp = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: EMAIL, password: PASS })
        });

        if (!resp.ok) {
            console.error('Login failed:', resp.status, await resp.text());
            return;
        }

        const json = await resp.json();
        const token = json.data?.access_token;
        if (!token) {
            console.error('No token:', json);
            return;
        }
        console.log('Login success, token obtained.');

        // Try to create a task
        console.log('Creating task...');
        const taskResp = await fetch(`${API_URL}/tareas/rapida`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ titulo: 'Tarea de Prueba Debug' })
        });

        console.log('Task Create Status:', taskResp.status);
        const taskBody = await taskResp.text();
        console.log('Task Create Body:', taskBody);

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
