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
   * Optimización: Usa UNION ALL para evitar filtrado intermedio y NOT EXISTS para exclusiones.
   */
  async obtenerCarnetsVisibles(carnetSolicitante: string): Promise<string[]> {
    const cleanCarnet = String(carnetSolicitante || '').trim();
    if (!cleanCarnet) return [];

    const sql = `
      WITH RECURSIVE
      -- 1) Actores: el solicitante + delegantes válidos
      Actores AS (
        SELECT $1::text AS carnet
        UNION ALL
        SELECT d.carnet_delegante
        FROM p_delegacion_visibilidad d
        WHERE d.carnet_delegado = $1
          AND d.activo = true
          AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURRENT_DATE)
      ),
      -- 2) Admin flag: si es admin ve todo
      IsAdmin AS (
        SELECT 1 FROM "p_Usuarios" u
        JOIN Actores a ON u.carnet = a.carnet
        WHERE u.activo = true 
          AND UPPER(TRIM(u."rolGlobal")) IN ('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
        LIMIT 1
      ),
      -- 3) Subordinados: recursivo por jefeCarnet
      Subordinados AS (
          SELECT u.carnet
          FROM "p_Usuarios" u
          JOIN Actores a ON u."jefeCarnet" = a.carnet
          WHERE u.activo = true
          UNION ALL
          SELECT u.carnet
          FROM "p_Usuarios" u
          JOIN Subordinados s ON u."jefeCarnet" = s.carnet
          WHERE u.activo = true
      ),
      -- 4) Permisos puntuales ALLOW
      VisiblesPuntual AS (
        SELECT pe.carnet_objetivo AS carnet
        FROM p_permiso_empleado pe
        JOIN Actores a ON a.carnet = pe.carnet_recibe
        WHERE pe.activo = true
          AND (pe.fecha_fin IS NULL OR pe.fecha_fin >= CURRENT_DATE)
          AND (pe.tipo_acceso IS NULL OR pe.tipo_acceso = 'ALLOW')
      ),
      -- 5) Nodos permitidos (Áreas)
      NodosPermitidos AS (
          SELECT pa.idorg_raiz::text as idorg
          FROM p_permiso_area pa
          JOIN Actores a ON a.carnet = pa.carnet_recibe
          WHERE pa.activo = true 
            AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CURRENT_DATE)
          UNION ALL
          SELECT n.idorg::text
          FROM p_organizacion_nodos n
          JOIN NodosPermitidos np ON n.padre::text = np.idorg
      ),
      -- 6) Empleados en esas áreas
      VisiblesArea AS (
        SELECT u.carnet
        FROM "p_Usuarios" u
        JOIN NodosPermitidos np ON u."idOrg" = np.idorg
        WHERE u.activo = true
      ),
      -- 7) Excluidos (DENY)
      Excluidos AS (
        SELECT pe.carnet_objetivo AS carnet
        FROM p_permiso_empleado pe
        JOIN Actores a ON a.carnet = pe.carnet_recibe
        WHERE pe.activo = true
          AND pe.tipo_acceso = 'DENY'
      ),
      -- 8) Consolidado de todo lo visible
      TodoVisible AS (
        SELECT carnet FROM Actores
        UNION ALL
        SELECT carnet FROM Subordinados
        UNION ALL
        SELECT carnet FROM VisiblesPuntual
        UNION ALL
        SELECT carnet FROM VisiblesArea
        UNION ALL
        SELECT carnet FROM "p_Usuarios" WHERE activo = true AND EXISTS (SELECT 1 FROM IsAdmin)
      )
      SELECT DISTINCT tv.carnet
      FROM TodoVisible tv
      WHERE tv.carnet IS NOT NULL AND tv.carnet != ''
        AND (EXISTS (SELECT 1 FROM IsAdmin) OR NOT EXISTS (
          SELECT 1 FROM Excluidos e WHERE e.carnet = tv.carnet
        ));
    `;

    try {
      const rows = await this.dataSource.query(sql, [cleanCarnet]);
      return rows.map((r: { carnet: string }) => String(r.carnet || '').trim()).filter(Boolean);
    } catch (error) {
      console.warn('[VisibilidadService] Error en obtenerCarnetsVisibles:', error);
      return [cleanCarnet];
    }
  }

  async puedeVer(carnetSolicitante: string, carnetObjetivo: string): Promise<boolean> {
    const visibles = await this.obtenerCarnetsVisibles(carnetSolicitante);
    return visibles.includes((carnetObjetivo || '').trim());
  }

  async obtenerEmpleadosVisibles(carnetSolicitante: string): Promise<any[]> {
    const carnets = await this.obtenerCarnetsVisibles(carnetSolicitante);
    if (carnets.length === 0) return [];

    // Optimización: Uso de ANY($1) para evitar generación dinámica de placeholders
    const sql = `
      SELECT u."idUsuario", u.carnet, u."nombreCompleto", u.correo, u.cargo, u.departamento, 
             u."orgDepartamento", u."orgGerencia", u."idOrg", u."jefeCarnet", u."jefeNombre", u."jefeCorreo", u.activo,
             u."primer_nivel" as "primerNivel", u.gerencia,
             u.ogerencia, u.subgerencia
      FROM "p_Usuarios" u
      WHERE u.carnet = ANY($1::text[])
      ORDER BY u."nombreCompleto"
    `;

    try {
      return await this.dataSource.query(sql, [carnets]);
    } catch (error) {
      console.error('Error fetching visible employees', error);
      return [];
    }
  }

  async verificarAccesoPorId(idSolicitante: number, idObjetivo: number): Promise<boolean> {
    if (idSolicitante === idObjetivo) return true;

    const res = await this.dataSource.query('SELECT "idUsuario", carnet FROM "p_Usuarios" WHERE "idUsuario" = $1 OR "idUsuario" = $2', [idSolicitante, idObjetivo]);
    const solicitante = res.find((r: any) => Number(r.idUsuario) === Number(idSolicitante));
    const objetivo = res.find((r: any) => Number(r.idUsuario) === Number(idObjetivo));

    if (!solicitante || !objetivo) return false;

    return this.puedeVer(solicitante.carnet, objetivo.carnet);
  }

  async obtenerActoresEfectivos(carnetSolicitante: string): Promise<string[]> {
    const sql = `
      SELECT $1::text AS carnet
      UNION ALL
      SELECT d.carnet_delegante FROM p_delegacion_visibilidad d
      WHERE d.carnet_delegado = $1 AND d.activo = true AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURRENT_DATE);
    `;
    try {
      const rows = await this.dataSource.query(sql, [carnetSolicitante]);
      return rows.map((r: { carnet: string }) => String(r.carnet).trim());
    } catch (error) {
      return [carnetSolicitante].filter(Boolean);
    }
  }

  async obtenerQuienPuedeVer(carnetObjetivo: string): Promise<any[]> {
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

