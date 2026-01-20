
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Usuario, OrganizacionNodo, UsuarioOrganizacion } from '../entities';

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
    entities: [Usuario, OrganizacionNodo, UsuarioOrganizacion],
    synchronize: false,
    logging: false
});

async function fixOrg() {
    try {
        await AppDataSource.initialize();
        console.log('--- 🛠️ REPARANDO ORGANIGRAMA RRHH (ASIGNANDO ROLES) ---');

        const uRepo = AppDataSource.getRepository(Usuario);
        const nRepo = AppDataSource.getRepository(OrganizacionNodo);
        const uoRepo = AppDataSource.getRepository(UsuarioOrganizacion);

        // Helper para buscar ID
        const getUser = async (email: string) => uRepo.findOneBy({ correo: email });
        const getNode = async (name: string) => nRepo.findOneBy({ nombre: name });

        // Helper para asignar
        const assign = async (userEmail: string, nodeName: string, rol: 'Lider' | 'Gerente' | 'Director' | 'Miembro' | 'Invitado') => {
            const u = await getUser(userEmail);
            const n = await getNode(nodeName);

            if (!u) { console.warn(`⚠️ Usuario no encontrado: ${userEmail}`); return; }
            if (!n) { console.warn(`⚠️ Nodo no encontrado: ${nodeName}`); return; }

            // Check if exists
            const exists = await uoRepo.findOneBy({ idUsuario: u.idUsuario, idNodo: n.idNodo });
            if (exists) {
                console.log(`ℹ️ ${u.nombre} ya está en ${n.nombre}`);
            } else {
                await uoRepo.save({
                    idUsuario: u.idUsuario,
                    idNodo: n.idNodo,
                    rol: rol,
                    fechaInicio: new Date()
                });
                console.log(`✅ Asignado: ${u.nombre} -> ${n.nombre} (${rol})`);
            }
        };

        // --- ASIGNACIONES ---
        // Cúpula
        await assign('gerente@rrhh.demo', 'Gerencia RRHH', 'Director'); // Director para que vea todo

        // Subgerentes (Lideres de sus áreas)
        await assign('mariana@rrhh.demo', 'Subgerencia Compensación', 'Lider');
        await assign('roberto@rrhh.demo', 'Subgerencia RRHH (Ops)', 'Lider');
        await assign('elena@rrhh.demo', 'Subgerencia Relaciones Laborales', 'Lider');
        await assign('sofia@rrhh.demo', 'Subgerencia Formación y Bienestar', 'Lider');

        // Equipos Específicos (Lideres o miembros clave)
        // Reclutamiento está bajo Gerencia directa en seed.ts? Check seed.ts logic.
        // Line 43: sgReclutamiento = ... idPadre: gerenciaRRHH
        await assign('pablo@rrhh.demo', 'Área de Reclutamiento', 'Lider');

        // Dentro de Ops
        await assign('juan@rrhh.demo', 'Transporte y Logística', 'Lider');
        await assign('lucia@rrhh.demo', 'Nómina Operativa', 'Lider');

        // Dentro de Rel Lab
        await assign('medico@rrhh.demo', 'Servicio Médico', 'Lider');
        await assign('carlos@rrhh.demo', 'Higiene y Seguridad', 'Lider');

        // Dentro de Capacitación
        await assign('ana@rrhh.demo', 'Bienestar Social', 'Lider');

        console.log('\n✨ Reparación completada.');

    } catch (e) {
        console.error('Error fixing org:', e);
    } finally {
        await AppDataSource.destroy();
    }
}

fixOrg();
