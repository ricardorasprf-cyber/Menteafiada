import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const [routeSource, planSource] = await Promise.all([
  readFile(new URL('../../src/app/api/generate-quiz/route.js', import.meta.url), 'utf8'),
  readFile(new URL('../../src/lib/planLimits.js', import.meta.url), 'utf8'),
]);

async function setup({
  userId = 'synthetic-user',
  planTier = 'student_pro',
  providerText = JSON.stringify({
    title: 'Quiz sintético',
    questions: Array.from({ length: 35 }, (_, index) => ({
      question: `Pergunta ${index + 1}`,
      type: 'true_false',
      isTrue: true,
    })),
  }),
} = {}) {
  const calls = [];
  const errors = [];
  const context = createContext({
    process: { env: { GEMINI_API_KEY: 'synthetic-key' } },
    console: { error: (...args) => errors.push(args) },
  });
  const stub = (name, value) => new SyntheticModule([name], function () {
    this.setExport(name, value);
  }, { context });
  const dependencies = {
    'next/server': stub('NextResponse', Response),
    '@clerk/nextjs/server': stub('auth', async () => ({
      userId,
      sessionClaims: { metadata: { plan_tier: planTier } },
    })),
    '@google/genai': stub('GoogleGenAI', class {
      models = {
        generateContent: async (request) => {
          calls.push(request);
          return { text: providerText };
        },
      };
    }),
    '@/lib/planLimits': new SourceTextModule(planSource, { context }),
  };
  const route = new SourceTextModule(routeSource, { context });
  await route.link((specifier) => {
    assert.ok(Object.hasOwn(dependencies, specifier), `Dependência inesperada: ${specifier}`);
    return dependencies[specifier];
  });
  await route.evaluate();
  const post = (body) => route.namespace.POST(new Request('http://fixture.invalid/api/generate-quiz', {
    method: 'POST',
    body: JSON.stringify({ topic: 'Tema sintético', ...body }),
  }));
  return { post, calls, errors };
}

test('exige autenticação antes de chamar o Gemini', async () => {
  const { post, calls } = await setup({ userId: null });
  assert.equal((await post({ amount: 3 })).status, 401);
  assert.equal(calls.length, 0);
});

test('bloqueia o plano gratuito antes de chamar o Gemini', async () => {
  const { post, calls } = await setup({ planTier: 'free' });
  const response = await post({ amount: 3 });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.code, 'PLAN_UPGRADE_REQUIRED');
  assert.equal(body.currentPlan, 'free');
  assert.equal(calls.length, 0);
});

test('rejeita quantidades inválidas sem gerar perguntas', async () => {
  const { post, calls } = await setup();
  for (const amount of [0, -1, 2.5, true, '', 'texto', Number.MAX_SAFE_INTEGER + 1]) {
    const response = await post({ amount });
    assert.equal(response.status, 400, JSON.stringify(amount));
    assert.match((await response.json()).error, /inteira e positiva/);
  }
  assert.equal(calls.length, 0);
});

test('encaminha a quantidade escolhida e mantém o campo legado', async () => {
  const { post, calls } = await setup();
  for (const input of [{ amount: 4 }, { count: 4 }]) {
    const response = await post(input);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).questions.length, 4);
  }
  assert.equal(calls.length, 2);
  for (const { contents } of calls) assert.match(contents, /Quantidade exata de questões: 4\./);
});

test('aplica o teto do plano ao pedido e à resposta do Gemini', async () => {
  for (const [planTier, limit] of [['student_pro', 10], ['creator_pro', 30]]) {
    const { post, calls } = await setup({ planTier });
    const response = await post({ amount: 100 });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.planApplied, planTier);
    assert.equal(body.maxQuestionsAllowed, limit);
    assert.equal(body.questions.length, limit);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].contents.includes(`Quantidade exata de questões: ${limit}.`));
  }
});

test('retorna erro quando o Gemini envia JSON malformado', async () => {
  const { post, calls, errors } = await setup({ providerText: '{' });
  const response = await post({ amount: 3 });
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /Falha ao gerar questões com IA/);
  assert.equal(calls.length, 1);
  assert.equal(errors.length, 1);
});

test('devolve lista vazia quando o Gemini envia questions em formato inesperado', async () => {
  const { post } = await setup({ providerText: '{"questions":{"question":"Inesperada"}}' });
  const response = await post({ amount: 3 });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).questions, []);
});
