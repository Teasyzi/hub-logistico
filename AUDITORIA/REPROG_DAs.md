---
title: "REPROG (CB Norte e CB Sul) — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "(novo: não havia MOD; MOD_Reprogramacao.md não existe)"
---
# REPROG: clientes reprogramados dos DAs (CB Norte e CB Sul)

> Não confundir com a **Reprogramação DL's** (Barreiras/Juazeiro, Roadnet), que fica em `Montagem de Cargas`. Esta é a reprogramação das revendas DA, feita pelo ERP.

## 1. Objetivo e público
Listar os clientes com pedido reprogramado (não entregue no dia e reemitido), quantos dias cada um foi reprogramado e quem são o vendedor e o supervisor. Mostra também a contagem por supervisor.

## 2. Arquivo atual e histórico
| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `REPROG\CB NORTE\CB NORTE - REPROGRAMAÇÃO.xlsx` | **37 MB** | `Resumo` (visível, **A1:J1048576**): cliente, razão, cidade, vendedor, supervisor, dia de rota, dias reprogramados + contagem por supervisor. `REPROGRAMAÇÃO DIA A DIA xlsx` (oculta, resultado do Power Query, 13 mil linhas). `base` (oculta, cadastro de clientes, 24 mil linhas) |
| `REPROG\CB NORTE\REPROGRAMAÇÃO DIA A DIA.xlsx` | 20 MB | **uma aba por dia** (`09-07` … `19-11`, ~80 abas), cada uma com a colagem do relatório do ERP; 5 conexões (`REPROG N1`, `REPROG1`…) |
| `REPROG\CB SUL\CB SUL - REPROGRAMAÇÃO.xlsx` | 3 MB | igual ao Norte + aba `Acerto` |
| `REPROG\CB SUL\REPROGRAMAÇÃO DIA A DIA.xlsx` | 14 MB | uma aba por dia, 2 conexões |

Não há histórico mensal. É um arquivo contínuo desde 09/07/2026.

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | Relatório de pedidos reprogramados/reemitidos do dia (layout texto: `DT.EMI | CLIENTE-- | ---- | QUANT | REDUZ. | DESCRICAO PRODUTO | UNITARIO | VLR TOTAL`) | ERP das revendas (relatório em TXT colado em colunas; **código do relatório a confirmar**) | dia, por revenda | diária | nova aba `dd-mm` em `REPROGRAMAÇÃO DIA A DIA.xlsx` | ❌ faltando (o TXT bruto) |
| 2 | Cadastro de clientes (`UXT (CÓD)`, `CLI (CÓD)`, razão social, fantasia, endereço, cidade, canal, subcanal, SUP, VEND, pasta/dia de rota, limite, condição de pagamento, status…) | ERP das revendas / BI | todos os clientes ativos | quando mudar | `base` | ❌ faltando |

## 4. Entradas manuais
- Criar uma aba por dia e colar o relatório.
- Atualizar o Power Query.
- Tabela de supervisores no `Resumo` (código 100/200/300/400 → nome).

## 5. Regras de cálculo
- Power Query junta todas as abas diárias.
- `Resumo` conta, por cliente, em quantos dias ele aparece ("dias reprogramados").
- Por supervisor: `CONT.SE` dos clientes.
- O `TOTAL PED./CLI.` (`SOMASES` por cliente) mostra o valor reprogramado.

## 6. Indicadores de saída e destino
Lista de clientes reprogramados e ranking por supervisor/vendedor, enviados à gestão comercial. Não alimenta o KPI nem o PES hoje.

## 7. Riscos e inconsistências
- **Arquivos inchados:** o Resumo do Norte tem intervalo usado até a linha 1.048.576 (37 MB). A mesma causa já foi vista no Retorno em 2025.
- Uma aba nova por dia faz o arquivo crescer sem limite (~80 abas em 4 meses), e o Power Query fica lento.
- O cabeçalho do relatório vem cortado nas colunas (`EDUZ. D`, `SCRICAO PRODUTO`), sinal de um TXT de largura fixa importado com quebras erradas.
- Não há separação por mês: o "dias reprogramados" acumula desde julho.

## 8. Perguntas em aberto
1. Qual é o relatório do ERP (código/nome) e os filtros usados para gerar a lista diária?
2. "Reprogramado" = cliente que aparece na lista do dia? Conta em dias corridos ou em dias de rota?
3. O indicador deve ser mensal (zera todo mês) ou acumulado?
4. O cadastro de clientes vem do BI ou do ERP?

## 9. Situação no Hub
**Não documentado e não implementado.** Proposta: importar o TXT bruto (como o Kardex) numa tabela `reprog_da(dia, revenda, cliente, produto, quant, valor)` + cadastro de clientes, e mostrar contagem por cliente/supervisor e % de clientes reprogramados. Isso elimina os arquivos de 37 MB.
