import { Logger, ServiceUnavailableException } from '@nestjs/common';

const DEFAULT_TIMEOUT_MS = 10_000;
const logger = new Logger('fetchWithTimeout');

/**
 * fetch con timeout obligatorio. El fetch de Node no tiene timeout por
 * defecto: una llamada externa lenta cuelga el request del checkout hasta
 * que la plataforma lo corta.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // AbortSignal.timeout rechaza con un DOMException name='TimeoutError'
    // (verificado en Node 22). DOMException extiende Error en Node.
    if (error instanceof Error && error.name === 'TimeoutError') {
      logger.error(`Timeout de ${timeoutMs}ms llamando a ${url}`);
      throw new ServiceUnavailableException(
        'El servicio externo no respondió a tiempo. Intentá de nuevo en unos minutos.',
      );
    }
    throw error;
  }
}
