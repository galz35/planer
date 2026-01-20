import { Test, TestingModule } from '@nestjs/testing';

// Mockear servicios ANTES de importarlos con factory explícita para evitar leer el archivo real
jest.mock('./clarity.service', () => ({ ClarityService: class MockClarityService { } }));
jest.mock('./reports.service', () => ({ ReportsService: class MockReportsService { } }));
jest.mock('./tasks.service', () => ({ TasksService: class MockTasksService { } }));
jest.mock('./foco.service', () => ({ FocoService: class MockFocoService { } }));

import { ClarityController } from './clarity.controller';
import { ClarityService } from './clarity.service';
import { ReportsService } from './reports.service';
import { TasksService } from './tasks.service';
import { FocoService } from './foco.service';
// import { JwtAuthGuard } from '../auth/jwt.guard'; // Removed: not needed for unit test mock

describe('ClarityController', () => {
    let controller: ClarityController;
    let mockClarityService: any;
    let mockReportsService: any;
    let mockTasksService: any;
    let mockFocoService: any;

    const mockRequest = {
        user: { userId: 1, rolGlobal: 'User' }
    };

    const mockAdminRequest = {
        user: { userId: 1, rolGlobal: 'Admin' }
    };

    beforeEach(async () => {
        mockClarityService = {
            getConfig: jest.fn().mockResolvedValue({ vistaPreferida: 'list' }),
            setConfig: jest.fn().mockResolvedValue({ success: true }),
            usuariosListarTodos: jest.fn().mockResolvedValue({ items: [], total: 0 }),
            rolesListar: jest.fn().mockResolvedValue([]),
            rolCrear: jest.fn().mockResolvedValue({ idRol: 1 }),
            rolActualizar: jest.fn().mockResolvedValue({ idRol: 1 }),
            rolEliminar: jest.fn().mockResolvedValue({ success: true }),
            nodoCrear: jest.fn().mockResolvedValue({ idNodo: 1 }),
            usuarioAsignarANodo: jest.fn().mockResolvedValue({ success: true }),
        };

        mockReportsService = {
            getReporteProductividad: jest.fn().mockResolvedValue([]),
            getReporteBloqueosTrend: jest.fn().mockResolvedValue([]),
            getReporteEquipoPerformance: jest.fn().mockResolvedValue([]),
            equipoBloqueos: jest.fn().mockResolvedValue([]),
            getWorkload: jest.fn().mockResolvedValue({ users: [], tasks: [] }),
            gerenciaResumen: jest.fn().mockResolvedValue([]),
        };

        mockTasksService = {
            miDiaGet: jest.fn().mockResolvedValue({ checkinHoy: null, tareasDisponibles: [] }),
            checkinUpsert: jest.fn().mockResolvedValue({ idCheckin: 1 }),
            tareaCrearRapida: jest.fn().mockResolvedValue({ idTarea: 1 }),
            tareasMisTareas: jest.fn().mockResolvedValue([]),
            tareaActualizar: jest.fn().mockResolvedValue({ idTarea: 1 }),
            tareaRevalidar: jest.fn().mockResolvedValue({ ok: true }),
            tareaActualizarOrden: jest.fn().mockResolvedValue({ success: true }),
            tareaReordenar: jest.fn().mockResolvedValue({ success: true }),
            tareaRegistrarAvance: jest.fn().mockResolvedValue({ idAvance: 1 }),
            tareaAsignarResponsable: jest.fn().mockResolvedValue({ idTarea: 1 }),
            bloqueoCrear: jest.fn().mockResolvedValue({ idBloqueo: 1 }),
            bloqueoResolver: jest.fn().mockResolvedValue({ idBloqueo: 1 }),
            equipoHoy: jest.fn().mockResolvedValue({ miembros: [] }),
            equipoBacklog: jest.fn().mockResolvedValue([]),
            tareasUsuario: jest.fn().mockResolvedValue([]),
            equipoMiembro: jest.fn().mockResolvedValue({ idUsuario: 1 }),
            proyectoCrear: jest.fn().mockResolvedValue({ idProyecto: 1 }),
            proyectoListar: jest.fn().mockResolvedValue([]),
            proyectoActualizar: jest.fn().mockResolvedValue({ idProyecto: 1 }),
            proyectoEliminar: jest.fn().mockResolvedValue({ success: true }),
            proyectoObtener: jest.fn().mockResolvedValue({ idProyecto: 1 }),
            tareasDeProyecto: jest.fn().mockResolvedValue([]),
        };

        mockFocoService = {
            getFocoDelDia: jest.fn().mockResolvedValue([]),
            agregarAlFoco: jest.fn().mockResolvedValue({ idFoco: 1 }),
            actualizarFoco: jest.fn().mockResolvedValue({ idFoco: 1 }),
            quitarDelFoco: jest.fn().mockResolvedValue({ success: true }),
            reordenarFocos: jest.fn().mockResolvedValue({ success: true }),
            getEstadisticasFoco: jest.fn().mockResolvedValue({ total: 0 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ClarityController],
            providers: [
                { provide: ClarityService, useValue: mockClarityService },
                { provide: ReportsService, useValue: mockReportsService },
                { provide: TasksService, useValue: mockTasksService },
                { provide: FocoService, useValue: mockFocoService },
            ],
        }).compile();

        controller = module.get<ClarityController>(ClarityController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // ==================== Config Endpoints ====================
    describe('getConfig', () => {
        it('should return user config', async () => {
            const result = await controller.getConfig(mockRequest);
            expect(mockClarityService.getConfig).toHaveBeenCalledWith(1);
            expect(result).toEqual({ vistaPreferida: 'list' });
        });
    });

    describe('setConfig', () => {
        it('should update user config', async () => {
            const body = { vistaPreferida: 'grid' };
            await controller.setConfig(mockRequest, body);
            expect(mockClarityService.setConfig).toHaveBeenCalledWith(1, body);
        });
    });

    // ==================== Mi Día Endpoints ====================
    describe('getMiDia', () => {
        it('should get user day data', async () => {
            const query = { fecha: '2024-01-15' };
            await controller.getMiDia(mockRequest, query);
            expect(mockTasksService.miDiaGet).toHaveBeenCalledWith(1, '2024-01-15');
        });
    });

    describe('upsertCheckin', () => {
        it('should create or update checkin', async () => {
            const dto = { idUsuario: 1, fecha: '2024-01-15', entregableTexto: 'Done' };
            await controller.upsertCheckin(dto as any, mockRequest);
            expect(mockTasksService.checkinUpsert).toHaveBeenCalled();
        });
    });

    // ==================== Tareas Endpoints ====================
    describe('crearTareaRapida', () => {
        it('should create a quick task', async () => {
            const dto = { titulo: 'New Task', idUsuario: 1 };
            await controller.crearTareaRapida(dto as any, mockRequest);
            expect(mockTasksService.tareaCrearRapida).toHaveBeenCalled();
        });
    });

    describe('getMisTareas', () => {
        it('should get user tasks', async () => {
            await controller.getMisTareas(mockRequest);
            expect(mockTasksService.tareasMisTareas).toHaveBeenCalledWith(1, undefined, undefined);
        });

        it('should filter by estado', async () => {
            await controller.getMisTareas(mockRequest, 'Pendiente');
            expect(mockTasksService.tareasMisTareas).toHaveBeenCalledWith(1, 'Pendiente', undefined);
        });
    });

    describe('actualizarTarea', () => {
        it('should update task description', async () => {
            const body = { descripcion: 'Updated desc' };
            await controller.actualizarTarea(1, body, mockRequest);
            expect(mockTasksService.tareaActualizar).toHaveBeenCalled();
        });
    });

    describe('actualizarOrden', () => {
        it('should update task order', async () => {
            const body = { orden: 5 };
            await controller.actualizarOrden(1, body, mockRequest);
            expect(mockTasksService.tareaActualizarOrden).toHaveBeenCalledWith(1, 5, 1);
        });
    });

    describe('reordenarTareas', () => {
        it('should reorder tasks', async () => {
            const body = { ids: [3, 1, 2] };
            await controller.reordenarTareas(body);
            expect(mockTasksService.tareaReordenar).toHaveBeenCalledWith([3, 1, 2]);
        });
    });

    // ==================== Bloqueos Endpoints ====================
    describe('crearBloqueo', () => {
        it('should create blocker', async () => {
            const dto = { idTarea: 1, motivo: 'API issue' };
            await controller.crearBloqueo(dto as any, mockRequest);
            expect(mockTasksService.bloqueoCrear).toHaveBeenCalled();
        });
    });

    describe('resolverBloqueo', () => {
        it('should resolve blocker', async () => {
            const body = { solucion: 'Fixed' };
            await controller.resolverBloqueo(1, body as any, mockRequest);
            expect(mockTasksService.bloqueoResolver).toHaveBeenCalledWith(1, body, 1);
        });
    });

    // ==================== Equipo Endpoints ====================
    describe('getEquipoHoy', () => {
        it('should get team today status', async () => {
            const query = { fecha: '2024-01-15' };
            await controller.getEquipoHoy(mockRequest, query);
            expect(mockTasksService.equipoHoy).toHaveBeenCalledWith(1, '2024-01-15');
        });
    });

    describe('getEquipoBacklog', () => {
        it('should get team backlog', async () => {
            const query = { fecha: '2024-01-15' };
            await controller.getEquipoBacklog(mockRequest, query);
            expect(mockTasksService.equipoBacklog).toHaveBeenCalledWith(1, '2024-01-15');
        });
    });

    // ==================== Foco Endpoints ====================
    describe('getFocoDelDia', () => {
        it('should get focus items', async () => {
            const query = { fecha: '2024-01-15' };
            await controller.getFocoDelDia(mockRequest, query);
            expect(mockFocoService.getFocoDelDia).toHaveBeenCalledWith(1, '2024-01-15');
        });
    });

    describe('agregarAlFoco', () => {
        it('should add to focus', async () => {
            const dto = { idTarea: 1, fecha: '2024-01-15', columna: 'objetivo' };
            await controller.agregarAlFoco(mockRequest, dto as any);
            expect(mockFocoService.agregarAlFoco).toHaveBeenCalled();
        });
    });

    // ==================== Reports Endpoints ====================
    describe('getProductividad', () => {
        it('should get productivity report', async () => {
            const filter = { month: 1, year: 2024 };
            await controller.getProductividad(mockRequest, filter as any);
            expect(mockReportsService.getReporteProductividad).toHaveBeenCalledWith(1, filter);
        });
    });

    describe('getBloqueosTrend', () => {
        it('should get blockers trend', async () => {
            const filter = {};
            await controller.getBloqueosTrend(mockRequest, filter as any);
            expect(mockReportsService.getReporteBloqueosTrend).toHaveBeenCalledWith(1, filter);
        });
    });
});
