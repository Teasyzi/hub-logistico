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
- [x] Adicionar exportação para Montagem, PES e KM usando uma rotina XLSM compartilhada e modelos escolhidos localmente. Plano/padrão: [[2026-11-16 Exportar planilhas oficiais]].
- [ ] Abrir os arquivos exportados de Montagem, PES e KM no Excel; conferir fórmulas/macros e comparar com planilhas oficiais antes do envio diário.
- [ ] Confirmar que as versões dos modelos de Montagem e KM extraídas do ZIP ainda são as vigentes.
- [ ] Exigir a aba Exportar e o mapeamento do modelo oficial como critério de conclusão de qualquer acompanhamento novo.
- [ ] Usar o PES no site: preencher a Digitação de nov/26 e publicar junto com a Montagem.
- [ ] Usar o site apenas para teste e conferência, mantendo a planilha oficial como arquivo diário enviado até a validação completa.
- [ ] Fase KM: validar os parsers e totais contra as planilhas de outubro/novembro antes de publicar o site ([[2026-11-16 KM plano]]).

## Concluído em 2026-11-16
- [x] Site v2 revisado pelo usuário: aprovado sem ajustes.
- [x] Fase 2: PES Logístico no site (`#/pes`), mais o seletor de tema do Hub; publicado no Pages.
- [x] Firebase configurado pelo usuário (Auth, Firestore, regras, admin); site testado com dados reais — números batem com a planilha.
- [x] Site reformulado: cores das planilhas, cada acompanhamento com link próprio (painel principal só admin), Importar/Parâmetros/Publicar dentro da Montagem, diário dividido em Volume e montagem / Reprogramação / Retorno, valores em cima das barras.
- [x] Repositório https://github.com/Teasyzi/hub-logistico (o usuário tornou **público**; contém só código e notas, sem dados) com GitHub Pages em `main:/docs`.
- [x] `hub.ini` criado (`C:\HubLogistico\dados`, entrada = Downloads); histórico jan–nov/2026 e arquivos de 01–13/11 importados.

## Próximas
- [ ] Decidir: o ACM do mês deve incluir o volume do dia da pré-venda? Hoje inclui, mas os dias trabalhados não o contam.
- [ ] Decidir: transporte que aparece em dois meses com Dt Remessa diferente conta uma vez (Hub) ou nos dois (planilhas)?
- [ ] Confirmar com a Solar a definição de "% retorno cliente" do PES.
- [ ] Corrigir a coluna E da `Reprogramação DL's - 11 Novembro` (Barreiras) antes de lançar o PES de novembro (1,99% → 1,74%).
- [ ] Analisar a pasta `Transportes 1x1` quando o usuário colocar no vault/zip.
- [ ] PES: pequenos ajustes adiados na revisão — regravação sem mudança na Digitação; meta de reprog do PES × parâmetro `meta_reprog` da Montagem; mês inválido na rota.
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
