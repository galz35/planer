
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Node is alive!');
});
server.listen(3005, () => console.log('Test server running on 3005'));
