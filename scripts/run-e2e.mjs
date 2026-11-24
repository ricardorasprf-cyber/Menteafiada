import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, mkdtempSync, readFileSync, symlinkSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseEnv } from 'node:util';

const root = process.cwd();
const baseURL = 'http://127.0.0.1:4317';
const configFile = join(root, '.env.e2e.local');
if (!existsSync(configFile)) {
  throw new Error('Crie .env.e2e.local a partir de .env.e2e.example com serviços dedicados a testes.');
}

const config = parseEnv(readFileSync(configFile, 'utf8'));
const {
  E2E_CLERK_HOST: clerkHost,
  E2E_SUPABASE_REF: supabaseRef,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPublic,
  CLERK_SECRET_KEY: clerkSecret,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
} = config;
const encodedClerkHost = clerkPublic?.slice('pk_test_'.length);
const decodedClerkHost = Buffer.from(encodedClerkHost ?? '', 'base64').toString();
if (!/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(clerkHost ?? '') ||
    !clerkPublic?.startsWith('pk_test_') || decodedClerkHost !== clerkHost + '$' ||
    !clerkSecret?.startsWith('sk_test_') || !/^[a-z0-9]{20}$/.test(supabaseRef ?? '') ||
    !supabaseAnon) {
  throw new Error('Configuração E2E inválida. Informe chaves de teste do Clerk e um projeto Supabase dedicado.');
}

const supabaseURL = `https://${supabaseRef}.supabase.co`;
if (supabaseAnon.split('.').length === 3) {
  const claims = JSON.parse(Buffer.from(supabaseAnon.split('.')[1], 'base64url').toString());
  if (claims.ref !== supabaseRef || claims.role !== 'anon') {
    throw new Error('A chave anônima deve pertencer ao projeto Supabase de teste.');
  }
} else if (!supabaseAnon.startsWith('sb_publishable_')) {
  throw new Error('Informe uma chave pública do Supabase.');
}

function run(args, options) {
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code) => done(code ?? 1));
    for (const signal of ['SIGINT', 'SIGTERM']) {
      const stop = () => child.kill();
      process.once(signal, stop);
      child.once('close', () => process.removeListener(signal, stop));
    }
  });
}

const [mode, ...args] = process.argv.slice(2);
const testEnv = Object.fromEntries(
  ['Path', 'PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP',
    'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'ProgramFiles', 'ProgramFiles(x86)']
    .filter((key) => process.env[key])
    .map((key) => [key, process.env[key]]),
);
Object.assign(testEnv, {
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPublic,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  CLERK_SECRET_KEY: clerkSecret,
  NEXT_PUBLIC_SUPABASE_URL: supabaseURL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
});

if (mode === 'test') {
  process.exitCode = await run([join(root, 'node_modules/@playwright/test/cli.js'), 'test', ...args], {
    cwd: root,
    env: {
      ...testEnv,
      MENTEAFIADA_E2E_APP: '1',
      E2E_CLERK_HOST: clerkHost,
      E2E_PARTICIPANT_EMAIL: config.E2E_PARTICIPANT_EMAIL ?? '',
      E2E_CREATOR_EMAIL: config.E2E_CREATOR_EMAIL ?? '',
    },
  });
} else if (mode === 'server') {
  const scratch = join(root, '.playwright-app');
  mkdirSync(scratch, { recursive: true });
  const work = mkdtempSync(join(scratch, 'next-'));
  try {
    for (const name of ['src', 'public', 'package.json', 'next.config.mjs', 'postcss.config.mjs', 'jsconfig.json']) {
      cpSync(join(root, name), join(work, name), {
        recursive: true,
        filter: (path) => !/(^|[\\/])\.env(?:\.|$)/.test(path),
      });
    }
    symlinkSync(join(root, 'node_modules'), join(work, 'node_modules'), 'junction');
    process.exitCode = await run([
      '--import', resolve(root, 'scripts/e2e-fetch-guard.mjs'),
      join(work, 'node_modules/next/dist/bin/next'), 'dev',
      '--hostname', new URL(baseURL).hostname, '--port', new URL(baseURL).port,
    ], { cwd: work, env: { ...testEnv, E2E_CLERK_HOST: clerkHost } });
  } finally {
    rmSync(work, { recursive: true, force: true, maxRetries: 3 });
  }
} else {
  throw new Error('Use test ou server.');
}
