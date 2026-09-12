/**
 * Lanza un Error con el mensaje que devolvió el API en vez de uno genérico.
 *
 * Nest responde `{ statusCode, message, error }`, donde `message` es un string
 * o, cuando falla el ValidationPipe, un array de mensajes. Si el body no es
 * JSON (un 502 del proxy, un 413 con HTML) se usa el texto de respaldo.
 */
export async function throwApiError(
  response: Response,
  fallback: string,
): Promise<never> {
  const body: unknown = await response.json().catch(() => null);
  const message = (body as { message?: unknown } | null)?.message;

  if (Array.isArray(message)) {
    throw new Error(message.filter(Boolean).join(", ") || fallback);
  }
  if (typeof message === "string" && message.trim()) {
    throw new Error(message);
  }
  throw new Error(fallback);
}
