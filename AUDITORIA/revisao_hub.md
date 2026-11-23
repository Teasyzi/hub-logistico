---
title: "Revisão dos módulos já implementados no Hub"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
---
# Revisão dos módulos já implementados (23/11/2026)

O que foi conferido:
- as amostras de `Relatorios fonte` (23/11) contra os importadores;
- o código de `docs/js/` (commit `535d221`);
- as pendências do `TASKS.md`.

**O que não foi feito:** os números não foram recalculados pelo Hub. Esta máquina não tem Python, então `python -B hub.py importar` não roda aqui, e a importação pelo site exige login de admin. A conferência numérica (seção 6) fica como próximo passo.

## 1. Montagem de Cargas e Reprogramação DL's (`#/montagem`)
| Item | Resultado |
|---|---|
| Layout VOLUMES DE VENDAS / ZSD0092 | ✅ igual. `detectar()` reconhece pelas colunas `Taxa Ocupação` + `Cxs Unitaria`, então o nome do arquivo não importa |
| Layout VOLUMES DE RETORNOS / ZSD0090 | ✅ igual. Reconhecido por `Motivo Nome` |
| Resumo de Planejamento CBAR_V5 / CCRT | ✅ **corrigido em 23/11** (bug confirmado com as amostras reais). Ver abaixo |
| Pendência: coluna E da Reprog Barreiras nov (1,99% → 1,74%) | continua aberta (planilha oficial) |
| Pendência: fator de cubo 1,6 × 1,66 (KPI) | continua aberta |

> [!bug] (CORRIGIDO 23/11) O Resumo de Planejamento importado pela Montagem era lido como "rotas do KM"
> Em `docs/js/importar.js`, `detectar()` testa `km_resumo` **antes** de `resumo`:
> - `km_resumo` = aba `Resumo Geral` com "Carga" na coluna B a partir da linha 9 e `C8` preenchido;
> - na amostra de 23/11, `B10 = "Carga"` e `C8 = HOJE()+2`, então a condição é verdadeira.
>
> A tela de importação da Montagem (`app.js`, ~l. 190–210) só trata `venda`, `retorno`, `resumo`, `montagem` e `reprog`. O arquivo é marcado como "✓ km_resumo" e registrado na importação, mas **o planejamento do dia não é gravado**.
>
> - A regra entrou no commit `03bbc3a` (17/11), junto com o KM.
> - O importador Python (`code/hub/importar.py`) não é afetado.
> - **Como confirmar:** importar um Resumo de Planejamento em `#/montagem/importar` e ver se a coluna "Tipo" mostra `km_resumo`.
> - **Correção sugerida:** detectar pela tela que chamou, passando `opcoes.acompanhamento`, ou na Montagem tratar `km_resumo` como `resumo`, já que o arquivo é o mesmo.

Observação: o `MOD_Montagem_de_Cargas.md` diz `C8 = HOJE()+1`, mas a amostra de 23/11 tem `C8 = HOJE()+2` (planejamento de sábado para segunda?). Vale confirmar se o Hub valida a data do planejamento.

## 2. PES Logístico (`#/pes`)
| Item | Resultado |
|---|---|
| Indicadores automáticos (retorno e reprog) | dependem da Montagem, com layout ✅. Herdam o item ⚠️ acima se o planejamento não for gravado |
| Digitação nov/26 | pendente (`TASKS.md`) |
| Escala CSAT (1–5 × 0–10) e definição de "% retorno cliente" | pendentes com a Solar |
| Macro `Atualiza_Bases` da planilha oficial | ainda lê nomes fixos da pasta Montagem. Só some quando o PES oficial for exportado pelo Hub |

## 3. Montadores (`#/montadores`, só admin)
| Item | Resultado |
|---|---|
| Layout `listas-trabalhadas` | ✅ colunas iguais |
| **Nome do arquivo** | ⚠️ `lerListaDiaria` exige exatamente `AAAA-MM-DD-listas-trabalhadas.xlsx`. Três das quatro amostras (`(1)`, `(2)`, `(3)`, criadas pelo navegador ao baixar arquivos de mesmo nome) **são recusadas** com "o nome precisa começar pela data…". Hoje o usuário precisa renomear e importar uma base por vez, escolhendo a base manualmente |
| Base | não vem no arquivo. A tela pede a base, um lote por vez |
| Armazenamento | IndexedDB local, sem Firebase: os dados não aparecem em outro computador nem para outro usuário |

Sugestões:
1. Aceitar o sufixo ` (n)` no nome.
2. Sugerir a base pelos logins do cadastro, por exemplo prefixo `dl_` = DL, ou o login já cadastrado numa base.
3. Publicar os totais por base/dia no Firebase, sem nomes, como já é feito no KM e na Montagem.

## 4. KM (`#/km`, em validação)
| Item | Resultado |
|---|---|
| Listagem de abastecimentos (TXT, Windows-1252) | ✅ cabeçalho igual. As 4 `N. local atual` da amostra (MATRIZ, FILIAL I, II, III) batem com `UNIDADES_KM` |
| Rotas DLs (Resumo Geral) | ✅ layout igual (B:L) |
| Rotas Norte/Sul (`MONTAGEM DAS CARGAS`) | sem amostra nova. Os campos são lidos **por posição** (`r[8]` / `r[13]`), o que é frágil se a operação mudar o arquivo |
| Validação contra out/nov | pendente (`TASKS.md`) |
| Gráfico diário previsto no `KM design.md` | não implementado (`paginaKMResumo` só tem tabelas) |

## 5. Código e visual (vale para todas as páginas)
| # | Achado | Onde | Ação |
|---|---|---|---|
| C1 | Imports do mesmo módulo com e sem `?v=` (`dados.js?v=20261117-7` em `app.js` × `dados.js` em `views.js`; `calc.js?v=…` × `calc.js` em `km.js`; `modelos.js?v=…` em `app.js` × `modelos.js` em `montadores.js`). O navegador carrega **duas instâncias** do módulo, o que duplica o estado e desperdiça cache | `app.js`, `views.js`, `km.js`, `dados.js`, `montadores.js` | uma única versão (constante `VERSAO` no `index.html` ou sem `?v=` em todos) |
| C2 | `abasMontagem`/`abasPES`/`abasKM`/`abasMontadores` e os `topo*` são cópias quase iguais | `views.js`, `app.js` | um componente `abas(modulo, itens)` |
| C3 | Nomes de unidade em 5 grafias: "BARREIRAS — LOG I", "Barreiras", "DL Barreiras", "BARREIRAS", "LOG I - BARREIRAS" | `views.js`, `km.js`, `dados.js`, `montadores.js` | um mapa único em `dados.js` (ver `DESIGN/PADRAO_VISUAL.md`) |
| C4 | Cor por unidade repetida: NORTE e CBAR = `cor 1`, SUL e CCRT = `cor 2`. Num gráfico com as 4 unidades não dá para distinguir | `km.js`, `dados.js` | cor fixa por unidade |
| C5 | Estilos inline: 9 em `views.js`, 7 em `app.js`, 1 em `index.html`, além do `cssText` do botão "ver como visitante" | — | classes utilitárias no `hub.css` |
| C6 | Cores fixas no CSS: `th.grp{color:#fff}` e a sombra `#0000000d` | `hub.css` | tokens (`--brand-ink`, `--shadow`) |
| C7 | Bloco de tokens do tema escuro duplicado (auto e `[data-theme=dark]`), e `--head-sub` só no claro | `hub.css` | definir uma vez e reaproveitar |
| C8 | Dois padrões de status: pill `.st.ok` e célula `.c-ok` | `views.js` | manter os dois com papéis claros: `.st` para rótulo, `.c-*` para célula de tabela. Documentado no padrão |
| C9 | Setas: Montagem usa ▲/▼ pelo sinal da tendência vs meta; PES usa ▲/▼ pela posição vs meta. Nos dois, verde = lado bom (`t-up`) | `views.js` | ✅ consistente na cor. Documentar a regra única "direção = acima/abaixo da meta; cor = bom/ruim" |
| C10 | `.montadores-planilha` definida e não usada | `hub.css` | remover |

## 6. Próximo passo: conferência numérica
Num computador com Python e com o `hub.ini` configurado:
1. Copiar as amostras de `Relatorios fonte` para a pasta de entrada.
2. Rodar `python -B hub.py importar`.
3. Comparar o resumo de nov/26 (até 23/11) com:
   - `11 - Montagem de Cargas - CB Logística.xlsm` (`RESUMO`);
   - `Reprogramação DL's - 11 Novembro.xlsx`;
   - `11 - PES - Resultados logisticos - Novembro.xlsm`.
4. No site, como admin:
   - importar as 4 listas do Easy Pallet de 19/11 e comparar com `Acompanhamento de Montadores - Novembro'26.xlsx` (abas `DA`/`DL`, data 19/11);
   - importar a Listagem e os Resumos no KM e comparar com `KM Planejado x Realizado - Novembro.xlsm` (`Analise por dia`).

## 7. Correções aplicadas
- **2026-11-23 · Resumo de Planejamento na Montagem.**
  - `detectar(wb, contexto)` passou a receber a tela que importa. Com `contexto = 'montagem'`, `Resumo Geral` + `Paradas` → `resumo`. O KM e as chamadas sem contexto mantêm `km_resumo`.
  - A tela da Montagem descarta tipos de outros acompanhamentos, que antes eram registrados como importados.
  - Teste: `code/tests_js/importar.test.html?resumo=<url do .xlsm>`. Passou com os dois Resumos de 23/11: CBAR (data 21/11, 9 cargas) e CCRT (data 21/11, 22 cargas).
