<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Mente Afiada

- Leia `CONTEXTO_PROJETO.md` e confira `git status --short --branch` ao retomar o trabalho. Preserve alterações locais e use o código e o lockfile como referência técnica.
- Trabalhe em branch e revise os arquivos individualmente antes de preparar um commit. Use o fluxo de PR descrito no README. Envio ao remoto, publicação e operações em serviços externos precisam de autorização para a ação correspondente.
- Use contas e dados sintéticos no QA. Consulte a matriz de ambientes no README antes de iniciar a aplicação, chamar rotas com efeitos externos ou executar testes de integração.
- Execute `npm run lint` e as verificações relacionadas à mudança. Use `npm run test:e2e` para verificar o Edge isolado e a suíte da aplicação somente com a configuração dedicada de QA.
- Mantenha credenciais, relatórios de teste, bases geradas e arquivos de recuperação fora do Git. Registre no contexto apenas decisões, evidências e pendências duráveis.
