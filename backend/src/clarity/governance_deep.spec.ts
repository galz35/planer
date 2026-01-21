import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// --- MOCK ENTIDADES (DEBE IR ANTES DE IMPORTAR TasksService) ---
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
jest.mock('../planning/entities/solicitud-cambio.entity', () => ({ SolicitudCambio: class MockSolicitudCambio { } }));
jest.mock('../common/entities/audit-log.entity', () => ({ AuditLog: class MockAuditLog { } }));

// --- IMPORTS REALES ---
import { TasksService } from './tasks.service';
import { Usuario } from '../auth/entities/usuario.entity';
import { Tarea } from '../planning/entities/tarea.entity';
import { TareaAsignado } from '../planning/entities/tarea-asignado.entity';
import { Proyecto } from '../planning/entities/proyecto.entity';
import { SolicitudCambio } from '../planning/entities/solicitud-cambio.entity';
import { TareaAvance } from '../planning/entities/tarea-avance.entity';
import { Checkin } from './entities/checkin.entity';
import { CheckinTarea } from './entities/checkin-tarea.entity';
import { Bloqueo } from './entities/bloqueo.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { AuditService } from '../common/audit.service';
import { PlanningService } from '../planning/planning.service';
import { VisibilidadService } from '../acceso/visibilidad.service';

describe('Governance & Approvals - Deep Integration Test', () => {
    let service: TasksService;
    let tareaRepo: any;
    let solicitudRepo: any;
    let userRepo: any;

    const createMockRepo = () => ({
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(d => ({ ...d, idSolicitud: Date.now() })),
        find: jest.fn(),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                { provide: getRepositoryToken(Usuario), useValue: createMockRepo() },
                { provide: getRepositoryToken(Tarea), useValue: createMockRepo() },
                { provide: getRepositoryToken(TareaAsignado), useValue: createMockRepo() },
                { provide: getRepositoryToken(TareaAvance), useValue: createMockRepo() },
                { provide: getRepositoryToken(Checkin), useValue: createMockRepo() },
                { provide: getRepositoryToken(CheckinTarea), useValue: createMockRepo() },
                { provide: getRepositoryToken(Bloqueo), useValue: createMockRepo() },
                { provide: getRepositoryToken(Proyecto), useValue: createMockRepo() },
                { provide: getRepositoryToken(OrganizacionNodo), useValue: createMockRepo() },
                { provide: getRepositoryToken(UsuarioOrganizacion), useValue: createMockRepo() },
                { provide: getRepositoryToken(SolicitudCambio), useValue: createMockRepo() },
                { provide: DataSource, useValue: { query: jest.fn() } },
                { provide: AuditService, useValue: { log: jest.fn() } },
                { provide: PlanningService, useValue: {} },
                { provide: VisibilidadService, useValue: {} },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);
        tareaRepo = module.get(getRepositoryToken(Tarea));
        solicitudRepo = module.get(getRepositoryToken(SolicitudCambio));
        userRepo = module.get(getRepositoryToken(Usuario));

        // Default: Mock normal user for most tests
        userRepo.findOne.mockResolvedValue({ idUsuario: 1, rol: { nombre: 'User' } });
    });

    it('Rule 1: Strategic Project requires approval for date changes in CONFIRMADO state', async () => {
        const mockTarea = {
            idTarea: 101,
            fechaObjetivo: '2026-05-01',
            proyecto: { tipo: 'Estrategico', estado: 'Confirmado' }
        };
        tareaRepo.findOne.mockResolvedValue(mockTarea);
        solicitudRepo.save.mockResolvedValue({ idSolicitud: 5555, estado: 'Pendiente' });

        const result: any = await service.tareaActualizar(101, { fechaObjetivo: '2026-06-01', motivo: 'Retraso' }, 1);

        expect(result.requiresApproval).toBe(true);
        expect(result.solicitudId).toBeDefined();
        expect(tareaRepo.save).not.toHaveBeenCalled();
    });

    it('Rule 2: Operative Project DOES NOT require approval if deadline is far away', async () => {
        const mockTarea = {
            idTarea: 102,
            fechaObjetivo: '2026-05-01',
            proyecto: { tipo: 'Operativo', estado: 'Confirmado' }
        };
        tareaRepo.findOne.mockResolvedValue(mockTarea);
        tareaRepo.save.mockResolvedValue({ ...mockTarea, fechaObjetivo: '2026-05-15' });

        const result: any = await service.tareaActualizar(102, { fechaObjetivo: '2026-05-15' }, 1);

        expect(result.requiresApproval).toBeUndefined();
        expect(tareaRepo.save).toHaveBeenCalled();
    });

    it('Rule 3: Imminent Deadline forces approval even on Operative Projects', async () => {
        const imminentDate = new Date();
        imminentDate.setDate(imminentDate.getDate() + 2);

        const mockTarea = {
            idTarea: 103,
            fechaObjetivo: imminentDate.toISOString(),
            proyecto: { tipo: 'Operativo', estado: 'Confirmado' }
        };
        tareaRepo.findOne.mockResolvedValue(mockTarea);
        solicitudRepo.save.mockResolvedValue({ idSolicitud: 6666, estado: 'Pendiente' });

        // Changing date of imminent task should trigger approval
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 10);

        const result: any = await service.tareaActualizar(103, { fechaObjetivo: targetDate.toISOString() }, 1);

        expect(result.requiresApproval).toBe(true);
    });

    it('Rule 4: Admins Bypass bypass approval locks', async () => {
        const mockTarea = {
            idTarea: 105,
            fechaObjetivo: '2026-05-01',
            proyecto: { tipo: 'Estrategico', estado: 'Confirmado' }
        };
        tareaRepo.findOne.mockResolvedValue(mockTarea);
        tareaRepo.save.mockResolvedValue(mockTarea);

        // Mock user as Admin
        userRepo.findOne.mockResolvedValue({ idUsuario: 999, rol: { nombre: 'Admin' } });

        const result: any = await service.tareaActualizar(105, { fechaObjetivo: '2026-06-01' }, 999);

        // Should NOT require approval because user is Admin
        expect(result.requiresApproval).toBeUndefined();
        expect(tareaRepo.save).toHaveBeenCalled();
    });

    it('Rule 5: Resolution Flow - Approving apply changes', async () => {
        const mockTarea = { idTarea: 101, fechaObjetivo: '2026-01-01' };
        const mockSolicitud = {
            idSolicitud: 5555,
            estado: 'Pendiente',
            campoAfectado: 'fechaObjetivo',
            valorNuevo: '2026-03-01',
            tarea: mockTarea
        };
        solicitudRepo.findOne.mockResolvedValue(mockSolicitud);
        solicitudRepo.save.mockImplementation(s => Promise.resolve(s));
        tareaRepo.save.mockResolvedValue(mockTarea);

        const result = await service.resolverSolicitud(5555, 'Aprobar', 1, 'Ok');

        expect(result.estado).toBe('Aprobado');
        expect(mockTarea.fechaObjetivo).toBe('2026-03-01');
        expect(tareaRepo.save).toHaveBeenCalled();
    });
});
