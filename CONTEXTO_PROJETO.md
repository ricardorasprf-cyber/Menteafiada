# Contexto do projeto Mente Afiada

Registro de continuidade em 24/11/2026. O trabalho local de aplicação e QA foi salvo no commit `4f629d0`, na branch `maturidade/etapa-1`, sobre a base `28fbfdc`. O ZIP de recuperação e as bases Markdown geradas permanecem no disco, fora do Git.

## Retomada segura

- Converse com o usuário em português. Consulte o escopo autorizado na sessão atual antes de implementar melhorias ou alterar serviços externos.
- Confira `git status --short --branch`, o commit atual e os diffs antes de editar. Preserve alterações locais e confira também os arquivos fora do Git relevantes à recuperação.
- Após autorização, prefira trabalhar em branch separada, com mudanças pequenas e reversíveis. Prepare reversão específica para eventuais alterações em esquema, políticas, agendamentos ou implantação. Reverter código no Git não reverte esses serviços.
- Siga as instruções de [AGENTS.md](AGENTS.md). Antes de escrever código Next.js, consulte o guia aplicável em `node_modules/next/dist/docs/` e observe os avisos de depreciação.
- Use os arquivos em `src` e `scripts` como fonte primária. As bases Markdown são cópias geradas e podem estar desatualizadas ou incompletas. Evite expor valores de configuração e credenciais ao revisar scripts ou ambientes.

## Arquitetura e tecnologias

Aplicação única com Next.js App Router e React, escrita em JavaScript. `src/app` contém páginas, layouts, componentes, manipuladores HTTP e ações de servidor. `src/lib` contém o cliente Supabase, regras de planos, avaliação de conquistas e efeitos sonoros. `src/contexts`, `src/locales` e `src/constants` concentram idioma, traduções e categorias. `public` contém ativos estáticos. `scripts` reúne ferramentas de manutenção e exportação de contexto.

| Tecnologia | Uso no projeto |
|---|---|
| Next.js 16.4.6, React 19.3.0, Tailwind CSS 4 e Geist | Interface, roteamento, APIs e estilos. [Manifesto](package.json) · [Lockfile](package-lock.json) · [Layout](src/app/layout.js) |
| Clerk 7.9.17 e Svix | Login, cadastro, sessões, metadados de perfil e verificação do webhook. Há um proxy do Clerk com domínio de produção fixado no código. [Middleware](src/middleware.js) · [Configuração Next.js](next.config.mjs) · [Webhook](src/app/api/webhooks/clerk/route.js) |
| Supabase JS 2.118.0 | Persistência, assinaturas em tempo real e funções SQL. Navegador e rotas do servidor acessam o banco por caminhos diferentes. [Cliente](src/lib/supabase.js) · [API de partidas](src/app/api/game/route.js) |
| Google GenAI 2.31.0 | Geração de quizzes e recursos do assistente Afiadinho. [API de geração](src/app/api/generate-quiz/route.js) · [Chat](src/app/api/chat/route.js) |
| Vercel, Google Drive e ESLint 9.39.5 | Implantação e abertura agendada da Arena, sincronização das bases de conhecimento e análise estática. [Vercel](vercel.json) · [Drive](scripts/upload-drive.js) · [ESLint](eslint.config.mjs) |

## Funcionalidades e estado atual

| Área | O que existe |
|---|---|
| Quizzes | Criação, edição, duplicação, quizzes oficiais, importação de JSON, CSV e texto e geração por IA. Formatos de múltipla escolha, verdadeiro ou falso, lacunas e ordenação. Os fluxos de importação e IA têm incompatibilidades descritas abaixo. [Editor](src/app/dashboard/quizzes/page.js) · [Importador](src/app/components/ImportQuizModal.js) · [Modal de IA](src/app/components/AiQuizGeneratorModal.js) |
| Partidas ao vivo | Sessões por PIN, telas de anfitrião e participante, QR Code, cronômetro, ranking, pódio, sondagens, nuvem de palavras e recursos de relatório. A tela do anfitrião exibe a capacidade do plano. [Anfitrião](src/app/game/host/page.js) · [Participante](src/app/game/play/page.js) |
| Arena | Batalhas oficiais, temporadas, sala por PIN, ranking e histórico. A abertura tem agendamento local na Vercel. O agendamento efetivo do motor de transições ainda precisa ser confirmado. [Arena](src/app/arena/page.js) · [Sala](src/app/arena/%5Bpin%5D/page.js) · [Motor](src/app/api/cron/arena-engine/route.js) |
| Cursos e conquistas | Catálogo, matrículas, progresso, interface de certificados, conquistas e estúdio para gerenciar cursos, vídeos e materiais PDF. [Catálogo](src/app/dashboard/courses/page.js) · [Sala de aula](src/app/dashboard/courses/%5BcourseId%5D/page.js) · [Estúdio](src/app/dashboard/creator/page.js) · [Conquistas](src/lib/badgeEvaluator.js) |
| Conta e administração | Cadastro, conclusão de perfil, configurações, exclusão de conta, gestão de usuários, preços e acompanhamento de visitas. [Perfil](src/app/completar-perfil/page.js) · [Proprietário](src/app/dashboard/owner/page.js) · [Visitas](src/app/api/analytics/visits/route.js) |
| Planos e gestão | Matriz dos planos gratuito, Aluno Pro, Criador Pro, Institucional e proprietário. A página de planos lê preços do banco. O checkout aguarda integração com o meio de pagamento e o painel B2B contém apenas um título. [Matriz](src/lib/planLimits.js) · [Planos](src/app/planos/page.js) · [Gestor](src/app/dashboard/manager/page.js) |

## Decisões e direções propostas

- A Etapa 1 foi aprovada para salvaguarda local, fluxo de validação, documentação e preparação de QA. Nenhum push, PR remoto ou publicação foi realizado. As demais etapas permanecem propostas.
- A direção proposta é manter a aplicação única e separar regras de partidas, contas, conteúdo e administração à medida que os fluxos sejam cobertos por testes. A matriz de planos existente é um ponto de reaproveitamento. Permissões e limites precisam ser aplicados nas operações de servidor e banco.
- Para interface, a proposta é preservar a identidade do Mente Afiada e o Afiadinho, priorizar o trajeto móvel do PIN até o resultado e organizar a navegação por tarefa de aluno, criador e administrador. Dar destaque à entrada por PIN, ao enunciado, às respostas e aos estados da Arena. Prévia jogável, revisão de erros e resumo por pergunta são propostas de evolução, ainda sem aprovação.

## Diagnóstico anterior e estado da validação

O ESLint registrou **40 erros e 14 avisos** em 24/11/2026, com concentração em regras de hooks do React. Trate essa linha de base antes de tornar o check obrigatório. O Playwright com Edge já passou nos três perfis em modo gráfico e headless usando dados sintéticos de navegador. Nesta etapa, o runner da aplicação encerrou antes de iniciar o Next.js devido à ausência de `.env.e2e.local`. A suíte e suas referências visuais dependem de Clerk e Supabase dedicados. Ainda não há migrações SQL locais. Build, políticas do banco, desempenho sob carga e acessibilidade permanecem sem validação nesta etapa.

| Criticidade | Fato observado e limite da evidência |
|---|---|
| Alta | **Motor da Arena exige segredo no código local.** O handler responde com 401 antes de consultar o Supabase quando o bearer não corresponde a `CRON_SECRET`. Ainda falta confirmar em QA a configuração do agendador, o comportamento sem a chave e as permissões usadas na execução autorizada. [Middleware](src/middleware.js) · [Motor](src/app/api/cron/arena-engine/route.js) |
| Alta | **Gabarito e pontuação no navegador.** As telas solicitam gabarito e calculam pontos. A API também repassa correção e pontos recebidos para a função `submit_game_answer_secure`. A implementação SQL não estava disponível para verificar o que ela valida. [Participante](src/app/game/play/page.js) · [Sala da Arena](src/app/arena/%5Bpin%5D/page.js) · [API](src/app/api/game/route.js) |
| Alta | **Permissões e planos.** O painel do proprietário lê perfis, planos e transações pelo cliente e grava alterações de perfil. Algumas telas comerciais consultam `unsafeMetadata` como alternativa. O alcance de leituras e escritas depende das políticas do Supabase. A atualização de papel em Supabase e Clerk pode divergir se uma gravação falhar. [Proprietário](src/app/dashboard/owner/page.js) · [Estúdio](src/app/dashboard/creator/page.js) · [API de papéis](src/app/api/admin/update-role/route.js) |
| Alta | **Importação de quizzes.** O editor passa `userId`, `onQuizImported` e `maxQuestions`, mas o modal espera `currentUserId` e `onImportComplete` e não aplica o limite recebido. A autoria pode chegar indefinida e o retorno aguardado pela tela não é chamado. Quiz e perguntas são gravados em etapas separadas, com risco de gravação parcial. [Editor](src/app/dashboard/quizzes/page.js) · [Importador](src/app/components/ImportQuizModal.js) |
| Alta | **Geração de quizzes.** O modal envia `count` e a API lê `amount` ou `questionCount`. A chamada da interface cai no padrão de cinco. A API gera conteúdo sem persistir, mas a tela o trata como quiz criado. A API já autentica, bloqueia o plano gratuito e limita questões por solicitação. Cota acumulada e validação completa dos formatos gerados seguem pendentes. [Modal](src/app/components/AiQuizGeneratorModal.js) · [API de IA](src/app/api/generate-quiz/route.js) · [Editor](src/app/dashboard/quizzes/page.js) |
| Alta | **Capacidade aplicada após a entrada.** O anfitrião consulta os jogadores após eventos e tenta excluir o excedente. O resultado da exclusão não é verificado nesse trecho. O controle efetivo depende de garantias no banco ainda não examinadas. [Anfitrião](src/app/game/host/page.js) · [Entrada](src/app/game/play/page.js) |
| Alta | **Ciclo e histórico da Arena.** A Vercel agenda a abertura, mas seu arquivo não agenda o motor. O histórico do motor lê `game_room_players`, enquanto a sala grava em `game_players`. Verificar agendamento externo e relação entre as tabelas antes de concluir que há falha em produção. [Vercel](vercel.json) · [Motor](src/app/api/cron/arena-engine/route.js) · [Sala](src/app/arena/%5Bpin%5D/page.js) |
| Alta | **Exclusão de conta pode terminar parcialmente.** A rota prossegue para o Clerk após erros em gravações no Supabase e o webhook também descarta alguns resultados de remoção. Chaves estrangeiras, cascatas e efeitos sobre cada tabela precisam de verificação. [Exclusão](src/app/api/user/delete-account/route.js) · [Webhook](src/app/api/webhooks/clerk/route.js) |
| Média | **Documentação de foco truncada.** O script publica no máximo duas partes de 22 mil caracteres. A tela do anfitrião tinha cerca de 96 mil caracteres na revisão e a parte 2 termina no meio de um botão. Os scripts de Drive também escolhem o primeiro resultado de uma busca por nome. Com nomes repetidos, há risco de atualizar outro documento. [Parte 1](base_foco_atual.md) · [Parte 2](base_foco_parte2.md) · [Foco](scripts/push-focus.js) · [Consolidador](scripts/upload-drive.js) |
| Média | **Desempenho e consistência.** Eventos em tempo real disparam novas consultas completas em alguns fluxos. O painel consulta perfis com `select("*")` sem paginação explícita, o limitador do chat usa memória local ao processo e matrículas combinam banco e armazenamento local sem conferir o erro de algumas gravações. O impacto sob carga ainda não foi medido. [Anfitrião](src/app/game/host/page.js) · [Proprietário](src/app/dashboard/owner/page.js) · [Chat](src/app/api/chat/route.js) · [Matrículas](src/app/dashboard/courses/page.js) |
| Média | **Segredos, ambiente e interface.** O script de diagnóstico pode imprimir parte de uma chave privada em caso de erro. A política de conteúdo permite scripts inline e `eval`. O layout mantém `lang="pt-BR"` quando o seletor muda o idioma. Contraste, teclado, foco, movimento reduzido e anúncios do cronômetro e do ranking precisam de teste manual. [Diagnóstico de chave](scripts/test-key.js) · [Política de conteúdo](vercel.json) · [Layout](src/app/layout.js) · [Idioma](src/contexts/LanguageContext.js) |

## Inventário anterior de alterações locais

Registro histórico anterior à salvaguarda. Consulte o commit `4f629d0` e o estado atual do Git para obter o inventário vigente.

**Arquivos rastreados com alterações locais**

- `package.json` e `scripts/upload-drive.js`
- `src/app/api/game/route.js` e `src/app/api/generate-quiz/route.js`
- `src/app/dashboard/creator/page.js`, `src/app/dashboard/quizzes/page.js` e `src/app/game/host/page.js`

**Arquivos ainda não rastreados**

- `scripts/push-focus.js` e `src/lib/planLimits.js`
- `base_05_apis_core.md`, `base_06_libs_contexts.md`, `base_07_ui_components.md`, `base_08_courses_creator.md` e `base_09_quizzes_game_planos.md`
- `base_foco_atual.md` e `base_foco_parte2.md`

A base consolidada, as bases auxiliares geradas e o ZIP de recuperação estão nas regras de exclusão do [Git](.gitignore). O [README](README.md) registra o fluxo de PR, a matriz de ambientes e os comandos de QA. As bases auxiliares podem documentar configurações e scripts, mas o provisionamento depende de migrações ou de uma definição revisável do esquema e das políticas.

## Prioridades e próximos passos após autorização

| Ordem | Trabalho | Verificação de conclusão |
|---|---|---|
| P0 | Recuperação de código registrada no commit `4f629d0`. Reunir o esquema para QA e verificar papéis, políticas do Supabase e operações administrativas. | A base sintética pode ser recriada. Operações privilegiadas exigem a identidade prevista e o acesso entre contas é verificado. |
| P1 | Corrigir o contrato dos modais de importação e IA. Definir revisão e salvamento do quiz gerado. Aplicar cotas de gravação na camada autorizada e gravar quiz e perguntas de forma consistente. | Importação preserva autoria e limites. A quantidade do formulário chega à API. A lista e a contagem refletem somente gravações confirmadas. |
| P1 | Aplicar capacidade antes de admitir jogadores e corrigir respostas no servidor. Gravar pontuação atomicamente, alinhar histórico e agendamento da Arena e tornar exclusão de conta e sincronização de papéis retomáveis. | Reenvios e concorrência preservam resultado e capacidade. Falhas parciais têm estado identificável e tentativa segura. |
| P2 | Corrigir a exportação de foco para preservar todo o conteúdo e identificar documentos de forma inequívoca. Documentar instalação, banco e implantação. Versionar esquema e políticas e adicionar cobertura dos fluxos críticos. Corrigir lint por área. | Exportação completa, ambiente de teste reproduzível e verificações automatizadas de build, lint e operações críticas. |
| P3 | Medir a carga das partidas e o custo das consultas. Validar a experiência móvel e acessível. Tratar pagamentos e gestão B2B como entregas de produto com critérios próprios. | Dados de latência e volume orientam as mudanças. O fluxo do PIN ao resultado é validado com teclado e leitor de tela. |

Para continuar o P0 de QA, obter uma fonte autorizada das definições SQL, funções, políticas de acesso por linha, permissões e modelo de salas. Provisionar Clerk e Supabase de QA com dados fictícios. Nenhuma política de RLS foi verificada em execução nesta etapa.
