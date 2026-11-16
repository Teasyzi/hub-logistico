---
title: "Perdas de estoque"
aliases: ["Perdas de Estoque - DL's", "Perdas CB Kardex"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Perdas de estoque em R$ e caixas unitárias: DLs pelo relatório de movimentos SAP (rota, estoque, transporte, inventário, por categoria); DAs pelas ocorrências 24 e 28 do Kardex TXT do ERP."
tags: []
related: []
sources: ["2026 - 11 Perdas de Estoque - Barreiras.xlsx e - Juazeiro.xlsx, Ajustes de preço - DL's.xlsx, PERDAS NORTE.TXT (ago/2026), ACM NORTE.TXT (dez/2025) — analisados em 2026-11-16"]
---
# Perdas de estoque

## DLs (Barreiras e Juazeiro)
### Arquivos
`Perdas de Estoque - DL's/<AAAA>/<MM - Mês>/<AAAA> - <MM> Perdas de Estoque - Barreiras|Juazeiro.xlsx` (mês corrente na raiz). Em fev/2025 houve "Relatório Novo" (mudança de layout da origem). `2026/Ajustes de preço - DL's.xlsx`.

### Estrutura
| Aba | Conteúdo |
|---|---|
| `Resumo` | perdas por categoria (SSD, energético, suco, destilados, água, cerveja, balas/gomas, biscoito, chá…) × motivo (inventário, rota, estoque, transporte); perdas em cx unit, %, custo por cx unit; blocos separados estoque e rota |
| `Relatório` (oculta) | relatório de movimentos de material colado a partir da linha 8: Centro, Data do documento, Data de entrada, Data de lançamento, Depósito, Material, Texto breve material, Tipo de movimento, Qtd. UM registro, UM registro, Nome do usuário, Lote, Pedido, Referência, Doc.material, Cliente, Montante em MI + colunas calculadas (motivo, código CB, qtd/un, fator de conversão, perdas em cx unit) |
| `Inventário` (oculta) | diferenças de inventário (quantidades + valor), convertidas para cx unit |
| `base` (oculta) | de-para código Solar → código CB, descrição, categoria, qtd/un, fator de conversão 2 |

Regras: motivo do lançamento definido pelo **tipo de movimento** (ex.: 928 → ROTA) e pela referência (`AV. TRANSF. S/N`); `perdas cx unit = qtd × fat.conv2 ÷ qtd/un`. Ver [[12_PROJECTS/Active/HubLogistico/INDICATORS#8. Perdas de estoque DLs (mensal)|catálogo §8]].

### Entradas necessárias
1. Relatório de movimentos de material do mês por centro (CBAR, CCRT), no layout acima.
2. Contagem/diferença de inventário do mês.
3. Volume do DL no mês (vem da [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas|Montagem]]).

## DAs (CB Norte e CB Sul)
- Fonte: **Kardex `VDER0002` "Lançamentos (posição do Kardex)"** do ERP, um TXT por revenda e mês (`PERDAS NORTE.TXT`, `ACM SUL.TXT`, `ESTOQUE NORTE.TXT` — o nome varia; ~1,1–1,9 MB, ~10 mil linhas, 160 páginas).
- Layout de largura fixa: `NRC. SEQ FORNECEDOR/CLIENTE DT.OPER. HORA USU DOC.OPER. C.PRD. DESCRICAO QUANT. SIN VL.OPER. OC`; quantidade no formato `caixas/unidades` (`19.298/00`), valor com vírgula decimal, código de ocorrência `OC` no fim da linha. Cabeçalho e rodapé repetem a cada página.
- Encoding varia entre UTF-8 e Windows-1252 de um mês para outro.
- No KPI: perdas R$ = Σ `VL.OPER` das ocorrências **24 e 28**; venda total = Σ ocorrência **1**; perdas % = perdas ÷ venda. Hoje o somatório é feito fora da planilha e digitado no bloco `W:Y`.

> [!question] Hipótese
> O significado exato das ocorrências 24 e 28 (avaria? quebra? vencimento?) não aparece no TXT. Confirmar com quem usa o ERP antes de rotular no dashboard.

## Proposta para o Hub
- Parser do Kardex TXT (largura fixa, multi-página, encoding automático) → tabela `movimentos_estoque_da`. Elimina o somatório manual do KPI.
- Importador do relatório SAP dos DLs com o de-para de produtos centralizado.
- Dashboard: perdas R$ e % por unidade, categoria, motivo, produto; evolução mensal; custo por cx unit.
