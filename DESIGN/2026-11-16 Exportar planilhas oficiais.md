---
title: "HubLogistico — Exportar planilhas oficiais"
aliases: ["Exportar acompanhamento para Excel"]
type: project-doc
domain: projects
project: "HubLogistico"
status: in-progress
created: 2026-11-16
updated: 2026-11-16
summary: "Durante a fase de testes, o Hub atualiza as planilhas oficiais para manter o envio diário sem substituir o fluxo de trabalho atual."
tags: []
---
# Exportar para as planilhas oficiais

## Decisão de fluxo
O site fica em fase de teste e conferência por enquanto. A planilha oficial continua sendo o arquivo enviado diariamente. Para cada acompanhamento já disponível no Hub, a ação **Exportar** deve preencher uma cópia do modelo oficial com os dados atuais e baixar o arquivo para revisão/envio.

## Requisitos
- Usar o arquivo oficial do acompanhamento como modelo: preservar abas, fórmulas, formatação, gráficos e, quando possível, macros.
- Atualizar somente os campos e intervalos que o acompanhamento já preenche; não recriar uma planilha genérica.
- Nunca enviar modelos com credenciais ao GitHub. Os modelos são selecionados pelo administrador no navegador e não são enviados ao Firestore.
- O usuário confere a exportação e continua enviando a planilha como faz hoje. O site não substitui esse fluxo nem é publicado como sistema pronto.
- Incluir exportação por acompanhamento, começando pelas áreas já existentes no site: Montagem, PES e KM. Expandir para as demais quando forem implementadas.
- Nenhum acompanhamento novo será considerado concluído sem uma aba **Exportar** que use o respectivo modelo oficial.

## Modelos localizados
Dentro de `Downloads/Informações Logisticas.zip` há modelos de Montagem (`Montagem de Cargas/11 - Montagem de Cargas - CB Logística.xlsm`) e KM (`Analise da quilometragem planejada/KM Planejado x Realizado - Novembro.xlsm`). Ambos contêm VBA. Os modelos PES encontrados vão até agosto/2026; não foi localizado o arquivo oficial mais recente.

## Etapas
1. [x] Mudar o estado do projeto para teste paralelo e exportação para os arquivos oficiais.
2. [x] Mapear a saída principal: Montagem nas abas `RESUMO`, `BARREIRAS` e `JUAZEIRO`; PES nas abas `CBAR` e `CCRT`, linhas 7–15; KM na aba `Analise por dia`.
3. [x] Criar o fluxo compartilhado para carregar um modelo XLSM, editar uma cópia em memória e baixar sem enviar o modelo; adaptadores PES, Montagem e KM implementados.
4. [ ] Comparar cada resultado exportado com uma planilha oficial validada e abrir os XLSM no Excel para conferir fórmulas/macros.
5. [x] Adicionar **Exportar** às áreas Montagem, PES e KM. A exportação KM atualiza a análise diária das quatro unidades; validar também as demais abas do modelo antes do uso diário.

## Pendente do usuário
- O modelo PES oficial de outubro foi fornecido como referência. Se houve mudanças no formato desde essa versão, enviar o arquivo atualizado antes de usar diariamente.
- Os modelos de Montagem/KM vieram do ZIP disponível e podem estar defasados; enviar a versão vigente se tiver mudado antes de usar diariamente.

## Estratégia técnica
Como os modelos de Montagem e KM contêm VBA, não recriar o arquivo com um escritor XLSX comum. Preferir atualizar somente os XMLs das células necessárias dentro de uma cópia do pacote OOXML, preservando sem alteração as demais partes do arquivo (VBA, gráficos, fórmulas, estilos, imagens e abas ocultas). Ativar recálculo no Excel ao abrir se os valores calculados dependerem de fórmulas. Validar cada modelo no Excel antes de usar no fluxo diário.
