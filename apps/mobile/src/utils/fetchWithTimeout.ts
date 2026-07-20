/** React Native's `fetch` has no built-in timeout — a stalled connection
 * (flaky network, server accepts the connection but never responds) leaves
 * the returned promise pending forever. Used anywhere in the sync path
 * (`db/sync.ts`) so a hung request eventually rejects instead of leaving
 * `syncDatabase()` — and the "syncing" status every list screen's
 * pull-to-refresh is bound to — stuck indefinitely. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 20000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
