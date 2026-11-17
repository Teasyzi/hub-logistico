---
title: "HubLogistico — Requisitos"
aliases: []
type: project-doc
domain: projects
project: "HubLogistico"
status: in-progress
created: 2026-11-16
updated: 2026-11-16
summary: "Requisitos funcionais e não funcionais do Hub logístico, derivados do levantamento das planilhas atuais."
tags: []
---
# HubLogistico — Requisitos

## Requisitos funcionais
| ID | Requisito | Prioridade | Critério de aceite |
|---|---|---|---|
| RF-01 | Importar cada exportação de [[12_PROJECTS/Active/HubLogistico/DATABASE\|F01–F19]] a partir de uma pasta de entrada, reconhecendo tipo e unidade pelo conteúdo | alta | arquivo do dia importado sem renomear nem editar macro |
| RF-02 | Reimportar o mesmo arquivo não duplica dados | alta | contagens iguais após duas importações |
| RF-03 | Calcular os indicadores do [[12_PROJECTS/Active/HubLogistico/INDICATORS\|catálogo]] por unidade, dia e mês | alta | bate com a planilha atual no mesmo período |
| RF-04 | Dashboard por acompanhamento e KPI consolidado com meta, ACM, tendência e % vs meta | alta | página HTML gerada por um comando |
| RF-05 | Metas e lançamentos manuais (TRIXLOG, Green Mile, licenças, acidentes, custos) editáveis fora do código | média | alterar meta sem mexer em script |
| RF-06 | Cadastros únicos de unidade, pessoa (aliases), veículo e produto (código Solar ↔ CB, fator de conversão) | média | nenhum de-para duplicado entre módulos |
| RF-07 | Exportar para Excel as visões que ainda são enviadas a terceiros (ex.: PES, fechamento) | média | arquivo gerado com o mesmo layout de envio |
| RF-08 | Log de importação com arquivo, hash, linhas e erros | média | toda linha de fato rastreável até o arquivo |
| RF-09 | Exportar cada acompanhamento do site para uma cópia do respectivo modelo oficial, durante a fase de testes | alta | cada acompanhamento existente tem ação **Exportar** que atualiza e baixa a planilha oficial; novos acompanhamentos só são concluídos quando têm esse fluxo |

### Padrão obrigatório de exportação
- A pessoa seleciona o modelo oficial vigente no próprio acompanhamento; o site atualiza uma cópia local e baixa o arquivo pronto para conferência/envio.
- Manter o mesmo fluxo de uso em todos os acompanhamentos. Compartilhar a rotina técnica sempre que o formato permitir; cada acompanhamento mantém apenas seu mapeamento de abas/células.
- Preservar abas, fórmulas, formatos e macros do modelo, atualizando somente os campos mapeados. Não substituir o arquivo original.
- Não enviar modelos para Firebase ou GitHub. A exportação acontece no navegador; arquivos com macros não são executados pelo Hub.
- A planilha continua sendo o arquivo diário oficial até a validação completa do site.
- Critério para concluir uma nova área: incluir a aba **Exportar**, o modelo mapeado e uma comparação com arquivo oficial validado.

## Requisitos não funcionais
| ID | Atributo | Requisito mensurável |
|---|---|---|
| RNF-01 | Simplicidade de uso | atualização diária em ≤ 3 passos (copiar arquivos, rodar, abrir) |
| RNF-02 | Portabilidade | roda em Windows sem caminhos de usuário fixos no código |
| RNF-03 | Privacidade | dados de clientes, motoristas e valores ficam na rede interna; nenhuma credencial em arquivo |
| RNF-04 | Robustez a layout | cabeçalho inesperado gera erro claro, não número errado |
| RNF-05 | Desempenho | atualização diária completa em < 1 min com o volume atual (~3 mil linhas/dia por DL) |

## Fora de escopo
- Escrever em ERP, SAP Solar, Roadnet ou BI.
- Substituir os portais da Solar (PES/PETS); o Hub só calcula e confere.

## Premissas e questões em aberto
- Onde o Hub roda e quem acessa (decisão pendente).
- Origem das rotas planejadas dos DAs, do relatório de insuficiência, de `Transportes - 1x1` e dos custos de frota.
- Significado das ocorrências 24 e 28 do Kardex; escala de NPS/CSAT de 2026.
