import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // 1. Helmet — headers de seguridad HTTP (XSS, clickjacking, etc.)
  app.use(helmet());

  // Aumentar límites para uploads (Cloudinary)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 2. Configuración Global de Validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 3. Habilitar CORS
  // En producción: ALLOWED_ORIGINS=https://tudominio.com,https://admin.tudominio.com
  // En desarrollo: fallback a localhost automático
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3002'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // 4. Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('YerbaXanaes API')
    .setDescription('API para gestión de Inventario y E-commerce de Yerba Mate')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación (manejada por Better Auth en Next.js)')
    .addTag('customers', 'Gestión de Clientes')
    .addTag('dashboard', 'Métricas y Estadísticas')
    .addTag('inventory', 'Gestión de Stock y Materia Prima')
    .addTag('catalog', 'Gestión de Productos y Variantes')
    .addTag('orders', 'Gestión de Órdenes')
    .addTag('payments', 'Pagos con MercadoPago')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 5. Arrancar el servidor
  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 API corriendo en http://localhost:${port}`);
  logger.log(`📄 Swagger UI disponible en http://localhost:${port}/api/docs`);
  logger.log(`🔑 Auth: Better Auth corre en http://localhost:3002 (Next.js)`);
}
bootstrap();
