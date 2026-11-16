---
title: "KM planejado x realizado"
aliases: ["Análise da quilometragem planejada", "Dispersão de KM"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Compara, por dia, unidade e motorista, o km planejado das rotas com o km realizado da listagem de abastecimentos; calcula dispersão e custo pela CPK."
tags: []
related: []
sources: ["KM Planejado x Realizado - Novembro.xlsm, Fechamentos - Evolução de KM.xlsx, Dispersão acumulada anterior.xlsx, Resumo de Planejamento - Diário - CBAR_V5 28-01.xlsm — analisados em 2026-11-16"]
---
# KM planejado x realizado

## Responsabilidade
Medir a dispersão entre a quilometragem planejada pela roteirização e a rodada (abastecimentos), por unidade, dia e motorista, e custear a diferença. Alimenta o KPI (quilometragem e KM planejado vs realizado) e a Gestão à vista.

## Arquivos
- Mensal: `Analise da quilometragem planejada/<AAAA>/<AAAA-MM>/KM Planejado x Realizado - <Mês>.xlsm` (~0,5–0,8 MB). Até 2025 existia também versão "Ajustado".
- Fechamentos: `Fechamentos - Evolução de KM.xlsx` (2026) e `Dispersão acumulada anterior.xlsx` (2025): planejado, realizado, % dispersão, dif e custo por mês e unidade; aba oculta de ajustes retroativos CBAR.
- 2024: `Resumo de Planejamento CBAR - <Mês> 2024 ... .xlsm` e ajustes diários de dezembro.

## Estrutura do `.xlsm` mensal
| Aba | Conteúdo |
|---|---|
| `Analise por dia` | matriz unidade × dia (MATRIZ, FILIAL I, II, III): planejado, realizado, dif, %; totais e médias; gráfico |
| `CB NORTE`, `CB SUL`, `CB BAHIA`, `CB JUAZEIRO` (ocultas) | acumulado por motorista |
| `Planejado Norte` / `Planejado Sul` | rotas do dia: data, descrição da rota, placa, TAG, motorista, km, ida e volta, km total, área, planejamento de referência, dif, status |
| `Planejado Barreiras` / `Planejado Juazeiro` | rotas exportadas do roteirizador: data, carga, veículo, crachá, motorista, área, entregas, volume, cubos, cap. cubos, distância planejada |
| `Consulta` | "Listagem de abastecimentos" do período: nº veículo, tipo, placa, ano, data, volume (l), valor, consumo km/l, km percorridos, km anterior, local, nome do local de custo |
| `Planilha1` (oculta) | de-para apelido do motorista → nome completo, por unidade |

Fórmulas-chave: realizado = `SUMIFS(Consulta!J, Consulta!M = unidade, Consulta!F = dia)`; por motorista via `VLOOKUP` no de-para; status de rota em [[12_PROJECTS/Active/HubLogistico/INDICATORS#6. KM planejado × realizado (todas as unidades, diário)|catálogo §6]].

## Automação atual (VBA)
- `Importar_KM_Barreiras` e `Importar_KM_Juazeiro_Final`: abrem o `.xls*` mais recente de uma pasta local do usuário (`...\Desktop\...\KM's Barreiras\` e `...\KM's Juazeiro\`), leem a data em `C8`, copiam `B11:L<fim>` para a aba `Planejado ...` e replicam formato e fórmula da coluna Q.
- Planejado Norte/Sul e Consulta: colagem manual.
- 2025: `Resumo de Planejamento - Diário` com conexões ODBC ao Roadnet (DSN `ROADNET`, banco `UPSLT`), tabelas de consulta, macro de envio por Outlook e gravação em banco (`tbl_RPResumoPlanejamento`) via ADODB.

## Entradas necessárias (não estão no zip)
1. Listagem de abastecimentos do mês (todas as unidades).
2. Arquivo de rotas planejadas de Barreiras e Juazeiro (formato com data em `C8` e rotas a partir da linha 11).
3. Rotas planejadas de Norte e Sul (origem a confirmar).

## Problemas conhecidos
- Macros com caminho fixo de uma máquina específica.
- Linhas "MOTORISTA GENERICO" e apelidos fora do de-para geram `#N/A` e km não atribuído.
- A diferença do dia é calculada com o dia corrente zerado (realizado ainda não lançado), o que distorce a média.

> [!warning] Segurança
> O arquivo `Resumo de Planejamento - Diário - CBAR_V5 28-01.xlsm` (2025) guarda usuário e senha do banco Roadnet **em texto puro** nas conexões. Recomendo remover a conexão desse arquivo arquivado e pedir a troca da senha a quem administra o acesso. Credenciais nunca devem ir para o Hub ou para o vault.

## Proposta para o Hub
- Importador para listagem de abastecimentos e rotas, normalizando placa, motorista e unidade.
- Dashboard: dispersão diária por unidade, ranking de motoristas por desvio, rotas com status "verificar", custo acumulado.
