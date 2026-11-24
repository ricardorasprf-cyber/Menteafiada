import { expect, test as base } from '@playwright/test';

export { expect };

export const test = base.extend({
  context: async ({ context, baseURL }, runTest) => {
    const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const origins = new Set([
      baseURL,
      supabase.origin,
      `https://${process.env.E2E_CLERK_HOST}`,
      'https://img.clerk.com',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ]);
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const blocked = url.origin === baseURL &&
        /^\/(?:__clerk|api\/(?:clerk-proxy|cron|webhooks|chat|generate-quiz))(?:\/|$)/.test(url.pathname);
      if (blocked || !origins.has(url.origin)) {
        await route.abort('blockedbyclient');
      } else {
        // Continue through Playwright so redirect destinations can be checked here too.
        const response = await route.fetch({ maxRedirects: 0 });
        const target = response.headers().location;
        if (target && !origins.has(new URL(target, url).origin)) {
          await route.abort('blockedbyclient');
        } else {
          await route.fulfill({ response });
        }
      }
    });
    await context.routeWebSocket('**/*', async (socket) => {
      const url = new URL(socket.url());
      if (url.origin === supabase.origin.replace(/^https:/, 'wss:') ||
          url.origin === baseURL.replace(/^http:/, 'ws:')) {
        socket.connectToServer();
      } else {
        await socket.close();
      }
    });
    await runTest(context);
  },
});
