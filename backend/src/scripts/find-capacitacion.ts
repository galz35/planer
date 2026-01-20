/**
 * Script para buscar nodos de capacitación en RRHH
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
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
    console.log('Conectado\n');

    // Buscar nodos de capacitación
    const capacitacion = await ds.query(`
        SELECT "idNodo", tipo, nombre 
        FROM "p_OrganizacionNodos" 
        WHERE activo = true 
        AND (LOWER(nombre) LIKE '%capacitac%' OR LOWER(nombre) LIKE '%entrenamiento%' OR LOWER(nombre) LIKE '%formacion%')
    `);
    console.log('Nodos de Capacitación:', JSON.stringify(capacitacion, null, 2));

    // Buscar todos los nodos hijos de RRHH (idNodo 163)
    const rrhhHijos = await ds.query(`
        WITH RECURSIVE tree AS (
            SELECT "idNodo", "idPadre", tipo, nombre FROM "p_OrganizacionNodos" WHERE "idNodo" = 163
            UNION ALL
            SELECT n."idNodo", n."idPadre", n.tipo, n.nombre
            FROM "p_OrganizacionNodos" n
            JOIN tree t ON n."idPadre" = t."idNodo"
        )
        SELECT * FROM tree ORDER BY tipo, nombre
    `);
    console.log('\nTodos los nodos de RRHH:', JSON.stringify(rrhhHijos, null, 2));

    await ds.destroy();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
