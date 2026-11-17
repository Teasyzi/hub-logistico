---
title: "Acompanhamento de montadores (Easy Pallet)"
aliases: ["Montadores", "Ajudantes de galpão", "Produtividade Easy Pallet"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-17
summary: "Produtividade diária (caixas/hora), erros, ranking e gratificação dos montadores das 4 unidades a partir da exportação do Easy Pallet; inclui a fatura mensal do Easy Pallet."
tags: []
related: []
sources: ["Acompanhamento de Montadores - Novembro'26.xlsx, MELHORES ANO AJUDANTES DE GALPÃO.xlsx, [COSTA BRASIL] 202508 - FATURA EASY PALLET.xlsx — analisados em 2026-11-16"]
---
# Acompanhamento de montadores

## Responsabilidade
Medir a produtividade de quem monta as cargas no galpão (caixas por hora, caixas por dia, erros) em CB Norte, CB Sul, LOG I Barreiras e LOG II Juazeiro; ranquear e calcular a gratificação. Alimenta o KPI (Easy Pallet cx/montador/hora e /dia) e a Gestão à vista.

## Arquivos
- `Montadores/Acompanhamento de Montadores - <Mês>'<AA>.xlsx` (mês corrente na raiz; fechamentos em `<ano>/`; ~0,1–0,35 MB).
- 2024: versões "analitico", "web" e "web - Ajustes" por mês (provável troca de relatório do Easy Pallet).
- `2025/modelo/`: `Modelo.xlsx` e `Teste de remuneração.xlsx`.
- `MELHORES ANO AJUDANTES DE GALPÃO.xlsx`: ranking anual.
- `Fatura Easy/[COSTA BRASIL] <AAAAMM> - FATURA EASY PALLET.xlsx`: abas `CARGAS - PALETIZAÇÃO`, `CARGAS - LINHA DE MONTAGEM`, `FATURA`, `motivos diferenças` (conferência do faturamento do serviço).

## Estrutura
| Aba | Conteúdo |
|---|---|
| `CB NORTE`, `CB SUL`, `LOG I - BARREIRAS`, `LOG II - JUAZEIRO` | grade dia × montador (cx/h), média do dia, meta 350; quadro "RANKING" com produtividade do mês, total de caixas, dias trabalhados, média/dia, erros, gratificação, observação; gráficos |
| `DA` / `DL` (ocultas) | base colada do Easy Pallet: sistema (nome), nome completo, base, montador, login, qtd. de caixas, caixa/hora, erros, data de entrega + colunas calculadas (montador normalizado, base, dia da semana) e evolução por dia da semana |
| `RESUMO` (oculta) | média do grupo, dia anterior e acumulado por unidade (lida pelo KPI) |
| `MELHORES DO MÊS` (oculta) | top 2 por unidade |

Fórmulas: `SUMIFS(DA!H, DA!J = dia, DA!L = base, DA!K = montador)`; gratificação = total de caixas × R$ 0,003. Detalhe em [[12_PROJECTS/Active/HubLogistico/INDICATORS#7. Montadores (Easy Pallet, diário)|catálogo §7]].

## Entradas necessárias
1. Exportação diária (ou do período) do Easy Pallet por base, com: montador, login, qtd. de caixas, caixa/hora, erros, data de entrega.
2. Cadastro de montadores ativos por base (inclui diaristas/teste).

## Problemas conhecidos
- Nome do montador vem em grafias diferentes (sistema × nome completo); depende de de-para manual.
- Média do dia corrente aparece como `#N/A` até haver produção; células `#DIV/0!` no valor de gratificação.

## Proposta para o Hub
- Importador do Easy Pallet com de-para por login (chave estável), não por nome.
- Dashboard: ranking ao vivo, curva diária por unidade, mapa de calor dia da semana × montador, gratificação prevista do mês.
- Bom candidato a fase inicial: entrada única e regra simples.

## Estado da implementação no Hub (2026-11-17)
- Fase inicial em validação: importa a planilha mensal oficial que contém `DA` e `DL`, monta ranking por unidade e exporta uma cópia atualizada usando o modelo XLSX/XLSM.
- Importações, nomes e modelos ficam apenas no IndexedDB do navegador usado para importar; a tela e rotas são administrativas. Não sincroniza esses dados ao Firebase.
- A média de CX/H considera dias com produção; a meta é 350 CX/H e a gratificação estimada é caixas × R$ 0,003.
- O resumo e o ranking diário já estão na primeira versão; de-para de nomes, observações, evolução por dia da semana e gráficos ainda precisam de validação/complementação.
- Os modelos de exportação de Montagem, PES, KM e Montadores podem ser guardados localmente no mesmo navegador e trocados escolhendo outro arquivo.
