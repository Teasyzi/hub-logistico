---
title: "HubLogistico — Visão geral"
aliases: ["Hub Logístico", "Informações Logísticas"]
type: project-doc
domain: projects
project: "HubLogistico"
status: in-progress
created: 2026-11-16
updated: 2026-11-16
summary: "Contexto do Grupo CB (unidades, sistemas, pasta de rede), os 11 acompanhamentos logísticos levantados no zip de 2026-11-16 e o glossário do negócio."
tags: []
---
# HubLogistico — Visão geral

## Problema
O trabalho diário de logística e distribuição é feito em ~11 acompanhamentos em Excel, cada um alimentado à mão por exportações de sistemas (TXT do ERP, planilhas da Solar, BI, Easy Pallet, abastecimento). Os arquivos se encadeiam por links externos e macros que dependem de caminhos locais. O KPI consolidado é uma planilha de uma aba que mostra só o resumo das 4 unidades.

## Objetivo
Transformar os acompanhamentos num **Hub**: cada exportação entra num pipeline que calcula os indicadores e publica dashboards. O KPI passa a ser a página inicial, com drill-down por unidade, dia, motorista e produto.

## Escopo
- Inclui: os 11 acompanhamentos de [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_00_Mapa_dos_Acompanhamentos|Mapa dos acompanhamentos]], o catálogo de indicadores ([[12_PROJECTS/Active/HubLogistico/INDICATORS|Indicadores]]) e as fontes de dados ([[12_PROJECTS/Active/HubLogistico/DATABASE|Fontes e modelo]]).
- Não inclui (por ora): escrever nos sistemas de origem (ERP, SAP da Solar, Roadnet, BI). O Hub só **lê** exportações.

## Contexto do negócio
| Sigla no arquivo | Unidade | Tipo | Observação |
|---|---|---|---|
| CB Norte / CB CE Norte / MATRIZ | CB Distribuidora de Bebidas, Maracanaú-CE | DA (distribuidor autorizado, revenda própria) | código de cliente `6403-…` |
| CB Sul / CB CE Sul / FILIAL II | CB Distribuidora de Bebidas, Iguatu-CE | DA | código de cliente `6461-…` |
| DL Barreiras / CBAR / LOG I / FILIAL I / "CB BAHIA" | Costa Brasil Logística I, Barreiras-BA | DL (distribuidor logístico da Solar) | remunerado por caixa unitária entregue |
| DL Juazeiro / CCRT / LOG II / FILIAL III / Cariri | Costa Brasil Logística II, Juazeiro do Norte-CE | DL | remunerado por caixa unitária entregue |
| OT / Frota OT | operação de transporte própria (LOG I e LOG II) e "frota puxada Norte" | transporte | KM, TRIXLOG e média de consumo no KPI |

- **Solar** (Solar Refrescos/Solar Coca-Cola) é a fabricante. Os DLs operam com dados e programas da Solar: exportações de venda e retorno, PES (Programa de Excelência Solar, antigo PED) e PETS (programa de transporte).
- Pasta de rede de origem dos arquivos: `Z:\OPERACIONAL\Logistica e Dist\Informações Logisticas\` (usada nos links externos e macros). Há também uma cópia num OneDrive pessoal de planejamento ("CB 2026").
- Histórico disponível: 2023-04 a 2026-11, variando por acompanhamento.

## Glossário
| Termo | Significado |
|---|---|
| CX UNIT / UC | caixa unitária (unidade padrão de volume do sistema Coca-Cola) |
| CX FIS | caixa física |
| Cubos | volume cúbico. As planilhas usam fator fixo, mas **não o mesmo**: 1,6 (Montagem, Reprogramação), 1,66 (cubagem média no KPI) e 1,68 (Gestão à vista). Padronizar no Hub |
| ACM | acumulado do mês |
| Pré-venda | carga planejada para o dia seguinte (D+1) |
| Reprogramação | volume/cliente pré-vendido que não foi planejado em até 24 h por falta de capacidade |
| Retorno | volume expedido que voltou (motivo registrado) |
| Fill rate / Insuficiência | falta de estoque contra pedido entregue (DAs) |
| Easy Pallet | sistema de montagem de cargas/paletização; mede caixas por hora por montador |
| Green Mile | app de rota (início, check-in, check-out, fim); PES mede % de uso válido |
| TRIXLOG | telemetria da frota; nota de segurança/condução |
| Roadnet | roteirizador da Solar (origem do resumo de planejamento) |
| Kardex | relatório de lançamentos de estoque do ERP das revendas (TXT `VDER0002`) |
| Sem acerto | vendas emitidas e ainda não acertadas no ERP (TXT `VDGR0017`) |
| Projeto 1x1 | meta de ajudantes por carga (acompanhamento "Transportes - 1x1", fora do zip) |
| CPK | custo por km rodado, usado para custear a dispersão de KM |

## Usuários e partes interessadas
- Analista de logística (dono dos acompanhamentos e do Hub).
- Gestão das unidades (DAs e DLs) e da Costa Brasil Logística.
- Solar: recebe resultados PES/PETS e envia fechamentos oficiais.

## Restrições
- Dados internos (clientes, motoristas, valores): o Hub não pode ser publicado em hospedagem pública sem controle de acesso.
- Ambiente atual: Windows + Excel + pasta de rede. As exportações chegam por download manual (pasta `Downloads`) ou por TXT do ERP.
- As exportações de entrada **não estão no zip**: cada acompanhamento precisa de amostras novas para construir o importador.

## Métricas de sucesso
- Tempo de atualização diária do KPI: de horas de copia-e-cola para "jogar arquivos numa pasta e rodar um comando".
- Zero links externos quebrados e zero dependência de caminho local de usuário.
- Mesmos números do Excel atual na validação paralela de pelo menos um fechamento mensal por acompanhamento.

## Projetos e notas relacionados
- [[12_PROJECTS/Active/HubLogistico/INDICATORS|Catálogo de indicadores]]
- [[12_PROJECTS/Active/HubLogistico/ARCHITECTURE|Arquitetura atual e proposta]]
- [[12_PROJECTS/Active/HubLogistico/IMPLEMENTATION_PLAN|Plano por fases]]
