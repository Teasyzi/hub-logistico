---
title: "Custos de descarga (DLs)"
aliases: ["Controle de Custos - descarrego", "Descarrego"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Controle mensal dos pagamentos de descarrego (descarga) em grandes clientes pelos DLs Barreiras e Juazeiro, com recibos em PDF."
tags: []
related: []
sources: ["Controle de Custos - Outubro.xlsx (Barreiras) e Controle de Custos.xlsx (Juazeiro, out) — analisados em 2026-11-16"]
---
# Custos de descarga (DLs)

## Arquivos
`Custos de Descarga/DL - BARREIRAS|DL - JUAZEIRO DO NORTE/<Mês>/` com `Controle de Custos[ - Mês].xlsx` (~15 KB) e os recibos (`RECIBO DESCARREGO - <CLIENTE> - DD-MM.pdf`, soltos, em PDF único do mês ou em `.zip`). Meses presentes: jul–out (ano não indicado no nome da pasta).

## Estrutura
| Aba | Conteúdo |
|---|---|
| `CBAR` / aba da unidade | lançamentos: fornecedor (cliente onde houve descarga), natureza ("PAGAMENTO DE DESCARREGO DE PRODUTO"), cupom/nota fiscal (recibo), valor, data; total por `SUBTOTAL` |
| `Resumo` | valor e quantidade por fornecedor (`SUMIF`/`COUNTIF`) e total do DL |

Clientes recorrentes: redes de atacarejo (o nome do cliente consta do recibo; não é dado pessoal).

## Entradas necessárias
- Recibos do mês (PDF/foto) e o lançamento manual de valor e data. Não há exportação de sistema.

## Proposta para o Hub
- Formulário simples de lançamento (data, cliente, valor, anexo do recibo) em vez da planilha, com totais automáticos e custo por cx unit entregue no cliente.
- Baixa prioridade: volume pequeno, mas o anexo do recibo junto do lançamento já resolve a conferência.
