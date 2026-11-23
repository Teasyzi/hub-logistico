---
title: "Matriz de fontes × acompanhamentos"
type: audit
project: "HubLogistico"
status: review
created: 2026-11-23
---
# Matriz de fontes × acompanhamentos

A versão em planilha está em `matriz_fontes.csv` (separador `;`).

Legenda: ✅ amostra recebida em `Relatorios fonte` (23/11/2026) · ❌ faltando · ✍️ digitado · 🟡 recebido, uso a confirmar.

| ID | Relatório-fonte | Sistema | Status | KM | Cargas | Fill | KPI | Mont. | Montagem | Perdas | PES | REPROG | Retorno | 1x1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S01 | VOLUMES DE VENDAS (CBAR) / ZSD0092 (CCRT) | SAP Solar | ✅ | | | | ● | | ● | ● | ● | | | |
| S02 | VOLUMES DE RETORNOS (CBAR) / ZSD0090 (CCRT) | SAP Solar | ✅ | | | | ● | | ● | | ● | | ● | |
| S03 | Resumo de Planejamento CBAR_V5 / CCRT | Roadnet | ✅ | ● | | | ● | | ● | | ● | | | ● |
| S04 | Listagem de abastecimentos | Sistema de frota | ✅ | ● | | | ● | | | | | | | |
| S05 | Rotas planejadas CB Norte / CB Sul = **mesmo arquivo que S19** | planilha via WhatsApp | ❌ | ● | | | ● | | | | | | | ● |
| S06 | Despesa de frota (CPK) | a confirmar | ❌ | ● | | | | | | | | | | |
| S07 | Consulta BI: vendas sem acerto | BI | ✅ | | ● | | | | | | | | | |
| S08 | Insuficiência por produto e dia | BI/ERP? | ❌ | | | ● | ● | | | | | | | |
| S09 | Cadastro de produtos | ERP revendas | ❌ | | | ● | | | | | | | | |
| S10 | Kardex `VDER0002` (TXT) | ERP revendas | ❌ (nov) | | | | ● | | | | | | | |
| S11 | `listas-trabalhadas` por base | Easy Pallet | ✅ | | | | ● | ● | | | | | | |
| S12 | MB59 movimentos de material | SAP | ✅ | | | | ● | | | ● | | | | |
| S13 | Diferenças de inventário | SAP | ❌ | | | | ● | | | ● | | | | |
| S14 | KSB1 centros de custo | SAP | 🟡 | | | | | | | ● | | | | |
| S15 | Relatório diário de reprogramados (TXT) | ERP revendas | ❌ | | | | | | | | | ● | | |
| S16 | Cadastro de clientes | ERP/BI | ❌ | | | | | | | | | ● | | |
| S17 | Devoluções por motivo e motorista (DAs) | BI | ❌ | | | | ● | | | | | | ● | |
| S18 | Volume, cargas e pedidos dos DAs | BI? | ❌ | | | | ● | | | | | | ● | |
| S19 | MONTAGEM DAS CARGAS CB NORTE/SUL (rotas, placa, motorista, km, ajudantes, cubagem) | planilha via WhatsApp | ❌ | ● | | | ● | | | | | | | ● |
| S20 | Ajudantes por carga (DLs) | informado pela base | ❌ | | | | ● | | | | | | | ● |
| D01 | TRIXLOG | portal | ✍️ | | | | ● | | | | ● | | | |
| D02 | Green Mile / Cashdrive | portal | ✍️ | | | | ● | | | | ● | | | |
| D03 | CSAT/NPS | pesquisa | ✍️ | | | | | | | | ● | | | |
| D04 | Licenças, acidentes, técnico de segurança | interno | ✍️ | | | | | | | | ● | | | |
| D05 | Metas | planilhas de metas | ✍️ | ● | | ● | ● | ● | ● | | ● | | | ● |
| D06 | Dias úteis/trabalhados | interno | ✍️ | | | | ● | | ● | | | | | |
| D07 | Particularidades 1x1 | supervisores | ✍️ | | | | | | | | | | | ● |

## Leitura rápida
- **Os relatórios mais reaproveitados são S01, S02 e S03:** SAP venda/retorno e o Roadnet entram em 4 a 5 acompanhamentos cada. Eles já são importados pelo Hub.
- **Com as amostras recebidas, dá para automatizar sem novas exportações:**
  - Cargas em aberto (S07);
  - Montadores com sincronização (S11);
  - KM dos DLs (S03 + S04);
  - Perdas DLs, menos o inventário (S12);
  - Retorno dos DLs (S02).
- **Os DAs são o ponto cego:**
  - fill rate, retorno, REPROG, volume/cargas e 1x1;
  - todos dependem do ERP das revendas ou do BI, e nenhuma amostra bruta foi recebida ainda.
- **O Imagens Frota não usa relatório-fonte.** O vínculo com os outros acompanhamentos é o cadastro de veículos (placa / nº do veículo), que aparece em S03, S04 e S19.

Lista do que exportar: `checklist_relatorios.md`.
