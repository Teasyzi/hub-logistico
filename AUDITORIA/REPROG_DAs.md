---
title: "REPROG (CB Norte e CB Sul) — ficha de auditoria"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
mod: "(novo: não havia MOD; MOD_Reprogramacao.md não existe)"
---
# REPROG: clientes reprogramados dos DAs (CB Norte e CB Sul)

> Não confundir com a **Reprogramação DL's** (Barreiras/Juazeiro, Roadnet), que fica em `Montagem de Cargas`. Esta é a reprogramação das revendas DA, feita pelo ERP.

## 1. Objetivo e público
Listar os clientes com pedido reprogramado (não entregue no dia e reemitido), quantos dias cada um foi reprogramado e quem são o vendedor e o supervisor. Mostra também a contagem por supervisor.

## 2. Arquivo atual e histórico
| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `REPROG\CB NORTE\CB NORTE - REPROGRAMAÇÃO.xlsx` | **37 MB** | `Resumo` (visível, **A1:J1048576**): cliente, razão, cidade, vendedor, supervisor, dia de rota, dias reprogramados + contagem por supervisor. `REPROGRAMAÇÃO DIA A DIA xlsx` (oculta, resultado do Power Query, 13 mil linhas). `base` (oculta, cadastro de clientes, 24 mil linhas) |
| `REPROG\CB NORTE\REPROGRAMAÇÃO DIA A DIA.xlsx` | 20 MB | **uma aba por dia** (`09-07` … `19-11`, ~80 abas), cada uma com a colagem do relatório do ERP; 5 conexões (`REPROG N1`, `REPROG1`…) |
| `REPROG\CB SUL\CB SUL - REPROGRAMAÇÃO.xlsx` | 3 MB | igual ao Norte + aba `Acerto` |
| `REPROG\CB SUL\REPROGRAMAÇÃO DIA A DIA.xlsx` | 14 MB | uma aba por dia, 2 conexões |

Não há histórico mensal. É um arquivo contínuo desde 09/07/2026.

## 3. Relatórios-fonte
| # | Relatório | Sistema | Filtros e período | Frequência | Aba | Amostra |
|---|---|---|---|---|---|---|
| 1 | Relatório de pedidos reprogramados/reemitidos do dia (layout texto: `DT.EMI | CLIENTE-- | ---- | QUANT | REDUZ. | DESCRICAO PRODUTO | UNITARIO | VLR TOTAL`) | ERP das revendas (relatório em TXT colado em colunas; **código do relatório a confirmar**) | dia, por revenda | diária | nova aba `dd-mm` em `REPROGRAMAÇÃO DIA A DIA.xlsx` | ❌ faltando (o TXT bruto) |
| 2 | Cadastro de clientes (`UXT (CÓD)`, `CLI (CÓD)`, razão social, fantasia, endereço, cidade, canal, subcanal, SUP, VEND, pasta/dia de rota, limite, condição de pagamento, status…) | ERP das revendas / BI | todos os clientes ativos | quando mudar | `base` | ❌ faltando |

## 4. Entradas manuais
- Criar uma aba por dia e colar o relatório.
- Atualizar o Power Query.
- Tabela de supervisores no `Resumo` (código 100/200/300/400 → nome).

## 5. Regras de cálculo
- Power Query junta todas as abas diárias.
- `Resumo` conta, por cliente, em quantos dias ele aparece ("dias reprogramados").
- Por supervisor: `CONT.SE` dos clientes.
- O `TOTAL PED./CLI.` (`SOMASES` por cliente) mostra o valor reprogramado.

## 6. Indicadores de saída e destino
Lista de clientes reprogramados e ranking por supervisor/vendedor, enviados à gestão comercial. Não alimenta o KPI nem o PES hoje.

## 7. Riscos e inconsistências
- **Arquivos inchados:** o Resumo do Norte tem intervalo usado até a linha 1.048.576 (37 MB). A mesma causa já foi vista no Retorno em 2025.
- Uma aba nova por dia faz o arquivo crescer sem limite (~80 abas em 4 meses), e o Power Query fica lento.
- O cabeçalho do relatório vem cortado nas colunas (`EDUZ. D`, `SCRICAO PRODUTO`), sinal de um TXT de largura fixa importado com quebras erradas.
- Não há separação por mês: o "dias reprogramados" acumula desde julho.

## 8. Perguntas em aberto
1. Qual é o relatório do ERP (código/nome) e os filtros usados para gerar a lista diária?
2. "Reprogramado" = cliente que aparece na lista do dia? Conta em dias corridos ou em dias de rota?
3. O indicador deve ser mensal (zera todo mês) ou acumulado?
4. O cadastro de clientes vem do BI ou do ERP?

## 9. Situação no Hub
**Construído em 25/11/2026: módulo `#/reprog` (ver §11).** Proposta original: importar o TXT bruto (como o Kardex) numa tabela `reprog_da(dia, revenda, cliente, produto, quant, valor)` + cadastro de clientes, e mostrar contagem por cliente/supervisor e % de clientes reprogramados. Isso elimina os arquivos de 37 MB.

## 10. Leitura completa (25/11/2026)
Arquivos lidos célula a célula (cópias de 23/11: Resumo do Norte agora com 4,8 MB e `A1:J611`, ou seja, o intervalo inchado já foi limpo; o do Sul tem 3 MB e `A1:J641`).

### 10.1 Como cada número é montado
- **Arquivo dia a dia** (84 abas no Norte, 82 no Sul, de 09-07 a 23-11):
  - `A:H` = relatório do ERP colado (DT.EMI, cliente, nome cortado em 20 caracteres, quantidade, código do produto, descrição, unitário, valor). Cada pedido termina numa linha de subtotal com descrição `OTAL PED./CLI.`.
  - `J:K` = lista dos clientes do dia (sem repetição). Bate com os clientes da coluna `B` em **todas** as abas.
  - `L` = `SUMIFS(H:H,B:B,J3,F:F,$N$1)`: soma dos subtotais do cliente no dia (cliente com 2 pedidos soma os 2).
  - A soma dos itens bate com a soma dos subtotais em todas as abas conferidas.
- **Resumo:**
  - `B` (código do cliente) = **só os clientes da última aba** (23-11): 600 no Norte e 631 no Sul. Valor colado, sem fórmula.
  - `C:I` = `PROCV` na aba `base` (razão, cidade, vendedor, supervisor, dia de rota). Não há `#N/D`.
  - `J` "DIAS REPROGRAMADOS" = **número digitado**, sem fórmula (ver 10.2).
  - Quadro por supervisor `G3:G8` = `CONT.SE` dos códigos de supervisor da coluna `G`. Sul `G8 = SOMA(G2:G7)` (inclui o título `G2`, sem efeito).
  - Não há valor (R$) no Resumo, apesar da coluna `L` do arquivo diário.
- **Aba oculta do Power Query:** está **desatualizada**. O Norte tem 1.105 linhas de clientes (1.070 distintos) e o Sul tem 387, que não batem com o Resumo. A consulta:
  - lê `C:\Users\<outro usuário>\Desktop\REPROGRAMAÇÃO\...` (a conexão está marcada como apagada, então não atualiza nesta máquina);
  - **descarta o nome da aba**, que é o dia. Por isso a consulta não serviria para contar dias.
- **Aba `Acerto` (Sul, oculta):** as colunas `J:K` estão vazias, então `M = SUMIFS(...)` dá sempre 0, e as colunas `N`/`O` da consulta não excluem nada. É uma tentativa abandonada.

### 10.2 O "DIAS REPROGRAMADOS"
Hipóteses testadas contra os 600 e os 631 clientes:

| Regra | Norte | Sul |
|---|---|---|
| Total de abas em que o cliente aparece (desde 09/07) | 24 | 20 |
| Abas de novembro | 215 | 170 |
| Abas **seguidas** até o último dia (aba ausente não quebra) | **393** | **491** |
| Dias úteis desde o início da sequência | **442** | **517** |

- A regra mais próxima é "há quantos dias seguidos o cliente está na lista". O resto difere em ±1 a ±9, o que sugere contagem feita à mão.
- Exemplos:
  - um cliente está em 10, 11, 12, 13, 16, 17, 18, 19 e 23/11 (9 abas) e tem `J` = 11;
  - outro está em 9 a 23/11 (10 abas) e tem `J` = 9.

### 10.3 Erros e riscos
1. A aba `10-10` (os dois arquivos) traz DT.EMI 13/10. O nome da aba está errado: 10/10/2026 foi sábado.
2. Sul `10-08` e `29-10`: abas criadas e **vazias** (relatório não colado). O Norte tem esses dias.
3. O Sul não tem as abas 12-11 e 16-11, e o Norte tem. Isso muda a contagem de dias seguidos.
4. A coluna `J` do Resumo é digitada e não segue uma regra única (10.2).
5. Cabeçalhos cortados (`EDUZ. D`, `SCRICAO PRODUTO`, `OTAL PED./CLI.`). No Sul, o nome vem colado ao código (`NOME00340211`). É o TXT de largura fixa importado com as quebras erradas.
6. O valor do dia cresce sem parar: Norte, 470 mil em 04/11 e 4,6 milhões em 23/11, com o mesmo número de clientes. Isso indica que o relatório traz **todos os pedidos em aberto acumulados**, não só os do dia. A confirmar.
7. O Power Query depende da área de trabalho de outro usuário.

### 10.4 O que falta para automatizar
- Amostra do **TXT bruto** do ERP (um dia do Norte e um do Sul) e o nome/código do relatório.
- O cadastro de clientes (aba `base`): de onde vem e com que frequência é atualizado. Ele tem nomes e telefones, então fica só no Firestore.

## 11. Decisões do usuário e módulo no Hub (25/11/2026)
### 11.1 Decisões
- **Fonte:** relatório do ERP **VDPDR007** "MOVIMENTO POR CLIENTE NO PERIODO", em TXT, um por revenda e por dia (amostras "REPROG N.TXT" e "REPROG S.TXT" de 25/11).
- **Cadastro:** a "BASE ATUALIZADA.xlsx" (abas NORTE e SUL, cabeçalho na linha 6, "ATUALIZADO EM" na linha 3). Ela é atualizada quase todo dia.
- **DIAS REPROGRAMADOS:** continuam **digitados** pelo usuário todo dia. No modo de edição, o Hub mostra ao lado de cada cliente o número do **dia anterior que foi feito** (o último dia gravado com dias digitados), para conferir.
- **Valores:** a planilha enviada só precisa dos dias. No dia a dia, o usuário quer ver pedidos, itens, valor e produtos.
- **Layout:** seguir a planilha (aba Resumo por revenda).
- **Exportação:** igual à planilha oficial.

### 11.2 Leitura do TXT (conferida com as amostras de 25/11)
- Linha de pedido: `PED ROM DT.EMI DT.FATURM CLIENTE NOME(20) … QUANT/UN OC 001-REDUZ-DESCRIÇÃO UNITÁRIO VLR TOTAL`. Os itens seguintes trazem só a parte do produto. O pedido fecha em `TOTAL PED./CLI.`, e o cabeçalho se repete a cada página.
- Norte: 1.085 pedidos, 10.651 itens, 866 clientes, R$ 3.904.230,50. Sul: 802 pedidos, 7.060 itens, 743 clientes, R$ 1.813.151,83.
- Em **todos** os pedidos, a soma dos itens é igual ao `TOTAL PED./CLI.`.
- O CNPJ/CPF da segunda linha do pedido não é gravado.
- **Revenda:** pelo cadastro. Os códigos se repetem entre as revendas (6.791 códigos estão nas duas bases), então o Hub exige ≥ 90% dos clientes num cadastro e 1,3× o outro. Sem essa folga, vale o nome do arquivo (N/S).

### 11.3 Módulo `#/reprog`
- Arquivos:
  - `docs/js/reprog.js` (leitura e Resumo);
  - `dados_reprog.js` (Firestore);
  - `reprog_telas.js` (telas);
  - `exportar_reprog.js` (planilha).
- Modelos: `docs/modelos/reprog_{NORTE,SUL}.xlsx`, gerados por `code/tools/modelo_reprog.ps1`. Cada um é só a aba Resumo da planilha oficial, sem clientes e sem nomes.
- Coleções:
  - `rp_dia/{u}_{dia}` (clientes, pedidos compactos, produtos, dias digitados);
  - `rp_base/{u}_meta` + `rp_base/{u}_{k}` (cadastro em partes de 7.000 clientes, porque o Norte tem 24 mil clientes e 1,8 MB, acima do limite de 1 MB por documento);
  - `rp_parametro/indice` (dias gravados);
  - `rp_publicado/{u}_{dia}`;
  - `meta/publicacoes_rp`.
  - Regras novas no `firestore.rules`.
- **Telas:** abas CB NORTE e CB SUL, mais ⚙ Importar e ⚙ Publicar, com seletor de dia.
  - Quadro SUP · SUPERVISOR · CLI REPRO, com o total.
  - Números do dia: clientes, pedidos, itens, valor, dias digitados, dia anterior e clientes sem cadastro.
  - Lista na ordem dos DIAS REPROGRAMADOS (sem dias digitados, pelo número do dia anterior), com o farol da planilha: 1 amarelo, 2 ou mais vermelho.
  - Busca, filtro por supervisor e clique no código para ver os pedidos e os produtos.
  - Em ✎ Editar dias, as colunas DIAS e DIA ANTERIOR vêm logo depois do código, e o Enter vai para o próximo cliente.
- **Importar:** TXT, BASE ATUALIZADA, planilha antiga do Resumo (semeia os dias do último dia; o dia é a data do arquivo ou a data escolhida) e planilha "dia a dia" (histórico de 09/07 a 23/11; o dia vem da DT.EMI).
- **Exportação:** igual à aba Resumo.
  - Quadro com `CONT.SE` e `SOMA`, e lista com os valores do cadastro (a planilha usava PROCV na aba base, que não vai junto).
  - Conferida no Excel com 23/11: Norte 6.110/6.110 e Sul 6.410/6.410 células iguais à planilha oficial, e os estilos iguais em 460/460 células conferidas.
  - **Diferença:** quando há clientes sem cadastro ou com SUP 0, o quadro ganha linhas e a lista desce. Em 25/11, no Norte, ela começa na linha 14, e não na 12.
- **Leitores:** veem códigos, cidade, VEND, SUP, dia de rota e dias, **sem nomes** (regra do projeto). A exportação fica só com o admin. **A confirmar com o usuário.**
- Prévia: `code/tests_js/reprog.preview.html?arquivos=…&pagina=NORTE|SUL|importar[&dia=][&admin=0][&editar=1][&dump=1]`, configuração "hub-reprog" (porta 8771).
### 11.4 Ajustes pedidos pelo usuário (25/11, depois do push ce90138)
- **Tela normal igual à planilha:** só o quadro por supervisor e as colunas B:J (CÓD CLIENTE … DIAS REPROGRAMADOS). O dia anterior, os pedidos, os itens, o valor e os números do dia aparecem **só em ✎ Editar dias**. O código continua clicável para ver os pedidos do dia.
- **Preencher o intervalo:** na edição, ao digitar um número num cliente e o mesmo número noutro mais abaixo (ou acima), os clientes **vazios** entre os dois recebem esse número. Isso só vale para as linhas visíveis (respeita a busca e o filtro de supervisor), e só quando não há outro número entre os dois. A lista fica na ordem do dia anterior e só se reordena depois de gravar.