import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
    Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion,
    Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance,
    UsuarioConfig, Nota, LogSistema, AuditLog
} from '../entities';

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [
        Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion,
        Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance,
        UsuarioConfig, Nota, LogSistema, AuditLog
    ],
    synchronize: false,
    logging: false
});

async function inspect() {
    try {
        await AppDataSource.initialize();
        console.log('--- INSPECCIÓN DE BASE DE DATOS ---');

        const usuarios = await AppDataSource.getRepository(Usuario).find();
        console.log(`\n👥 USUARIOS (${usuarios.length}):`);
        usuarios.forEach(u => console.log(` - [${u.idUsuario}] ${u.nombre} (${u.correo})`));

        const nodos = await AppDataSource.getRepository(OrganizacionNodo).find();
        console.log(`\n🏢 ESTRUCTURA (${nodos.length}):`);
        nodos.forEach(n => console.log(` - [${n.idNodo}] ${n.tipo}: ${n.nombre}`));

        const proyectos = await AppDataSource.getRepository(Proyecto).find();
        console.log(`\n📁 PROYECTOS (${proyectos.length}):`);
        proyectos.forEach(p => console.log(` - [${p.idProyecto}] ${p.nombre} (Estado: ${p.estado})`));

        const tareas = await AppDataSource.getRepository(Tarea).find({ relations: ['proyecto'] });
        console.log(`\n✅ TAREAS (${tareas.length}):`);
        // Show summary by project
        const tasksByProject = tareas.reduce((acc, t) => {
            const pName = t.proyecto?.nombre || 'Sin Proyecto';
            if (!acc[pName]) acc[pName] = 0;
            acc[pName]++;
            return acc;
        }, {});
        Object.entries(tasksByProject).forEach(([p, count]) => console.log(` - ${p}: ${count} tareas`));

    } catch (e) {
        console.error(e);
    } finally {
        await AppDataSource.destroy();
    }
}

inspect();
