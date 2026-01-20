
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { winstonConfig } from './common/logger/winston.config';
import { WinstonModule } from 'nest-winston';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';

async function bootstrap() {
  // Configuración de Fastify con límite de body aumentado (útil para subidas)
  const adapter = new FastifyAdapter({
    logger: false, // Usamos nuestro propio logger Winston
    bodyLimit: 10485760 // 10MB
  });

  // Habilitar CORS a nivel de adaptador Fastify (más eficiente) o usar Nest enableCors
  adapter.enableCors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      logger: WinstonModule.createLogger(winstonConfig),
    }
  );

  // Registrar multipart para subida de archivos (Excel, etc.)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB máximo
    },
  });


  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  // Nota: Helmet para Fastify requiere @fastify/helmet, lo omitimos por ahora para evitar conflictos de imports
  // Si se desea, instalar y: await app.register(fastifyHelmet);

  // Filtro Global de Excepciones
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Interceptor Global de Transformación
  app.useGlobalInterceptors(new TransformInterceptor());

  // Validación Global
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Clarity API')
    .setDescription('API Backend para sistema Clarity (Fastify Powered)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  // Fastify requiere '0.0.0.0' explícito para ser accesible desde red externa/docker a veces
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`⚡ Engine: Fastify`);
  logger.log(`🚀 SERVIDOR INICIADO LIMPIAMENTE: ` + new Date().toISOString());
}
bootstrap();
// Hot Reload Trigger: Unified System Update

