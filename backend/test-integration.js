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

        if (!loginData.data || !loginData.data.access_token) {
            console.error('Login failed:', loginData);
            return;
        }

        const token = loginData.data.access_token;
        console.log('✅ Login OK.');

        // 2. My Projects
        console.log('Getting My Projects...');
        const projectsRes = await fetch('http://localhost:3000/api/planning/my-projects', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const projectsData = await projectsRes.json();
        console.log('✅ My Projects response:', JSON.stringify(projectsData, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

run();
