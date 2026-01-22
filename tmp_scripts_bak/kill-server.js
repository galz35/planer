const { exec } = require('child_process');
const os = require('os');
const isWin = os.platform() === 'win32';

const cmd = isWin ? 'netstat -ano | findstr :3000' : 'lsof -i :3000 -t';

console.log('🔍 Looking for process on port 3000...');
exec(cmd, (err, stdout) => {
    if (stdout) {
        const lines = stdout.trim().split(/[\r\n]+/);
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1]; // PID is last column in netstat -ano
            if (pid && /^\d+$/.test(pid) && pid !== '0') {
                console.log(`🔪 Killing PID: ${pid}`);
                const killCmd = isWin ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
                exec(killCmd, (e, out, stderr) => {
                    if (e) console.log('Error killing:', e.message);
                    else console.log('Killed.', out);
                });
            }
        });
    } else {
        console.log('✅ Port 3000 is free.');
    }
});
