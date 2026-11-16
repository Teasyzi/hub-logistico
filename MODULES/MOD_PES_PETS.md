---
title: "PES e PETS (programas Solar)"
aliases: ["PES", "PED", "Programa de Excelência Solar", "PETS - Transporte", "Resultados comerciais e logísticos"]
type: module
domain: projects
status: review
project: "HubLogistico"
created: 2026-11-16
updated: 2026-11-16
summary: "Resultados mensais dos programas da Solar: PES Comercial (DAs), PES Logístico (DLs), certificação/ranking da rede, NPS de entregas e PETS Transporte (evidências de frota e motoristas 3PL)."
tags: []
related: []
sources: ["10 - PES - Resultados comerciais - Outubro.xlsx, 10 - PES - Resultados logisticos - Outubro.xlsm, Certificação PES 2026 - DA's/DL's.xlsx, NPS - mês.xlsx, Fechamento de Setembro 28.10 - Programa de Excelência Solar.xlsx, Controle RTM e Controle Preventiva (PETS 2026-05), Fechamento - PED Logístico Agosto 2025.pptx — analisados em 2026-11-16"]
---
# PES e PETS

Pasta `PES - Resultados comerciais e logisticos/` (608 arquivos, 2019 → 2026). Até 2025 o programa se chamava **PED**; em 2026 virou **PES** (Programa de Excelência Solar).

## PES Comercial (DAs: CB CE Norte e CB CE Sul)
- Mensal: `PED - Comercial/<AAAA>/<MM - MÊS>/<MM> - PES - Resultados comerciais - <Mês>.xlsx`. Abas `Resumo PES - CB CE NORTE`, `Resumo PES - CB CE SUL`, `Volumes` (meta × real por categoria), `Formulas` e `Range` (faixas de pontuação, ocultas).
- Indicadores, metas e pontos: [[12_PROJECTS/Active/HubLogistico/INDICATORS#3. PES Comercial 2026 (DAs)|catálogo §3]]. Coluna Q indica a fonte de cada real (BI, portal, "informações", Solar).
- Fechamento oficial da Solar: `Fechamento de <Mês> <DD.MM> - Programa de Excelência Solar.xlsx` (~3 MB): `CAPA`, `ONEPAGE`, `INDICADORES MEDIDOS`, `RANKING`, `GLOSSÁRIO` (grupo, subgrupo, indicador, descrição, fonte, responsáveis), `PREMISSAS` e ~15 abas ocultas (bases, cálculo de notas, simulador, raio-X por ciclo). Útil para conferir o nosso cálculo contra o oficial.
- `Certificação PES 2026 - DA's.xlsx`: ranking da rede.
- Histórico: 2019–2020 (`Resultados`, `.xlsb` do PED 2º semestre), 2021–2025 mensais, "Resultados Solar" (fechamentos oficiais), evidências de abril/2024 (prints e documentação de imóvel/seguro/licenças das revendas).

## PES Logístico (DLs: CBAR e CCRT)
- Mensal: `PED - Logistica/<MM> - PES - Resultados logisticos - <Mês>.xlsm` (~30 KB), abas `CBAR` e `CCRT` com indicador, meta, real, % atingimento, pontos possíveis/realizados e coluna "SOLAR" (pontuação oficial) para comparação.
- Macro `Atualiza_Bases`: abre `Z:\...\Montagem de Cargas\<MM> - Montagem de Cargas - CB Logística.xlsm` e `Reprogramação DL's - <MM> <Mês>.xlsx` e copia retorno volume/cliente (`R8`/`S8`) e reprogramação volume/cliente (`F6`/`P6`). **Nomes de arquivo fixos dentro do código**: precisa editar a macro todo mês.
- Indicadores, pontos, certificação e desempate: [[12_PROJECTS/Active/HubLogistico/INDICATORS#2. PES Logístico 2026 (DLs, Solar)|catálogo §2]].
- `Certificação PES 2026 - DL's.xlsx`: ranking dos DLs da rede Solar (PE, BA, RN, CE, PI, MA, RO…) por ciclo (abr; mai–ago; set–dez).
- `NPS - mês.xlsx`: abas `CCRT` e `BAR` com pesquisa de entregas (código, razão social, nota, justificativa) e NPS calculado. Bases de clientes pesquisados vêm da Solar.
- 2025: `Dashboard PED Logístico - <Mês>.pptx` e `Fechamento - PED Logístico <Mês> 2025.pptx` (apresentação mensal), PDFs de premissas e fechamentos, prints de ranking.

## PETS — Transporte (Costa Brasil Logística I e II)
- Mensal desde jul/2025: `PETS - Transporte/<AAAA>/<MM. Mês>/PETS - Transporte <AAAA-MM> - COSTA BRASIL LOGISTICA I|II/` (também enviado em `.zip`/`.rar`).
- Conteúdo de cada pacote:
  - `Controle RTM - <empresa>.xlsx`: `Mapa de aderência RTM por veíc.` (itens obrigatórios de segurança do veículo e do transportador), `Aderência RTM por veículo` (placa cavalo/carreta, ano, ~26 itens SIM/NÃO), `Telemetria_Evidência_Feedback`, `Gestão de motoristas 3PL`.
  - `1. Plano de Manutenção Preventiva/`: contratos de manutenção por veículo (PDF), `Controle Preventiva - LOG I|II.xlsx`, relatórios de preventivas internas e externas.
  - `2. Certificado de Opacidade/`: certidão por placa (PDF).
  - `3. Jornada dos Motoristas/`: relatório de jornada (PDF).
  - `Controle RTM - Gestão de motoristas 3PL (Evidências)/`: certificados e documentos por motorista (dados pessoais: não levar ao vault).
- `2026/PETS 2026.pdf`: regulamento do ano (não lido: o ambiente não tem leitor de PDF).
- `Tira dúvidas/`: 10 prints de orientação.

## Entradas necessárias
- PES Logístico: só dados já cobertos pela Montagem/Reprogramação + Green Mile, CSAT, licenças, acidentes e telemetria (digitados).
- PES Comercial: relatórios de BI/portal da Solar por indicador (a levantar um por um).
- PETS: checklist e documentos; automação possível é um **controle de vencimentos** (opacidade, preventivas, documentos de motorista) e a montagem do pacote mensal.

## Proposta para o Hub
- PES Logístico calculado direto da base da Montagem (sem macro e sem nome fixo de arquivo), com simulação de pontos e "quanto falta" por indicador.
- Painel de certificação: pontos acumulados no ciclo × faixa Ouro/Prata/Bronze.
- PETS: checklist mensal com status por item e alerta de documentos a vencer.
