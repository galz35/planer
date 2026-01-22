
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();

    console.log('🔄 Iniciando sincronización de Usuarios a Empleados...');

    // Buscar usuarios que no están en la tabla de empleados
    const missingUsers = await ds.query(`
        SELECT u."idUsuario", u.nombre, u.correo, u.carnet, u.pais, u.activo
        FROM "p_Usuarios" u
        LEFT JOIN p_empleados e ON LOWER(u.correo) = LOWER(e.correo)
        WHERE e.carnet IS NULL
    `);

    console.log(`Encontrados ${missingUsers.length} usuarios sin ficha de empleado.`);

    for (const user of missingUsers) {
        const carnet = user.carnet || `USR-${user.idUsuario}`;
        const email = user.correo.toLowerCase();

        console.log(`Sincronizando: ${user.nombre} (${email}) -> Carnet: ${carnet}`);

        await ds.query(`
            INSERT INTO p_empleados (
                carnet, nombre_completo, correo, pais, activo, 
                cargo, departamento, fuente, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, 
                'Usuario del Sistema', 'Sin Clasificar (Sync Automática)', 'SYNC_USUARIO', NOW(), NOW()
            )
            ON CONFLICT (carnet) DO UPDATE SET
                correo = EXCLUDED.correo,
                nombre_completo = EXCLUDED.nombre_completo,
                activo = EXCLUDED.activo
        `, [carnet, user.nombre, email, user.pais || 'NI', user.activo]);
    }

    console.log('✅ Sincronización completada.');
    await ds.destroy();
}

main().catch(console.error);
