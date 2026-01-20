import { Test, TestingModule } from '@nestjs/testing';
import { ClarityService } from './clarity.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResourceNotFoundException, BusinessRuleException, InsufficientPermissionsException } from '../common/exceptions';

// Mocks de Entidades
jest.mock('../auth/entities/usuario.entity', () => ({ Usuario: class MockUsuario { } }));
jest.mock('../auth/entities/organizacion-nodo.entity', () => ({ OrganizacionNodo: class MockOrganizacionNodo { } }));
jest.mock('../auth/entities/usuario-organizacion.entity', () => ({ UsuarioOrganizacion: class MockUsuarioOrganizacion { } }));
jest.mock('../auth/entities/usuario-config.entity', () => ({ UsuarioConfig: class MockUsuarioConfig { } }));
jest.mock('../auth/entities/rol.entity', () => ({ Rol: class MockRol { } }));
jest.mock('../common/entities/log-sistema.entity', () => ({ LogSistema: class MockLogSistema { } }));
jest.mock('../common/entities/audit-log.entity', () => ({ AuditLog: class MockAuditLog { } }));
jest.mock('../common/audit.service', () => ({ AuditService: class MockAuditService { } }));

import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { UsuarioConfig } from '../auth/entities/usuario-config.entity';
import { Rol } from '../auth/entities/rol.entity';
import { LogSistema } from '../common/entities/log-sistema.entity';
import { AuditLog } from '../common/entities/audit-log.entity';
import { AuditService } from '../common/audit.service';

describe('ClarityService', () => {
    let service: ClarityService;
    let auditService: AuditService;

    // Mock Repositories
    let mockUserRepo: any;
    let mockNodoRepo: any;
    let mockConfigRepo: any;
    let mockUoRepo: any;
    let mockLogRepo: any;
    let mockRolRepo: any;

    beforeEach(async () => {
        mockUserRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            findOneBy: jest.fn().mockResolvedValue(null),
            findAndCount: jest.fn().mockResolvedValue([[], 0]),
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(dto => Promise.resolve({ idUsuario: 1, ...dto })),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
            count: jest.fn().mockResolvedValue(0),
        };

        mockNodoRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            findOneBy: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(dto => Promise.resolve({ idNodo: 1, ...dto })),
        };

        mockConfigRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(dto => Promise.resolve({ ...dto })),
        };

        mockUoRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(dto => Promise.resolve({ idRelacion: 1, ...dto })),
        };

        mockLogRepo = {
            findAndCount: jest.fn().mockResolvedValue([[], 0]),
            save: jest.fn().mockImplementation(dto => Promise.resolve({ idLog: 1, ...dto })),
        };

        mockRolRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            findOneBy: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(dto => Promise.resolve({ idRol: 1, ...dto })),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
            remove: jest.fn().mockResolvedValue({}),
        };

        const mockAuditService = {
            log: jest.fn().mockResolvedValue({ idAuditLog: 1 }),
            listarAudit: jest.fn().mockResolvedValue({ items: [], total: 0, totalPages: 0 }),
            getHistorialEntidad: jest.fn().mockResolvedValue([]),
        };

        const mockDataSource = {
            getRepository: jest.fn(),
            query: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ClarityService,
                { provide: DataSource, useValue: mockDataSource },
                { provide: getRepositoryToken(Usuario), useValue: mockUserRepo },
                { provide: getRepositoryToken(OrganizacionNodo), useValue: mockNodoRepo },
                { provide: getRepositoryToken(UsuarioConfig), useValue: mockConfigRepo },
                { provide: getRepositoryToken(UsuarioOrganizacion), useValue: mockUoRepo },
                { provide: getRepositoryToken(LogSistema), useValue: mockLogRepo },
                { provide: getRepositoryToken(Rol), useValue: mockRolRepo },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get<ClarityService>(ClarityService);
        auditService = module.get<AuditService>(AuditService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('usuariosListarTodos', () => {
        it('should list all users with pagination', async () => {
            const result = await service.usuariosListarTodos(1, 10);
            expect(mockUserRepo.findAndCount).toHaveBeenCalled();
            expect(result.items).toEqual([]);
        });
    });

    describe('auditLogsListar', () => {
        it('should call auditService.listarAudit', async () => {
            await service.auditLogsListar({ page: 1, limit: 10 });
            expect(auditService.listarAudit).toHaveBeenCalled();
        });
    });

    describe('auditLogsByTask', () => {
        it('should call auditService.getHistorialEntidad', async () => {
            await service.auditLogsByTask(123);
            expect(auditService.getHistorialEntidad).toHaveBeenCalledWith('Tarea', '123');
        });
    });

    describe('rolCrear', () => {
        it('should create a new role and log audit', async () => {
            const rolDto = { nombre: 'Manager', descripcion: 'Manager role', reglas: [] };
            mockRolRepo.findOne.mockResolvedValue(null);

            await service.rolCrear(rolDto as any, 1);

            expect(mockRolRepo.save).toHaveBeenCalled();
            expect(auditService.log).toHaveBeenCalled();
        });

        it('should throw BusinessRuleException for duplicate role name', async () => {
            const rolDto = { nombre: 'Admin', descripcion: 'Duplicate' };
            mockRolRepo.findOne.mockResolvedValue({ idRol: 1, nombre: 'Admin' });

            await expect(service.rolCrear(rolDto as any, 1))
                .rejects.toThrow(BusinessRuleException);
        });
    });

    describe('rolEliminar', () => {
        it('should delete a non-system role and log audit', async () => {
            const role = { idRol: 3, nombre: 'CustomRole', esSistema: false };
            mockRolRepo.findOneBy.mockResolvedValue(role);
            mockUserRepo.count.mockResolvedValue(0);

            await service.rolEliminar(3, 1);

            expect(mockRolRepo.remove).toHaveBeenCalledWith(role);
            expect(auditService.log).toHaveBeenCalled();
        });

        it('should throw InsufficientPermissionsException for system role deletion', async () => {
            const systemRole = { idRol: 1, nombre: 'Admin', esSistema: true };
            mockRolRepo.findOneBy.mockResolvedValue(systemRole);

            await expect(service.rolEliminar(1, 1))
                .rejects.toThrow(InsufficientPermissionsException);
        });
    });

    describe('nodoCrear', () => {
        it('should create organization node and log audit', async () => {
            const nodoDto = { nombre: 'Marketing', tipo: 'Departamento', idPadre: 1 };
            await service.nodoCrear(nodoDto as any, 1);
            expect(mockNodoRepo.save).toHaveBeenCalled();
            expect(auditService.log).toHaveBeenCalled();
        });
    });

    describe('usuarioAsignarANodo', () => {
        it('should create new assignment and log audit', async () => {
            const dto = { idUsuario: 5, idNodo: 3, rol: 'Miembro' };
            mockUoRepo.findOne.mockResolvedValue(null);

            await service.usuarioAsignarANodo(dto as any, 1);

            expect(mockUoRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                idUsuario: 5,
                idNodo: 3,
                rol: 'Miembro'
            }));
            expect(mockUoRepo.save).toHaveBeenCalled();
            expect(auditService.log).toHaveBeenCalled();
        });
    });
});
