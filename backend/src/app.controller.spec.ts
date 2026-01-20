import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getRepositoryToken } from '@nestjs/typeorm';

// Mock de la entidad para romper ciclo
jest.mock('./auth/entities/usuario.entity', () => ({
  Usuario: class MockUsuario { }
}));

class MockUsuario { }

describe('AppController', () => {
  let appController: AppController;

  const mockAppService = {
    getHello: jest.fn(() => 'Hello World!'),
  };

  const mockUserRepo = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
        { provide: getRepositoryToken(MockUsuario), useValue: mockUserRepo }
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
