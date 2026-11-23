---
title: "Auditoria dos acompanhamentos e relatórios-fonte"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
summary: "Auditoria de nov/2026 dos 12 acompanhamentos do escopo: arquivos atuais, relatórios-fonte (com amostras conferidas), entradas manuais, riscos, revisão dos módulos já no Hub e padrão visual."
---
# Auditoria: acompanhamentos e relatórios-fonte (23/11/2026)

Base:
- os arquivos **atuais** da pasta de rede `Informações Logisticas`, de nov/2026;
- as amostras de relatórios em `Downloads\Relatorios fonte`, de 23/11/2026.

Diferente do `MOD_00` (zip de 16/11), aqui cada layout foi conferido coluna a coluna contra a aba onde é colado.

## Conteúdo
| Arquivo | O que tem |
|---|---|
| `checklist_relatorios.md` | **o que exportar**: ✅ 8 recebidos · ❌ 11 faltando · ✍️ 7 digitados |
| `matriz_fontes.md` / `.csv` | relatório-fonte × acompanhamento |
| `riscos.md` | fluxo relatório → planilha → indicador e 14 riscos priorizados |
| `revisao_hub.md` | revisão de Montagem, Reprog DL's, PES, Montadores e KM (já no Hub) |
| `../DESIGN/PADRAO_VISUAL.md` | padrão de cores, componentes e esqueleto de página |
| Fichas (12) | `KM_Planejado_x_Realizado`, `Cargas_em_Aberto`, `Fill_Rate_Insuficiencia`, `Imagens_Frota`, `KPI_Distribuicao_Logistica`, `Montadores`, `Montagem_de_Cargas`, `Perdas_de_Estoque_DLs`, `PES_PED_Logistico`, `REPROG_DAs`, `Retorno_por_Motivo`, `Transportes_1x1` |
| `_modelo_ficha.md` | modelo para fichas novas |

Inventário automático (só leitura): `code/tools/auditar_planilhas.ps1`.
```powershell
powershell -ExecutionPolicy Bypass -File code\tools\auditar_planilhas.ps1 -Saida AUDITORIA
```
Gera `arquivos.csv`, `inventario.csv` e `amostras.csv`. Os três ficam **fora do git**, porque os cabeçalhos podem trazer nomes de pessoas. Em 23/11 foram 5.581 arquivos, 667 abas inventariadas e 21 abas de amostra.

## Situação por acompanhamento
| Acompanhamento | No Hub | Fontes | Pronto para automatizar? |
|---|---|---|---|
| Montagem de Cargas + Reprog DL's | ✅ implementado | ✅ todas | já está; ver bug ⚠️ em `revisao_hub.md` |
| PES – PED Logístico | ✅ implementado | ✅ + ✍️ | já está |
| Montadores | 🟡 só no navegador | ✅ | sincronizar com o Firebase e aceitar o nome `(n)` |
| KM | 🟡 em validação | ✅ DLs · ❌ Norte/Sul (S19) | validar com as amostras |
| Cargas em aberto | ❌ | ✅ (S07) | **sim: piloto recomendado** |
| Perdas DL's | ❌ | ✅ MB59 · ❌ inventário | sim, sem o inventário no início |
| Retorno por motivo | ❌ | ✅ DLs · ❌ DAs (S17) | DLs sim; DAs depois da amostra |
| Transportes 1x1 | ❌ (sem MOD) | ❌ S19/S20 | depois da amostra S19 |
| Fill rate | ❌ | ❌ S08/S09 | depois das amostras |
| REPROG (DAs) | ❌ (sem MOD) | ❌ S15/S16 | depois das amostras |
| KPI | ❌ | depende de todos | **por último** |
| Imagens Frota | site próprio | — | card/link no Hub (fase A) |

## Ordem proposta (esforço × dependência)
1. **Correções no que já existe:**
   - bug do Resumo de Planejamento na Montagem;
   - nome `(n)` e sincronização do Montadores;
   - import único de versão (C1);
   - aplicar o padrão visual (tokens de unidade, limpeza de inline/hex).
2. **Cargas em aberto:** uma fonte, layout confirmado.
3. **KM:** validar DLs com as amostras; Norte/Sul quando chegar o S19.
4. **Perdas DL's:** MB59 confirmado; inventário em seguida.
5. **Retorno por motivo:** DLs reaproveitando a tabela `retorno`; DAs com o S17.
6. **Transportes 1x1:** DLs pelo Roadnet + lançamento de ajudantes; DAs com o S19. Isso elimina o link do WhatsApp.
7. **Fill rate** e **REPROG DAs**, conforme chegarem S08/S09 e S15/S16.
8. **KPI:** lendo do Hub, sem links externos.
9. **Imagens Frota:** card/link a qualquer momento. Alinhar o visual depois.

## Perguntas para o responsável (consolidadas das fichas)
| ID | Pergunta | Bloqueia |
|---|---|---|
| P-01 | Quem gera o `MONTAGEM DAS CARGAS` de CB Norte/Sul, de qual sistema, e ele pode ficar numa pasta fixa da rede (fim do link do WhatsApp)? | KM Norte/Sul, 1x1, KPI |
| P-02 | Origem da despesa usada no CPK do KM | KM |
| P-03 | Filtro aplicado no export do BI de cargas em aberto (18.971 linhas no export × ~3.378 na planilha) e se o TXT `VDGR0017` ainda é usado | Cargas em aberto |
| P-04 | Qual consulta (BI/ERP) dá a base de insuficiência, e se ela pode trazer o código do produto | Fill rate |
| P-05 | Para que serve o KSB1 (conferência contábil ou indicador novo)? Existe para CCRT? | Perdas |
| P-06 | Qual transação SAP gera as diferenças de inventário, e quando | Perdas |
| P-07 | Consulta do BI de devoluções dos DAs (motivo × motorista) e regra única de motivos administrativos (Norte × Sul, constante −328) | Retorno, KPI |
| P-08 | Código/nome do relatório do ERP de pedidos reprogramados; "dias reprogramados" é mensal ou acumulado? | REPROG |
| P-09 | De onde saem volume, cargas e pedidos dos DAs digitados no KPI | KPI |
| P-10 | Significado das ocorrências 24 e 28 do Kardex | KPI (perdas CB) |
| P-11 | Fator único cubos ↔ cx (1,6 / 1,66 / 1,68) | Montagem, KPI |
| P-12 | Qual é o arquivo oficial do KPI no mês ("Copia" ou não)? | KPI |
| P-13 | Meta de 450 cubos vale para as 4 unidades? As particularidades excluem cargas do indicador? | 1x1 |
| P-14 | O Easy Pallet permite exportar com a base no nome, ou as 4 bases num arquivo só? | Montadores |
| P-15 | Imagens Frota: basta card/link, ou login único com o Hub? `fleet-plates.js` pode virar o cadastro único de veículos? | Imagens Frota |
| P-16 | Já abertas no `TASKS.md`: ACM com pré-venda; transporte em dois meses; "% retorno cliente" Solar; escala CSAT | Montagem, PES |
