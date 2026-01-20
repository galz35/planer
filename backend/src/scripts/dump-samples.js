const http = require('http');
const fs = require('fs');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/acceso/debug-raw-data',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        if (res.statusCode === 200) {
            fs.writeFileSync('d:/planificacion/backend/db_samples.json', data);
            console.log('✅ Samples dumped to db_samples.json');
        } else {
            console.log(`ERROR: ${data}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`REQUEST FAILED: ${e.message}`);
});

req.end();
