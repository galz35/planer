/**
 * Script para listar empleados actuales y agregar a Gustavo Lira
 * Ejecutar: npx ts-node -r tsconfig-paths/register src/scripts/listar-agregar-empleado.ts
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function main() {
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

    // 1. Listar empleados actuales
    console.log('📋 EMPLEADOS ACTUALES EN p_empleados:');
    console.log('='.repeat(60));
    const empleados = await ds.query(`
        SELECT carnet, nombre_completo, correo, cargo, departamento
        FROM public.p_empleados 
        ORDER BY nombre_completo
    `);
    console.table(empleados);

    // 2. Verificar si Gustavo ya existe
    const existe = empleados.find((e: any) =>
        e.correo?.toLowerCase() === 'gustavo.lira@claro.com.ni' ||
        e.nombre_completo?.toLowerCase().includes('gustavo')
    );

    if (existe) {
        console.log('\n✅ Gustavo ya existe en p_empleados');
    } else {
        console.log('\n⚠️ Gustavo Lira NO existe en p_empleados. Agregando...');

        // Insertar empleado
        await ds.query(`
            INSERT INTO public.p_empleados (
                carnet, 
                nombre_completo, 
                correo, 
                cargo, 
                departamento, 
                area,
                gerencia,
                direccion,
                empresa,
                pais,
                activo,
                tipo_empleado,
                fuente
            ) VALUES (
                'EMP899',
                'GUSTAVO ADOLFO LIRA SALAZAR',
                'gustavo.lira@claro.com.ni',
                'Administrador de Sistemas',
                'Tecnología de Información',
                'Desarrollo',
                'Gerencia TI',
                'Dirección de Tecnología',
                'Claro Nicaragua',
                'NI',
                true,
                'FIJO',
                'MANUAL'
            )
            ON CONFLICT (carnet) DO UPDATE SET
                correo = EXCLUDED.correo,
                nombre_completo = EXCLUDED.nombre_completo
        `);

        console.log('✅ Empleado insertado correctamente!');

        // Verificar inserción
        console.log('\n📋 EMPLEADOS ACTUALIZADOS:');
        const empleadosActualizados = await ds.query(`
            SELECT carnet, nombre_completo, correo, cargo
            FROM public.p_empleados 
            ORDER BY nombre_completo
        `);
        console.table(empleadosActualizados);
    }

    await ds.destroy();
    console.log('\n✅ Script completado.');
}

main().catch(console.error);
