---
title: "Imagens Frota — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "(sem MOD: site já existente)"
---
# Imagens Frota

## 1. Objetivo e público
Registrar fotos e o estado de cada veículo por ciclo de inspeção (1º, 2º e 3º ciclo) e por unidade.

## 2. Arquivo atual e histórico
- Pasta `Imagens Frota\` com 4.381 arquivos (~750 MB): fotos `.jpg/.jpeg`, PDFs e 6 `.xlsx` "Consolidado <n>º Ciclo", organizados por responsável (uma pasta por supervisor) e número do carro.
- Site pronto: <https://teasyzi.github.io/imagens-frotaV3/>, repo `Teasyzi/imagens-frotaV3`.
  - HTML + JS sem build, Tailwind pré-compilado, PWA.
  - Usa um projeto Firebase próprio (`imagens-frota`): Auth + Firestore (`fleet`, `fleet/{id}/slots`, `settings/editors`).
  - `fleet-plates.js`: cadastro estático de ~180 veículos (ID, placa, modelo, tipo, ano), gerado do "Consolidado 2º Ciclo.xlsx".

## 3. Relatórios-fonte
Não depende de relatório de sistema. As fotos são enviadas pelo próprio site.

## 4–6. Regras e saídas
Fora do escopo da automação. O pedido é só **integrar ao Hub**.

## 7. Riscos e inconsistências
- São dois projetos Firebase com logins separados: `hub-log-dd1a0` e `imagens-frota`. Quem usa os dois faz login duas vezes.
- O cadastro de veículos (`fleet-plates.js`) é a mesma informação que o KM (placa, nº veículo na Listagem de abastecimentos) e o 1x1 (placa, código do veículo) usam. Hoje são três fontes separadas.
- O visual é diferente: vermelho `#E30613`, neutros slate, Lucide e Tailwind. O Hub usa `#c00000`, cinzas neutros e CSS próprio. Ver `DESIGN/PADRAO_VISUAL.md`.

## 8. Perguntas em aberto
1. Basta entrar como card/link no Hub, ou o site deve abrir dentro do Hub com o mesmo login?
2. Quem mantém `fleet-plates.js`? Ele pode virar o cadastro único de veículos do Hub?

## 9. Situação no Hub
Nada documentado no repo do Hub. Proposta:
- **Fase A:** card "Imagens Frota" no painel e link no cabeçalho, sem mudar o site.
- **Fase B, opcional e num commit separado em `imagens-frotaV3`:** adotar os tokens do Hub (`--brand`) e usar o cadastro único de veículos.
