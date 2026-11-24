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
