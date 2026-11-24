import { randomUUID } from 'node:crypto';
import { clerk } from '@clerk/testing/playwright';
import { expect, test } from '../fixtures/app.js';

const quizPath = '/dashboard/quizzes';
const quizCount = (page) => page.getByText(/Quizzes:\s*\d+\s*\//);
const quizHeading = (page, title) => page.getByRole('heading', { level: 3, name: title, exact: true });
const isWrite = (request) =>
  /\/rest\/v1\/(quizzes|questions)$/.test(new URL(request.url()).pathname) &&
  ['POST', 'PATCH', 'DELETE'].includes(request.method());

function quizCard(page, title) {
  return page.locator('div').filter({ has: quizHeading(page, title) })
    .filter({ has: page.getByTitle('Eliminar quiz', { exact: true }) }).last();
}

async function fillImport(page, title, quantity) {
  await page.getByRole('button', { name: /Importar Arquivo/i }).click();
  await page.getByPlaceholder(/Ver Modelo JSON/i).fill(JSON.stringify({
    title,
    questions: Array.from({ length: quantity }, (_, index) => ({
      type: 'multiple_choice',
      question_text: `Questão sintética ${index + 1}`,
      options: ['A', 'B', 'C', 'D'],
      correct_option: 1,
      time_seconds: 20,
    })),
  }));
  await page.getByPlaceholder(/Simulado Completo de Legislação/i).fill(title);
}

async function expectSavedQuiz(page, title, initialCount, questions) {
  const quantity = questions.length;
  await expect(quizCard(page, title)).toContainText(`${quantity} perguntas`);
  await expect(quizCount(page)).toContainText(new RegExp(`Quizzes:\\s*${initialCount + 1}\\s*/`));
  await page.reload();
  await page.getByRole('button', { name: /Meus Quizzes/i }).click();
  const card = quizCard(page, title);
  await expect(card).toContainText(`${quantity} perguntas`);
  await expect(card).toContainText(/Por\s+\S/);
  await expect(quizCount(page)).toContainText(new RegExp(`Quizzes:\\s*${initialCount + 1}\\s*/`));
  await quizHeading(page, title).click();
  for (const question of questions) {
    await expect(page.getByText(question, { exact: true })).toBeVisible();
  }
}

async function deleteTestQuiz(page, title) {
  const button = quizCard(page, title).getByTitle('Eliminar quiz', { exact: true });
  if (!(await button.isVisible())) return;
  page.once('dialog', (dialog) => dialog.accept());
  const deleted = page.waitForResponse((response) =>
    response.request().method() === 'DELETE' &&
    new URL(response.url()).pathname === '/rest/v1/quizzes'
  );
  await button.click();
  expect((await deleted).ok()).toBe(true);
}

test.beforeEach(async ({ page }) => {
  const emailAddress = process.env.E2E_CREATOR_EMAIL;
  test.skip(!emailAddress, 'Configure uma conta sintética de Criador Pro em E2E_CREATOR_EMAIL.');
  await page.goto('/');
  await clerk.signIn({
    page,
    emailAddress,
    setupClerkTestingTokenOptions: { frontendApiUrl: process.env.E2E_CLERK_HOST },
  });
  await page.goto(quizPath);
  await page.getByRole('button', { name: /Meus Quizzes/i }).click();
  await expect(page.getByText(/Plano: Professor \/ Criador Pro/i)).toBeVisible();
});

async function currentQuizCount(page) {
  const countResponse = page.waitForResponse((response) =>
    response.request().method() === 'HEAD' &&
    new URL(response.url()).pathname === '/rest/v1/quizzes'
  );
  await page.reload();
  const response = await countResponse;
  expect(response.ok()).toBe(true);
  const total = Number(response.headers()['content-range']?.split('/').at(-1));
  expect(Number.isInteger(total)).toBe(true);
  await expect(quizCount(page)).toContainText(new RegExp(`Quizzes:\\s*${total}\\s*/`));
  return total;
}

test('importa um quiz dentro do limite e mantém os dados após recarregar', async ({ page }) => {
  const title = `QA Importação ${randomUUID()}`;
  const count = await currentQuizCount(page);
  try {
    await fillImport(page, title, 2);
    await page.getByRole('button', { name: /Importar 2 Questões/i }).click();
    await expectSavedQuiz(page, title, count, ['Questão sintética 1', 'Questão sintética 2']);
  } finally {
    await deleteTestQuiz(page, title);
  }
});

test('rejeita importação acima do limite sem enviar gravações', async ({ page }) => {
  const title = `QA Limite ${randomUUID()}`;
  const writes = [];
  page.on('request', (request) => { if (isWrite(request)) writes.push(request); });
  const limitLabel = page.getByText(/Máx\. Questões\/Quiz/);
  await expect(limitLabel).toContainText(/\d+/);
  const quantity = Number((await limitLabel.innerText()).match(/\d+/)[0]) + 1;
  await fillImport(page, title, quantity);
  const alert = page.waitForEvent('dialog');
  const click = page.getByRole('button', { name: new RegExp(`Importar ${quantity} Questões`, 'i') }).click();
  const dialog = await alert;
  const message = dialog.message();
  await dialog.accept();
  await click;
  expect(message).toContain(`Seu plano permite até ${quantity - 1}`);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(quizHeading(page, title)).toHaveCount(0);
  expect(writes).toHaveLength(0);
});

test('cancela a prévia de IA e salva uma versão editada com quatro formatos', async ({ page }) => {
  const title = `QA IA ${randomUUID()}`;
  const editedTitle = `${title} revisado`;
  const count = await currentQuizCount(page);
  const writes = [];
  const amounts = [];
  page.on('request', (request) => { if (isWrite(request)) writes.push(request); });
  await page.route('**/api/generate-quiz', async (route) => {
    amounts.push(route.request().postDataJSON().amount);
    await route.fulfill({ json: {
      title,
      questions: [
        { type: 'multiple_choice', question: 'Qual letra vem primeiro?', options: ['A', 'B', 'C', 'D'].map((text) => ({ text, is_correct: text === 'A' })) },
        { type: 'true_false', question: 'A Terra gira em torno do Sol.', isTrue: true },
        { type: 'fill_blanks', question: 'O céu diurno costuma ser ___.', correctSequence: ['azul'], distractors: ['verde'] },
        { type: 'sequence_order', question: 'Ordene os números.', correctOrder: ['Um', 'Dois', 'Três'] },
      ],
    } });
  });

  async function generatePreview() {
    await page.getByRole('button', { name: /Gerar com IA/i }).click();
    await page.getByPlaceholder(/Direito Constitucional/i).fill('Conteúdo sintético de QA');
    await page.getByRole('spinbutton').fill('4');
    await page.getByRole('button', { name: /Gerar Perguntas/i }).click();
    await expect(page.getByRole('heading', { name: 'Revisar quiz gerado' })).toBeVisible();
    await expect(page.getByRole('group', { name: /^Pergunta \d+$/ })).toHaveCount(4);
  }

  try {
    await generatePreview();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(quizHeading(page, title)).toHaveCount(0);
    expect(writes).toHaveLength(0);

    await generatePreview();
    await page.getByLabel('Título', { exact: true }).fill(editedTitle);
    const firstQuestion = 'Qual é a primeira letra do alfabeto?';
    await page.getByLabel('Enunciado da pergunta 1', { exact: true }).fill(firstQuestion);
    expect(writes).toHaveLength(0);
    expect(amounts).toEqual([4, 4]);
    await page.getByRole('button', { name: 'Salvar quiz', exact: true }).click();
    await expectSavedQuiz(page, editedTitle, count, [
      firstQuestion,
      'A Terra gira em torno do Sol.',
      'O céu diurno costuma ser ___.',
      'Ordene os números.',
    ]);
  } finally {
    await deleteTestQuiz(page, editedTitle);
  }
});

test('mantém a prévia de IA após falha ao gravar perguntas e permite salvar novamente', async ({ page }) => {
  const title = `QA Nova tentativa ${randomUUID()}`;
  const count = await currentQuizCount(page);
  const editedQuestion = 'A pergunta editada deve sobreviver à falha.';
  await page.route('**/api/generate-quiz', (route) => route.fulfill({ json: {
    title,
    questions: [{ type: 'true_false', question: 'Uma pergunta de QA.', isTrue: true }],
  } }));

  let failNextInsert = true;
  await page.route(`${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin}/rest/v1/questions**`, async (route) => {
    if (route.request().method() === 'POST' && failNextInsert) {
      failNextInsert = false;
      await route.fulfill({ status: 500, json: { message: 'Falha simulada de QA' } });
    } else {
      await route.fallback();
    }
  });

  try {
    await page.getByRole('button', { name: /Gerar com IA/i }).click();
    await page.getByPlaceholder(/Direito Constitucional/i).fill('Conteúdo sintético de QA');
    await page.getByRole('spinbutton').fill('1');
    await page.getByRole('button', { name: /Gerar Perguntas/i }).click();
    const question = page.getByLabel('Enunciado da pergunta 1', { exact: true });
    await question.fill(editedQuestion);
    const save = page.getByRole('button', { name: 'Salvar quiz', exact: true });
    await save.click();

    await expect(page.getByRole('alert').filter({ hasText: 'Falha simulada de QA' })).toBeVisible();
    await expect(question).toHaveValue(editedQuestion);
    await expect(quizHeading(page, title)).toHaveCount(0);
    await expect(quizCount(page)).toContainText(new RegExp(`Quizzes:\\s*${count}\\s*/`));

    await save.click();
    await expectSavedQuiz(page, title, count, [editedQuestion]);
    await expect(quizHeading(page, title)).toHaveCount(1);
  } finally {
    await deleteTestQuiz(page, title);
  }
});
