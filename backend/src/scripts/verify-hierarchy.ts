import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Usuario, OrganizacionNodo, UsuarioOrganizacion } from '../entities';

async function verifyHierarchy() {
    let app;
    try {
        app = await NestFactory.createApplicationContext(AppModule, { logger: false });
        const AppDataSource = app.get(DataSource);
        console.log("✅ DB Connected (Via NestJS)");

        const userRepo = AppDataSource.getRepository(Usuario);

        // 1. List all Users to confirm creation
        const users = await userRepo.find({ order: { idUsuario: 'ASC' } });
        console.log("\n👥 USUARIOS CREADOS:");
        console.table(users.map(u => ({ id: u.idUsuario, nombre: u.nombre, correo: u.correo })));

        // 2. Verify Franklin's View (Deep Recursive Check)
        const franklin = await userRepo.findOne({ where: { nombre: 'Franklin' } });
        if (!franklin) throw new Error("Franklin not found!");

        console.log(`\n🔍 VERIFICANDO VISIBILIDAD DE: ${franklin.nombre} (${franklin.correo})`);

        // Simulate getSubtreeUserIds logic from ClarityService
        // Find nodes where Franklin is leader
        const franklinRoles = await AppDataSource.getRepository(UsuarioOrganizacion).find({
            where: { idUsuario: franklin.idUsuario }
        });
        const rootNodeIds = franklinRoles.map(r => r.idNodo);

        console.log(`Nodes managed by Franklin: ${rootNodeIds.join(', ')}`);

        // Recursive Query
        const rawNodes = await AppDataSource.query(`
            WITH RECURSIVE Subtree AS (
                SELECT "idNodo", "nombre" FROM "p_OrganizacionNodos" WHERE "idNodo" = ANY($1)
                UNION ALL
                SELECT n."idNodo", n."nombre" FROM "p_OrganizacionNodos" n
                INNER JOIN Subtree s ON n."idPadre" = s."idNodo"
            )
            SELECT * FROM Subtree
        `, [rootNodeIds]);

        console.log("\n🌳 ÁRBOL DE JERARQUÍA DETECTADO:");
        console.table(rawNodes);

        const allNodeIds = rawNodes.map((r: any) => r.idNodo);

        // Let's us raw query to see who is inside this tree
        const usersInTree = await AppDataSource.query(`
            SELECT u.nombre, u.correo, n.nombre as equipo, uo.rol 
            FROM "p_UsuariosOrganizacion" uo
            JOIN "p_Usuarios" u ON u."idUsuario" = uo."idUsuario"
            JOIN "p_OrganizacionNodos" n ON n."idNodo" = uo."idNodo"
            WHERE uo."idNodo" = ANY($1)
        `, [allNodeIds]);

        console.log("\n👀 FRANKLIN PUEDE VER A (EQUIPO EXTENDIDO):");
        console.table(usersInTree);

        // Check if Gustavo is in list
        const gustavoVisible = usersInTree.some((u: any) => u.nombre === 'Gustavo Lira');
        console.log(`\n✅ ¿Gustavo Lira es visible para Franklin? ${gustavoVisible ? 'SÍ' : 'NO'}`);

        await app.close();

    } catch (err) {
        console.error("Error verification:", err);
        if (app) await app.close();
        process.exit(1);
    }
}

verifyHierarchy();
