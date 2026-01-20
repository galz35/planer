const http = require('http');

const payload = "{}";

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/seed',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            // The controller likely wraps the service response in 'data' or similar, or returns it directly.
            // SeedService returns: { success, processed, created }
            // Let's print the whole object structure deeply
            console.dir(json, { depth: null, colors: true });

            if (json.data && json.data.processed !== undefined) {
                console.log(`\nIMPORTANT STATS: Processed=${json.data.processed}, Created=${json.data.created}`);
            } else if (json.processed !== undefined) {
                console.log(`\nIMPORTANT STATS: Processed=${json.processed}, Created=${json.created}`);
            } else {
                console.log('\nCould not find stats in response.');
            }

        } catch (e) {
            console.log('Raw Data (Parse Error):', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`REQUEST FAILED: ${e.message}`);
});

req.write(payload);
req.end();
