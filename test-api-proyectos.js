
// Native fetch is available in Node.js 18+

async function testProjectsApi() {
    const base = 'http://127.0.0.1:3000/api';
    console.log('1. Authenticating as Gustavo...');

    let token = '';

    try {
        const loginRes = await fetch(base + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: 'gustavo.lira@claro.com.ni', password: '123456' })
        });

        if (loginRes.status !== 201 && loginRes.status !== 200) {
            console.error('❌ Login failed:', loginRes.status, await loginRes.text());
            // Try fallback email if above fails, just in case
            return;
        }

        const loginData = await loginRes.json();
        console.log('Login Response:', JSON.stringify(loginData));
        token = loginData.data.access_token; // Verify if this key exists
        console.log('Token:', token ? token.substring(0, 20) + '...' : 'UNDEFINED');

        console.log('\n2. Testing /api/proyectos endpoint...');
        const startTime = Date.now();

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        console.log('Sending headers:', JSON.stringify(headers));

        const projectsRes = await fetch(base + '/proyectos', {
            method: 'GET',
            headers: headers
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (projectsRes.status === 200) {
            const projects = await projectsRes.json();
            console.log(`✅ Success! Response time: ${duration}ms`);
            console.log(`ℹ️ Projects found: ${projects.items ? projects.items.length : projects.length}`);
            // console.log('Sample project:', projects.items ? projects.items[0] : projects[0]);
        } else {
            console.error(`❌ API Error: ${projectsRes.status} ${projectsRes.statusText}`);
            console.error('Response:', await projectsRes.text());
        }

    } catch (e) {
        console.error('❌ Unexpected Error:', e.message);
    }
}

testProjectsApi();
