---
title: "Checklist de relatórios-fonte"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
---
# Checklist de relatórios-fonte

As amostras ficam numa pasta só. Hoje é `Downloads\Relatorios fonte`. A proposta é padronizar como `_Entrada\<ID - fonte>\AAAA-MM\`, com o nome padrão abaixo.

Status em 23/11/2026: **8 recebidos** (1 com uso a confirmar), **11 faltando** (S05 e S19 são o mesmo arquivo) e **7 digitados**.

## ✅ Recebidos: layout conferido contra a aba onde é colado
| ID | Arquivo recebido | Nome padrão sugerido | Conferência |
|---|---|---|---|
| S01 | `01 - VOLUMES DE VENDAS 01.11.2026 á 23.11.2026.XLSX` (CBAR) · `ZSD0092 01.11.2026 A 23.11.2026.xls` (CCRT) | `S01 VENDAS <CENTRO> AAAA-MM-DD.xlsx` | 47/47 colunas iguais a `Venda Barreiras`/`Venda Juazeiro` |
| S02 | `01 - VOLUMES DE RETORNOS ...XLSX` (CBAR) · `ZSD0090 ...xls` (CCRT) | `S02 RETORNOS <CENTRO> AAAA-MM-DD.xlsx` | 41/41 iguais a `Retorno Barreiras` e a `cbar` (Retorno por motivo) |
| S03 | `Resumo de Planejamento - Diário - CBAR_V5.xlsm` · `- CCRT.xlsm` | (mantém o nome; um por dia) | `Resumo Geral` (linha 10) B:L = colunas de `Planejado Barreiras`; aba `Paradas` usada na Reprog |
| S04 | `Listagem de abastecimentos.txt` | `S04 ABASTECIMENTOS AAAA-MM-DD.txt` | 12/12 colunas iguais à aba `Consulta` do KM |
| S07 | `eb75ca84-4c74-4c57-b741-af427ad2c469.xlsx` | `S07 SEM ACERTO AAAA-MM-DD.xlsx` | 6/6 colunas iguais a `Cargas em aberto` (A5:F). Atenção: 18.971 linhas no export × ~3.378 na planilha, então há um filtro a confirmar |
| S11 | `2026-11-19-listas-trabalhadas.xlsx`, `(1)`, `(2)`, `(3)` | `S11 EASY <BASE> AAAA-MM-DD.xlsx` | colunas Montador/Login/Caixas/Caixas/Hora/Erros = abas `DA`/`DL`. Pelos logins: sem sufixo = CB Norte, (1) = CB Sul, (2) = Barreiras, (3) = Juazeiro. **Sem data e sem base dentro do arquivo** |
| S12 | `RELATORIO MB59 PERDAS CBAR ...XLSX` · `MB59 ...xls` (CCRT) | `S12 MB59 <CENTRO> AAAA-MM.xlsx` | 17/17 colunas iguais à aba `Relatório` de Perdas |
| S14 | `RELATORIO KSB1 CENTROS DE CUSTO CBAR ...XLSX` | `S14 KSB1 <CENTRO> AAAA-MM.xlsx` | 🟡 não é usado em nenhuma planilha atual. Ver pergunta P-PER-1 |

## ❌ Faltando: favor exportar 1 amostra recente
| ID | O que exportar | Para qual acompanhamento | Detalhes que preciso junto |
|---|---|---|---|
| S05 = S19 | Rotas planejadas de CB Norte e CB Sul: são as abas diárias do mesmo `MONTAGEM DAS CARGAS` do S19 | KM | uma amostra do S19 resolve as duas |
| S06 | Despesa de frota do mês por unidade (base do CPK) | KM | sistema/relatório |
| S08 | Relatório de **insuficiência/corte** por produto e dia, CB Norte e CB Sul (out/26) | Fill rate, KPI | nome da consulta e filtros |
| S09 | **Cadastro de produtos** do ERP das revendas | Fill rate (e cadastro único) | só uma vez |
| S10 | **Kardex `VDER0002`** de nov/26, Norte e Sul (TXT) | KPI (perdas CB) | igual aos `PERDAS NORTE/SUL.TXT` |
| S13 | **Diferenças de inventário** SAP, CBAR e CCRT (mês) | Perdas DLs | transação usada |
| S15 | Relatório diário de **pedidos reprogramados** do ERP (o TXT bruto, antes de colar), Norte e Sul | REPROG | código do relatório e filtros |
| S16 | **Cadastro de clientes** (o que é colado na aba `base` do REPROG) | REPROG | BI ou ERP? |
| S17 | **Devoluções por motivo e motorista** dos DAs (BI), out/26 | Retorno, KPI | nome da consulta |
| S18 | Volume, cargas e pedidos do mês dos DAs | KPI | de onde saem os números digitados |
| S19 | `MONTAGEM DAS CARGAS <MÊS> - CB NORTE <ANO>.xlsx` e `MONTAGEM DAS CARGAS - CB SUL - <MÊS>.xlsx` | KM (Norte/Sul) e Transportes 1x1 | quem gera; dá para salvar numa pasta da rede? |
| S20 | Ajudantes por carga dos DLs (como a base informa) | Transportes 1x1 | — |

## ✍️ Digitados: confirmar a origem e quem lança
| ID | Valor | Hoje entra em | Proposta no Hub |
|---|---|---|---|
| D01 | TRIXLOG (telemetria) por unidade | KPI, PES | tela de lançamento mensal |
| D02 | Green Mile / Cashdrive | KPI, PES | lançamento mensal |
| D03 | CSAT/NPS entregas | PES | lançamento mensal (ou import do `NPS - mês.xlsx`) |
| D04 | Licenças, acidentes, técnico de segurança | PES | lançamento mensal (já existe a Digitação no PES) |
| D05 | Metas (volume, faturamento, cubagem 450/600/650, montador 350, fill 2%, TRIXLOG 98) | várias | tabela `parametro` (já existe) |
| D06 | Dias úteis/trabalhados | KPI, Montagem | calendário em `parametro` |
| D07 | Particularidades 1x1 | 1x1 | campo de observação por carga |
