---
title: "HubLogistico — Plano da Fase 2 (PES Logístico no site)"
aliases: ["Plano PES Logístico"]
type: project-doc
domain: projects
project: "HubLogistico"
status: in-progress
created: 2026-11-16
updated: 2026-11-16
summary: "Plano de implementação da área #/pes do site: cálculo puro do placar, dados no Firestore, telas Resumo/Digitação/Publicar e verificação no navegador."
tags: []
---
# PES Logístico no site: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** área `#/pes` do site com o placar mensal do PES Logístico por DL, digitação dos indicadores manuais e publicação para os leitores.

**Architecture:** um módulo puro `docs/js/pes.js` monta o placar a partir do resultado de `calcular()` (Montagem) e dos valores digitados. `dados.js` ganha a leitura e gravação no Firestore, `views.js` ganha o HTML e `app.js` ganha as rotas. Mesmo padrão da Montagem.

**Tech Stack:** JS (ES modules, sem build), Firebase 10.12.2 (Auth + Firestore), GitHub Pages em `main:/docs`. Sem Node no PC: os testes rodam numa página HTML servida por `python -m http.server` e aberta no browser pane.

**Spec:** [[2026-11-16 PES Logistico design]]

## Global Constraints
- No Firestore vão só números e códigos, sem nomes.
- Leitor só lê o que foi publicado; a digitação e o rascunho são só do admin.
- Pontos cheios ou zero; total possível = 1.000.
- Metas padrão 2026: retorno volume ≤ 1%, retorno cliente ≤ 2%, reprog volume ≤ 3%, reprog cliente ≤ 3%, Green Mile ≥ 95%, CSAT ≥ 90, licenças ≥ 1, acidentes = 0, telemetria ≥ 95%.
- Pontos: 100, 100, 100, 100, 50, 50, 200, 200, 100 (na ordem acima).
- Os números automáticos têm de ser os mesmos da área Montagem do mesmo mês: rascunho com rascunho, publicado com publicado.
- Textos em pt-BR.

## Review Focus
- Mês sem dados da Montagem num DL: placar com "sem dado" nos 4 automáticos, sem quebrar e sem pontuar. Teste na Task 1.
- Indicador digitado vazio: "sem dado", 0 ponto, e não pode ser confundido com o valor 0 (acidentes = 0 pontua). Teste na Task 1.
- Percentual digitado como "96,5" (tela) ↔ guardado como 0,965: ida e volta sem erro de arredondamento. Teste na Task 1 (`pctDeTela`/`pctParaTela`).
- Meta editada no mês muda bateu, pontos e "quanto falta" juntos. Teste na Task 1.
- Leitor abre `#/pes` de um mês ainda não publicado: mensagem de "não publicado", não erro de permissão. Verificação na Task 4.

---

### Task 1: Placar puro (`pes.js`) e totais extras em `calc.js`

**Files:**
- Modify: `docs/js/calc.js` (em `calcular`, `total`)
- Create: `docs/js/pes.js`
- Create: `code/tests_js/pes.test.html` (harness mínimo: `ok(nome, cond)` escreve ✓/✕ numa lista e um resumo `N ok, M falhas` no fim)

**Interfaces:**
- Produces:
  - `calcular()` passa a devolver também `total.venda_cxu` (Σ venda cx unit do mês) e `total.ret_ext_cxu` (Σ retorno externo cx unit). Nenhum valor existente muda.
  - `export const INDICADORES_PES`: lista de `{k, nome, meta, pontos, regra: '<='|'>='|'=', auto: bool, pct: bool}`, com as chaves `ret_vol, ret_cli, reprog_vol, reprog_cli, green_mile, csat, licencas, acidentes, telemetria`.
  - `export function placarPES(montagem, dig)`: `montagem` = resultado de `calcular()` ou `null`; `dig = {valores:{k:num}, metas:{k:num}, solar:{k:num}}`, com campos opcionais. Devolve `{linhas:[{k, nome, meta, real, bateu, possiveis, feitos, solar, falta, faltaUn}], total:{possiveis, feitos, solar}}`.
  - `export const pctDeTela = (s) => number|null` ("96,5" → 0.965) e `export const pctParaTela = (x) => string` (0.965 → "96,5").
- Real dos automáticos: `ret_vol = total.ret_vol`, `ret_cli = total.ret_cli`, `reprog_vol = reprog.pct`, `reprog_cli = reprog.pct_cli`.
- `falta`: volume em cx unit, cliente em clientes; negativo = estourou; `null` nos digitados. Fórmulas: `ret_vol: meta·venda_cxu − ret_ext_cxu`; `ret_cli: meta·entregas − ret_cli·entregas`; `reprog_vol: meta·rp_uc_total − rp_reprog`; `reprog_cli: meta·entregas − rp_cli`. `faltaUn` = `'cx unit'` ou `'clientes'`.

- [ ] **Step 1: Escrever os testes em `pes.test.html`** com uma montagem sintética (`calcular()` sobre 2 dias de venda/retorno/plan):
  - `total.venda_cxu` e `total.ret_ext_cxu` iguais às somas da fixture;
  - `placarPES(null, {}).linhas` tem 9 linhas, todas `bateu === null`, `total.feitos === 0`, `total.possiveis === 1000`;
  - `acidentes = 0` → `bateu === true`, `feitos === 200`; acidentes vazio → `bateu === null`, `feitos === 0`;
  - `ret_vol` real 0,008 com meta 0,01 → bateu, 100 pts, `falta ≈ 0,002·venda_cxu`; com `metas.ret_vol = 0,005` → não bateu, 0 pts, falta negativa;
  - `pctDeTela('96,5') === 0.965`, `pctParaTela(0.965) === '96,5'`, `pctDeTela('') === null`.
- [ ] **Step 2: Servir e abrir a página.** `.claude/launch.json` com `{"name":"hub-local","runtimeExecutable":"python","runtimeArgs":["-m","http.server","8765","--directory","12_PROJECTS/Active/HubLogistico"],"port":8765}`; `preview_start hub-local` e abrir `/code/tests_js/pes.test.html`. Esperado: falhas (`pes.js` não existe).
- [ ] **Step 3: Implementar** os totais em `calc.js` e o `pes.js`. Mover `META_PES` de `views.js` para derivar de `INDICADORES_PES`, se ele ainda for usado na Montagem.
- [ ] **Step 4: Recarregar a página.** Esperado: `N ok, 0 falhas`.
- [ ] **Step 5: Commit** `PES: placar puro e testes`.

### Task 2: Dados do PES no Firestore e regras

**Files:**
- Modify: `docs/js/dados.js`, `docs/firestore.rules`

**Interfaces:**
- Consumes: `placarPES`, `calcularAoVivo(centro, mes)`, `lerPublicado(centro, mes)`.
- Produces:
  - coleção `pes/{centro}_{mes}`: `{centro, mes, valores, metas, solar}` (admin);
  - `pes_publicado/{centro}_{mes}`: `{centro, mes, placar: JSON string, publicadoEm, por}` (leitura admin ou leitor);
  - `meta/publicacoes_pes`: `{meses:[...]}` (leitura admin ou leitor);
  - `lerDigPES(centro, mes) → {valores, metas, solar}`, `gravarDigPES(centro, mes, dig)`;
  - `placarAoVivo(centro, mes) → placar` (calcularAoVivo + lerDigPES; montagem `null` se o mês não tem dados);
  - `publicarPES(mes)`, `lerPESPublicado(centro, mes) → {placar, publicadoEm, por}|null`, `mesesPESPublicados() → string[]`.

- [ ] **Step 1: Implementar as funções** em `dados.js`, no padrão de `publicar` e `lerPublicado`.
- [ ] **Step 2: Acrescentar as 3 regras** em `firestore.rules`, espelhando `publicado` e `meta/publicacoes` para os públicos e `admin()` para `pes`.
- [ ] **Step 3: Verificar a sintaxe** recarregando a página de teste, que importa `pes.js` mas não `dados.js`: sem erro de módulo no console (`read_console_messages`). A verificação real é na Task 4.
- [ ] **Step 4: Commit** `PES: dados no Firestore e regras`.

### Task 3: Telas e rotas

**Files:**
- Modify: `docs/js/views.js` (`abasPES`, `paginaPES`, `painelPrincipal`), `docs/js/app.js` (rotas `pes`), `docs/css/hub.css` (só se faltar estilo)

**Interfaces:**
- Consumes: Task 2 inteira; `INDICADORES_PES`, `pctDeTela`, `pctParaTela`.
- Produces: rotas `#/pes/resumo/AAAA-MM` (todos), `#/pes/digitacao/AAAA-MM` e `#/pes/publicar/AAAA-MM` (admin). O link do e-mail é `#/pes/resumo/AAAA-MM`.
- Resumo: um bloco por DL (faixa com as cores de `UNIDADES`) e uma tabela com Indicador · Meta · Real · Status (`status()`) · Pontos possíveis · Pontos feitos · SOLAR · Quanto falta, mais a linha de total. Admin tem o seletor Rascunho/Publicado, como na Montagem. Percentuais com `fp`; CSAT, licenças e acidentes com `fi`/`fd`.
- Digitação: tabela por indicador manual × DL (valor; `%` nos campos `pct`), metas dos 9 indicadores e SOLAR dos 9, e um botão Salvar. Grava só o que mudou (padrão de `telaParametros`).
- Publicar: igual a `telaPublicar`, chamando `publicarPES`, com o link do e-mail e o botão Copiar.
- Painel principal: o card "PES Logístico" passa a "ativo", com Abrir e Copiar link para `#/pes`.

- [ ] **Step 1: Implementar** views e rotas.
- [ ] **Step 2: Abrir `http://localhost:8765/docs/`** no browser pane. Esperado: a tela de login carrega sem erro no console. O login é do usuário: pedir que ele entre no pane.
- [ ] **Step 3: Commit** `PES: telas Resumo, Digitação e Publicar`.

### Task 4: Verificação com dados reais e publicação do código

- [ ] **Step 1: Usuário publica as regras** novas no console do Firebase (Firestore › Regras). Sem isso as coleções novas dão permissão negada.
- [ ] **Step 2: Com o usuário logado como admin no pane**, abrir `#/pes/resumo/2026-11`. Conferir que os 4 automáticos são iguais aos da Montagem de nov/26 (CBAR reprog volume = 1,74%).
- [ ] **Step 3: Digitar** um valor de teste em Juazeiro, salvar, recarregar e conferir que persiste. Depois apagar.
- [ ] **Step 4: Leitor em mês não publicado:** com o modo "Publicado", aparece a mensagem de "ainda não publicado".
- [ ] **Step 5: Push** (`git push` na pasta do projeto) e conferir o Pages em https://teasyzi.github.io/hub-logistico/#/pes.
