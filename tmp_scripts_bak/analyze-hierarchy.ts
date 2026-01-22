import { DataSource } from 'typeorm';
import { Usuario, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales, Rol, Tarea, TareaAsignado, Proyecto, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog, UsuarioConfig } from '../entities';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env') });

const entities = [
    Usuario, OrganizacionNodo, UsuarioOrganizacion, UsuarioCredenciales, Rol,
    Tarea, TareaAsignado, Proyecto, Checkin, CheckinTarea, Bloqueo, TareaAvance, AuditLog, UsuarioConfig
];

async function analyze() {
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
        console.log('--- ANÁLISIS DE JERARQUÍA IMPORTADA ---');

        const userCount = await ds.getRepository(Usuario).count();
        const nodeCount = await ds.getRepository(OrganizacionNodo).count();
        const assignCount = await ds.getRepository(UsuarioOrganizacion).count();

        console.log(`Usuarios: ${userCount}`);
        console.log(`Nodos Estructurales: ${nodeCount}`);
        console.log(`Asignaciones: ${assignCount}`);

        console.log('\n-- Nodos Principales (Gerencias) --');
        const gerencias = await ds.getRepository(OrganizacionNodo).find({
            where: { tipo: 'Gerencia' },
            take: 10
        });
        gerencias.forEach(g => console.log(` - ${g.nombre}`));

        console.log('\n-- Muestra de Líderes Asignados --');
        const lideres = await ds.getRepository(UsuarioOrganizacion).find({
            where: { rol: 'Lider' },
            relations: ['usuario', 'nodo'],
            take: 10
        });
        lideres.forEach(l => console.log(` - ${l.usuario?.nombre} -> LIDER de [${l.nodo?.nombre}]`));

        console.log('\n-- Muestra de Usuarios sin Rol Líder (Colaboradores) --');
        const colaboradores = await ds.getRepository(UsuarioOrganizacion).find({
            where: { rol: 'Colaborador' },
            relations: ['usuario', 'nodo'],
            take: 5
        });
        colaboradores.forEach(c => console.log(` - ${c.usuario?.nombre} -> Colaborador en [${c.nodo?.nombre}]`));

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}
analyze();
