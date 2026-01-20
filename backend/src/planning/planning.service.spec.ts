import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Mocks de Entidades
jest.mock('./entities/tarea.entity', () => ({ Tarea: class MockTarea { } }));
jest.mock('./entities/proyecto.entity', () => ({ Proyecto: class MockProyecto { } }));
jest.mock('./entities/solicitud-cambio.entity', () => ({ SolicitudCambio: class MockSolicitudCambio { } }));
jest.mock('./entities/plan-trabajo.entity', () => ({ PlanTrabajo: class MockPlanTrabajo { } }));
jest.mock('./entities/tarea-asignado.entity', () => ({ TareaAsignado: class MockTareaAsignado { } }));
jest.mock('../auth/entities/usuario.entity', () => ({ Usuario: class MockUsuario { } }));
jest.mock('../auth/entities/organizacion-nodo.entity', () => ({ OrganizacionNodo: class MockOrganizacionNodo { } }));
jest.mock('../auth/entities/usuario-organizacion.entity', () => ({ UsuarioOrganizacion: class MockUsuarioOrganizacion { } }));
jest.mock('../common/audit.service', () => ({ AuditService: class MockAuditService { } }));

import { Tarea } from './entities/tarea.entity';
import { Proyecto } from './entities/proyecto.entity';
import { SolicitudCambio } from './entities/solicitud-cambio.entity';
import { PlanTrabajo } from './entities/plan-trabajo.entity';
import { TareaAsignado } from './entities/tarea-asignado.entity';
import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { AuditService } from '../common/audit.service';

describe('PlanningService', () => {
    let service: PlanningService;
    let auditService: AuditService;

    const createMockRepo = () => ({
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockImplementation(dto => Promise.resolve({ id: 1, ...dto })),
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findOneBy: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
    });

    const mockTareaRepo = createMockRepo();
    const mockProyectoRepo = createMockRepo();
    const mockSolicitudRepo = createMockRepo();
    const mockUsuarioRepo = createMockRepo();
    const mockPlanRepo = createMockRepo();
    const mockUserOrgRepo = createMockRepo();
    const mockAsignadoRepo = createMockRepo();
    const mockNodoRepo = createMockRepo();

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PlanningService,
                { provide: getRepositoryToken(Tarea), useValue: mockTareaRepo },
                { provide: getRepositoryToken(Proyecto), useValue: mockProyectoRepo },
                { provide: getRepositoryToken(SolicitudCambio), useValue: mockSolicitudRepo },
                { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
                { provide: getRepositoryToken(PlanTrabajo), useValue: mockPlanRepo },
                { provide: getRepositoryToken(UsuarioOrganizacion), useValue: mockUserOrgRepo },
                { provide: getRepositoryToken(TareaAsignado), useValue: mockAsignadoRepo },
                { provide: getRepositoryToken(OrganizacionNodo), useValue: mockNodoRepo },
                { provide: AuditService, useValue: { log: jest.fn() } },
            ],
        }).compile();

        service = module.get<PlanningService>(PlanningService);
        auditService = module.get<AuditService>(AuditService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== checkEditPermission Tests ====================
    describe('checkEditPermission', () => {
        it('should allow free edit for personal tasks (no project)', async () => {
            const task = { idTarea: 1, titulo: 'Personal Task', proyecto: null };
            mockTareaRepo.findOne.mockResolvedValue(task);

            const result = await service.checkEditPermission(1, 10);

            expect(result).toEqual({
                puedeEditar: true,
                requiereAprobacion: false,
                tipoProyecto: 'Personal'
            });
        });

        it('should require approval for strategic projects (non-admin)', async () => {
            const task = {
                idTarea: 1,
                titulo: 'Strategic Task',
                proyecto: { idProyecto: 1, tipo: 'Estrategico', requiereAprobacion: true }
            };
            const user = { idUsuario: 10, rolGlobal: 'User' };

            mockTareaRepo.findOne.mockResolvedValue(task);
            mockUsuarioRepo.findOne.mockResolvedValue(user);

            const result = await service.checkEditPermission(1, 10);

            expect(result).toEqual({
                puedeEditar: true,
                requiereAprobacion: true,
                tipoProyecto: 'Estrategico'
            });
        });

        it('should bypass approval for Admin on strategic projects', async () => {
            const task = {
                idTarea: 1,
                titulo: 'Strategic Task',
                proyecto: { idProyecto: 1, tipo: 'Estrategico', requiereAprobacion: true }
            };
            const adminUser = { idUsuario: 1, rolGlobal: 'Admin' };

            mockTareaRepo.findOne.mockResolvedValue(task);
            mockUsuarioRepo.findOne.mockResolvedValue(adminUser);

            const result = await service.checkEditPermission(1, 1);

            expect(result).toEqual({
                puedeEditar: true,
                requiereAprobacion: false,
                tipoProyecto: 'Estrategico'
            });
        });

        it('should allow free edit for operative projects', async () => {
            const task = {
                idTarea: 1,
                titulo: 'Operative Task',
                proyecto: { idProyecto: 2, tipo: 'Operativo', requiereAprobacion: false }
            };
            mockTareaRepo.findOne.mockResolvedValue(task);

            const result = await service.checkEditPermission(1, 10);

            expect(result).toEqual({
                puedeEditar: true,
                requiereAprobacion: false,
                tipoProyecto: 'Operativo'
            });
        });

        it('should throw NotFoundException for non-existent task', async () => {
            mockTareaRepo.findOne.mockResolvedValue(null);

            await expect(service.checkEditPermission(999, 10))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== solicitarCambio Tests ====================
    describe('solicitarCambio', () => {
        const existingTask = {
            idTarea: 1,
            titulo: 'Test Task',
            fechaObjetivo: '2024-01-15'
        };

        it('should create a change request', async () => {
            mockTareaRepo.findOne.mockResolvedValue(existingTask);
            mockSolicitudRepo.save.mockResolvedValue({ idSolicitud: 100 });

            const result = await service.solicitarCambio(
                10,
                1,
                'fechaObjetivo',
                '2024-02-15',
                'Need more time'
            );

            expect(mockSolicitudRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                idTarea: 1,
                idUsuarioSolicitante: 10,
                campoAfectado: 'fechaObjetivo',
                valorAnterior: '2024-01-15',
                valorNuevo: '2024-02-15',
                motivo: 'Need more time',
                estado: 'Pendiente'
            }));
            expect(mockSolicitudRepo.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException for non-existent task', async () => {
            mockTareaRepo.findOne.mockResolvedValue(null);

            await expect(service.solicitarCambio(10, 999, 'titulo', 'New', 'Reason'))
                .rejects.toThrow(NotFoundException);
        });

        it('should handle empty previous value', async () => {
            const taskWithNullField = { idTarea: 1, fechaObjetivo: null };
            mockTareaRepo.findOne.mockResolvedValue(taskWithNullField);
            mockSolicitudRepo.save.mockResolvedValue({ idSolicitud: 101 });

            await service.solicitarCambio(10, 1, 'fechaObjetivo', '2024-02-15', 'Setting date');

            expect(mockSolicitudRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                valorAnterior: ''
            }));
        });
    });

    // ==================== getSolicitudesPendientes Tests ====================
    describe('getSolicitudesPendientes', () => {
        it('should return pending requests', async () => {
            const pendingRequests = [
                { idSolicitud: 1, estado: 'Pendiente', tarea: { titulo: 'Task 1' } },
                { idSolicitud: 2, estado: 'Pendiente', tarea: { titulo: 'Task 2' } }
            ];
            mockSolicitudRepo.find.mockResolvedValue(pendingRequests);

            const result = await service.getSolicitudesPendientes(1);

            expect(result).toEqual(pendingRequests);
            expect(mockSolicitudRepo.find).toHaveBeenCalledWith({
                where: { estado: 'Pendiente' },
                relations: ['tarea', 'tarea.proyecto', 'usuarioSolicitante'],
                order: { fechaSolicitud: 'DESC' }
            });
        });

        it('should return empty array when no pending requests', async () => {
            mockSolicitudRepo.find.mockResolvedValue([]);

            const result = await service.getSolicitudesPendientes(1);

            expect(result).toEqual([]);
        });
    });

    // ==================== resolverSolicitud Tests ====================
    describe('resolverSolicitud', () => {
        const pendingSolicitud = {
            idSolicitud: 1,
            estado: 'Pendiente',
            idTarea: 10,
            campoAfectado: 'fechaObjetivo',
            valorNuevo: '2024-03-01',
            tarea: { idTarea: 10, titulo: 'Test' }
        };

        it('should approve a request and apply changes', async () => {
            mockSolicitudRepo.findOne.mockResolvedValue({ ...pendingSolicitud });
            mockSolicitudRepo.save.mockResolvedValue({ ...pendingSolicitud, estado: 'Aprobado' });
            mockTareaRepo.update.mockResolvedValue({ affected: 1 });

            const result = await service.resolverSolicitud(5, 1, 'Aprobar');

            expect(mockTareaRepo.update).toHaveBeenCalledWith(10, { fechaObjetivo: '2024-03-01' });
            expect(mockSolicitudRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                estado: 'Aprobado',
                idAprobador: 5
            }));
            expect(auditService.log).toHaveBeenCalled();
        });

        it('should reject a request without applying changes', async () => {
            mockSolicitudRepo.findOne.mockResolvedValue({ ...pendingSolicitud });
            mockSolicitudRepo.save.mockResolvedValue({ ...pendingSolicitud, estado: 'Rechazado' });

            const result = await service.resolverSolicitud(5, 1, 'Rechazar');

            expect(mockTareaRepo.update).not.toHaveBeenCalled();
            expect(mockSolicitudRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                estado: 'Rechazado',
                idAprobador: 5
            }));
        });

        it('should throw NotFoundException for non-existent request', async () => {
            mockSolicitudRepo.findOne.mockResolvedValue(null);

            await expect(service.resolverSolicitud(5, 999, 'Aprobar'))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException for already processed request', async () => {
            const processedSolicitud = { ...pendingSolicitud, estado: 'Aprobado' };
            mockSolicitudRepo.findOne.mockResolvedValue(processedSolicitud);

            await expect(service.resolverSolicitud(5, 1, 'Rechazar'))
                .rejects.toThrow(BadRequestException);
        });
    });

    // ==================== updateTareaOperativa Tests ====================
    describe('updateTareaOperativa', () => {
        it('should update operative task and create audit log', async () => {
            const task = {
                idTarea: 1,
                titulo: 'Operative Task',
                proyecto: { tipo: 'Operativo' }
            };
            mockTareaRepo.findOne
                .mockResolvedValueOnce(task) // For checkEditPermission
                .mockResolvedValueOnce(task) // For getting previous state
                .mockResolvedValueOnce({ ...task, titulo: 'Updated' }); // For return
            mockTareaRepo.update.mockResolvedValue({ affected: 1 });

            const result = await service.updateTareaOperativa(10, 1, { titulo: 'Updated' });

            expect(mockTareaRepo.update).toHaveBeenCalledWith(1, { titulo: 'Updated' });
            expect(auditService.log).toHaveBeenCalled();
        });

        it('should throw ForbiddenException for strategic tasks', async () => {
            const strategicTask = {
                idTarea: 1,
                titulo: 'Strategic Task',
                proyecto: { tipo: 'Estrategico', requiereAprobacion: true }
            };
            const normalUser = { idUsuario: 10, rolGlobal: 'User' };

            mockTareaRepo.findOne.mockResolvedValue(strategicTask);
            mockUsuarioRepo.findOne.mockResolvedValue(normalUser);

            await expect(service.updateTareaOperativa(10, 1, { titulo: 'Changed' }))
                .rejects.toThrow(ForbiddenException);
        });
    });
});
