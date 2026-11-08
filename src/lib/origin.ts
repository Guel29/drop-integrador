/** Canonical public origin comes from configuration, never forwarded headers. */
export function appOrigin(request: Request, configuredUrl = process.env.APP_URL) { return new URL(configuredUrl || request.url).origin; }
export function sameOrigin(request: Request, configuredUrl = process.env.APP_URL) { try { return request.headers.get('origin') === appOrigin(request, configuredUrl); } catch { return false; } }
