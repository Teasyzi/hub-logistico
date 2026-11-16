---
title: "ADR-0001 Stack local com Python stdlib e SQLite"
aliases: []
type: adr
domain: projects
status: complete
adr_status: accepted
project: "HubLogistico"
deciders: ["usuário (escolheu começar pela Montagem; recomendação aceita por omissão em 2026-11-16, revisável)"]
supersedes: ""
superseded_by: ""
created: 2026-11-16
updated: 2026-11-16
summary: "O Hub roda localmente: Python 3 só com biblioteca padrão, SQLite, servidor HTTP em 127.0.0.1 com formulários e exportação HTML estática."
tags: []
related: ["[[12_PROJECTS/Active/HubLogistico/ARCHITECTURE|Arquitetura]]"]
sources: []
---
# ADR-0001 Stack local com Python stdlib e SQLite

## Contexto
- As exportações chegam em `.xlsx` (com números como texto) e `.xls` binário (SAP ZSD). O PC não tinha `openpyxl`, `pandas` nem `xlrd`, e a política de TI para instalar pacotes é desconhecida.
- Alguns valores são digitados todo mês (dias úteis, metas, tarifa), então o Hub precisa de edição, não só de leitura.
- Os dados têm nomes de clientes e motoristas: nada de hospedagem pública.

## Decisão
Vamos usar Python 3 **só com a biblioteca padrão**:
- leitores próprios de `.xlsx` (`zipfile` + XML) e `.xls` (BIFF8 sobre Compound File);
- SQLite como banco;
- `http.server` local em 127.0.0.1 com páginas HTML, gráficos em SVG inline e formulários;
- exportação estática (HTML) para enviar.

## Alternativas consideradas
| Alternativa | Prós | Contras |
|---|---|---|
| pandas/openpyxl/xlrd + Streamlit | menos código próprio | instalar pacotes; Streamlit pesado para rodar com duplo clique |
| Power BI / Power Query | familiar no mundo Excel | licença, publicação e regras complexas (S, reprog) difíceis de testar |
| Só HTML estático | zero servidor | sem edição de parâmetros |

## Consequências
- Positivas: roda em qualquer Windows com Python, sem instalação; testável (`unittest`); dados ficam numa pasta local fora do vault.
- Negativas: leitores de planilha próprios (cobrem o que as exportações usam, não o formato inteiro).
- Riscos: SAP mudar o formato do `.xls` (ex.: strings em registros não tratados). Mitigação: teste de importação a cada amostra nova.

## Conformidade
`code/` sem dependências fora da stdlib; `python -B -m unittest discover -s tests` passa.

## Histórico
- 2026-11-16: aceita ao iniciar a fase 1 (Montagem de Cargas).
