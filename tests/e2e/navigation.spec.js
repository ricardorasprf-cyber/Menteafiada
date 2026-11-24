import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '../fixtures/app.js';

test('navega entre as páginas públicas e abre a Arena', async ({ page }) => {
  for (const path of ['/', '/planos', '/arena']) {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator('h1').first()).toBeVisible();
  }
});

test('exige autenticação no dashboard', async ({ page }) => {
  await page.goto('/dashboard/courses');
  await expect(page).toHaveURL(/\/sign-in(?:[/?]|$)/);
});

test('exibe o formulário de entrada por PIN', async ({ page }) => {
  await page.goto('/game/play');
  await expect(page.getByPlaceholder(/PIN/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Nome ou Apelido/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Entrar na Sala/i })).toBeVisible();
});

for (const [role, routes] of [
  ['PARTICIPANT', ['/dashboard/courses', '/dashboard/participant']],
  ['CREATOR', ['/dashboard/creator', '/dashboard/quizzes', '/game/host']],
]) {
  test(`${role} acessa as interfaces com uma conta sintética`, async ({ page }) => {
    const emailAddress = process.env[`E2E_${role}_EMAIL`];
    test.skip(!emailAddress, `Informe E2E_${role}_EMAIL para rodar este cenário.`);
    await page.goto('/');
    await clerk.signIn({
      page,
      emailAddress,
      setupClerkTestingTokenOptions: { frontendApiUrl: process.env.E2E_CLERK_HOST },
    });
    for (const path of routes) {
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);
      await expect(page).toHaveURL(new RegExp(`${path}/?(?:[?#].*)?$`));
      await expect(page.locator('body')).toBeVisible();
    }
    await clerk.signOut({ page });
    await page.goto('/dashboard/courses');
    await expect(page).toHaveURL(/\/sign-in(?:[/?]|$)/);
  });
}
