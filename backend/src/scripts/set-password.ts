import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import {
    Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion,
    Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance,
    UsuarioConfig, Nota, LogSistema, AuditLog
} from '../entities';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: sslConfig,
    entities: [
        Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion,
        Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance,
        UsuarioConfig, Nota, LogSistema, AuditLog
    ],
    synchronize: false,
    logging: false
});

const usersToReset = [
    { email: 'gerente@rrhh.demo', pass: '123456' },
    { email: 'mariana@rrhh.demo', pass: '123456' },
    { email: 'roberto@rrhh.demo', pass: '123456' },
    { email: 'elena@rrhh.demo', pass: '123456' },
    { email: 'sofia@rrhh.demo', pass: '123456' },
    { email: 'pablo@rrhh.demo', pass: '123456' },
    { email: 'gustavo@claro.com.ni', pass: 'password123' },
    { email: 'franklin@claro.com.ni', pass: 'password123' }
];

async function run() {
    try {
        await AppDataSource.initialize();
        console.log('DB Connected');

        for (const u of usersToReset) {
            await setPasswordInside(u.email, u.pass);
        }

    } catch (e) { console.error(e); }
    finally { await AppDataSource.destroy(); }
}

async function setPasswordInside(email: string, pass: string) {
    const uRepo = AppDataSource.getRepository(Usuario);
    const cRepo = AppDataSource.getRepository(UsuarioCredenciales);

    const user = await uRepo.findOneBy({ correo: email });
    if (!user) {
        console.log(`Skipping ${email} - Not Found`);
        return;
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pass, salt);

    let creds = await cRepo.findOneBy({ idUsuario: user.idUsuario });
    if (!creds) {
        creds = cRepo.create({ idUsuario: user.idUsuario });
    }
    creds.passwordHash = hash;
    creds.ultimoLogin = new Date();
    await cRepo.save(creds);
    console.log(`Password SET for ${email}`);
}

run();
