// Redirects and same-origin checks belong to the current deployment, not an
// APP_URL copied from another environment. Next may normalize local URLs to
// localhost; preserve 127.0.0.1 only when both hosts are explicitly loopback.
export function requestOrigin(request: Pick<Request, 'url' | 'headers'>): string {
  const url = new URL(request.url);
  const loopback = (host: string) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
  if (loopback(url.hostname)) {
    const host = request.headers.get('host');
    if (host) {
      try {
        const actual = new URL(`${url.protocol}//${host}`);
        if (loopback(actual.hostname)) return actual.origin;
      } catch { /* Use the parsed request origin for invalid Host headers. */ }
    }
  }
  return url.origin;
}
