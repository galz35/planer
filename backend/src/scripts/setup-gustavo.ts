/**
 * Script para configurar cuenta de Gustavo Lira con rol Admin y contraseña 123456
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
dotenv.config();

import { DataSource } from 'typeorm';

const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    await ds.initialize();
    console.log('🔌 Conectado a la base de datos\n');

    const USUARIO_ID = 899; // Gustavo Adolfo Lira Salazar
    const CORREO = 'gustavo.lira@claro.com.ni';
    const PASSWORD = '123456';

    // 1. Asignar rol Admin (idRol = 1)
    console.log('👔 Asignando rol Admin...');
    await ds.query(`UPDATE "p_Usuarios" SET "idRol" = 1 WHERE "idUsuario" = $1`, [USUARIO_ID]);
    console.log('   ✅ Rol Admin asignado');

    // 2. Crear/actualizar credenciales con password 123456
    console.log('🔐 Configurando contraseña...');
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    // Verificar si ya existen credenciales
    const existingCred = await ds.query(
        `SELECT "idCredencial" FROM "p_UsuariosCredenciales" WHERE "idUsuario" = $1`,
        [USUARIO_ID]
    );

    if (existingCred.length > 0) {
        await ds.query(
            `UPDATE "p_UsuariosCredenciales" SET "passwordHash" = $1 WHERE "idUsuario" = $2`,
            [hashedPassword, USUARIO_ID]
        );
        console.log('   ✅ Contraseña actualizada');
    } else {
        await ds.query(
            `INSERT INTO "p_UsuariosCredenciales" ("idUsuario", "passwordHash") VALUES ($1, $2)`,
            [USUARIO_ID, hashedPassword]
        );
        console.log('   ✅ Credenciales creadas');
    }

    // 3. Verificar configuración final
    const user = await ds.query(`
        SELECT u."idUsuario", u.nombre, u.correo, u.activo, r.nombre as rol
        FROM "p_Usuarios" u 
        LEFT JOIN "p_Roles" r ON u."idRol" = r."idRol" 
        WHERE u."idUsuario" = $1
    `, [USUARIO_ID]);

    console.log('\n✅ CUENTA CONFIGURADA:');
    console.log('=====================================');
    console.log(`   Nombre: ${user[0].nombre}`);
    console.log(`   Correo: ${user[0].correo}`);
    console.log(`   Rol: ${user[0].rol}`);
    console.log(`   Contraseña: ${PASSWORD}`);
    console.log('=====================================');

    await ds.destroy();
}

main().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
