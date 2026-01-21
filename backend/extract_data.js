const { Client } = require('pg');
const fs = require('fs');

const pgConfig = {
    host: 'aws-0-us-west-2.pooler.supabase.com',
    port: 6543,
    user: 'postgres.ddmeodlpdxgmadduwdas',
    password: '92li!ra$Gu2',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
};

async function migrate() {
    const client = new Client(pgConfig);
    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');

        let sqlScript = 'USE Bdplaner;\nGO\n\n';

        // 1. MIGRAR ROLES
        console.log('Obteniendo roles...');
        const rolesRes = await client.query('SELECT * FROM "p_Roles"');
        if (rolesRes.rows.length > 0) {
            sqlScript += "PRINT 'Insertando Roles...';\n";
            sqlScript += 'SET IDENTITY_INSERT p_Roles ON;\n';
            for (const row of rolesRes.rows) {
                const desc = row.descripcion ? `'${row.descripcion.replace(/'/g, "''")}'` : 'NULL';
                sqlScript += `INSERT INTO p_Roles (idRol, nombre, descripcion) VALUES (${row.idRol}, '${row.nombre.replace(/'/g, "''")}', ${desc});\n`;
            }
            sqlScript += 'SET IDENTITY_INSERT p_Roles OFF;\nGO\n\n';
        }

        // 2. MIGRAR USUARIOS
        console.log('Obteniendo usuarios...');
        const usersRes = await client.query('SELECT * FROM "p_Usuarios"');
        if (usersRes.rows.length > 0) {
            sqlScript += "PRINT 'Insertando Usuarios...';\n";
            sqlScript += 'SET IDENTITY_INSERT p_Usuarios ON;\n';
            for (const row of usersRes.rows) {
                const keys = Object.keys(row).filter(k => k !== 'updatedAt'); // Filtrar columnas que no existan en SQL Server si es necesario
                const cols = keys.join(', ');
                const vals = keys.map(k => {
                    const v = row[k];
                    if (v === null) return 'NULL';
                    if (typeof v === 'boolean') return v ? 1 : 0;
                    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                    return v;
                }).join(', ');

                sqlScript += `INSERT INTO p_Usuarios (${cols}) VALUES (${vals});\n`;
            }
            sqlScript += 'SET IDENTITY_INSERT p_Usuarios OFF;\nGO\n\n';
        }

        // 3. MIGRAR CREDENCIALES
        console.log('Obteniendo credenciales...');
        const credsRes = await client.query('SELECT * FROM "p_UsuariosCredenciales"');
        if (credsRes.rows.length > 0) {
            sqlScript += "PRINT 'Insertando Credenciales...';\n";
            sqlScript += 'SET IDENTITY_INSERT p_UsuariosCredenciales ON;\n';
            for (const row of credsRes.rows) {
                const pass = row.passwordHash ? `'${row.passwordHash}'` : 'NULL';
                const ultimo = row.ultimoLogin ? `'${new Date(row.ultimoLogin).toISOString().slice(0, 19).replace('T', ' ')}'` : 'GETDATE()';
                sqlScript += `INSERT INTO p_UsuariosCredenciales (id, idUsuario, passwordHash, ultimoCambio) VALUES (${row.idCredencial || row.id}, ${row.idUsuario}, ${pass}, ${ultimo});\n`;
            }
            sqlScript += 'SET IDENTITY_INSERT p_UsuariosCredenciales OFF;\nGO\n\n';
        }

        // 4. MIGRAR PROYECTOS
        console.log('Obteniendo proyectos...');
        const proyRes = await client.query('SELECT * FROM "p_Proyectos"');
        if (proyRes.rows.length > 0) {
            sqlScript += "PRINT 'Insertando Proyectos...';\n";
            sqlScript += 'SET IDENTITY_INSERT p_Proyectos ON;\n';
            for (const row of proyRes.rows) {
                const keys = Object.keys(row);
                const cols = keys.join(', ');
                const vals = keys.map(k => {
                    const v = row[k];
                    if (v === null) return 'NULL';
                    if (typeof v === 'boolean') return v ? 1 : 0;
                    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                    return v;
                }).join(', ');
                sqlScript += `INSERT INTO p_Proyectos (${cols}) VALUES (${vals});\n`;
            }
            sqlScript += 'SET IDENTITY_INSERT p_Proyectos OFF;\nGO\n\n';
        }

        // 5. MIGRAR TAREAS
        console.log('Obteniendo tareas...');
        const tareasRes = await client.query('SELECT * FROM "p_Tareas"');
        if (tareasRes.rows.length > 0) {
            sqlScript += "PRINT 'Insertando Tareas...';\n";
            sqlScript += 'SET IDENTITY_INSERT p_Tareas ON;\n';
            for (const row of tareasRes.rows) {
                const keys = Object.keys(row);
                const cols = keys.join(', ');
                const vals = keys.map(k => {
                    const v = row[k];
                    if (v === null) return 'NULL';
                    if (typeof v === 'boolean') return v ? 1 : 0;
                    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                    return v;
                }).join(', ');
                sqlScript += `INSERT INTO p_Tareas (${cols}) VALUES (${vals});\n`;
            }
            sqlScript += 'SET IDENTITY_INSERT p_Tareas OFF;\nGO\n\n';
        }

        // 6. MIGRAR ASIGNADOS
        console.log('Obteniendo asignados...');
        const asigRes = await client.query('SELECT * FROM "p_TareaAsignados"');
        if (asigRes.rows.length > 0) {
            sqlScript += "PRINT 'Insertando TareaAsignados...';\n";
            sqlScript += 'SET IDENTITY_INSERT p_TareaAsignados ON;\n';
            for (const row of asigRes.rows) {
                const keys = Object.keys(row);
                const cols = keys.join(', ');
                const vals = keys.map(k => {
                    const v = row[k];
                    if (v === null) return 'NULL';
                    if (typeof v === 'boolean') return v ? 1 : 0;
                    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                    return v;
                }).join(', ');
                sqlScript += `INSERT INTO p_TareaAsignados (${cols}) VALUES (${vals});\n`;
            }
            sqlScript += 'SET IDENTITY_INSERT p_TareaAsignados OFF;\nGO\n\n';
        }

        // 7. MIGRAR PERMISOS EMPLEADO
        console.log('Obteniendo permisos empleado...');
        const permRes = await client.query('SELECT * FROM "p_permiso_empleado"');
        if (permRes.rows.length > 0) {
            sqlScript += "PRINT 'Insertando PermisoEmpleado...';\n";
            sqlScript += 'SET IDENTITY_INSERT p_permiso_empleado ON;\n';
            for (const row of permRes.rows) {
                const keys = Object.keys(row).filter(k => k !== 'creadoEn'); // creadoSql ya tiene default
                const cols = keys.map(k => {
                    if (k === 'carnetOtorga') return 'carnet_otorga';
                    if (k === 'carnetRecibe') return 'carnet_recibe';
                    if (k === 'carnetObjetivo') return 'carnet_objetivo';
                    if (k === 'fechaInicio') return 'fecha_inicio';
                    if (k === 'fechaFin') return 'fecha_fin';
                    if (k === 'tipoAcceso') return 'tipo_acceso';
                    if (k === 'creadoEn') return 'creado_en';
                    return k;
                }).join(', ');
                const vals = keys.map(k => {
                    const v = row[k];
                    if (v === null) return 'NULL';
                    if (typeof v === 'boolean') return v ? 1 : 0;
                    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                    return v;
                }).join(', ');
                sqlScript += `INSERT INTO p_permiso_empleado (${cols}) VALUES (${vals});\n`;
            }
            sqlScript += 'SET IDENTITY_INSERT p_permiso_empleado OFF;\nGO\n\n';
        }

        // 8. MIGRAR CHECKINS
        console.log('Obteniendo checkins...');
        const checkRes = await client.query('SELECT * FROM "p_Checkins"');
        if (checkRes.rows.length > 0) {
            sqlScript += "PRINT 'Insertando Checkins...';\n";
            sqlScript += 'SET IDENTITY_INSERT p_Checkins ON;\n';
            for (const row of checkRes.rows) {
                const keys = Object.keys(row);
                const cols = keys.join(', ');
                const vals = keys.map(k => {
                    const v = row[k];
                    if (v === null) return 'NULL';
                    if (typeof v === 'boolean') return v ? 1 : 0;
                    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                    return v;
                }).join(', ');
                sqlScript += `INSERT INTO p_Checkins (${cols}) VALUES (${vals});\n`;
            }
            sqlScript += 'SET IDENTITY_INSERT p_Checkins OFF;\nGO\n\n';
        }

        fs.writeFileSync('./sql/migrate_data.sql', sqlScript);
        console.log('✅ Script de migración generado en ./sql/migrate_data.sql');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
