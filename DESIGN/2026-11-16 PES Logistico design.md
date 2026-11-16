---
title: "HubLogistico — Design da Fase 2 (PES Logístico no site)"
aliases: ["Design PES Logístico"]
type: project-doc
domain: projects
project: "HubLogistico"
status: complete
created: 2026-11-16
updated: 2026-11-16
summary: "Design aprovado da Fase 2: área #/pes no site com placar mensal por DL (4 indicadores automáticos da Montagem + 5 digitados), quanto falta e publicação."
tags: []
---
# Design da Fase 2: PES Logístico no site

Aprovado pelo usuário em 2026-11-16.

## Intenção
Trocar a planilha mensal `PES - Resultados logisticos - <mês>.xlsm` e a macro `Atualiza_Bases` (nome de arquivo fixo, editada todo mês) por uma área do site. Segundo o usuário, a maior parte dos números vem da Reprogramação e o resto ele preenche à mão.

## Objetivos
- Placar mensal do PES Logístico por DL (Barreiras `CBAR`, Juazeiro `CCRT`), com os indicadores, metas e pontos de [[12_PROJECTS/Active/HubLogistico/INDICATORS#2. PES Logístico 2026 (DLs, Solar)|INDICATORS §2]].
- Link próprio para e-mail, com o mesmo controle de acesso da Montagem (os leitores só veem o que foi publicado).

## Fora do escopo
Certificação por ciclo, ranking da rede, PES Comercial, PETS.

## Abordagem
Uma só faz sentido: uma área nova no site, reaproveitando o cálculo da Montagem. As alternativas descartadas:
- consertar a macro: mantém a dependência de nome de arquivo;
- versão local em Python: o site é o que está em uso.

## Design
- **Rota** `#/pes/resumo/AAAA-MM` (leitor e admin). Para o admin, também `#/pes/digitacao/AAAA-MM` e `#/pes/publicar/AAAA-MM`. O painel principal ganha o link do PES.
- **Placar por DL**: uma linha por indicador (9) com meta, real, bateu?, pontos possíveis, pontos feitos e SOLAR (opcional). Total sobre 1.000. O ponto é cheio ou zero, sem proporcional.
- **Automáticos**, saindo do `calcular()` da Montagem do mês:
  - % retorno volume = `total.ret_vol`;
  - % retorno cliente = `total.ret_cli`;
  - % reprogramação volume = `reprog.pct`;
  - % reprogramação cliente = `reprog.pct_cli`.
- **Quanto falta** (decisão do agente), nos 4 automáticos: a folga até a meta, em cx unit (volume) ou em clientes/entregas (cliente). Negativa = estourou.
- **Digitados**, por DL e por mês: Green Mile, CSAT, licenças (1 = vigentes), acidentes com afastamento e telemetria. Também ficam ali as metas (padrão 2026, editáveis) e a coluna SOLAR (decisão do agente).
- **Publicar**: uma foto do placar, como na Montagem. A publicação do PES é separada da publicação da Montagem.
- **Regras**: as da planilha atual. As decisões em aberto (TASKS › Próximas) entram depois, sem mudar a tela.

## Fica para quem implementa
Nomes das coleções no Firestore, layout fino e regras do `firestore.rules` para as coleções novas.
