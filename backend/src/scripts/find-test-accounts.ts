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

async function findTestAccounts() {
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
        // 1. Admin
        const admin = await ds.getRepository(Usuario).findOne({ where: { rolGlobal: 'Admin' } });

        // 2. Jefe (Lider de algún nodo con hijos)
        const jefeRel = await ds.getRepository(UsuarioOrganizacion).findOne({
            where: { rol: 'Lider' },
            relations: ['usuario', 'nodo'],
        });

        // 3. Usuario (Colaborador)
        const userRel = await ds.getRepository(UsuarioOrganizacion).findOne({
            where: { rol: 'Colaborador' },
            relations: ['usuario', 'nodo'],
        });

        console.log('--- CUENTAS PARA PRUEBAS (Password: 123456) ---');

        if (admin) {
            console.log(`\n👑 ADMINISTRADOR:`);
            console.log(`Email: ${admin.correo}`);
            console.log(`Nombre: ${admin.nombre}`);
        }

        if (jefeRel) {
            console.log(`\n👔 JEFE (Líder):`);
            console.log(`Email: ${jefeRel.usuario.correo}`);
            console.log(`Nombre: ${jefeRel.usuario.nombre}`);
            console.log(`Nodo: ${jefeRel.nodo.nombre}`);
        }

        if (userRel) {
            console.log(`\n👷 USUARIO (Colaborador):`);
            console.log(`Email: ${userRel.usuario.correo}`);
            console.log(`Nombre: ${userRel.usuario.nombre}`);
            console.log(`Nodo: ${userRel.nodo.nombre}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

findTestAccounts();
