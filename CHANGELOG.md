---
title: "HubLogistico — Changelog"
aliases: []
type: project-doc
domain: projects
project: "HubLogistico"
status: in-progress
created: 2026-11-16
updated: 2026-11-16
summary: "Histórico de mudanças de HubLogistico."
tags: []
---
# HubLogistico — Changelog

## [Não lançado]
### Adicionado
### Alterado
### Corrigido

## 2026-11-16 (fase 1)
- Adicionado: código do Hub em `code/` — leitores `.xlsx`/`.xls` (stdlib), SQLite, importadores da Montagem (venda, retorno, Resumo de Planejamento, planilhas antigas), cálculo dos indicadores da Montagem e da Reprogramação, app local com painel principal, detalhe por DL, parâmetros e planejamento editáveis, importação, exportação estática, testes.
- Validação contra jan–nov/2026: diferenças só onde a planilha tem erro (ver [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas|Montagem]] §Problemas).
- Decisão: [[12_PROJECTS/Active/HubLogistico/DECISIONS/ADR-0001 Stack local com Python stdlib e SQLite|ADR-0001]].

## 2026-11-16
- Projeto criado a partir do scaffold.
- Levantamento do zip `Informações Logisticas.zip` (1.733 arquivos, 11 acompanhamentos, 2019–2026): estrutura de abas, fórmulas, links externos, macros VBA e formatos de entrada.
- Documentação: visão geral e glossário, catálogo de indicadores, mapa de dependências, 11 notas de módulo, catálogo de fontes F01–F19, modelo de dados e arquitetura proposta, roadmap em 10 fases.
