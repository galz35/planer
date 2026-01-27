
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const USER_CREDENTIALS = {
    correo: 'gustavo.lira@claro.com.ni',
    password: '123456'
};

(async () => {
    try {
        console.log('--- DEBUG LOGIN ---');
        const res = await axios.post(`${BASE_URL}/auth/login`, USER_CREDENTIALS);
        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.log('Error:', e.response ? e.response.data : e.message);
    }
})();
