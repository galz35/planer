import { Test, TestingModule } from '@nestjs/testing';
import { FocoService } from './foco.service';
import { getRepositoryToken } from '@nestjs/typeorm';

// Mock entidades para evitar ciclos
jest.mock('./entities/foco-diario.entity', () => ({ FocoDiario: class MockFocoDiario { } }));
jest.mock('../planning/entities/tarea.entity', () => ({ Tarea: class MockTarea { } }));

// Imports de entidades mockeadas
import { FocoDiario } from './entities/foco-diario.entity';
import { Tarea } from '../planning/entities/tarea.entity';

describe('FocoService', () => {
    let service: FocoService;
    let mockFocoRepo: any;
    let mockTareaRepo: any;

    beforeEach(async () => {
        mockFocoRepo = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            findOneBy: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(dto => Promise.resolve({ idFoco: 1, ...dto })),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
            remove: jest.fn().mockResolvedValue({}),
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(0),
                clone: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue(null),
            }),
        };

        mockTareaRepo = {
            findOne: jest.fn().mockResolvedValue({ idTarea: 1 }),
            findOneBy: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FocoService,
                { provide: getRepositoryToken(FocoDiario), useValue: mockFocoRepo },
                { provide: getRepositoryToken(Tarea), useValue: mockTareaRepo },
            ],
        }).compile();

        service = module.get<FocoService>(FocoService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getFocoDelDia', () => {
        it('should return focus items for user and date', async () => {
            const mockFocos = [
                { idFoco: 1, idTarea: 1, columna: 'objetivo', orden: 0, tarea: { idTarea: 1 }, fechaPrimerFoco: '2024-01-01' },
                { idFoco: 2, idTarea: 2, columna: 'avanzar', orden: 0, tarea: { idTarea: 2 }, fechaPrimerFoco: '2024-01-01' }
            ];
            // First call matches arrastrarPendientes (should return empty to avoid complexity)
            mockFocoRepo.find.mockResolvedValueOnce([]);
            // Second call matches the actual fetch
            mockFocoRepo.find.mockResolvedValueOnce(mockFocos);

            const result = await service.getFocoDelDia(1, '2024-01-15');

            expect(result).toHaveLength(2);
            expect(result[0].idFoco).toBe(1);
        });

        it('should return empty array when no focus items', async () => {
            mockFocoRepo.find.mockResolvedValue([]);

            const result = await service.getFocoDelDia(1, '2024-01-15');

            expect(result).toEqual([]);
        });
    });

    describe('agregarAlFoco', () => {
        it('should add task to focus', async () => {
            const dto = { idTarea: 1, fecha: '2024-01-15', columna: 'objetivo' as const };
            mockFocoRepo.findOne.mockResolvedValue(null); // Not already in focus
            mockTareaRepo.findOne.mockResolvedValue({ idTarea: 1 }); // Task exists

            await service.agregarAlFoco(1, dto);

            expect(mockFocoRepo.create).toHaveBeenCalled();
            expect(mockFocoRepo.save).toHaveBeenCalled();
        });

        it('should not duplicate if already in focus', async () => {
            const dto = { idTarea: 1, fecha: '2024-01-15', columna: 'objetivo' as const };
            const existing = { idFoco: 1, idTarea: 1 };

            mockTareaRepo.findOne.mockResolvedValue({ idTarea: 1 });
            mockFocoRepo.findOne.mockResolvedValue(existing);

            const result = await service.agregarAlFoco(1, dto);

            expect(result).toEqual(existing);
            expect(mockFocoRepo.create).not.toHaveBeenCalled();
        });
    });

    describe('actualizarFoco', () => {
        it('should update focus item', async () => {
            const existing = { idFoco: 1, idTarea: 1, esEstrategico: false, completadoEnFecha: null };
            mockFocoRepo.findOne.mockResolvedValue(existing);

            const dto = { esEstrategico: true, completado: true };
            await service.actualizarFoco(1, 1, dto, '2024-01-15');

            expect(mockFocoRepo.save).toHaveBeenCalled();
            expect(existing.esEstrategico).toBe(true);
        });

        it('should throw Error for non-existent focus', async () => {
            mockFocoRepo.findOne.mockResolvedValue(null);

            await expect(service.actualizarFoco(1, 999, {}, '2024-01-15'))
                .rejects.toThrow('Foco no encontrado');
        });
    });

    describe('quitarDelFoco', () => {
        it('should remove focus item', async () => {
            const existing = { idFoco: 1, idTarea: 1 };
            mockFocoRepo.findOne.mockResolvedValue(existing);

            await service.quitarDelFoco(1, 1);

            expect(mockFocoRepo.remove).toHaveBeenCalledWith(existing);
        });

        it('should throw Error for non-existent focus', async () => {
            mockFocoRepo.findOne.mockResolvedValue(null);

            await expect(service.quitarDelFoco(1, 999))
                .rejects.toThrow('Foco no encontrado');
        });
    });

    describe('reordenarFocos', () => {
        it('should reorder focus items', async () => {
            const dto = [3, 1, 2]; // ids

            await service.reordenarFocos(1, '2024-01-15', dto);

            expect(mockFocoRepo.update).toHaveBeenCalledTimes(3);
        });
    });

    describe('getEstadisticasFoco', () => {
        it('should return focus statistics', async () => {
            mockFocoRepo.createQueryBuilder.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getCount: jest.fn().mockResolvedValue(10), // total
                clone: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ promedio: 1.5 }),
            });

            const result = await service.getEstadisticasFoco(1, 1, 2024);

            expect(result).toHaveProperty('total', 10);
            expect(result).toHaveProperty('promedioArrastre');
        });
    });
});
