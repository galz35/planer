import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

// MOCK DE MODULOS DE ENTIDADES para evitar cargar los archivos reales que tienen ciclos
jest.mock('./entities/usuario.entity', () => ({
    Usuario: class MockUsuario { }
}));
jest.mock('./entities/usuario-credenciales.entity', () => ({
    UsuarioCredenciales: class MockUsuarioCredenciales { }
}));

// --- Mocks Locales para usar en el test (aunque los de arriba ya cubren la importacion)
// Re-definimos para claridad de tipos en el test
class MockUsuario {
    idUsuario: number;
    nombre: string;
    correo: string;
    rolGlobal: string;
}

class MockUsuarioCredenciales {
    idUsuario: number;
    passwordHash: string;
    ultimoLogin: Date;
    refreshTokenHash: string;
}

describe('AuthService', () => {
    let service: AuthService;
    let jwtService: JwtService;
    let userRepo: any;
    let credsRepo: any;

    const mockUserRepo = {
        findOne: jest.fn(),
    };

    const mockCredsRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
    };

    const mockJwtService = {
        signAsync: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: getRepositoryToken(MockUsuario), useValue: mockUserRepo },
                { provide: getRepositoryToken(MockUsuarioCredenciales), useValue: mockCredsRepo },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jwtService = module.get<JwtService>(JwtService);
        userRepo = module.get(getRepositoryToken(MockUsuario));
        credsRepo = module.get(getRepositoryToken(MockUsuarioCredenciales));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ==================== validateUser Tests ====================
    describe('validateUser', () => {
        const mockUser = {
            idUsuario: 1,
            nombre: 'Test User',
            correo: 'test@example.com',
            activo: true,
            rolGlobal: 'User',
            rol: { idRol: 1, nombre: 'Employee' }
        };

        const mockCreds = {
            idUsuario: 1,
            passwordHash: 'hashedPassword123',
            ultimoLogin: null
        };

        it('should return user when credentials are valid', async () => {
            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockCredsRepo.findOne.mockResolvedValue(mockCreds);
            mockCredsRepo.save.mockResolvedValue({ ...mockCreds, ultimoLogin: new Date() });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.validateUser('test@example.com', 'password123');

            expect(result).toEqual(mockUser);
            expect(mockUserRepo.findOne).toHaveBeenCalledWith({
                where: [
                    { correo: 'test@example.com', activo: true },
                    { carnet: 'test@example.com', activo: true }
                ],
                relations: ['rol']
            });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
            expect(mockCredsRepo.save).toHaveBeenCalled();
        });

        it('should return null when user does not exist', async () => {
            mockUserRepo.findOne.mockResolvedValue(null);

            const result = await service.validateUser('nonexistent@example.com', 'password');

            expect(result).toBeNull();
            expect(mockCredsRepo.findOne).not.toHaveBeenCalled();
        });

        it('should return null when password is incorrect', async () => {
            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockCredsRepo.findOne.mockResolvedValue(mockCreds);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const result = await service.validateUser('test@example.com', 'wrongpassword');

            expect(result).toBeNull();
            expect(mockCredsRepo.save).not.toHaveBeenCalled();
        });

        it('should return null when user has no credentials', async () => {
            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockCredsRepo.findOne.mockResolvedValue(null);

            const result = await service.validateUser('test@example.com', 'password123');

            expect(result).toBeNull();
        });

        it('should return null for inactive user', async () => {
            mockUserRepo.findOne.mockResolvedValue(null); // activo: false won't match query

            const result = await service.validateUser('inactive@example.com', 'password123');

            expect(result).toBeNull();
        });
    });

    // ==================== login Tests ====================
    describe('login', () => {
        const mockUser = {
            idUsuario: 1,
            nombre: 'Test User',
            correo: 'test@example.com',
            carnet: 'E123456',
            rol: { idRol: 1, nombre: 'Employee' },
            rolGlobal: 'User'
        };

        it('should return tokens and user info on successful login', async () => {
            mockJwtService.signAsync
                .mockResolvedValueOnce('access_token_123')
                .mockResolvedValueOnce('refresh_token_456');
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_refresh_token');
            mockCredsRepo.update.mockResolvedValue({});

            const result = await service.login(mockUser);

            expect(result).toEqual({
                access_token: 'access_token_123',
                refresh_token: 'refresh_token_456',
                user: {
                    idUsuario: 1,
                    nombre: 'Test User',
                    correo: 'test@example.com',
                    carnet: 'E123456',
                    rol: { idRol: 1, nombre: 'Employee' },
                    rolGlobal: 'User',
                    pais: undefined
                }
            });
            expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
            expect(mockCredsRepo.update).toHaveBeenCalled();
        });

        it('should generate tokens with correct payload', async () => {
            mockJwtService.signAsync.mockResolvedValue('token');
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
            mockCredsRepo.update.mockResolvedValue({});

            await service.login(mockUser);

            expect(mockJwtService.signAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    correo: 'test@example.com',
                    sub: 1,
                    userId: 1,
                    rol: 'User'
                }),
                expect.objectContaining({ expiresIn: '1h' })
            );
        });
    });

    // ==================== refreshTokens Tests ====================
    describe('refreshTokens', () => {
        const mockUser = {
            idUsuario: 1,
            nombre: 'Test User',
            correo: 'test@example.com',
            rol: { idRol: 1, nombre: 'Employee' },
            rolGlobal: 'User'
        };

        const mockCreds = {
            idUsuario: 1,
            refreshTokenHash: 'hashed_refresh_token'
        };

        it('should return new tokens when refresh token is valid', async () => {
            mockCredsRepo.findOne.mockResolvedValue(mockCreds);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockUserRepo.findOne.mockResolvedValue(mockUser);
            mockJwtService.signAsync
                .mockResolvedValueOnce('new_access_token')
                .mockResolvedValueOnce('new_refresh_token');
            (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_refresh');
            mockCredsRepo.update.mockResolvedValue({});

            const result = await service.refreshTokens(1, 'valid_refresh_token');

            expect(result).toEqual({
                access_token: 'new_access_token',
                refresh_token: 'new_refresh_token'
            });
        });

        it('should throw UnauthorizedException when credentials not found', async () => {
            mockCredsRepo.findOne.mockResolvedValue(null);

            await expect(service.refreshTokens(1, 'token'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException when no refresh token stored', async () => {
            mockCredsRepo.findOne.mockResolvedValue({ idUsuario: 1, refreshTokenHash: null });

            await expect(service.refreshTokens(1, 'token'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException when refresh token does not match', async () => {
            mockCredsRepo.findOne.mockResolvedValue(mockCreds);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.refreshTokens(1, 'invalid_token'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException when user no longer exists', async () => {
            mockCredsRepo.findOne.mockResolvedValue(mockCreds);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockUserRepo.findOne.mockResolvedValue(null);

            await expect(service.refreshTokens(1, 'valid_token'))
                .rejects.toThrow(UnauthorizedException);
        });
    });
});
