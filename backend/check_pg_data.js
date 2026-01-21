const { Client } = require('pg');

const pgConfig = {
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ddmeodlpdxgmadduwdas',
    password: '92li!ra$Gu2',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

async function checkRows() {
    const client = new Client(pgConfig);
    try {
        await client.connect();
        const tables = [
            'p_Roles', 'p_Usuarios', 'p_UsuariosCredenciales',
            'p_Proyectos', 'p_Tareas', 'p_TareaAsignados',
            'p_Checkins', 'p_Bloqueos', 'p_Notas',
            'p_organizacion_nodos', 'p_permiso_area',
            'p_permiso_empleado', 'p_delegacion_visibilidad'
        ];

        console.log('--- Conteo de filas en PostgreSQL ---');
        for (const t of tables) {
            try {
                const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
                console.log(`${t}: ${res.rows[0].count}`);
            } catch (e) {
                // Probar con minúsculas si falla (Postgres es sensible a mayúsculas con comillas)
                try {
                    const res = await client.query(`SELECT COUNT(*) FROM ${t.toLowerCase()}`);
                    console.log(`${t} (lowercased): ${res.rows[0].count}`);
                } catch (e2) {
                    console.log(`${t}: No existe o error`);
                }
            }
        }
    } finally {
        await client.end();
    }
}

checkRows();
