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

## 2026-11-16 (Fase 2: PES Logístico + temas)
- Adicionado: área `#/pes` com placar mensal do PES Logístico por DL. Os 4 indicadores automáticos vêm da Montagem, os 5 são digitados, há metas editáveis e coluna SOLAR, "vs meta" com ▲/▼ e quantidade, e publicação própria. Design e plano em `DESIGN/`; testes em `code/tests_js/pes.test.html` (37 ok).
- Adicionado: seletor de tema no cabeçalho (Automático, Claro, Escuro, Alto contraste), guardado no navegador.
- Regras do Firestore: coleções `pes`, `pes_publicado` e `meta/publicacoes_pes` (publicadas pelo usuário no console).
- Corrigido antes de publicar (revisão final): texto inválido na digitação virava 0 e pontuava; mês sem Reprogramação pontuava 0%.

## 2026-11-16 (site v2)
- Alterado: visual com as cores das planilhas (cabeçalho #C00000, TOTAL amarelo, MÉDIA cinza, formatação condicional de ocupação/reprog/retorno/tendência); cada acompanhamento é uma área com link próprio e abas internas; painel principal só para admin; Importar/Parâmetros/Publicar dentro do acompanhamento; diário em 3 tabelas agrupadas sem rolagem lateral; valores sobre as barras dos gráficos.
- Validado pelo usuário: números do site batem com a planilha da Montagem.

## 2026-11-16 (site)
- Adicionado: site em `docs/` (GitHub Pages) com Firebase Auth e Firestore. Inclui login, papéis (administrador e leitor), importação no navegador, parâmetros, planejamento manual, rascunho e publicação, e gestão de leitores. Cálculos e importadores portados para JavaScript e validados contra o Python.

## 2026-11-16 (fase 1)
- Adicionado: código do Hub em `code/` — leitores `.xlsx`/`.xls` (stdlib), SQLite, importadores da Montagem (venda, retorno, Resumo de Planejamento, planilhas antigas), cálculo dos indicadores da Montagem e da Reprogramação, app local com painel principal, detalhe por DL, parâmetros e planejamento editáveis, importação, exportação estática, testes.
- Validação contra jan–nov/2026: diferenças só onde a planilha tem erro (ver [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas|Montagem]] §Problemas).
- Decisão: [[12_PROJECTS/Active/HubLogistico/DECISIONS/ADR-0001 Stack local com Python stdlib e SQLite|ADR-0001]].

## 2026-11-16
- Projeto criado a partir do scaffold.
- Levantamento do zip `Informações Logisticas.zip` (1.733 arquivos, 11 acompanhamentos, 2019–2026): estrutura de abas, fórmulas, links externos, macros VBA e formatos de entrada.
- Documentação: visão geral e glossário, catálogo de indicadores, mapa de dependências, 11 notas de módulo, catálogo de fontes F01–F19, modelo de dados e arquitetura proposta, roadmap em 10 fases.
