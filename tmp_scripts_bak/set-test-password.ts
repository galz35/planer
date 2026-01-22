import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Usuario, UsuarioCredenciales, Rol, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance, UsuarioConfig, Nota, LogSistema, AuditLog, SolicitudCambio } from '../entities';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    entities: [
        Usuario, UsuarioCredenciales, Rol, OrganizacionNodo, UsuarioOrganizacion,
        Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance,
        UsuarioConfig, Nota, LogSistema, AuditLog, SolicitudCambio
    ],
});

const TARGET_USERS = [
    'ERVIN DANILO MARTINEZ CHAVARRIA', // Empleado
    'CANDIDA SANCHEZ'                  // Gerente
];

const DEFAULT_PASSWORD = 'password123';

async function run() {
    try {
        await AppDataSource.initialize();
        console.log('✅ BD Conectada');

        const userRepo = AppDataSource.getRepository(Usuario);
        const credRepo = AppDataSource.getRepository(UsuarioCredenciales);

        for (const nombre of TARGET_USERS) {
            // Busqueda aproximada por nombre (case insensitive si fuera necesario, pero usaremos exacto o like)
            const user = await userRepo.createQueryBuilder('u')
                .where('UPPER(u.nombre) LIKE :nombre', { nombre: `%${nombre.toUpperCase()}%` })
                .getOne();

            if (!user) {
                console.warn(`⚠️ Usuario no encontrado: ${nombre}`);
                continue;
            }

            console.log(`🔑 Estableciendo contraseña para: ${user.nombre} (${user.correo})`);

            // Generar Hash
            const salt = await bcrypt.genSalt();
            const hash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

            // Buscar o crear credenciales
            let cred = await credRepo.findOneBy({ idUsuario: user.idUsuario });
            if (!cred) {
                cred = credRepo.create({ idUsuario: user.idUsuario });
            }

            cred.passwordHash = hash;
            cred.ultimoLogin = new Date();
            // Eliminamos 'ultimoCambio' ya que no existe en la entidad según el error reportado

            await credRepo.save(cred);
            console.log(`   ✅ Contraseña actualizada a: "${DEFAULT_PASSWORD}"`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
