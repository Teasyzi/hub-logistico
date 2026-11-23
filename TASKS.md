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

## Auditoria de 2026-11-23 ([[AUDITORIA/README]])
- [x] Inventário das 12 pastas do escopo + conferência das amostras de `Relatorios fonte` (8 recebidas, layouts iguais às abas onde são coladas).
- [x] Fichas por acompanhamento, matriz de fontes, checklist de relatórios, riscos, revisão do Hub e `DESIGN/PADRAO_VISUAL.md`.
- [ ] Responder as perguntas P-01 a P-16 (`AUDITORIA/README.md`) e juntar as 11 amostras faltantes (`AUDITORIA/checklist_relatorios.md`).
- [x] Corrigido: o Resumo de Planejamento importado em `#/montagem/importar` era detectado como `km_resumo` e o planejamento não era gravado (`AUDITORIA/revisao_hub.md` §1 e §7).
- [ ] Reimportar na Montagem os Resumos de Planejamento de 17/11 em diante (importados depois do commit `03bbc3a`), para gravar o planejamento desses dias.
- [ ] Montadores: aceitar `AAAA-MM-DD-listas-trabalhadas (n).xlsx`, sugerir a base pelos logins e sincronizar os totais com o Firebase.
- [ ] Unificar as versões de import dos módulos JS (`?v=`), que hoje carregam módulos duplicados.
- [ ] Aplicar o `DESIGN/PADRAO_VISUAL.md`: tokens de unidade, mapa único de unidades, sem hex/inline fora do CSS, componente único de abas.
- [ ] Conferência numérica do Hub com as amostras de 23/11 (precisa de Python ou de login admin no site).
- [ ] Card/link do Imagens Frota no painel do Hub.
- [x] Cargas em aberto no site (`#/cargas`), conferido com a Consulta BI de 23/11 (3.373 vendas em aberto, igual à planilha).
- [ ] Publicar no console do Firebase as regras novas de `docs/firestore.rules` (cargas_dados, cargas_publicado, meta/publicacoes_cargas) antes de usar o Cargas em aberto.

## Em andamento
- [x] Adicionar exportação para Montagem, PES e KM usando uma rotina XLSM compartilhada e modelos escolhidos localmente. Plano/padrão: [[2026-11-16 Exportar planilhas oficiais]].
- [ ] Abrir os arquivos exportados de Montagem, PES e KM no Excel; conferir fórmulas/macros e comparar com planilhas oficiais antes do envio diário.
- [ ] Confirmar que as versões dos modelos de Montagem e KM extraídas do ZIP ainda são as vigentes.
- [ ] Exigir a aba Exportar e o mapeamento do modelo oficial como critério de conclusão de qualquer acompanhamento novo.
- [ ] Usar o PES no site: preencher a Digitação de nov/26 e publicar junto com a Montagem.
- [ ] Usar o site apenas para teste e conferência, mantendo a planilha oficial como arquivo diário enviado até a validação completa.
- [ ] KM: importar no site os Resumos diários de BA/JN de novembro e a planilha de outubro (para a tabela de ida e volta); conferir os 3 motoristas da Norte fora da tabela.
- [ ] Fase KM: outubro/26 validado contra a planilha oficial em 2026-11-23 (`AUDITORIA/KM_Planejado_x_Realizado.md` §10). Falta novembro, que depende dos Resumos diários de BA/JN e da planilha oficial de novembro ([[2026-11-16 KM plano]]).
- [ ] KM: atualizar a CPK (igual desde abr/26) e a despesa/km de `Analise por dia!AX:AY` (iguais desde 2024) assim que houver a origem dos valores.

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
