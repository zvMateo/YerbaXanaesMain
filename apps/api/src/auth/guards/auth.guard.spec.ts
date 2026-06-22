import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

function contextWithToken(token?: string): ExecutionContext {
  const request = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

// Fecha muy en el futuro para que la sesión nunca esté vencida según el reloj real
// (el spy de Date.now solo afecta al TTL del cache, no a `new Date()`).
const FUTURE = new Date('2099-01-01T00:00:00Z');

function validSession(token: string) {
  return {
    id: `sess-${token}`,
    token,
    expiresAt: FUTURE,
    userId: 'user-1',
    user: { id: 'user-1', email: 'admin@test.com', role: 'ADMIN' },
  };
}

describe('AuthGuard — cache de sesiones', () => {
  let prisma: { session: { findUnique: jest.Mock } };
  let guard: AuthGuard;

  beforeEach(() => {
    prisma = { session: { findUnique: jest.fn() } };
    guard = new AuthGuard(prisma as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('cachea la sesión: dos requests con el mismo token consultan la DB una sola vez', async () => {
    prisma.session.findUnique.mockResolvedValue(validSession('tok-1'));

    await expect(guard.canActivate(contextWithToken('tok-1'))).resolves.toBe(
      true,
    );
    await expect(guard.canActivate(contextWithToken('tok-1'))).resolves.toBe(
      true,
    );

    expect(prisma.session.findUnique).toHaveBeenCalledTimes(1);
  });

  it('tokens distintos no comparten entrada de cache', async () => {
    prisma.session.findUnique.mockImplementation(
      ({ where }: { where: { token: string } }) =>
        Promise.resolve(validSession(where.token)),
    );

    await guard.canActivate(contextWithToken('tok-1'));
    await guard.canActivate(contextWithToken('tok-2'));

    expect(prisma.session.findUnique).toHaveBeenCalledTimes(2);
  });

  it('re-consulta la DB cuando expira el TTL del cache (60s)', async () => {
    prisma.session.findUnique.mockResolvedValue(validSession('tok-1'));
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(1_000_000);
    await guard.canActivate(contextWithToken('tok-1'));

    // +61s: supera SESSION_CACHE_TTL_MS (60s) → la entrada cacheada ya no es válida
    nowSpy.mockReturnValue(1_000_000 + 61_000);
    await guard.canActivate(contextWithToken('tok-1'));

    expect(prisma.session.findUnique).toHaveBeenCalledTimes(2);
  });

  it('rechaza requests sin token y no toca la DB', async () => {
    await expect(guard.canActivate(contextWithToken())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza un token inválido (sesión inexistente)', async () => {
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextWithToken('desconocido')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza una sesión vencida y la purga del cache', async () => {
    const expired = {
      ...validSession('tok-exp'),
      expiresAt: new Date('2000-01-01T00:00:00Z'),
    };
    prisma.session.findUnique.mockResolvedValue(expired);

    await expect(
      guard.canActivate(contextWithToken('tok-exp')),
    ).rejects.toThrow('Session expired');

    // Como se purgó, la segunda request vuelve a consultar la DB (no usa cache)
    await expect(
      guard.canActivate(contextWithToken('tok-exp')),
    ).rejects.toThrow('Session expired');

    expect(prisma.session.findUnique).toHaveBeenCalledTimes(2);
  });
});
