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
**Não documentado e não implementado.** Proposta: importar o TXT bruto (como o Kardex) numa tabela `reprog_da(dia, revenda, cliente, produto, quant, valor)` + cadastro de clientes, e mostrar contagem por cliente/supervisor e % de clientes reprogramados. Isso elimina os arquivos de 37 MB.

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
