import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const load = createRequire(__filename);
const { loadBindings, transform } = load('next/dist/build/swc');
const root = resolve(__dirname, '../..');
const origin = 'http://quiz-modals.fixture.invalid';
let bundle;

test.beforeAll(async () => {
  await loadBindings();
  const packages = {
    react: 'react/cjs/react.development.js',
    'react/jsx-runtime': 'react/cjs/react-jsx-runtime.development.js',
    'react-dom': 'react-dom/cjs/react-dom.development.js',
    'react-dom/client': 'react-dom/cjs/react-dom-client.development.js',
    scheduler: 'scheduler/cjs/scheduler.development.js',
  };
  const modules = await Promise.all(Object.entries(packages).map(async ([name, file]) => [
    name, await readFile(resolve(root, 'node_modules', file), 'utf8'),
  ]));
  for (const [name, path] of [
    ['ai', 'app/components/AiQuizGeneratorModal.js'],
    ['import', 'app/components/ImportQuizModal.js'],
    ['@/constants/categories', 'constants/categories.js'],
  ]) {
    const source = await readFile(resolve(root, 'src', path), 'utf8');
    const { code } = await transform(source, {
      filename: path,
      jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
      module: { type: 'commonjs' },
    });
    modules.push([name, code]);
  }
  modules.push(
    ['@/contexts/LanguageContext', 'exports.useLanguage = () => ({ language: "pt-BR" });'],
    ['@/lib/supabase', `
      exports.supabase = { from: (table) => ({ insert(payload) {
        window.writes.push({ table, payload });
        return table === 'quizzes'
          ? { select: () => ({ single: async () => ({ data: { id: 'synthetic-quiz' } }) }) }
          : Promise.resolve({ error: null });
      } }) };
    `],
  );

  bundle = `
    const process = { env: { NODE_ENV: 'development' } };
    const factories = {
      ${modules.map(([name, body]) => `${JSON.stringify(name)}: (require, module, exports) => {\n${body}\n}`).join(',\n')}
    };
    const cache = {};
    function require(name) {
      if (cache[name]) return cache[name].exports;
      const module = cache[name] = { exports: {} };
      factories[name](require, module, module.exports);
      return module.exports;
    }
    const React = require('react');
    const mode = location.pathname.slice(1);
    const Modal = require(mode === 'import' ? 'import' : 'ai').default;
    window.writes = [];
    window.saved = [];
    window.saveAttempts = 0;
    function Fixture() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(Modal, {
        isOpen: open,
        onClose: () => setOpen(false),
        currentUserId: 'synthetic-creator',
        authorName: 'Criador de teste',
        maxQuestions: 2,
        onImportComplete: (quiz) => window.saved.push(quiz),
        onSaveQuiz: async (draft) => {
          window.saveAttempts++;
          if (mode === 'ai-retry' && window.saveAttempts === 1) throw new Error('Falha simulada ao salvar');
          window.saved.push(draft);
        },
      }) : React.createElement('p', null, 'Modal fechado');
    }
    require('react-dom/client').createRoot(document.getElementById('root')).render(React.createElement(Fixture));
  `;
});

async function openModal(page, mode) {
  const requests = [];
  await page.route('**/*', async (route) => {
    const { origin: target, pathname } = new URL(route.request().url());
    if (target !== origin) return route.abort();
    if (pathname === '/fixture.js') {
      return route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: bundle });
    }
    if (pathname === '/api/generate-quiz') {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: {
        title: 'Quiz sintético',
        questions: [
          { question: 'Enunciado inicial', type: 'true_false', isTrue: true },
          { question: 'Segundo enunciado', type: 'true_false', isTrue: false },
        ],
      } });
    }
    if (pathname !== `/${mode}`) return route.abort();
    return route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script defer src="/fixture.js"></script></html>',
    });
  });
  await page.goto(`${origin}/${mode}`);
  return requests;
}

async function fillImport(page, quantity) {
  await page.getByPlaceholder(/Ver Modelo JSON/).fill(JSON.stringify({
    title: 'Importação sintética',
    questions: Array.from({ length: quantity }, (_, index) => ({
      question_text: `Pergunta ${index + 1}`,
      options: ['A', 'B', 'C', 'D'],
      correct_option: 0,
    })),
  }));
  await page.getByPlaceholder(/Simulado Completo de Legislação/).fill('Importação sintética');
}

async function generatePreview(page) {
  await page.getByPlaceholder(/Direito Constitucional/).fill('Tema sintético');
  await page.getByRole('spinbutton').fill('2');
  await page.getByRole('button', { name: /Gerar Perguntas/ }).click();
  await expect(page.getByRole('heading', { name: 'Revisar quiz gerado' })).toBeVisible();
}

test('aplica o limite da importação e envia a autoria no caso permitido', async ({ page }) => {
  await openModal(page, 'import');
  await fillImport(page, 3);
  const dialogMessage = page.waitForEvent('dialog').then(async (dialog) => {
    await dialog.accept();
    return dialog.message();
  });
  await page.getByRole('button', { name: /Importar 3 Questões/ }).click();
  expect(await dialogMessage).toContain('Seu plano permite até 2');
  expect(await page.evaluate(() => window.writes)).toEqual([]);

  await fillImport(page, 2);
  await page.getByRole('button', { name: /Importar 2 Questões/ }).click();
  await expect(page.getByText('Modal fechado')).toBeVisible();
  const writes = await page.evaluate(() => window.writes);
  expect(writes.map(({ table }) => table)).toEqual(['quizzes', 'questions']);
  expect(writes[0].payload.created_by).toBe('synthetic-creator');
  expect(writes[1].payload).toHaveLength(2);
});

test('edita e cancela a prévia de IA sem chamar o salvamento', async ({ page }) => {
  const requests = await openModal(page, 'ai');
  await generatePreview(page);
  expect(requests.map(({ amount }) => amount)).toEqual([2]);
  await page.getByLabel('Enunciado da pergunta 1').fill('Enunciado editado');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByText('Modal fechado')).toBeVisible();
  expect(await page.evaluate(() => window.saveAttempts)).toBe(0);
});

test('mantém a edição após falha e envia a prévia na nova tentativa', async ({ page }) => {
  await openModal(page, 'ai-retry');
  await generatePreview(page);
  const question = page.getByLabel('Enunciado da pergunta 1');
  await question.fill('Enunciado editado');
  const save = page.getByRole('button', { name: 'Salvar quiz', exact: true });
  await save.click();
  await expect(page.getByRole('alert')).toHaveText('Falha simulada ao salvar');
  await expect(question).toHaveValue('Enunciado editado');
  expect(await page.evaluate(() => window.saved)).toEqual([]);

  await save.click();
  await expect(page.getByText('Modal fechado')).toBeVisible();
  const { attempts, saved } = await page.evaluate(() => ({ attempts: window.saveAttempts, saved: window.saved }));
  expect(attempts).toBe(2);
  expect(saved).toHaveLength(1);
  expect(saved[0].questions[0].question).toBe('Enunciado editado');
});
