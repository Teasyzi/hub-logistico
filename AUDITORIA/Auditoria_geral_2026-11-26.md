# Auditoria geral dos acompanhamentos (26/11/2026)

Comparativo entre o que o Hub faz hoje e as planilhas oficiais da pasta. Feito por leitura do código e das fichas, sem entrar com login (as telas com login e as gravações no Firestore ainda precisam de teste seu).

Versão do código nesta auditoria: `20261126-02` (após os ajustes do dia; ver §4).

## 1. Quadro dos 12 acompanhamentos

| # | Acompanhamento | Planilha de origem (pasta) | Exporta igual à planilha | Layout fiel à planilha | Dados a partir de jan/26 | Pontos em aberto |
|---|---|---|---|---|---|---|
| 1 | Montagem de Cargas (DLs) | `Montagem de Cargas\11 - Montagem de Cargas - CB Logística.xlsm` | Sim (`exportar_montagem.js`) | Parcial: RESUMO + telas por DL | Importar Resumos de Planejamento de 17/11 em diante | Reimportar os Resumos a partir de 17/11; revisar telas por DL contra a aba |
| 2 | PES Logístico | `PES - Resultados comerciais e logisticos\PED - Logistica` | Sim (`exportar_pes.js`) | Parcial | Importar o que falta de jan a nov | Barreiras e Juazeiro lado a lado (pedido seu); cabeçalho enxuto |
| 3 | Cargas em aberto | `Cargas em aberto\Acompanhamento de Cargas em aberto.xlsx` | **Não** | Não segue a planilha | Consulta BI diária (não é histórico mensal) | Decidir se precisa de exportação e de layout de planilha |
| 4 | Montadores | `Montadores\Acompanhamento de Montadores - Novembro'26.xlsx` | Sim (`exportar_montadores.js`), mas só do que está no navegador | Parcial | **Só no navegador** (ver §3.4) | Levar ao Firestore; importar as 4 unidades; validar "em observação" |
| 5 | KM planejado × realizado | `Analise da quilometragem planejada\KM Planejado x Realizado - Novembro.xlsm` | Sim (`exportar_km.js`) | Parcial (matriz por dia) | Resumos de Barreiras e Juazeiro de nov pendentes | Dispersão corrigida hoje (§4); importar nov; revisar 15 rotas FRETEIRO da Sul |
| 6 | Perdas de estoque DLs | `Perdas de Estoque - DL's\2026 - 11 Perdas de Estoque - Barreiras.xlsx` (e Juazeiro) | Sim (`exportar_perdas.js`, conferido no Excel em 26/11) | Sim (aba Resumo) | Importação de nov pendente | Quadro da planilha por categoria de Barreiras deixa fora R$ 65,11 (linha #N/D); o Hub inclui |
| 7 | Retorno por motivo | `Retorno por motivo\10. Retorno - Outubro.xlsx` | **Não** | Não segue a planilha | Histórico jan–out a importar | Exportar; layout igual à planilha; correções dos meses fechados |
| 8 | Transportes 1x1 | `Transportes - 1x1\11 - Acompanhamento de transportes - 1x1 - Novembro.xlsx` | Parcial (só as Particularidades) | Parcial | Importar nov (5 arquivos) | Exportar a planilha inteira; layout igual à planilha |
| 9 | Fill rate · Insuficiência | `Fill rate Insuficiencia - CB's Norte e Sul\11 - Insuficiência - Novembro.xlsx` | Sim (`exportar_fillrate.js`, conferido) | Sim (RESUMO, CB NORTE, CB SUL, MÊS A MÊS) | Importar jan–nov | Setas e meta ajustadas hoje (§4) |
| 10 | Gestão à vista | `Gestão à vista\2026\` | Sim (`exportar_gestao.js`) | Sim (uma aba por DL) | Planilhas completas jan–out/26 prontas | Custos mai–out e empilhadeiras (digitar) |
| 11 | REPROG (DAs) | `REPROG\CB NORTE`, `REPROG\CB SUL` | Sim (`exportar_reprog.js`, 6.110/6.110 células) | Sim | Importar BASE + planilhas antigas + TXT | Preenchimento para baixo ajustado hoje (§4) |
| 12 | KPI Distribuição e Logística | `KPI Distribuição e Logística\KPI Distribuição e Logística - Novembro.xlsx` | Sim (`exportar_kpi.js`, 1.450/1.450 células) | Sim (cartões) | Importar KPIs jan–nov + "Perdas de Estoque 2026" | Metas de perdas de nov; ver §3.5 |

## 2. Painel principal e modo visitante

- **Observações de status nos cards:** tiradas (ativo, novo, em validação, planejado). Também saiu o card "Custos de descarga", que não existe no Hub ainda. Ficam só os 12 acompanhamentos da pasta.
- **Ver como visitante:** o redirecionamento para a Montagem vinha de uma lista fixa que não tinha KPI, Montadores nem Acessos; qualquer outra página caía na Montagem. Agora fica na mesma página (ou na versão pública dela). Testar com login.
- **Promessa do painel:** o texto diz "quem recebe vê só aquele acompanhamento". Hoje isso não é garantido: as regras do Firestore liberam para todo leitor todas as coleções `*_publicado` (ver §3.1). É só a tela que mostra um acompanhamento por vez. Ou o texto muda, ou as regras passam a separar por acompanhamento.

## 3. Login, acessos e dados

### 3.1 Regras (`docs/firestore.rules`)
- Bom: dados brutos (`*_dados`, `*_parametro`, `venda`, `importacao` etc.) são só do admin; o leitor lê só `*_publicado`, `meta/publicacoes_*` e os dados de fechamento que o admin publica.
- **P1. Leitor sem e-mail verificado:** a função `leitor()` confere só se o e-mail está em `meta/acesso.leitores`. Quem cria conta com esse e-mail, sem confirmar, entra. Proposta: exigir `request.auth.token.email_verified == true` e enviar o e-mail de confirmação na tela de login.
- **P2. "Criar conta" aberto:** qualquer pessoa cria conta no login. Não vaza dado (as regras barram), mas polui a base. Proposta: desligar o cadastro público no console do Firebase e criar as contas dos leitores pelo admin.
- **P3. Acesso por acompanhamento:** não existe. Ver a promessa do painel (§2). Se quiser, a lista de leitores passa a ter quais acompanhamentos cada um vê (ex.: `meta/acesso.leitores` com mapa e-mail → lista).
- **P4. Admin só pelo console** (`admins/{uid}`): bom, mas o admin não consegue ver quem é admin pelo site.

### 3.2 Tela de Acessos (`#/acessos`)
- Lista de e-mails em uma caixa de texto; "Salvar" troca a lista inteira. Não há histórico de quem mudou. Remover um e-mail corta o acesso na próxima leitura (bom).
- Proposta: uma linha por leitor, com o nome (só no Firestore), data de inclusão, quem incluiu e botão de remover.

### 3.3 Ver como visitante
- É só de tela: o admin continua com acesso aos rascunhos pelas regras. Para testar de verdade o que o leitor vê, use uma segunda conta de leitor (ou a aba anônima).

### 3.4 Montadores
- Os dados ficam **só no navegador** ("Nenhum arquivo importado neste navegador"). Outro computador ou o leitor não veem nada, e o admin perde os dados se trocar de navegador.
- Importação: a unidade é escolhida **uma vez por lote**. Para as 4 unidades, são 4 lotes. Os relatórios diários não trazem a unidade (o aviso já diz isso).
- **"Em observação" (ajudantes):** o login que não está no cadastro DA/DL fica em observação. O cadastro também fica no navegador, então um cache antigo ou um cadastro não importado aqui gera o mesmo aviso. Antes de culpar a regra, confirme que o cadastro foi importado neste navegador e que o site está na versão `20261126-02` (os módulos do Montadores estavam com versão de 17 e 23/11; corrigido hoje).
- Proposta (ideia já anotada no KPI): levar os Montadores para o Firestore.

### 3.5 Pendências de login que dependem de você
1. Publicar as regras no console (`kpi_*`, `gav_*`, `rp_*`, `fr_*`, `transp_*`, `perdas`/`retorno` se ainda não estiverem).
2. Decidir P1 (e-mail verificado) e P2 (cadastro aberto).
3. Decidir P3: leitor vê todos os acompanhamentos ou só alguns?

## 4. O que foi feito hoje (no código, ainda sem publicar)

| Item | Onde | Situação |
|---|---|---|
| Painel: sem observações de status; sem "Custos de descarga" | `views.js` (`painelPrincipal`) | feito |
| Ver como visitante: fica na mesma página; só telas de administração caem na versão pública | `app.js` (`destinoVisitante`) | feito, falta testar com login |
| KM: dispersão = (planejado − realizado) ÷ planejado (negativa quando passa do planejado); farol e "dentro da meta" ajustados | `km.js`, `views.js` | feito; a exportação .xlsx leva o mesmo valor |
| Setas: positivo = ▲ verde; negativo = ▼ vermelho (KM, 1x1, PES "quanto falta", Fill rate) | `views.js`, `transportes_telas.js`, `fillrate_telas.js` | feito |
| Fill rate: "acima/dentro da meta" saiu; fica "meta até 2% do pedido" | `fillrate_telas.js` | feito |
| Perdas: sem aba Resumo (abre Barreiras) | `perdas_telas.js` | feito; a função `telaResumo` ficou sem uso (remover depois) |
| REPROG: digitar um dia num cliente preenche todos os clientes vazios abaixo | `reprog_telas.js` | feito |
| Cache: todos os imports em `?v=20261126-02` (antes havia 17/23 de nov) | `index.html`, `js/*`, prévias | feito |

Verificação: os 17 módulos carregam sem erro de sintaxe (`code/tests_js/sintaxe.html`). Nada disso foi visto numa tela com login.

## 5. O que fica para as próximas rodadas (decisões suas marcadas com ▶)

1. **Exportação faltante:** Cargas em aberto, Perdas e Retorno não exportam. Transportes exporta só as Particularidades. ▶ Exportar a planilha inteira igual à original em todos?
2. **Layout igual à planilha:** só Fill rate, Gestão, REPROG e KPI seguem a planilha de fato. ▶ Quer que as telas de Montagem, PES, KM, Perdas, Retorno e Transportes sigam a planilha também? Por ordem de importância?
3. **Cabeçalho enxuto:** em todos, tirar a repetição (ex.: "KPI · Distribuição e Logística · Grupo CB · novembro de 2026" mais "Distribuição e Logística" mais a data ao lado). ▶ Modelo proposto: título + seletor de mês, nada mais.
4. **PES:** Barreiras e Juazeiro lado a lado (a fazer).
5. **Barreiras e esvaziamento (esvazios):** ▶ Confirme se "esvazios" é a Cargas em aberto. Se for, ela precisa do layout da planilha (item 2).
6. **Montadores:** levar ao Firestore (ver §3.4). ▶ Autorizar?
7. **Dados de jan/26 em diante:** importar pelo ⚙ Importar de cada acompanhamento (tem login; eu não consigo). Lista na §6.
8. **Login:** P1, P2 e P3 (§3.5).

## 6. Dados de jan/26 em diante (o que importar, de onde)

| Acompanhamento | Arquivos da pasta |
|---|---|
| Montagem | Resumos de Planejamento de 17/11 em diante; Montagens diárias do que faltar |
| PES | `PES - Resultados comerciais e logisticos` (PED Logística e Comercial) |
| KM | Listagem de abastecimentos (KMS.xls ou TXT) e os Resumos de Barreiras e Juazeiro de nov; cadastro de motoristas da planilha "KM Planejado x Realizado - Novembro.xlsm" |
| Perdas | `2026 - 11 Perdas de Estoque - Barreiras.xlsx` e `... Juazeiro.xlsx`, mais PRODUTOS.xlsx |
| Retorno | BI de nov; planilhas de out e anteriores |
| Transportes 1x1 | 5 arquivos de nov (ver a ficha Transportes_1x1 §12) |
| Fill rate | `Fill rate Insuficiencia - CB's Norte e Sul\2026` (jan–out) e `11 - Insuficiência - Novembro.xlsx` |
| Gestão à vista | `Gestão à vista\2026\"... - Hub jan-out.xlsx"` (já prontas) |
| REPROG | BASE ATUALIZADA.xlsx + "CB NORTE/SUL - REPROGRAMAÇÃO" + TXT do dia |
| KPI | `KPI Distribuição e Logística\2026` (jan–nov) e `Perdas de Estoque 2026.xlsx` (Desktop) |
| Montadores | `Montadores\2026` (planilha mensal DA/DL) |
| Cargas em aberto | Consulta BI (diária; não há histórico mensal) |

## 7. Como testar (checklist para você)

1. Publicar no console as regras pendentes e, se decidir, P1/P2.
2. Entrar como admin: abrir o painel (só os 12 cards, sem observações).
3. Clicar em "Ver como visitante" em cada acompanhamento: deve ficar na mesma tela e "Voltar ao admin" deve funcionar.
4. KM: conferir a dispersão de um mês (negativa quando o realizado passa do planejado; seta vermelha para baixo).
5. Fill rate: o card de insuficiência deve mostrar só "meta até 2% do pedido".
6. REPROG: digitar um dia no primeiro cliente de uma revenda; os vazios abaixo devem receber o mesmo dia.
7. Montadores: importar as 4 unidades em lotes e ver se o "em observação" some com o cadastro importado.
