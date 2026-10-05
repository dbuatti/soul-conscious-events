/**
 * supabase.functions.invoke reports any non-2xx response as a generic
 * "Edge Function returned a non-2xx status code". Our functions put the real
 * reason in a JSON `{ error }` body, so read it from the response when present.
 */
export async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body && typeof body.error === 'string' && body.error) return body.error;
    } catch {
      // Not JSON; fall through to the generic message.
    }
  }
  return error instanceof Error ? error.message : String(error);
}
