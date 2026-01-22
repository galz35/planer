import { Injectable, Logger } from '@nestjs/common';
import * as accesoRepo from './acceso.repo';

/**
 * VisibilidadService - Servicio maestro para calcular visibilidad de empleados
 * Refactorizado para usar acceso.repo (SQL Server Directo)
 */
@Injectable()
export class VisibilidadService {
  private readonly logger = new Logger(VisibilidadService.name);

  constructor() { }

  /**
   * Obtiene todos los carnets que un usuario puede ver
   */
  async obtenerCarnetsVisibles(carnetSolicitante: string): Promise<string[]> {
    const cleanCarnet = String(carnetSolicitante || '').trim();
    if (!cleanCarnet) return [];

    try {
      return await accesoRepo.calcularCarnetsVisibles(cleanCarnet);
    } catch (error) {
      this.logger.warn(`Error calculando visibilidad para ${cleanCarnet}`, error);
      // Fallback seguro: solo se ve a sí mismo
      return [cleanCarnet];
    }
  }

  async puedeVer(carnetSolicitante: string, carnetObjetivo: string): Promise<boolean> {
    if (carnetSolicitante === carnetObjetivo) return true;
    const visibles = await this.obtenerCarnetsVisibles(carnetSolicitante);
    return visibles.includes((carnetObjetivo || '').trim());
  }

  async obtenerEmpleadosVisibles(carnetSolicitante: string): Promise<any[]> {
    const carnets = await this.obtenerCarnetsVisibles(carnetSolicitante);
    if (carnets.length === 0) return [];

    try {
      return await accesoRepo.obtenerDetallesUsuarios(carnets);
    } catch (error) {
      this.logger.error('Error fetching visible employees', error);
      return [];
    }
  }

  async verificarAccesoPorId(idSolicitante: number, idObjetivo: number): Promise<boolean> {
    if (idSolicitante === idObjetivo) return true;

    try {
      const [carnet1, carnet2] = await Promise.all([
        accesoRepo.obtenerCarnetDeUsuario(idSolicitante),
        accesoRepo.obtenerCarnetDeUsuario(idObjetivo)
      ]);

      if (!carnet1 || !carnet2) return false;
      return this.puedeVer(carnet1, carnet2);
    } catch (e) {
      this.logger.error('Error verifing access by ID', e);
      return false;
    }
  }

  async obtenerActoresEfectivos(carnetSolicitante: string): Promise<string[]> {
    try {
      // Actores = Solicitante + Sus Delegantes activos (quienes me delegaron su vista)
      const delegaciones = await accesoRepo.obtenerDelegacionesActivas(carnetSolicitante);
      const delegantes = delegaciones.map(d => d.carnet_delegante);
      return [carnetSolicitante, ...delegantes];
    } catch (error) {
      return [carnetSolicitante];
    }
  }

  /**
   * Obtiene lista de personas que pueden ver al objetivo (Inversa)
   * Implementación simplificada solo Jefes Directos por ahora.
   */
  async obtenerQuienPuedeVer(carnetObjetivo: string): Promise<any[]> {
    // Pendiente de implementar lógica inversa compleja
    return [];
  }
}
