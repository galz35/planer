import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// Mock de Entidades para evitar ciclos
jest.mock('../auth/entities/usuario.entity', () => ({ Usuario: class MockUsuario { } }));
jest.mock('../auth/entities/organizacion-nodo.entity', () => ({ OrganizacionNodo: class MockOrganizacionNodo { } }));
jest.mock('../auth/entities/usuario-organizacion.entity', () => ({ UsuarioOrganizacion: class MockUsuarioOrganizacion { } }));
jest.mock('../planning/entities/tarea.entity', () => ({ Tarea: class MockTarea { } }));
jest.mock('../planning/entities/proyecto.entity', () => ({ Proyecto: class MockProyecto { } }));
jest.mock('./entities/bloqueo.entity', () => ({ Bloqueo: class MockBloqueo { } }));
jest.mock('./entities/checkin.entity', () => ({ Checkin: class MockCheckin { } }));

// Imports de entidades mockeadas
import { Usuario } from '../auth/entities/usuario.entity';
import { OrganizacionNodo } from '../auth/entities/organizacion-nodo.entity';
import { UsuarioOrganizacion } from '../auth/entities/usuario-organizacion.entity';
import { Tarea } from '../planning/entities/tarea.entity';
import { Proyecto } from '../planning/entities/proyecto.entity';
import { Bloqueo } from './entities/bloqueo.entity';
import { Checkin } from './entities/checkin.entity';

describe('ReportsService', () => {
    let service: ReportsService;
    let mockUserRepo: any;
    let mockTareaRepo: any;
    let mockBloqueoRepo: any;
    let mockNodoRepo: any;
    let mockUoRepo: any;
    let mockCheckinRepo: any;
    let mockProyectoRepo: any;
    let mockDataSource: any;

    beforeEach(async () => {
        // Create fresh mocks
        const mockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([]),
            getRawOne: jest.fn().mockResolvedValue(null),
            getCount: jest.fn().mockResolvedValue(0),
            getMany: jest.fn().mockResolvedValue([]),
        };

        mockUserRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };

        mockTareaRepo = {
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };

        mockBloqueoRepo = {
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        };

        mockNodoRepo = {
            find: jest.fn().mockResolvedValue([]),
        };

        mockUoRepo = {
            find: jest.fn().mockResolvedValue([]),
        };

        mockCheckinRepo = {
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
        };

        mockProyectoRepo = {
            find: jest.fn().mockResolvedValue([]),
        };

        mockDataSource = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            query: jest.fn().mockResolvedValue([]),
            getRepository: jest.fn().mockImplementation((entity) => {
                if (entity === UsuarioOrganizacion) return mockUoRepo;
                return { find: jest.fn(), count: jest.fn() };
            })
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportsService,
                { provide: getRepositoryToken(Usuario), useValue: mockUserRepo },
                { provide: getRepositoryToken(Tarea), useValue: mockTareaRepo },
                { provide: getRepositoryToken(Bloqueo), useValue: mockBloqueoRepo },
                { provide: getRepositoryToken(OrganizacionNodo), useValue: mockNodoRepo },
                { provide: getRepositoryToken(UsuarioOrganizacion), useValue: mockUoRepo },
                { provide: getRepositoryToken(Checkin), useValue: mockCheckinRepo },
                { provide: getRepositoryToken(Proyecto), useValue: mockProyectoRepo },
                { provide: DataSource, useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<ReportsService>(ReportsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getReporteProductividad', () => {
        it('should return empty array for team with no members', async () => {
            mockDataSource.query.mockResolvedValue([]); // No nodes
            mockUoRepo.find.mockResolvedValue([]); // No users

            const result = await service.getReporteProductividad(1, {});

            expect(result).toEqual([]);
        });
    });

    describe('getReporteBloqueosTrend', () => {
        it('should return empty array when no team members', async () => {
            mockDataSource.query.mockResolvedValue([]);
            mockUoRepo.find.mockResolvedValue([]);

            const result = await service.getReporteBloqueosTrend(1, {});

            expect(result).toEqual([]);
        });
    });

    describe('getReporteEquipoPerformance', () => {
        it('should return empty array when no team members', async () => {
            mockDataSource.query.mockResolvedValue([]);
            mockUoRepo.find.mockResolvedValue([]);

            const result = await service.getReporteEquipoPerformance(1, {});

            expect(result).toEqual([]);
        });
    });

    describe('equipoBloqueos', () => {
        it('should return empty array when no team', async () => {
            mockDataSource.query.mockResolvedValue([]);
            mockUoRepo.find.mockResolvedValue([]);

            const result = await service.equipoBloqueos(1, '2024-01-15');

            expect(result).toEqual([]);
        });
    });

    describe('getWorkload', () => {
        it('should return object with empty arrays when no team', async () => {
            mockDataSource.query.mockResolvedValue([]);
            mockUoRepo.find.mockResolvedValue([]);

            const result = await service.getWorkload(1);

            expect(result).toEqual({ users: [], tasks: [] });
        });
    });

    describe('gerenciaResumen', () => {
        it('should return empty array when no related nodes', async () => {
            mockDataSource.getRepository = jest.fn().mockReturnValue({
                find: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
                findOneBy: jest.fn().mockResolvedValue(null)
            });

            const result = await service.gerenciaResumen(1, '2024-01-15');

            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual([]);
        });
    });

    describe('getDateRange (private helper)', () => {
        it('service should be defined and helper works indirectly', () => {
            // We test this indirectly through other methods
            expect(service).toBeDefined();
        });
    });
});
