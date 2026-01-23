import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service'; // ClarityService ha sido migrado a TasksService
import { PlanningService } from '../planning/planning.service';
import { AuditService } from '../common/audit.service';
import { VisibilidadService } from '../acceso/visibilidad.service';

// Mock de Repositorios (estos son módulos, no clases inyectadas)
jest.mock('./clarity.repo', () => ({
    obtenerCheckinPorFecha: jest.fn(),
    obtenerMisTareas: jest.fn(),
    upsertCheckin: jest.fn(),
    crearTarea: jest.fn(),
    asignarUsuarioTarea: jest.fn(),
    obtenerTareasMultiplesUsuarios: jest.fn(),
    obtenerEquipoHoy: jest.fn(),
    bloquearTarea: jest.fn(),
    resolverBloqueo: jest.fn(),
    ejecutarQuery: jest.fn(),
}));

jest.mock('../planning/planning.repo', () => ({
    obtenerTareaPorId: jest.fn(),
    actualizarTarea: jest.fn(),
    obtenerTodosProyectos: jest.fn(),
    obtenerProyectosVisibles: jest.fn(),
    crearProyecto: jest.fn(),
    obtenerProyectoPorId: jest.fn(),
    actualizarDatosProyecto: jest.fn(),
    eliminarProyecto: jest.fn(),
}));

jest.mock('../auth/auth.repo', () => ({
    obtenerUsuarioPorId: jest.fn(),
}));

import * as clarityRepo from './clarity.repo';
import * as planningRepo from '../planning/planning.repo';

describe('ClarityService (Migrated to TasksService)', () => {
    let service: TasksService;
    let mockPlanningService = { checkEditPermission: jest.fn(), solicitarCambio: jest.fn() };
    let mockAuditService = { log: jest.fn(), getHistorialEntidad: jest.fn() };
    let mockVisibilidadService = { verificarAccesoPorId: jest.fn(), obtenerEmpleadosVisibles: jest.fn() };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                { provide: PlanningService, useValue: mockPlanningService },
                { provide: AuditService, useValue: mockAuditService },
                { provide: VisibilidadService, useValue: mockVisibilidadService },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('miDiaGet', () => {
        it('should return day snapshot', async () => {
            (clarityRepo.obtenerCheckinPorFecha as jest.Mock).mockResolvedValue({ idCheckin: 1 });
            (clarityRepo.obtenerMisTareas as jest.Mock).mockResolvedValue([]);
            const result = await service.miDiaGet(1, '2024-01-23');
            expect(result).toBeDefined();
        });
    });
});
