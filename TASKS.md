---
title: "HubLogistico — Tarefas"
aliases: []
type: project-doc
domain: projects
project: "HubLogistico"
status: in-progress
created: 2026-11-16
updated: 2026-11-16
summary: "Backlog e andamento das tarefas de HubLogistico."
tags: []
---
# HubLogistico — Tarefas

## Em andamento
- [ ] Usar o Hub em paralelo à planilha da Montagem por alguns dias e anotar divergências.

## Concluído em 2026-11-16
- [x] Repositório privado criado e enviado: https://github.com/Teasyzi/hub-logistico (Git e GitHub CLI instalados via winget).
- [x] `hub.ini` criado (`C:\HubLogistico\dados`, entrada = Downloads); histórico jan–nov/2026 e arquivos de 01–13/11 importados.

## Próximas
- [ ] Decidir: o ACM do mês deve incluir o volume do dia da pré-venda? Hoje inclui, mas os dias trabalhados não o contam.
- [ ] Decidir: transporte que aparece em dois meses com Dt Remessa diferente conta uma vez (Hub) ou nos dois (planilhas)?
- [ ] Confirmar com a Solar a definição de "% retorno cliente" do PES.
- [ ] Corrigir a coluna E da `Reprogramação DL's - 11 Novembro` (Barreiras) antes de lançar o PES de novembro (1,99% → 1,74%).
- [ ] Fase 2: PES Logístico a partir da Montagem (substitui a macro `Atualiza_Bases`).
- [ ] Confirmar com o ERP o significado das ocorrências 24 e 28 do Kardex.
- [ ] Confirmar a escala de NPS/CSAT válida em 2026 (1–5 na planilha × 0–10 no deck Solar).
- [ ] Pedir o arquivo `Transportes - 1x1` e a origem dos custos (distribuição, manutenção, empilhadeiras).
- [ ] Decidir regra única de exclusão de motivos administrativos no retorno (Norte × Sul).
- [ ] Padronizar o fator cubos ↔ cx unit (1,6 / 1,66 / 1,68).

## Segurança (fazer fora do Hub)
- [ ] Os arquivos `Resumo de Planejamento - Diário - CBAR_V5.xlsm` e `- CCRT.xlsm` **em uso** guardam usuário e senha do Roadnet em texto puro nas conexões ODBC. Falar com quem administra o acesso sobre trocar a senha e usar conexão sem senha salva.

## Concluídas recentemente
- [x] 2026-11-16 · Análise dos 1.733 arquivos do zip e documentação dos 11 acompanhamentos.
- [x] 2026-11-16 · Fase 0 + Fase 1: leitores xlsx/xls, banco, importadores (venda, retorno, Resumo, histórico), indicadores, app local, exportação estática, 6 testes, validação jan–nov/2026.
