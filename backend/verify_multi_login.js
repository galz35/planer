const axios = require('axios');

async function testLogin(identifier, password) {
    console.log(`\n\n🔍 Probando Login con: ${identifier}`);
    try {
        const response = await axios.post('http://100.26.176.32/api/auth/login', {
            correo: identifier,
            password: password
        });

        console.log('✅ LOGIN EXITOSO');
        console.log('--------------------------------------------------');
        console.log('Respuesta completa:', JSON.stringify(response.data, null, 2));
        console.log('--------------------------------------------------');
        return true;
    } catch (error) {
        console.log('❌ LOGIN FALLIDO');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Mensaje:', error.response.data.message || error.response.data);
        } else {
            console.log('Error:', error.message);
        }
        return false;
    }
}

async function runTests() {
    console.log('🚀 INICIANDO PRUEBA DE LOGIN HÍBRIDO');
    
    // Prueba 1: Email
    await testLogin('gustavo.lira@claro.com.ni', '123456');
    
    // Prueba 2: Carnet
    await testLogin('500708', '123456');
    
    console.log('\n🏁 PRUEBAS FINALIZADAS');
}

runTests();
