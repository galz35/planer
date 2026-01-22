import { ejecutarQuery, ejecutarSP, Int, BigInt, NVarChar, sql } from '../db/base.repo';

export interface UsuarioDb {
    idUsuario: number;
    carnet: string;
    nombre: string;
    nombreCompleto: string;
    correo: string;
    cargo: string;
    departamento: string;
    orgDepartamento: string;
    orgGerencia: string;
    idOrg: number;
    jefeCarnet: string;
    jefeNombre: string;
    jefeCorreo: string;
    activo: boolean;
    gerencia: string;
    subgerencia: string;
    idRol: number;
    rolGlobal: string;
}

export interface OrganizacionNodoRhDb {
    idorg: number;
    nombre: string;
    tipo: string;
    padre: number | null;
    orden: number;
    activo: boolean;
    // Campos legacy/virtuales para compatibilidad
    descripcion?: string;
    nivel?: number;
}

export interface PermisoAreaDb {
    id: number;
    carnet_otorga: string | null;
    carnet_recibe: string;
    idorg_raiz: number;
    alcance: string;
    activo: boolean;
    motivo: string | null;
    creado_en: Date;
    fecha_fin: Date;
}

export interface PermisoEmpleadoDb {
    id: number;
    carnet_otorga: string | null;
    carnet_recibe: string;
    carnet_objetivo: string;
    tipo_acceso: string;
    motivo: string | null;
    activo: boolean;
    creado_en: Date;
}

export interface DelegacionVisibilidadDb {
    id: number;
    carnet_delegante: string;
    carnet_delegado: string;
    motivo: string | null;
    activo: boolean;
    creado_en: Date;
    fecha_inicio: Date;
    fecha_fin: Date;
}

// ==========================================
// VISIBILIDAD (CTE Recursiva -> SP)
// ==========================================

export async function calcularCarnetsVisibles(carnetSolicitante: string): Promise<string[]> {
    // Migrado a SP sp_Visibilidad_ObtenerCarnets
    const result = await ejecutarSP<{ carnet: string }>('sp_Visibilidad_ObtenerCarnets', {
        carnetSolicitante: { valor: carnetSolicitante, tipo: NVarChar }
    });
    // Ensure trimmed carnets
    return result.map(r => (r.carnet || '').trim()).filter(c => c.length > 0);
}

export async function obtenerDetallesUsuarios(carnets: string[]) {
    if (!carnets || carnets.length === 0) return [];

    // Clean input carnets
    const cleanCarnets = carnets.map(c => c.trim()).filter(c => c.length > 0);
    if (cleanCarnets.length === 0) return [];

    console.log(`[AccesoRepo] Buscando detalles para ${cleanCarnets.length} carnets:`, cleanCarnets.slice(0, 5));

    // Usar IN dinámico en lugar de STRING_SPLIT para máxima compatibilidad y evitar problemas de espacios
    // Sanitizar inputs es importante, pero aquí son carnets internos.
    const uniqueCarnets = [...new Set(cleanCarnets)];
    // Construir lista de parámetros @p0, @p1, etc.
    const params: any = {};
    const paramNames = uniqueCarnets.map((c, i) => {
        const pName = `c${i}`;
        params[pName] = { valor: c, tipo: NVarChar };
        return `@${pName}`;
    });

    const rows = await ejecutarQuery<UsuarioDb & { rolNombre?: string }>(`
        SELECT u.idUsuario, u.carnet, u.nombreCompleto, u.correo, u.cargo, u.departamento,
               u.orgDepartamento, u.orgGerencia, u.idOrg, u.jefeCarnet, u.jefeNombre, u.jefeCorreo, u.activo,
               u.gerencia, u.subgerencia, u.idRol, u.rolGlobal,
               r.nombre as rolNombre
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE LTRIM(RTRIM(u.carnet)) IN (${paramNames.join(',')})
        ORDER BY u.nombreCompleto
    `, params);

    console.log(`[AccesoRepo] Usuarios encontrados: ${rows.length}`);

    return rows.map(u => {
        const user: any = { ...u };
        if (u.idRol) {
            user.rol = { idRol: u.idRol, nombre: u.rolNombre || 'Empleado' };
        }
        return user;
    });
}

export async function obtenerCarnetDeUsuario(idUsuario: number) {
    const res = await ejecutarQuery<{ carnet: string }>(`SELECT carnet FROM p_Usuarios WHERE idUsuario = @id`, { id: { valor: idUsuario, tipo: Int } });
    return res[0]?.carnet || null;
}

// ==========================================
// DELEGACIONES
// ==========================================
export async function obtenerDelegacionesActivas(carnetDelegado: string) {
    return await ejecutarQuery<DelegacionVisibilidadDb>(`
        SELECT * FROM p_delegacion_visibilidad 
        WHERE carnet_delegado = @carnet AND activo = 1
        AND (fecha_inicio IS NULL OR fecha_inicio <= GETDATE())
        AND (fecha_fin IS NULL OR fecha_fin >= GETDATE())
    `, { carnet: { valor: carnetDelegado, tipo: NVarChar } });
}

export async function crearDelegacion(delegacion: Partial<DelegacionVisibilidadDb>) {
    await ejecutarQuery(`
        INSERT INTO p_delegacion_visibilidad (carnet_delegante, carnet_delegado, motivo, activo, creado_en)
        VALUES (@delegante, @delegado, @motivo, 1, GETDATE())
    `, {
        delegante: { valor: delegacion.carnet_delegante, tipo: NVarChar },
        delegado: { valor: delegacion.carnet_delegado, tipo: NVarChar },
        motivo: { valor: delegacion.motivo || null, tipo: NVarChar }
    });
}

// ==========================================
// PERMISOS AREA
// ==========================================
export async function obtenerPermisosAreaActivos(carnetRecibe: string) {
    return await ejecutarQuery<PermisoAreaDb>(`
        SELECT * FROM p_permiso_area
        WHERE carnet_recibe = @carnet AND activo = 1
    `, { carnet: { valor: carnetRecibe, tipo: NVarChar } });
}

export async function crearPermisoArea(permiso: Partial<PermisoAreaDb>) {
    await ejecutarQuery(`
        INSERT INTO p_permiso_area (carnet_otorga, carnet_recibe, idorg_raiz, alcance, motivo, activo, creado_en)
        VALUES (@otorga, @recibe, @idorg, @alcance, @motivo, 1, GETDATE())
    `, {
        otorga: { valor: permiso.carnet_otorga, tipo: NVarChar },
        recibe: { valor: permiso.carnet_recibe, tipo: NVarChar },
        idorg: { valor: permiso.idorg_raiz, tipo: BigInt },
        alcance: { valor: permiso.alcance || 'SUBARBOL', tipo: NVarChar },
        motivo: { valor: permiso.motivo, tipo: NVarChar }
    });
}

export async function desactivarPermisoArea(id: number) {
    await ejecutarQuery(`UPDATE p_permiso_area SET activo = 0 WHERE id = @id`, { id: { valor: id, tipo: BigInt } });
}

// ==========================================
// PERMISOS EMPLEADO
// ==========================================
export async function obtenerPermisosEmpleadoActivos(carnetRecibe: string) {
    return await ejecutarQuery<PermisoEmpleadoDb>(`
        SELECT * FROM p_permiso_empleado
        WHERE carnet_recibe = @carnet AND activo = 1
    `, { carnet: { valor: carnetRecibe, tipo: NVarChar } });
}

export async function crearPermisoEmpleado(p: Partial<PermisoEmpleadoDb>) {
    await ejecutarQuery(`
        INSERT INTO p_permiso_empleado (carnet_otorga, carnet_recibe, carnet_objetivo, tipo_acceso, motivo, activo, creado_en)
        VALUES (@otorga, @recibe, @objetivo, @tipo, @motivo, 1, GETDATE())
    `, {
        otorga: { valor: p.carnet_otorga, tipo: NVarChar },
        recibe: { valor: p.carnet_recibe, tipo: NVarChar },
        objetivo: { valor: p.carnet_objetivo, tipo: NVarChar },
        tipo: { valor: p.tipo_acceso || 'ALLOW', tipo: NVarChar },
        motivo: { valor: p.motivo, tipo: NVarChar }
    });
}

export async function desactivarPermisoEmpleado(id: number) {
    await ejecutarQuery(`UPDATE p_permiso_empleado SET activo = 0 WHERE id = @id`, { id: { valor: id, tipo: BigInt } });
}

// ==========================================
// ORGANIGRAMA RH y HELPERS DE SERVICIO
// ==========================================
export async function obtenerArbolOrganizacion() {
    // Migrado a SP sp_Organizacion_ObtenerArbol
    return await ejecutarSP<OrganizacionNodoRhDb>('sp_Organizacion_ObtenerArbol');
}

export async function buscarNodoPorId(idorg: number) {
    const res = await ejecutarQuery<OrganizacionNodoRhDb>(`
        SELECT id as idorg, nombre, tipo, idPadre as padre, orden, activo
        FROM p_OrganizacionNodos WHERE id = @id
    `, { id: { valor: idorg, tipo: BigInt } });
    return res[0] || null;
}

export async function listarTodosPermisosArea() {
    return await ejecutarQuery<PermisoAreaDb>(`SELECT * FROM p_permiso_area WHERE activo = 1 ORDER BY creado_en DESC`);
}

export async function listarTodosPermisosEmpleado() {
    return await ejecutarQuery<PermisoEmpleadoDb>(`SELECT * FROM p_permiso_empleado WHERE activo = 1 ORDER BY creado_en DESC`);
}

export async function listarTodasDelegaciones() {
    return await ejecutarQuery<DelegacionVisibilidadDb>(`SELECT * FROM p_delegacion_visibilidad WHERE activo = 1 ORDER BY creado_en DESC`);
}

export async function listarDelegacionesPorDelegante(carnetDelegante: string) {
    return await ejecutarQuery<DelegacionVisibilidadDb>(`
        SELECT * FROM p_delegacion_visibilidad 
        WHERE carnet_delegante = @carnet
        ORDER BY creado_en DESC
    `, { carnet: { valor: carnetDelegante, tipo: NVarChar } });
}

export async function buscarUsuarioPorCarnet(carnet: string) {
    const res = await ejecutarQuery<UsuarioDb>(`SELECT * FROM p_Usuarios WHERE carnet = @carnet`, { carnet: { valor: carnet.trim(), tipo: NVarChar } });
    return res[0] || null;
}

export async function buscarUsuarioPorCorreo(correo: string) {
    const res = await ejecutarQuery<UsuarioDb>(`SELECT * FROM p_Usuarios WHERE correo = @correo`, { correo: { valor: correo.trim().toLowerCase(), tipo: NVarChar } });
    return res[0] || null;
}

export async function listarEmpleadosActivos() {
    return await ejecutarQuery<UsuarioDb>(`SELECT * FROM p_Usuarios WHERE activo = 1 ORDER BY nombre ASC`);
}

export async function buscarUsuarios(termino: string, limite = 10) {
    const t = `%${termino}%`;
    return await ejecutarQuery<UsuarioDb>(`
        SELECT TOP (@limite) * FROM p_Usuarios 
        WHERE (LOWER(nombre) LIKE LOWER(@t) OR carnet LIKE @t OR LOWER(correo) LIKE LOWER(@t))
        AND activo = 1
        ORDER BY nombre ASC
    `, { t: { valor: t, tipo: NVarChar }, limite: { valor: limite, tipo: Int } });
}

export async function buscarNodosOrganizacion(termino: string) {
    const t = `%${termino}%`;
    return await ejecutarQuery<OrganizacionNodoRhDb>(`
        SELECT TOP 50 id as idorg, nombre, tipo, idPadre as padre, orden, activo 
        FROM p_OrganizacionNodos
        WHERE LOWER(nombre) LIKE LOWER(@t)
        ORDER BY nombre ASC
    `, { t: { valor: t, tipo: NVarChar } });
}

export async function contarEmpleadosPorNodo() {
    return await ejecutarQuery<{ idOrg: string, count: number }>(`
        SELECT idOrg, COUNT(*) as count 
        FROM p_Usuarios 
        WHERE activo = 1 AND idOrg IS NOT NULL 
        GROUP BY idOrg
    `);
}

export async function previewEmpleadosSubarbol(idOrgRaiz: string, limite = 50) {
    return await ejecutarQuery<UsuarioDb>(`
        WITH NodosSub AS (
            SELECT CAST(id AS NVARCHAR(50)) as idorg FROM p_OrganizacionNodos WHERE CAST(id AS NVARCHAR(50)) = @id
            UNION ALL
            SELECT CAST(n.id AS NVARCHAR(50)) FROM p_OrganizacionNodos n
            JOIN NodosSub ns ON CAST(n.idPadre AS NVARCHAR(50)) = ns.idorg
        )
        SELECT TOP (@limite) u.idUsuario, u.nombre, u.nombreCompleto, u.cargo, u.departamento, u.correo
        FROM p_Usuarios u
        JOIN NodosSub ns ON CAST(u.idOrg AS NVARCHAR(50)) = ns.idorg
        WHERE u.activo = 1
    `, { id: { valor: idOrgRaiz, tipo: NVarChar }, limite: { valor: limite, tipo: Int } });
}

export async function contarEmpleadosSubarbol(idOrgRaiz: string) {
    const res = await ejecutarQuery<{ total: number }>(`
        WITH NodosSub AS (
            SELECT CAST(id AS NVARCHAR(50)) as idorg FROM p_OrganizacionNodos WHERE CAST(id AS NVARCHAR(50)) = @id
            UNION ALL
            SELECT CAST(n.id AS NVARCHAR(50)) FROM p_OrganizacionNodos n
            JOIN NodosSub ns ON CAST(n.idPadre AS NVARCHAR(50)) = ns.idorg
        )
        SELECT COUNT(*) as total
        FROM p_Usuarios u
        JOIN NodosSub ns ON CAST(u.idOrg AS NVARCHAR(50)) = ns.idorg
        WHERE u.activo = 1
    `, { id: { valor: idOrgRaiz, tipo: NVarChar } });
    return res[0].total;
}

// ==========================================
// FUNCIONES RESTAURADAS / COMPATIBILIDAD
// ==========================================

export async function desactivarDelegacion(id: number) {
    await ejecutarQuery(`UPDATE p_delegacion_visibilidad SET activo = 0 WHERE id = @id`, { id: { valor: id, tipo: BigInt } });
}

export async function obtenerEmpleadosNodoDirecto(idOrg: string | number, limite = 50) {
    const id = typeof idOrg === 'string' ? parseInt(idOrg, 10) : idOrg;
    return await ejecutarQuery<UsuarioDb>(`
        SELECT TOP (@limite) * 
        FROM p_Usuarios 
        WHERE idOrg = @id AND activo = 1
        ORDER BY nombre ASC
    `, { id: { valor: id, tipo: Int }, limite: { valor: limite, tipo: Int } });
}

export async function contarEmpleadosNodoDirecto(idOrg: string | number) {
    const id = typeof idOrg === 'string' ? parseInt(idOrg, 10) : idOrg;
    const res = await ejecutarQuery<{ total: number }>(`
        SELECT COUNT(*) as total 
        FROM p_Usuarios 
        WHERE idOrg = @id AND activo = 1
    `, { id: { valor: id, tipo: Int } });
    return res[0]?.total || 0;
}
