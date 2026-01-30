/**
 * Auth Repository - Queries de autenticación usando MSSQL directo
 * Replica EXACTAMENTE la lógica de TypeORM del AuthService
 */
import { crearRequest, NVarChar, Int, Bit } from '../db/base.repo';
import { UsuarioDb, CredencialesDb, RolDb } from '../db/tipos';

/**
 * Obtiene un usuario por correo o carnet (activo)
 * Replica: this.userRepo.findOne({ where: [{ correo, activo: true }, { carnet, activo: true }], relations: ['rol'] })
 */
export async function obtenerUsuarioPorIdentificador(identificador: string): Promise<(UsuarioDb & { rol?: RolDb }) | null> {
    const request = await crearRequest();
    request.input('identificador', NVarChar, identificador);

    const result = await request.query<UsuarioDb & {
        rolNombre?: string;
        rolDescripcion?: string;
        esSistema?: boolean;
        reglas?: string;
        defaultMenu?: string
    }>(`
        SELECT 
            u.*,
            r.nombre as rolNombre,
            r.descripcion as rolDescripcion,
            r.esSistema,
            r.reglas,
            r.defaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE (u.correo = @identificador OR u.carnet = @identificador)
          AND u.activo = 1
    `);

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];

    // Mapear rol si existe
    const usuario: UsuarioDb & { rol?: RolDb } = { ...row };
    if (row.idRol) {
        usuario.rol = {
            idRol: row.idRol,
            nombre: row.rolNombre || '',
            descripcion: row.rolDescripcion || null,
            esSistema: row.esSistema || false,
            reglas: row.reglas || '[]',
            defaultMenu: row.defaultMenu || null
        };
    }

    return usuario;
}

/**
 * Obtiene credenciales por idUsuario
 * Replica: this.credsRepo.findOne({ where: { idUsuario } })
 */
export async function obtenerCredenciales(idUsuario: number): Promise<CredencialesDb | null> {
    const request = await crearRequest();
    request.input('idUsuario', Int, idUsuario);

    const result = await request.query<CredencialesDb>(`
        SELECT * FROM p_UsuariosCredenciales WHERE idUsuario = @idUsuario
    `);

    return result.recordset[0] || null;
}

/**
 * Actualiza el último login
 * Replica: this.credsRepo.save(creds) después de creds.ultimoLogin = new Date()
 */
export async function actualizarUltimoLogin(idUsuario: number): Promise<void> {
    const request = await crearRequest();
    request.input('idUsuario', Int, idUsuario);

    await request.query(`
        UPDATE p_UsuariosCredenciales 
        SET ultimoLogin = GETDATE() 
        WHERE idUsuario = @idUsuario
    `);
}

/**
 * Actualiza el refresh token hash
 * Replica: this.credsRepo.update({ idUsuario }, { refreshTokenHash: hashedRt })
 */
export async function actualizarRefreshToken(idUsuario: number, refreshTokenHash: string): Promise<void> {
    const request = await crearRequest();
    request.input('idUsuario', Int, idUsuario);
    request.input('refreshTokenHash', NVarChar, refreshTokenHash);

    await request.query(`
        UPDATE p_UsuariosCredenciales 
        SET refreshTokenHash = @refreshTokenHash 
        WHERE idUsuario = @idUsuario
    `);
}

/**
 * Cuenta subordinados de un jefe
 * Replica: this.userRepo.count({ where: { jefeCarnet: carnet, activo: true } })
 */
export async function contarSubordinados(carnetJefe: string): Promise<number> {
    const request = await crearRequest();
    request.input('carnetJefe', NVarChar, carnetJefe);

    const result = await request.query<{ cnt: number }>(`
        SELECT COUNT(*) as cnt FROM p_Usuarios 
        WHERE jefeCarnet = @carnetJefe AND activo = 1
    `);

    return result.recordset[0]?.cnt ?? 0;
}

/**
 * Obtiene usuario por ID con rol
 * Replica: this.userRepo.findOne({ where: { idUsuario }, relations: ['rol'] })
 */
export async function obtenerUsuarioPorId(idUsuario: number): Promise<(UsuarioDb & { rol?: RolDb }) | null> {
    const request = await crearRequest();
    request.input('idUsuario', Int, idUsuario);

    const result = await request.query<UsuarioDb & {
        rolNombre?: string;
        rolDescripcion?: string;
        esSistema?: boolean;
        reglas?: string;
        defaultMenu?: string
    }>(`
        SELECT 
            u.*,
            r.nombre as rolNombre,
            r.descripcion as rolDescripcion,
            r.esSistema,
            r.reglas,
            r.defaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE u.idUsuario = @idUsuario
    `);

    if (result.recordset.length === 0) return null;

    const row = result.recordset[0];
    const usuario: UsuarioDb & { rol?: RolDb } = { ...row };

    if (row.idRol) {
        usuario.rol = {
            idRol: row.idRol,
            nombre: row.rolNombre || '',
            descripcion: row.rolDescripcion || null,
            esSistema: row.esSistema || false,
            reglas: row.reglas || '[]',
            defaultMenu: row.defaultMenu || null
        };
    }

    return usuario;
}

/**
 * Obtiene config de usuario
 * Replica: this.configRepo.findOne({ where: { idUsuario } })
 */
export async function obtenerConfigUsuario(idUsuario: number): Promise<{ customMenu?: string } | null> {
    const request = await crearRequest();
    request.input('idUsuario', Int, idUsuario);

    const result = await request.query<{ customMenu: string | null }>(`
        SELECT menuPersonalizado as customMenu FROM p_UsuariosConfig WHERE idUsuario = @idUsuario
    `);

    return result.recordset[0] || null;
}

/**
 * Obtiene múltiples usuarios por IDs con sus roles
 */
export async function obtenerUsuariosPorIds(ids: number[]): Promise<(UsuarioDb & { rol?: RolDb })[]> {
    if (ids.length === 0) return [];

    const request = await crearRequest();
    // Use IDs directly in query since they are numbers
    const idsStr = ids.map(id => Math.floor(id)).join(',');

    const result = await request.query<UsuarioDb & {
        rolNombre?: string;
        rolDescripcion?: string;
        esSistema?: boolean;
        reglas?: string;
        defaultMenu?: string
    }>(`
        SELECT 
            u.*,
            r.nombre as rolNombre,
            r.descripcion as rolDescripcion,
            r.esSistema,
            r.reglas,
            r.defaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE u.idUsuario IN (${idsStr})
    `);

    return result.recordset.map(row => {
        const usuario: UsuarioDb & { rol?: RolDb } = { ...row };
        if (row.idRol) {
            usuario.rol = {
                idRol: row.idRol,
                nombre: row.rolNombre || '',
                descripcion: row.rolDescripcion || null,
                esSistema: row.esSistema || false,
                reglas: row.reglas || '[]',
                defaultMenu: row.defaultMenu || null
            };
        }
        return usuario;
    });
}

/**
 * Actualiza el password hash de un usuario
 */
export async function actualizarPassword(idUsuario: number, passwordHash: string): Promise<void> {
    const request = await crearRequest();
    request.input('idUsuario', Int, idUsuario);
    request.input('passwordHash', NVarChar, passwordHash);

    await request.query(`
        UPDATE p_UsuariosCredenciales 
        SET passwordHash = @passwordHash,
            fechaActualizacion = GETDATE()
        WHERE idUsuario = @idUsuario
    `);
}

/**
 * Obtiene un usuario por correo exacto
 */
export async function obtenerUsuarioPorCorreo(correo: string): Promise<UsuarioDb | null> {
    const request = await crearRequest();
    request.input('correo', NVarChar, correo);

    const result = await request.query<UsuarioDb>(`
        SELECT * FROM p_Usuarios WHERE correo = @correo AND activo = 1
    `);

    return result.recordset[0] || null;
}
