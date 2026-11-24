This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Revisão e recuperação

Consulte [AGENTS.md](AGENTS.md) e [CONTEXTO_PROJETO.md](CONTEXTO_PROJETO.md) ao retomar o projeto. Faça mudanças em branch e revise `git diff --cached --name-only` antes de cada commit. Para entregar, abra um PR com o escopo e as evidências de validação quando houver autorização para enviar a branch ao remoto. O script legado `npm run push` adiciona todos os arquivos e envia a `main` diretamente.

O workflow localmente preparado em `.github/workflows/validate.yml` instala as dependências do lockfile e executa o ESLint em PRs destinados a `main`. Antes de tornar o check obrigatório no GitHub, verifique a primeira execução remota e trate a linha de base do lint. Build e E2E da aplicação entram no CI depois que houver configuração de QA validada.

Para recuperar código, inspecione o commit de salvaguarda em outra branch ou reverta o commit que causou a regressão. Preserve alterações locais antes de trocar de branch. Mudanças de esquema e credenciais têm procedimentos próprios de recuperação.

## Ambientes e dados

| Ambiente | Aplicação | Serviços e dados |
| --- | --- | --- |
| Desenvolvimento | Next.js local com configuração de desenvolvimento | Clerk e Supabase de desenvolvimento. Use dados fictícios e mantenha os valores locais fora do Git. |
| QA local | `npm run test:e2e:serve` em `127.0.0.1:4317` | Instância de desenvolvimento do Clerk dedicada à suíte e projeto Supabase descartável. Use `.env.e2e.local` e contas sintéticas. |
| Homologação remota, se necessária | Preview isolado e autorizado | Use credenciais separadas de produção. Valide destinos de webhooks, rotinas agendadas e variáveis antes de habilitar tráfego. |
| Produção | Implantação publicada separadamente | Credenciais e dados exclusivos de produção. |

O provisionamento de QA depende de uma definição revisável do esquema, incluindo funções, permissões e políticas RLS. Ainda não há migrações versionadas que permitam reconstruí-lo. Obtenha uma fonte de esquema aprovada, revise-a e prepare migrações e seed sintético antes de executar a suíte. Antes de habilitar os fluxos autenticados, comprove com duas contas de QA o isolamento entre usuários e o acesso legítimo por papel. Para recuperar QA, revogue as credenciais afetadas e recrie o projeto descartável por migrações e seed. Mantenha proteção de rede compatível com os destinos permitidos.

## Testes de interface com Microsoft Edge

O Playwright usa o canal `msedge` do Edge instalado no Windows. Execute
`npm ci` para obter as dependências fixadas no lockfile.

| Comando | Uso |
| --- | --- |
| `npm run test:e2e` | Verifica navegação, isolamento e capturas do Edge com uma página sintética. |
| `npm run test:e2e -- --headed` | Executa a mesma verificação com janela do Edge. |
| `npm run test:e2e:ui` | Abre a interface de depuração do Playwright. |
| `npm run test:e2e:app` | Executa os testes da aplicação e as verificações visuais. |
| `npm run test:e2e:serve` | Inicia somente a instância de teste para navegação exploratória. |
| `npm run test:visual` | Executa somente as verificações de layout e regressão visual da aplicação. |
| `npm run test:e2e:report` | Abre o relatório HTML da execução mais recente. |

Para executar contra a aplicação, configure `.env.e2e.local` a partir de
`.env.e2e.example`. Use uma instância Clerk de desenvolvimento dedicada e um
projeto Supabase descartável provisionado com o esquema e as políticas da
aplicação. Cadastre contas fictícias e seus perfis correspondentes no banco.
Confirme a origem e as credenciais dos dois serviços antes da primeira execução.
O runner usa uma cópia temporária do código, sem os arquivos de ambiente do
workspace, e inicia o Next.js em `http://127.0.0.1:4317`.

O runner restringe requisições roteadas do navegador e chamadas feitas pelo
`fetch` global do servidor a origens esperadas. Esses controles operam na
aplicação e no navegador. Se o ambiente exigir isolamento de rede de todo o
processo, use firewall ou proxy com lista de saída compatível.

Para criar ou atualizar referências de forma explícita, execute
`npm run test:visual -- --update-snapshots` e revise as imagens e a versão do
Edge em `tests/visual/baselines/` antes de versionar. Compare as imagens no
mesmo sistema operacional, modo, escala e conjunto de fontes. Capturas da
execução, diferenças e traces ficam em `test-results/` e
`playwright-report/`, ignorados pelo Git.

O servidor local do Playwright MCP pode ser registrado separadamente no Codex
com `@playwright/mcp@0.0.86 --browser msedge --isolated`. O modo gráfico é o
padrão. Acrescente `--headless` à configuração do servidor para executar sem
janela. A configuração local define `http://127.0.0.1:4317` como origem
permitida. A lista de origens do MCP não constitui uma barreira de rede e
não cobre redirecionamentos. O modo isolado abre um perfil temporário.
