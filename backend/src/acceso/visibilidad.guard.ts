import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { VisibilidadService } from './visibilidad.service';

/**
 * VisibilidadGuard - Guard que valida acceso por carnet objetivo
 * 
 * Uso: @UseGuards(VisibilidadGuard) en endpoints que reciben carnetObjetivo
 * 
 * Convención: el carnet objetivo viene en:
 * - req.params.carnetObjetivo
 * - req.params.carnet
 * - req.body.carnetObjetivo
 * 
 * Requiere que el usuario autenticado tenga `carnet` en req.user
 */
@Injectable()
export class VisibilidadGuard implements CanActivate {
    constructor(private readonly visibilidadService: VisibilidadService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user || {};

        // Obtener carnet del solicitante desde el token JWT
        const carnetSolicitante = this.getCarnetFromUser(user);
        if (!carnetSolicitante) {
            throw new ForbiddenException('Token sin carnet. No se puede validar visibilidad.');
        }

        // Obtener carnet objetivo desde params o body
        const carnetObjetivo = this.getCarnetObjetivo(request);
        if (!carnetObjetivo) {
            // Si no hay carnet objetivo, permitir (endpoints que no requieren validación por objetivo)
            return true;
        }

        // El usuario siempre puede verse a sí mismo
        if (carnetSolicitante === carnetObjetivo) {
            return true;
        }

        // Validar visibilidad
        const puedeVer = await this.visibilidadService.puedeVer(carnetSolicitante, carnetObjetivo);
        if (!puedeVer) {
            throw new ForbiddenException(`No tienes permiso para ver al empleado: ${carnetObjetivo}`);
        }

        return true;
    }

    /**
     * Extrae el carnet del usuario autenticado
     */
    private getCarnetFromUser(user: any): string | null {
        // Intenta obtener carnet de varias fuentes posibles
        const carnet = user.carnet || user.sub || user.id || user.correo;
        return carnet ? String(carnet).trim() : null;
    }

    /**
     * Extrae el carnet objetivo de la request
     */
    private getCarnetObjetivo(request: any): string | null {
        const params = request.params || {};
        const body = request.body || {};
        const query = request.query || {};

        // Buscar en orden de prioridad
        const carnet =
            params.carnetObjetivo ||
            params.carnet ||
            body.carnetObjetivo ||
            query.carnetObjetivo;

        return carnet ? String(carnet).trim() : null;
    }
}
