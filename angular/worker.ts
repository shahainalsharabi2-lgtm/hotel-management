const API_ORIGIN = 'https://hotel-api-fo0z.onrender.com';

function shouldProxy(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/connect/') ||
    pathname.startsWith('/.well-known/') ||
    pathname.startsWith('/Abp/')
  );
}

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (shouldProxy(url.pathname)) {
      const target = new URL(url.pathname + url.search, API_ORIGIN);
      const headers = new Headers(request.headers);
      headers.set('Host', new URL(API_ORIGIN).host);
      const response = await fetch(target.toString(), {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('text/html') && url.pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({
            error: {
              message:
                'استجابة غير متوقعة من الخادم (صفحة HTML). تأكد من نشر آخر إصدار للـ API على Render.',
            },
          }),
          { status: 502, headers: { 'content-type': 'application/json; charset=utf-8' } },
        );
      }

      return response;
    }

    return env.ASSETS.fetch(request);
  },
};
