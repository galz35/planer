import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Clarity E2E', () => {
    let app: INestApplication;
    let authToken: string;

    // Assuming seeded data: juan@empresa.com / 123456
    const testUser = {
        correo: 'juan@empresa.com',
        password: 'password123',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        await app.init();

        // Login logic
        // Note: E2E tests often run against a separate DB. This assumes Dev DB availability.
        // Ideally we would mock the DB connection or use an in-memory DB.
    });

    afterAll(async () => {
        await app.close();
    });

    // Basic health check
    it('/ (GET)', () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(200);
    });

    // Future: Add real Auth flow test once test DB environment is robust
});
