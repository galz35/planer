import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * VisibilidadService - Servicio maestro para calcular visibilidad de empleados
 * REFACTORED: Uses p_Usuarios instead of p_empleados
 * 
 * Logic adjusted:
 * - Empleados are now in p_Usuarios
 * - Basic hierarchy (jefeCarnet) is used from p_Usuarios
 * - Organization node logic is DISABLED for now (unless we seed nodes later)
 */
@Injectable()
export class VisibilidadService {
  constructor(private readonly dataSource: DataSource) { }

  /**
   * Obtiene todos los carnets que un usuario puede ver
   */
  async obtenerCarnetsVisibles(carnetSolicitante: string): Promise<string[]> {
    const sql = `
      WITH RECURSIVE
      Actores AS (
        SELECT $1::text AS carnet
        UNION
        SELECT d.carnet_delegante
        FROM p_delegacion_visibilidad d
        WHERE d.carnet_delegado = $1
          AND d.activo = true
          AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURRENT_DATE)
      ),
      -- Recursividad simple por Jefatura Directa (p_Usuarios.jefeCarnet)
      Subordinados AS (
          SELECT u.carnet
          FROM "p_Usuarios" u
          JOIN Actores a ON u."jefeCarnet" = a.carnet
          WHERE u.activo = true
          UNION
          SELECT u.carnet
          FROM "p_Usuarios" u
          JOIN Subordinados s ON u."jefeCarnet" = s.carnet
          WHERE u.activo = true
      ),
      VisiblesPuntual AS (
        SELECT pe.carnet_objetivo AS carnet
        FROM p_permiso_empleado pe
        JOIN Actores a ON a.carnet = pe.carnet_recibe
        WHERE pe.activo = true
          AND (pe.fecha_fin IS NULL OR pe.fecha_fin >= CURRENT_DATE)
          AND (pe.tipo_acceso IS NULL OR pe.tipo_acceso = 'ALLOW')
      ),
      -- Lógica de Jerarquía Organizacional:
      -- Si tengo permiso sobre un nodo (id_org_raiz), veo a todos los empleados
      -- pertenecientes a ese nodo y sus descendientes (recursivo).
      NodosPermitidos AS (
          SELECT pa.idorg_raiz::text as idorg
          FROM p_permiso_area pa
          JOIN Actores a ON a.carnet = pa.carnet_recibe
          WHERE pa.activo = true 
            AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CURRENT_DATE)
          
          UNION
          
          SELECT n.idorg::text
          FROM p_organizacion_nodos n
          JOIN NodosPermitidos np ON n.padre::text = np.idorg
      ),
      VisiblesArea AS (
        SELECT u.carnet
        FROM "p_Usuarios" u
        JOIN NodosPermitidos np ON u."idOrg" = np.idorg
      ),
      Excluidos AS (
        SELECT pe.carnet_objetivo AS carnet
        FROM p_permiso_empleado pe
        JOIN Actores a ON a.carnet = pe.carnet_recibe
        WHERE pe.activo = true
          AND pe.tipo_acceso = 'DENY'
      ),
      IsAdmin AS (
        SELECT 1 FROM "p_Usuarios" u
        JOIN Actores a ON TRIM(u.carnet) = TRIM(a.carnet)
        WHERE u.activo = true 
          AND UPPER(TRIM(u."rolGlobal")) IN ('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
        LIMIT 1
      )
      SELECT DISTINCT v.carnet
      FROM (
        SELECT carnet FROM Subordinados
        UNION
        SELECT carnet FROM VisiblesPuntual
        UNION
        SELECT carnet FROM VisiblesArea
        UNION
        SELECT carnet FROM Actores
        UNION
        -- Si es admin, ve todos los carnets activos
        SELECT carnet FROM "p_Usuarios" WHERE activo = true AND EXISTS (SELECT 1 FROM IsAdmin)
      ) v
      WHERE v.carnet IS NOT NULL AND v.carnet != ''
      AND (EXISTS (SELECT 1 FROM IsAdmin) OR v.carnet NOT IN (SELECT carnet FROM Excluidos)); 
    `;

    try {
      console.log(`[VisibilidadService] Obteniendo carnets para: ${carnetSolicitante}`);
      const rows = await this.dataSource.query(sql, [carnetSolicitante]);
      const carnets = rows.map((r: { carnet: string }) => String(r.carnet || '').trim()).filter(Boolean);
      console.log(`[VisibilidadService] Carnets encontrados para ${carnetSolicitante}: ${carnets.length}`, carnets);
      return carnets;
    } catch (error) {
      console.warn('[VisibilidadService] Error en obtenerCarnetsVisibles:', error);
      return [carnetSolicitante].filter(Boolean);
    }
  }

  async puedeVer(carnetSolicitante: string, carnetObjetivo: string): Promise<boolean> {
    const visibles = await this.obtenerCarnetsVisibles(carnetSolicitante);
    return visibles.includes((carnetObjetivo || '').trim());
  }

  async obtenerEmpleadosVisibles(carnetSolicitante: string): Promise<any[]> {
    const carnets = await this.obtenerCarnetsVisibles(carnetSolicitante);
    if (carnets.length === 0) return [];

    const placeholders = carnets.map((_, i) => `$${i + 1}`).join(', ');
    // Updated query to use p_Usuarios
    const sql = `
      SELECT u."idUsuario", u.carnet, u."nombreCompleto", u.correo, u.cargo, u.departamento, 
             u."orgDepartamento", u."orgGerencia", u."idOrg", u."jefeCarnet", u."jefeNombre", u."jefeCorreo", u.activo,
             u."primer_nivel" as "primerNivel", u.gerencia,
             u.ogerencia, u.subgerencia
      FROM "p_Usuarios" u
      WHERE u.carnet IN (${placeholders})
      ORDER BY u."nombreCompleto"
    `;

    try {
      const result = await this.dataSource.query(sql, carnets);
      console.log(`[VisibilidadService] Empleados detallados para ${carnetSolicitante}: ${result.length}`);
      return result;
    } catch (error) {
      console.error('Error fetching visible employees', error);
      return [];
    }
  }

  /**
   * Versión que recibe IDs numéricos para integración con servicios que usan idUsuario
   */
  async verificarAccesoPorId(idSolicitante: number, idObjetivo: number): Promise<boolean> {
    if (idSolicitante === idObjetivo) return true;

    // Obtener carnets para los IDs proporcionados
    const res = await this.dataSource.query('SELECT "idUsuario", carnet FROM "p_Usuarios" WHERE "idUsuario" = $1 OR "idUsuario" = $2', [idSolicitante, idObjetivo]);
    const solicitante = res.find((r: any) => Number(r.idUsuario) === Number(idSolicitante));
    const objetivo = res.find((r: any) => Number(r.idUsuario) === Number(idObjetivo));

    if (!solicitante || !objetivo) return false;

    return this.puedeVer(solicitante.carnet, objetivo.carnet);
  }

  // .. Other methods simplified or removed if they depended heavily on p_organizacion_nodos and pure ID recursion
  // For now, focusing on User->Boss hierarchy

  async obtenerActoresEfectivos(carnetSolicitante: string): Promise<string[]> {
    // Same login
    const sql = `
      SELECT $1::text AS carnet
      UNION
      SELECT d.carnet_delegante FROM p_delegacion_visibilidad d
      WHERE d.carnet_delegado = $1 AND d.activo = true AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURRENT_DATE);
    `;
    try {
      const rows = await this.dataSource.query(sql, [carnetSolicitante]);
      return rows.map((r: { carnet: string }) => String(r.carnet).trim());
    } catch (error) {
      return [carnetSolicitante];
    }
  }

  async obtenerQuienPuedeVer(carnetObjetivo: string): Promise<any[]> {
    // Simplified logic avoiding p_empleados join
    const sql = `
            SELECT DISTINCT u.carnet, 'Jefe Directo' as razon, u."nombreCompleto" as nombre
            FROM "p_Usuarios" u
            JOIN "p_Usuarios" objetivo ON objetivo."jefeCarnet" = u.carnet
            WHERE objetivo.carnet = $1
         `;
    try {
      return await this.dataSource.query(sql, [carnetObjetivo]);
    } catch { return []; }
  }
}
