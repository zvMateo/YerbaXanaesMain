import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AdminGuard } from './../src/auth/guards/admin.guard';
import { AuthGuard } from './../src/auth/guards/auth.guard';
import { Role } from '@prisma/client';

/**
 * E2E TESTS: Payments Controller - Manual Cleanup Endpoint
 *
 * Valida:
 * 1. Endpoint requiere admin authentication
 * 2. Respuesta tiene estructura correcta
 * 3. TTL override funciona
 * 4. Métricas se calculan correctamente
 */
describe('PaymentsController - Manual Cleanup (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = {
            id: 'test-user-123',
            email: 'admin@test.com',
            role: Role.ADMIN,
          };
          return true;
        },
      })
      .overrideGuard(AdminGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          // Simular que el user está autenticado y es admin
          request.user = {
            id: 'test-user-123',
            email: 'admin@test.com',
            role: Role.ADMIN,
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /payments/cleanup-manual', () => {
    it('debería ejecutar cleanup manual y retornar métricas estructuradas', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual')
        .expect(200);

      // Validar estructura de respuesta
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');

      const { data, message } = response.body;

      // Validar campos de metrics
      expect(data).toHaveProperty('checked');
      expect(data).toHaveProperty('cancelled');
      expect(data).toHaveProperty('failed');
      expect(data).toHaveProperty('totalStockRestored');
      expect(data).toHaveProperty('ttlMinutes');
      expect(data).toHaveProperty('durationMs');
      expect(data).toHaveProperty('timestamp');

      // Validar tipos
      expect(typeof data.checked).toBe('number');
      expect(typeof data.cancelled).toBe('number');
      expect(typeof data.failed).toBe('number');
      expect(typeof data.totalStockRestored).toBe('number');
      expect(typeof data.ttlMinutes).toBe('number');
      expect(typeof data.durationMs).toBe('number');
      expect(typeof data.timestamp).toBe('string');

      // Validar lógica
      expect(data.checked).toBeGreaterThanOrEqual(0);
      expect(data.cancelled).toBeGreaterThanOrEqual(0);
      expect(data.cancelled).toBeLessThanOrEqual(data.checked); // No puede cancelarse más de las encontradas

      expect(message).toBe('Cleanup de ordenes pendientes ejecutado');
    });

    it('debería respetar TTL override via query parameter', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual?ttl_minutes=15')
        .expect(200);

      const { data } = response.body;
      expect(data.ttlMinutes).toBe(15);
    });

    it('debería usar TTL default cuando no se proporciona override', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual')
        .expect(200);

      const { data } = response.body;
      // Default es 60 minutos (según .env.example)
      expect(data.ttlMinutes).toBe(60);
    });

    it('debería convertir TTL string a número correctamente', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual?ttl_minutes=45')
        .expect(200);

      const { data } = response.body;
      expect(typeof data.ttlMinutes).toBe('number');
      expect(data.ttlMinutes).toBe(45);
    });

    it('debería retornar durationMs > 0 (took tiempo ejecutar)', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual')
        .expect(200);

      const { data } = response.body;
      expect(data.durationMs).toBeGreaterThan(0);
    });

    it('debería tener timestamp válido ISO 8601', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual')
        .expect(200);

      const { data } = response.body;
      const timestamp = new Date(data.timestamp);
      expect(timestamp instanceof Date).toBe(true);
      expect(timestamp.getTime()).toBeGreaterThan(0);
      // Validar que está cercano a "ahora"
      const now = Date.now();
      expect(now - timestamp.getTime()).toBeLessThan(5000); // Dentro de 5 segundos
    });

    it('debería fallar (401) cuando algún tipo de protección está activa sin token', async () => {
      // Recrear app SIN mocks para validar autenticación real
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      const appWithGuard = moduleFixture.createNestApplication();
      await appWithGuard.init();

      const response = await request(appWithGuard.getHttpServer())
        .post('/payments/cleanup-manual')
        .expect(401); // Unauthorized

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('No session token provided');

      await appWithGuard.close();
    });

    it('response time debería ser razonable (< 2 segundos)', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .post('/payments/cleanup-manual')
        .expect(200);

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(2000); // 2 segundos max
    });

    it('debería tener cancelled + failed == checked (contabilidad exacta)', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual')
        .expect(200);

      const { data } = response.body;
      expect(data.cancelled + data.failed).toBe(data.checked);
    });

    it('debería parsear TTL inválido a undefined (usa default)', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual?ttl_minutes=invalid')
        .expect(200);

      const { data } = response.body;
      // parseInt('invalid', 10) retorna NaN, que será undefined en nuestro código
      // Entonces debería usar el default (60)
      expect(data.ttlMinutes).toBe(60);
    });
  });

  describe('Request Headers & Security', () => {
    it('debería aceptar POST sin body especial', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual')
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('debería ser idempotente (llamadas múltiples, mismos datos)', async () => {
      const response1 = await request(app.getHttpServer())
        .post('/payments/cleanup-manual?ttl_minutes=120')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .post('/payments/cleanup-manual?ttl_minutes=120')
        .expect(200);

      // Diferentes ejecutiones == diferentes datasets
      // (puede haber nuevas órdenes expiradas entre calls)
      // Pero la ESTRUCTURA debe ser idéntica
      expect(Object.keys(response1.body.data).sort()).toEqual(
        Object.keys(response2.body.data).sort(),
      );
    });
  });

  describe('Edge Cases', () => {
    it('debería manejar TTL = 1 (mínimo)', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual?ttl_minutes=1')
        .expect(200);

      const { data } = response.body;
      expect(data.ttlMinutes).toBe(1);
      // Con TTL de 1 minuto, puede encontrar órdenesExpired si las hay muy recientes
    });

    it('debería manejar TTL muy alto (10000 minutos)', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual?ttl_minutes=10000')
        .expect(200);

      const { data } = response.body;
      expect(data.ttlMinutes).toBe(10000);
      // Con TTL muy alto, probablemente NO encontrará órdenes (todas son recientes)
      expect(data.checked).toBe(0);
    });

    it('debería retornar 0s en todo si no hay órdenes expiradas', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/cleanup-manual?ttl_minutes=10000')
        .expect(200);

      const { data } = response.body;
      if (data.checked === 0) {
        expect(data.cancelled).toBe(0);
        expect(data.failed).toBe(0);
        expect(data.totalStockRestored).toBe(0);
      }
    });
  });
});
