import { DataSource } from 'typeorm';
import {
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
} from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: join(__dirname, '../../.env') });

const entities = [
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
];

const admins = [
    'gustavo.lira@claro.com.ni',
    'candida.sanchez@claro.com.ni',
    'juan.ortuno@claro.com.ni'
];

async function run() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'clarity_db',
        entities: entities,
        synchronize: false,
    });

    await ds.initialize();

    try {
        console.log('--- CONFIGURANDO ADMINISTRADORES ---');

        const root = await ds.getRepository(OrganizacionNodo).findOne({ where: { tipo: 'Dirección' } });
        if (!root) {
            console.log('Advertencia: No se encontró nodo raíz "Dirección". Se verificará después.');
        }

        const hashedPw = await bcrypt.hash('123456', 10);

        for (const email of admins) {
            let user = await ds.getRepository(Usuario).findOneBy({ correo: email });

            // Create or Update
            if (!user) {
                console.log(`Creando usuario: ${email}`);
                user = await ds.getRepository(Usuario).save({
                    nombre: email.split('@')[0].replace('.', ' ').toUpperCase(),
                    correo: email,
                    rolGlobal: 'Admin',
                    activo: true
                });

                await ds.getRepository(UsuarioCredenciales).save({
                    idUsuario: user.idUsuario,
                    passwordHash: hashedPw
                });
            } else {
                console.log(`Actualizando usuario a Admin: ${email}`);
                user.rolGlobal = 'Admin';
                user.activo = true;
                await ds.getRepository(Usuario).save(user);

                // Reset password just in case
                await ds.getRepository(UsuarioCredenciales).update(
                    { idUsuario: user.idUsuario },
                    { passwordHash: hashedPw }
                );
            }

            // Assign to Root as Leader if Root exists
            if (root) {
                const existingRel = await ds.getRepository(UsuarioOrganizacion).findOneBy({
                    idUsuario: user.idUsuario,
                    idNodo: root.idNodo
                });

                if (!existingRel) {
                    await ds.getRepository(UsuarioOrganizacion).save({
                        idUsuario: user.idUsuario,
                        idNodo: root.idNodo,
                        rol: 'Lider', // Super boss
                        fechaInicio: new Date()
                    });
                    console.log(` - Asignado a ${root.nombre} (LIDER)`);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}
run();
