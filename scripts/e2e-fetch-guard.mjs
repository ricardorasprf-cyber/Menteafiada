const allowed = new Set([
  'http://127.0.0.1:4317',
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  `https://${process.env.E2E_CLERK_HOST}`,
  'https://api.clerk.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
]);
const fetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input, options) => {
  const request = new Request(input, options);
  if (!allowed.has(new URL(request.url).origin)) {
    throw new Error('Destino HTTP bloqueado na instância E2E.');
  }
  const response = await fetch(new Request(request, { redirect: 'manual' }));
  if (request.redirect === 'follow' && [301, 302, 303, 307, 308].includes(response.status)) {
    throw new Error('Redirecionamento externo bloqueado na instância E2E.');
  }
  return response;
};
