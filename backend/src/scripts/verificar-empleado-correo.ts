/**
 * Script para verificar si un correo existe en la tabla de empleados (p_empleados)
 * Ejecutar: npx ts-node -r tsconfig-paths/register src/scripts/verificar-empleado-correo.ts
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function main() {
    const correo = 'gustavo.lira@claro.com.ni';

    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'clarity',
    });

    await ds.initialize();
    console.log('✅ Conectado a la base de datos\n');

    // 1. Buscar en tabla de usuarios (p_usuarios)
    console.log('='.repeat(60));
    console.log('📋 BUSCANDO EN TABLA p_usuarios (login)...');
    console.log('='.repeat(60));
    const usuario = await ds.query(`
        SELECT "idUsuario", nombre, correo, activo, "rolGlobal"
        FROM public."p_Usuarios" 
        WHERE LOWER(correo) = LOWER($1)
    `, [correo]);

    if (usuario.length > 0) {
        console.log('✅ ENCONTRADO en p_Usuarios:');
        console.table(usuario);
    } else {
        console.log('❌ NO encontrado en p_Usuarios');
    }

    // 2. Buscar en tabla de empleados (p_empleados)
    console.log('\n' + '='.repeat(60));
    console.log('📋 BUSCANDO EN TABLA p_empleados (RH)...');
    console.log('='.repeat(60));
    const empleado = await ds.query(`
        SELECT carnet, nombre_completo, correo, cargo, departamento, activo
        FROM public.p_empleados 
        WHERE LOWER(correo) = LOWER($1)
    `, [correo]);

    if (empleado.length > 0) {
        console.log('✅ ENCONTRADO en p_empleados:');
        console.table(empleado);
    } else {
        console.log('❌ NO encontrado en p_empleados');

        // Buscar por nombre similar
        console.log('\n🔍 Buscando empleados con nombre similar "GUSTAVO LIRA"...');
        const similares = await ds.query(`
            SELECT carnet, nombre_completo, correo, cargo, activo
            FROM public.p_empleados 
            WHERE LOWER(nombre_completo) LIKE LOWER('%gustavo%lira%')
               OR LOWER(nombre_completo) LIKE LOWER('%lira%gustavo%')
            LIMIT 5
        `);

        if (similares.length > 0) {
            console.log('✅ Empleados con nombre similar:');
            console.table(similares);
        } else {
            console.log('❌ No se encontraron empleados con nombre similar');
        }
    }

    // 3. Verificar cantidad total de empleados
    console.log('\n' + '='.repeat(60));
    console.log('📊 ESTADÍSTICAS GENERALES');
    console.log('='.repeat(60));
    const stats = await ds.query(`
        SELECT 
            (SELECT COUNT(*) FROM public."p_Usuarios") as total_usuarios,
            (SELECT COUNT(*) FROM public.p_empleados) as total_empleados,
            (SELECT COUNT(*) FROM public.p_empleados WHERE correo IS NOT NULL) as empleados_con_correo
    `);
    console.table(stats);

    await ds.destroy();
    console.log('\n✅ Script completado.');
}

main().catch(console.error);
