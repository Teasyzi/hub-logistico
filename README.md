---
title: "HubLogistico"
aliases: ["Hub Logístico", "Automação dos acompanhamentos logísticos"]
type: project
domain: projects
project: "HubLogistico"
status: in-progress
project_status: active
tech_stack: [python, sqlite]
repo: "https://github.com/Teasyzi/hub-logistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Hub de informações de logística e distribuição do Grupo CB: automatizar os acompanhamentos diários e mensais (KPI, KM, cargas, montadores, perdas, retorno, fill rate, PES) com scripts, sites e dashboards."
tags: []
---
# HubLogistico

> **Objetivo:** Hub de informações de logística e distribuição do Grupo CB: automatizar os acompanhamentos diários e mensais (KPI, KM, cargas, montadores, perdas, retorno, fill rate, PES) com scripts, sites e dashboards.

## Estado atual
- 2026-11-16: levantamento concluído (1.733 arquivos documentados).
- 2026-11-16: **fase 0 e fase 1 (Montagem de Cargas + Reprogramação DL's) implementadas e validadas** contra as planilhas de jan–nov/2026. Detalhes, regras e erros encontrados nas planilhas em [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_Montagem_de_Cargas|Montagem de cargas]]. Stack em [[12_PROJECTS/Active/HubLogistico/DECISIONS/ADR-0001 Stack local com Python stdlib e SQLite|ADR-0001]].
- Instalado neste PC: `code/hub.ini` aponta `dados = C:\HubLogistico\dados` (banco `hub.db`) e `entrada = C:\Users\luisi\Downloads`. Histórico jan–nov/2026 carregado de uma cópia do zip (o drive `Z:` não estava acessível); os arquivos de 01–13/11 foram importados dos Downloads.

## Como executar
Requisito: Python 3 (só biblioteca padrão). Na pasta `12_PROJECTS/Active/HubLogistico/code/`:
```bash
copy hub.ini.exemplo hub.ini          # ajuste dados= (FORA do vault) e entrada= (ex.: Downloads)
python -B hub.py historico "Z:\OPERACIONAL\Logistica e Dist\Informações Logisticas\Montagem de Cargas\2026"
python -B hub.py importar             # importa as exportações e Resumos da pasta de entrada
python -B hub.py                      # abre o Hub no navegador (ou duplo clique em "Hub Logistico.bat")
python -B hub.py validar 2026-11      # confere contra a planilha antiga importada
python -B hub.py exportar             # versão HTML estática em <dados>\site
python -B -m unittest discover -s tests
```
Rotina diária: baixar as 4 exportações (venda e retorno de cada DL) e salvar os 2 Resumos de Planejamento sem habilitar edição na pasta de entrada → no Hub, **Importar → Importar agora**. Dias úteis, metas e tarifa: **Parâmetros**.

Ferramenta de análise usada no levantamento: [[XLSX Inspector (Python)]].

## Próximas etapas
- [ ] Usar o Hub em paralelo à planilha da Montagem por alguns dias (importar a cada nova exportação).
- [ ] Fase 2: PES Logístico calculado a partir da Montagem ([[12_PROJECTS/Active/HubLogistico/IMPLEMENTATION_PLAN|Plano]]).

## Por onde começar a ler
| Documento | Conteúdo |
|---|---|
| [[12_PROJECTS/Active/HubLogistico/PROJECT_OVERVIEW\|Visão geral]] | unidades, sistemas, glossário |
| [[12_PROJECTS/Active/HubLogistico/MODULES/MOD_00_Mapa_dos_Acompanhamentos\|Mapa dos acompanhamentos]] | inventário do zip e grafo de dependências |
| [[12_PROJECTS/Active/HubLogistico/INDICATORS\|Indicadores]] | fórmula, meta e origem de cada KPI |
| [[12_PROJECTS/Active/HubLogistico/DATABASE\|Fontes e modelo]] | exportações de entrada e tabelas propostas |
| [[12_PROJECTS/Active/HubLogistico/ARCHITECTURE\|Arquitetura]] | como é hoje e como será |
| [[12_PROJECTS/Active/HubLogistico/IMPLEMENTATION_PLAN\|Plano]] | ordem das fases |
| [[12_PROJECTS/Active/HubLogistico/TASKS\|Tarefas]] | backlog |
| [[12_PROJECTS/Active/HubLogistico/CHANGELOG\|Changelog]] | histórico |

Módulos (um por acompanhamento) em `MODULES/`: KPI, KM, Montagem de Cargas, Montadores, Cargas em aberto, Perdas, Retorno, Fill rate, Custos de descarga, Gestão à vista, PES/PETS.

## Código
- Local: `code/` dentro deste projeto (`hub/` pacote, `hub.py` CLI, `tests/`). Sem `.md` lá dentro (o vault indexaria).
- Banco e páginas geradas ficam na pasta `dados` do `hub.ini`, **fora do vault** (contêm nomes de clientes e motoristas).
- Repositório git: https://github.com/Teasyzi/hub-logistico (**privado**, branch `main`). A raiz do repositório é esta pasta do projeto. O `.gitignore` bloqueia `hub.ini`, bancos, planilhas e páginas geradas.
- Atualizar o GitHub depois de mudanças (nesta pasta): `git add -A`, depois `git commit -m "mensagem"`, depois `git push`.
- Origem dos dados: pasta de rede `Z:\OPERACIONAL\Logistica e Dist\Informações Logisticas\` (cópia analisada: `Downloads\Informações Logisticas.zip`, 2026-11-16).
