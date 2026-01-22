
import { DataSource } from "typeorm";
import * as bcrypt from 'bcrypt';
import { Usuario } from "../auth/entities/usuario.entity";
import { UsuarioCredenciales } from "../auth/entities/usuario-credenciales.entity";
import { OrganizacionNodo } from "../auth/entities/organizacion-nodo.entity";
import { Rol } from "../auth/entities/rol.entity";
import { UsuarioOrganizacion } from "../auth/entities/usuario-organizacion.entity";

// Minimal config to connect - assuming Supabase as per previous debug session
const AppDataSource = new DataSource({
    type: "postgres",
    host: "aws-0-us-west-2.pooler.supabase.com",
    port: 6543,
    username: "postgres.ddmeodlpdxgmadduwdas",
    password: "92li!ra$Gu2",
    database: "postgres",
    entities: [Usuario, UsuarioCredenciales, OrganizacionNodo, Rol, UsuarioOrganizacion],
    synchronize: false,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected.");

        const userRepo = AppDataSource.getRepository(Usuario);
        const credsRepo = AppDataSource.getRepository(UsuarioCredenciales);

        const users = await userRepo.find();
        console.log(`Found ${users.length} users. Resetting passwords to '123456'...`);

        const defaultHash = await bcrypt.hash("123456", 10);
        let updatedCount = 0;
        let createdCount = 0;

        for (const user of users) {
            let creds = await credsRepo.findOne({ where: { idUsuario: user.idUsuario } });

            if (creds) {
                creds.passwordHash = defaultHash;
                await credsRepo.save(creds);
                updatedCount++;
            } else {
                await credsRepo.save({
                    idUsuario: user.idUsuario,
                    passwordHash: defaultHash
                });
                createdCount++;
            }
        }

        console.log(`Summary:`);
        console.log(`- Updated: ${updatedCount}`);
        console.log(`- Created: ${createdCount}`);
        console.log(`All passwords reset to '123456'.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
