import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function createCleanUser() {
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
        const email = 'nuevo@claro.com.ni';
        const name = 'Usuario Nuevo';

        console.log(`🌱 Creating test user: ${email}...`);

        // 1. Create User
        // Check if exists first because of constraints
        const existing = await client.query('SELECT "idUsuario" FROM "p_Usuarios" WHERE correo = $1', [email]);
        let uid;

        if (existing.rows.length > 0) {
            console.log('User already exists, resetting...');
            uid = existing.rows[0].idUsuario;
            // Clean up tasks/checkins for today to make it "clean"
            // Actually, let's just make a new one if possible, or clean this one.
            // Let's delete this user's checkins for today?
            // Safer to just create a 'nuevo2' if needed, but 'nuevo' is fine.
        } else {
            const res = await client.query(`
                INSERT INTO "p_Usuarios" (nombre, correo, activo) 
                VALUES ($1, $2, $3) RETURNING "idUsuario"
            `, [name, email, true]);
            uid = res.rows[0].idUsuario;

            await client.query(`
                INSERT INTO "p_UsuariosCredenciales" ("idUsuario", "passwordHash") 
                VALUES ($1, $2)
            `, [uid, hash]);
        }

        // 2. Find Candida's Node (Node C - Equipo Desarrollo)
        // We know from seed-db that Cándida is leader of Node C.
        // Or we can query the node where Candida is leader?
        // Let's hardcode getting "Equipo Desarrollo"
        const nodeRes = await client.query(`SELECT "idNodo" FROM "p_OrganizacionNodos" WHERE nombre = 'Equipo Desarrollo' LIMIT 1`);
        if (nodeRes.rows.length === 0) throw new Error("Node 'Equipo Desarrollo' not found. Run seed-db first?");
        const idNode = nodeRes.rows[0].idNodo;

        // 3. Assign to Node
        // Check if already assigned
        const roleCheck = await client.query(`SELECT * FROM "p_UsuariosOrganizacion" WHERE "idUsuario" = $1 AND "idNodo" = $2`, [uid, idNode]);
        if (roleCheck.rows.length === 0) {
            await client.query(`INSERT INTO "p_UsuariosOrganizacion" ("idUsuario", "idNodo", "rol", "fechaInicio") VALUES ($1, $2, 'Miembro', NOW())`, [uid, idNode]);
        }

        console.log(`✅ User ${email} created/ready.`);
        console.log(`   Role: Miembro of Node ${idNode} (Under Cándida)`);
        console.log(`   Password: ${password}`);

    } catch (err) {
        console.error('Error creating user:', err);
    } finally {
        await client.end();
    }
}

createCleanUser();
