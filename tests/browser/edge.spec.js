import { expect, test } from '@playwright/test';

test('Edge navega, isola sessões e captura a tela', async ({ page, browser }, testInfo) => {
  await page.route('http://fixture.invalid/**', async (route) => {
    const next = new URL(route.request().url()).pathname === '/next';
    await route.fulfill({
      contentType: 'text/html; charset=utf-8',
      headers: { 'set-cookie': 'e2e=synthetic; Path=/' },
      body: next
        ? '<meta name="viewport" content="width=device-width, initial-scale=1"><h1>Captura de teste</h1>'
        : '<a href="/next">Continuar</a>',
    });
  });
  await page.goto('http://fixture.invalid/');
  await page.getByRole('link', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Captura de teste' })).toBeVisible();
  if (testInfo.project.name === 'desktop') {
    expect(await page.evaluate(() => navigator.userAgent)).toContain('Edg/');
  }
  expect(await page.context().cookies()).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'e2e' })]));
  const isolated = await browser.newContext();
  try {
    expect(await isolated.cookies()).toEqual([]);
  } finally {
    await isolated.close();
  }
  await testInfo.attach('edge-version', { body: browser.version(), contentType: 'text/plain' });
  await testInfo.attach('edge-screenshot', { body: await page.screenshot(), contentType: 'image/png' });
});
