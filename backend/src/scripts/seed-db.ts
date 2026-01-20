import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedDb() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });

    try {
        await client.connect();

        const password = 'password123';
        const hash = await bcrypt.hash(password, 10);

        console.log('🧹 Cleaning database...');
        await client.query(`
            TRUNCATE TABLE "p_Bloqueos", "p_CheckinTareas", "p_Checkins", 
            "p_TareaAsignados", "p_Tareas", "p_Proyectos", 
            "p_UsuariosOrganizacion", "p_OrganizacionNodos", 
            "p_UsuariosCredenciales", "p_Usuarios" 
            RESTART IDENTITY CASCADE
        `);
        console.log('✅ Database cleaned.');

        console.log('🌱 Seeding specific hierarchy...');

        const createUser = async (name: string, email: string) => {
            const res = await client.query(`
                INSERT INTO "p_Usuarios" (nombre, correo, activo) 
                VALUES ($1, $2, $3) RETURNING "idUsuario"
            `, [name, email, true]);
            const uid = res.rows[0].idUsuario;
            await client.query(`
                INSERT INTO "p_UsuariosCredenciales" ("idUsuario", "passwordHash") 
                VALUES ($1, $2)
            `, [uid, hash]);
            return uid;
        };

        // 1. Create Users
        const franklinId = await createUser('Franklin', 'franklin@claro.com.ni');
        const juanCarlosId = await createUser('Juan Carlos', 'juancarlos@claro.com.ni');
        const candidaId = await createUser('Cándida Sánchez', 'candida@claro.com.ni');
        const aliId = await createUser('Ali Rodríguez', 'ali@claro.com.ni');
        const pedroId = await createUser('Pedro Castillo', 'pedro@claro.com.ni');
        const taniaId = await createUser('Tania Aguirres', 'tania@claro.com.ni');
        const gustavoId = await createUser('Gustavo Lira', 'gustavo@claro.com.ni');

        console.log('✅ Users created.');

        // 2. Create Nodes
        const nodeA = await client.query(`
            INSERT INTO "p_OrganizacionNodos" (nombre, tipo, activo)
            VALUES ('Dirección General', 'Gerencia', true) RETURNING "idNodo"
        `);
        const idNodeA = nodeA.rows[0].idNodo;

        const nodeB = await client.query(`
            INSERT INTO "p_OrganizacionNodos" (nombre, tipo, activo, "idPadre")
            VALUES ('Gerencia Operaciones', 'Gerencia', true, $1) RETURNING "idNodo"
        `, [idNodeA]);
        const idNodeB = nodeB.rows[0].idNodo;

        const nodeC = await client.query(`
            INSERT INTO "p_OrganizacionNodos" (nombre, tipo, activo, "idPadre")
            VALUES ('Equipo Desarrollo', 'Equipo', true, $1) RETURNING "idNodo"
        `, [idNodeB]);
        const idNodeC = nodeC.rows[0].idNodo;

        // 3. Assign Roles
        // Franklin -> Lider Node A
        await client.query(`INSERT INTO "p_UsuariosOrganizacion" ("idUsuario", "idNodo", "rol", "fechaInicio") VALUES ($1, $2, 'Lider', NOW())`, [franklinId, idNodeA]);

        // Juan Carlos -> Lider Node B
        await client.query(`INSERT INTO "p_UsuariosOrganizacion" ("idUsuario", "idNodo", "rol", "fechaInicio") VALUES ($1, $2, 'Lider', NOW())`, [juanCarlosId, idNodeB]);

        // Ali, Pedro, Tania -> Miembro Node B
        await client.query(`INSERT INTO "p_UsuariosOrganizacion" ("idUsuario", "idNodo", "rol", "fechaInicio") VALUES ($1, $2, 'Miembro', NOW())`, [aliId, idNodeB]);
        await client.query(`INSERT INTO "p_UsuariosOrganizacion" ("idUsuario", "idNodo", "rol", "fechaInicio") VALUES ($1, $2, 'Miembro', NOW())`, [pedroId, idNodeB]);
        await client.query(`INSERT INTO "p_UsuariosOrganizacion" ("idUsuario", "idNodo", "rol", "fechaInicio") VALUES ($1, $2, 'Miembro', NOW())`, [taniaId, idNodeB]);

        // Cándida -> Lider Node C
        await client.query(`INSERT INTO "p_UsuariosOrganizacion" ("idUsuario", "idNodo", "rol", "fechaInicio") VALUES ($1, $2, 'Lider', NOW())`, [candidaId, idNodeC]);

        // Gustavo -> Miembro Node C
        await client.query(`INSERT INTO "p_UsuariosOrganizacion" ("idUsuario", "idNodo", "rol", "fechaInicio") VALUES ($1, $2, 'Miembro', NOW())`, [gustavoId, idNodeC]);

        console.log('✅ Organization & Roles assigned.');

        // 4. Create Tasks
        const projRes = await client.query(`
            INSERT INTO "p_Proyectos" (nombre, estado, "idNodoDuenio")
            VALUES ('Migración 2025', 'Activo', $1) RETURNING "idProyecto"
        `, [idNodeC]);
        const projId = projRes.rows[0].idProyecto;

        // Tareas Gustavo
        await client.query(`INSERT INTO "p_Tareas" (titulo, estado, "idProyecto", "idCreador") VALUES ('Tarea de Gustavo 1', 'Pendiente', $1, $2) RETURNING "idTarea"`, [projId, gustavoId]);
        const t2 = await client.query(`INSERT INTO "p_Tareas" (titulo, estado, "idProyecto", "idCreador") VALUES ('Tarea de Gustavo 2', 'Pendiente', $1, $2) RETURNING "idTarea"`, [projId, gustavoId]);

        // Assign one to Gustavo
        await client.query(`INSERT INTO "p_TareaAsignados" ("idTarea", "idUsuario", "tipo") VALUES ($1, $2, 'Responsable')`, [t2.rows[0].idTarea, gustavoId]);

        console.log('✅ Tasks initialized.');
        console.log('HIERARCHY CREATED: Franklin > Juan Carlos > Cándida > Gustavo');

    } catch (err) {
        console.error('Error seeding:', err);
    } finally {
        await client.end();
    }
}

seedDb();
