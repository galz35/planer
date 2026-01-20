import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResourceNotFoundException, InsufficientPermissionsException } from '../common/exceptions';
import { PlanningService } from '../planning/planning.service';

// Mock de Entidades para evitar ciclos
jest.mock('../auth/entities/usuario.entity', () => ({ Usuario: class MockUsuario { } }));
jest.mock('../auth/entities/organizacion-nodo.entity', () => ({ OrganizacionNodo: class MockOrganizacionNodo { } }));
jest.mock('../auth/entities/usuario-organizacion.entity', () => ({ UsuarioOrganizacion: class MockUsuarioOrganizacion { } }));
jest.mock('../planning/entities/tarea.entity', () => ({ Tarea: class MockTarea { } }));
jest.mock('../planning/entities/tarea-asignado.entity', () => ({ TareaAsignado: class MockTareaAsignado { } }));
jest.mock('../planning/entities/proyecto.entity', () => ({ Proyecto: class MockProyecto { } }));
jest.mock('../planning/entities/tarea-avance.entity', () => ({ TareaAvance: class MockTareaAvance { } }));
jest.mock('./entities/checkin.entity', () => ({ Checkin: class MockCheckin { } }));
jest.mock('./entities/checkin-tarea.entity', () => ({ CheckinTarea: class MockCheckinTarea { } }));
jest.mock('./entities/bloqueo.entity', () => ({ Bloqueo: class MockBloqueo { } }));
jest.mock('./entities/solicitud-cambio.entity', () => ({ SolicitudCambio: class MockSolicitudCambio { } }));
jest.mock('../common/entities/audit-log.entity', () => ({ AuditLog: class MockAuditLog { } }));
jest.mock('../common/audit.service', () => ({ AuditService: class MockAuditService { } }));

// Imports de entidades mockeadas
import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { Tarea } from '../planning/entities/tarea.entity';
import { TareaAsignado } from '../planning/entities/tarea-asignado.entity';
import { Proyecto } from '../planning/entities/proyecto.entity';
import { TareaAvance } from '../planning/entities/tarea-avance.entity';
import { Checkin } from './entities/checkin.entity';
import { CheckinTarea } from './entities/checkin-tarea.entity';
import { Bloqueo } from './entities/bloqueo.entity';
import { SolicitudCambio } from './entities/solicitud-cambio.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditService } from '../common/audit.service';

// Mock Query Builder
const createMockQueryBuilder = () => ({
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
});

describe('TasksService', () => {
    let service: TasksService;
    let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
    let auditService: AuditService;

    const createMockRepo = () => ({
        create: jest.fn().mockImplementation(dto => ({ ...dto })),
        save: jest.fn().mockImplementation(dto => Promise.resolve({ id: Math.random(), ...dto })),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findOneBy: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        createQueryBuilder: jest.fn(),
    });

    const mockTareaRepo = createMockRepo();
    const mockUserRepo = createMockRepo();
    const mockTareaAsignadoRepo = createMockRepo();
    const mockCheckinRepo = createMockRepo();
    const mockCheckinTareaRepo = createMockRepo();
    const mockBloqueoRepo = createMockRepo();
    const mockProyectoRepo = createMockRepo();
    const mockNodoRepo = createMockRepo();
    const mockUoRepo = createMockRepo();
    const mockAuditRepo = createMockRepo();
    const mockAvanceRepo = createMockRepo();
    const mockSolicitudRepo = createMockRepo();

    const mockDataSource = {
        query: jest.fn(),
        getRepository: jest.fn().mockReturnValue(mockAvanceRepo),
    };

    const mockPlanningService = {
        checkEditPermission: jest.fn().mockResolvedValue({
            puedeEditar: true,
            requiereAprobacion: false,
            tipoProyecto: 'Operativo'
        }),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        mockQueryBuilder = createMockQueryBuilder();
        mockTareaRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
        mockBloqueoRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                { provide: getRepositoryToken(Usuario), useValue: mockUserRepo },
                { provide: getRepositoryToken(Tarea), useValue: mockTareaRepo },
                { provide: getRepositoryToken(TareaAsignado), useValue: mockTareaAsignadoRepo },
                { provide: getRepositoryToken(Checkin), useValue: mockCheckinRepo },
                { provide: getRepositoryToken(CheckinTarea), useValue: mockCheckinTareaRepo },
                { provide: getRepositoryToken(Bloqueo), useValue: mockBloqueoRepo },
                { provide: getRepositoryToken(Proyecto), useValue: mockProyectoRepo },
                { provide: getRepositoryToken(OrganizacionNodo), useValue: mockNodoRepo },
                { provide: getRepositoryToken(UsuarioOrganizacion), useValue: mockUoRepo },
                { provide: getRepositoryToken(TareaAvance), useValue: mockAvanceRepo },
                { provide: getRepositoryToken(SolicitudCambio), useValue: mockSolicitudRepo },
                { provide: DataSource, useValue: mockDataSource },
                { provide: PlanningService, useValue: mockPlanningService },
                { provide: AuditService, useValue: { log: jest.fn() } },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);
        auditService = module.get<AuditService>(AuditService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== tareaCrearRapida Tests ====================
    describe('tareaCrearRapida', () => {
        it('should create a task with default priority Media', async () => {
            const dto = { idUsuario: 1, titulo: 'New Task' };
            mockTareaRepo.save.mockResolvedValue({ idTarea: 123, ...dto, prioridad: 'Media' });

            await service.tareaCrearRapida(dto as any);

            expect(mockTareaRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                titulo: 'New Task',
                prioridad: 'Media',
                estado: 'Pendiente'
            }));
            expect(mockTareaRepo.save).toHaveBeenCalled();
        });

        it('should use provided priority if specified', async () => {
            const dto = { idUsuario: 1, titulo: 'High Priority Task', prioridad: 'Alta' };
            mockTareaRepo.save.mockResolvedValue({ idTarea: 124, ...dto });

            await service.tareaCrearRapida(dto as any);

            expect(mockTareaRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                prioridad: 'Alta'
            }));
        });

        it('should set idCreador correctly', async () => {
            const dto = { idUsuario: 5, titulo: 'Test' };
            mockTareaRepo.save.mockResolvedValue({ idTarea: 125, ...dto });

            await service.tareaCrearRapida(dto as any);

            expect(mockTareaRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                idCreador: 5
            }));
        });
    });

    // ==================== tareaActualizar Tests ====================
    // ==================== tareaActualizar Tests ====================
    describe('tareaActualizar', () => {
        const existingTask = {
            idTarea: 1,
            titulo: 'Original Title',
            estado: 'Pendiente',
            prioridad: 'Media',
            idCreador: 1,
            proyecto: { idProyecto: 1, tipo: 'Operativo' },
            asignados: [{ idUsuario: 1, tipo: 'Responsable' }]
        };

        it('should update task when user is creator', async () => {
            mockTareaRepo.findOne.mockResolvedValue(existingTask);
            mockTareaRepo.save.mockResolvedValue({ ...existingTask, titulo: 'Updated Title' });

            // Mock normal user
            mockUserRepo.findOne.mockResolvedValue({ idUsuario: 1, rol: { nombre: 'User' } });

            await service.tareaActualizar(1, { titulo: 'Updated Title' } as any, 1);

            expect(mockTareaRepo.save).toHaveBeenCalled();
        });

        it('should throw ResourceNotFoundException for non-existent task', async () => {
            mockTareaRepo.findOne.mockResolvedValue(null);

            await expect(service.tareaActualizar(999, { titulo: 'Test' } as any, 1))
                .rejects.toThrow(ResourceNotFoundException);
        });

        it('should allow admin to update any task', async () => {
            const taskNotOwned = { ...existingTask, idCreador: 99 };
            mockTareaRepo.findOne.mockResolvedValueOnce(taskNotOwned);
            mockTareaRepo.save.mockResolvedValueOnce({ ...taskNotOwned, titulo: 'Updated' });

            // Mock Admin
            mockUserRepo.findOne.mockResolvedValueOnce({ idUsuario: 1, rol: { nombre: 'Admin' } });

            await service.tareaActualizar(1, { titulo: 'Updated' } as any, 1);

            expect(mockTareaRepo.save).toHaveBeenCalled();
        });
    });

    // ... (skipped assignee tests which seemed fine) ...

    // ==================== tareaActualizarOrden Tests ====================
    describe('tareaActualizarOrden', () => {
        it('should update task order', async () => {
            const task = { idTarea: 1, orden: 0 };
            mockTareaRepo.findOneBy.mockResolvedValue(task);
            mockTareaRepo.save.mockResolvedValue({ ...task, orden: 5 });

            await service.tareaActualizarOrden(1, 5, 1);

            expect(mockTareaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                orden: 5
            }));
        });

        it('should throw ResourceNotFoundException for non-existent task', async () => {
            mockTareaRepo.findOneBy.mockResolvedValue(null);

            await expect(service.tareaActualizarOrden(999, 5, 1))
                .rejects.toThrow(ResourceNotFoundException);
        });
    });

    // ==================== Bloqueos Tests ====================
    describe('bloqueoCrear', () => {
        it('should create a blocker', async () => {
            const dto = { idTarea: 1, motivo: 'Waiting for API', idOrigenUsuario: 5 };
            mockBloqueoRepo.save.mockResolvedValue({ idBloqueo: 1, ...dto, estado: 'Activo' });

            await service.bloqueoCrear(dto as any);

            expect(mockBloqueoRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                idTarea: 1,
                estado: 'Activo'
            }));
        });
    });

    describe('bloqueoResolver', () => {
        it('should resolve a blocker when user is owner', async () => {
            const blocker = { idBloqueo: 1, estado: 'Activo', idOrigenUsuario: 5 };
            mockBloqueoRepo.findOneBy.mockResolvedValue(blocker);
            mockBloqueoRepo.save.mockResolvedValue({ ...blocker, estado: 'Resuelto' });

            await service.bloqueoResolver(1, { solucion: 'Fixed' } as any, 5);

            expect(mockBloqueoRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                estado: 'Resuelto'
            }));
        });

        it('should throw ResourceNotFoundException for non-existent blocker', async () => {
            mockBloqueoRepo.findOneBy.mockResolvedValue(null);

            await expect(service.bloqueoResolver(999, { solucion: 'Test' } as any, 1))
                .rejects.toThrow(ResourceNotFoundException);
        });

        it('should throw InsufficientPermissionsException when user is not owner', async () => {
            const blocker = { idBloqueo: 1, estado: 'Activo', idOrigenUsuario: 99 };
            mockBloqueoRepo.findOneBy.mockResolvedValue(blocker);

            await expect(service.bloqueoResolver(1, { solucion: 'Fixed' } as any, 5))
                .rejects.toThrow(InsufficientPermissionsException);
        });
    });

    // ==================== Proyectos Tests ====================
    describe('proyectoCrear', () => {
        it('should create a project', async () => {
            const dto = { nombre: 'New Project', descripcion: 'Test Project' };
            mockProyectoRepo.save.mockResolvedValue({ idProyecto: 1, ...dto });

            await service.proyectoCrear(dto as any, 1);

            expect(mockProyectoRepo.save).toHaveBeenCalled();
            expect(auditService.log).toHaveBeenCalled();
        });
    });

    describe('proyectoActualizar', () => {
        it('should update project', async () => {
            const project = { idProyecto: 1, nombre: 'Old Name' };
            mockProyectoRepo.findOneBy.mockResolvedValue(project);
            mockProyectoRepo.save.mockResolvedValue({ ...project, nombre: 'New Name' });

            await service.proyectoActualizar(1, { nombre: 'New Name' }, 1);

            expect(mockProyectoRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                nombre: 'New Name'
            }));
        });

        it('should throw ResourceNotFoundException for non-existent project', async () => {
            mockProyectoRepo.findOneBy.mockResolvedValue(null);

            await expect(service.proyectoActualizar(999, { nombre: 'Test' }, 1))
                .rejects.toThrow(ResourceNotFoundException);
        });
    });

    describe('proyectoEliminar', () => {
        it('should archive project (soft delete)', async () => {
            const project = { idProyecto: 1, nombre: 'To Delete' };
            mockProyectoRepo.findOneBy.mockResolvedValue(project);
            mockProyectoRepo.save.mockResolvedValue({ ...project, estado: 'Archivado' });

            await service.proyectoEliminar(1, 1);

            expect(mockProyectoRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                estado: 'Archivado'
            }));
            expect(auditService.log).toHaveBeenCalled();
        });

        it('should throw ResourceNotFoundException for non-existent project', async () => {
            mockProyectoRepo.findOneBy.mockResolvedValue(null);

            await expect(service.proyectoEliminar(999, 1))
                .rejects.toThrow(ResourceNotFoundException);
        });
    });

    describe('proyectoObtener', () => {
        it('should return project with tasks', async () => {
            const project = { idProyecto: 1, nombre: 'Test', tareas: [] };
            mockProyectoRepo.findOne.mockResolvedValue(project);

            const result = await service.proyectoObtener(1);

            expect(result).toEqual(project);
        });

        it('should throw ResourceNotFoundException for non-existent project', async () => {
            mockProyectoRepo.findOne.mockResolvedValue(null);

            await expect(service.proyectoObtener(999))
                .rejects.toThrow(ResourceNotFoundException);
        });
    });

    // ==================== Checkin Tests ====================
    describe('checkinUpsert', () => {
        it('should create new checkin if none exists', async () => {
            const dto = {
                idUsuario: 1,
                fecha: '2024-01-15',
                entregableTexto: 'Completed feature X',
                entrego: [10],
                avanzo: [11],
                extras: []
            };
            mockCheckinRepo.findOne.mockResolvedValue(null);
            mockCheckinRepo.save.mockResolvedValue({ idCheckin: 55, ...dto });

            const result = await service.checkinUpsert(dto as any);

            expect(mockCheckinRepo.save).toHaveBeenCalled();
            expect(result.idCheckin).toBe(55);
        });

        it('should update existing checkin', async () => {
            const dto = {
                idUsuario: 1,
                fecha: '2024-01-15',
                entregableTexto: 'Updated text',
                entrego: [],
                avanzo: [],
                extras: []
            };
            const existing = { idCheckin: 55, entregableTexto: 'Old text' };
            mockCheckinRepo.findOne.mockResolvedValue(existing);
            mockCheckinRepo.save.mockResolvedValue({ ...existing, ...dto });

            await service.checkinUpsert(dto as any);

            expect(mockCheckinRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                idCheckin: 55,
                entregableTexto: 'Updated text'
            }));
        });
    });

    // ==================== Equipo Tests ====================
    describe('equipoHoy', () => {
        it('should handle empty team gracefully', async () => {
            // Mock interno de getSubtreeUserIds (privado) - una forma es mockear query o find
            mockUoRepo.find.mockResolvedValue([]); // No related org nodes found -> empty team
            mockDataSource.query.mockResolvedValue([]);

            const result = await service.equipoHoy(1, '2024-01-15');

            expect(result.miembros).toEqual([]);
            expect(result.resumenAnimo.promedio).toBe(0);
        });
    });
});
