import { release } from 'node:os';
import { expect, test } from '../fixtures/app.js';

for (const [name, path] of [['inicio', '/'], ['planos', '/planos']]) {
  test(`${name} mantém o layout e a referência visual`, async ({ page, browser }, testInfo) => {
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    const rendering = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        deviceScaleFactor: devicePixelRatio,
        fonts: getComputedStyle(document.body).fontFamily,
      };
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    const version = browser.version();
    await testInfo.attach('visual-environment', {
      body: JSON.stringify({ edge: version, os: `${process.platform} ${release()}`, ...rendering }, null, 2),
      contentType: 'application/json',
    });
    expect(version).toMatchSnapshot(`${name}-edge-version.txt`);
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
  });
}
