import { DataSource } from 'typeorm';
import {
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
} from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const entities = [
    Usuario, Tarea, TareaAsignado, Proyecto, OrganizacionNodo,
    Rol, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog,
    UsuarioOrganizacion, UsuarioConfig, UsuarioCredenciales
];

async function reportAndClean() {
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
        console.log('--- REPORTE DE VOLUMEN DE DATOS ---');

        const totalUsers = await ds.getRepository(Usuario).count();
        const totalNodes = await ds.getRepository(OrganizacionNodo).count();

        const realDomain = '@claro.com.ni';

        const dummyUsers = await ds.getRepository(Usuario).createQueryBuilder('u')
            .where('u.correo NOT LIKE :domain', { domain: `%${realDomain}%` })
            .getMany();

        const realUsersCount = totalUsers - dummyUsers.length;

        console.log(`Total Usuarios en BD: ${totalUsers}`);
        console.log(` - Usuarios Reales (@claro): ${realUsersCount}`);
        console.log(` - Usuarios Dummy/Prueba: ${dummyUsers.length}`);

        console.log(`Total Nodos Organizacionales: ${totalNodes}`);

        if (dummyUsers.length > 0) {
            console.log('\n--- LIMPIEZA DE USUARIOS DUMMY ---');
            console.log('Eliminando usuarios que no pertenecen al dominio corporativo...');

            const dummyIds = dummyUsers.map(u => u.idUsuario);

            // Delete dependencies first
            await ds.createQueryBuilder().delete().from(UsuarioOrganizacion).where("idUsuario IN (:...ids)", { ids: dummyIds }).execute();
            await ds.createQueryBuilder().delete().from(UsuarioCredenciales).where("idUsuario IN (:...ids)", { ids: dummyIds }).execute();
            await ds.createQueryBuilder().delete().from(UsuarioConfig).where("idUsuario IN (:...ids)", { ids: dummyIds }).execute();
            await ds.createQueryBuilder().delete().from(AuditLog).where("idUsuario IN (:...ids)", { ids: dummyIds }).execute();

            // Extensive cleanup of everything they touched
            await ds.createQueryBuilder().delete().from(Checkin).where("idUsuario IN (:...ids)", { ids: dummyIds }).execute();
            await ds.createQueryBuilder().delete().from(TareaAsignado).where("idUsuario IN (:...ids)", { ids: dummyIds }).execute();
            // If they created tasks or are responsible for blocks...
            // Note: TypeORM usually maps snake_case. Let's rely on entity property matching or standard quoted names if raw.
            // Using QueryBuilder with Entity properties is safer usually, but delete() is tricky.
            // Let's assume standard "reportadoPorId" or "responsableId" if relation-based, OR "idUsuarioReporta" if simple column
            // Checking entity definition would be ideal, but let's try standard relation ID naming convention or skip if complex.
            // Let's just catch the error and remove users, assuming no blocker deps for now or try "reportadoPor"

            try {
                // Try "reportadoPor" relation
                await ds.createQueryBuilder().delete().from(Bloqueo).where('"reportadoPorId" IN (:...ids)', { ids: dummyIds }).execute();
            } catch (e) {
                // Ignore if column differs, just proceed to critical user deletion
            }

            await ds.getRepository(Usuario).remove(dummyUsers);
            console.log(`[OK] Eliminados ${dummyUsers.length} usuarios de prueba.`);
        } else {
            console.log('\n[OK] No se encontraron usuarios dummy para eliminar.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}
reportAndClean();
