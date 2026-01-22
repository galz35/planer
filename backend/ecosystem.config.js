module.exports = {
    apps: [
        {
            name: 'momentus-backend',
            script: 'dist/main.js',
            instances: 'max', // O un número específico, ej: 2
            exec_mode: 'cluster', // Habilita balanceo de carga
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            env_production: {
                NODE_ENV: 'production'
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,
            time: true
        }
    ]
};
