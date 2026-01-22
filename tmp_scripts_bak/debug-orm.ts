import { DataSource } from 'typeorm';
import {
    Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion,
    Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance,
    UsuarioConfig, Nota, LogSistema, AuditLog, SolicitudCambio, FocoDiario
} from '../entities';
import * as dotenv from 'dotenv';
dotenv.config();

console.log("🔄 Intentando conectar a la BD...");

const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [Usuario, Rol, UsuarioCredenciales, OrganizacionNodo, UsuarioOrganizacion, Proyecto, Tarea, TareaAsignado, Checkin, CheckinTarea, Bloqueo, TareaAvance, UsuarioConfig, Nota, LogSistema, AuditLog, SolicitudCambio, FocoDiario],
    synchronize: false,
});

ds.initialize()
    .then(() => {
        console.log("✅ Conexión exitosa. Entidades cargadas:");
        ds.entityMetadatas.forEach(e => console.log(` - ${e.name} (${e.tableName})`));
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Error de conexión stack:", err);
        process.exit(1);
    });
