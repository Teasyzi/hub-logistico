---
title: "Padrão visual do Hub Logístico"
type: design
project: "HubLogistico"
status: review
created: 2026-11-23
summary: "Tokens, componentes e esqueleto de página que todo acompanhamento do Hub segue. Base: docs/css/hub.css (paleta das planilhas). Nada de paleta nova."
---
# Padrão visual do Hub Logístico

**Regra:** toda página usa só os tokens e componentes abaixo. A paleta é a que já está em `docs/css/hub.css`, tirada das próprias planilhas:
- cabeçalho vermelho `#C00000` com texto branco;
- TOTAL amarelo e MÉDIA cinza;
- formatação condicional verde, amarelo e vermelho do Excel.

Nenhuma página nova traz cor própria.

## 1. Tokens (já existentes)
| Papel | Token | Claro | Escuro | Alto contraste |
|---|---|---|---|---|
| Fundo da página | `--page` | `#f2f2f2` | `#121212` | `#000` |
| Superfície (cards, tabelas) | `--surface` | `#ffffff` | `#1e1e1e` | `#000` |
| Texto / secundário / apagado | `--ink` / `--ink2` / `--muted` | `#1a1a1a` / `#555` / `#7a7a7a` | `#eee` / `#bbb` / `#8a8a8a` | `#fff` |
| Marca (cabeçalho, `th`, abas ativas) | `--brand` / `--brand-ink` | `#c00000` / `#fff` | `#a31515` / `#fff` | `#ffff00` / `#000` |
| Marca forte / suave | `--brand-strong` / `--brand-soft` | `#8b0000` / `#f8e5e5` | `#6e0f0f` / `#3a1c1c` | `#00ffff` / `#000` |
| Faixa de seção | `--section` / `--section-ink` / `--section-strong` | `#e7e7e7` / `#252525` / `#686868` | `#292929` / `#eee` / `#3b3b3b` | `#000` / `#fff` / `#000` |
| Linhas, bordas, grade | `--row` / `--border` / `--grid` / `--axis` | `#f2f2f2` / `#d0d0d0` / `#d9d9d9` / `#bfbfbf` | `#242424` / `#3a3a3a` / `#333` / `#4a4a4a` | `#000` / `#fff` |
| Linha TOTAL / MÉDIA / pré-venda | `--total` (+`--total-ink`) / `--media` / `--pv` | `#ffff00` / `#bfbfbf` / `#fff2cc` | `#5c5600` / `#3d3d3d` / `#3d3418` | `#fff` / `#00ffff` / `#000` |
| Série 1 / Série 2 dos gráficos | `--s1` / `--s2` | `#c00000` / `#1f4e79` | `#e05252` / `#5b9bd5` | `#ffff00` / `#00ffff` |
| Bom (texto / fundo) | `--good` / `--goodbg` | `#006100` / `#c6efce` | `#7ddc8a` / `#173d1f` | `#00ff00` / `#000` |
| Atenção | `--mid` / `--midbg` | `#9c5700` / `#ffeb9c` | `#f2c94c` / `#3d3214` | `#ffff00` / `#000` |
| Ruim | `--bad` / `--badbg` | `#9c0006` / `#ffc7ce` | `#ff8a8a` / `#4a1a1d` | `#ff5050` / `#000` |
| Seta boa / ruim | `--up` / `--down` | `#00b050` / `#c00000` | `#4cd07d` / `#ff6b6b` | `#00ff00` / `#ff5050` |
| Foco | `--accent` | `#c00000` | `#e05252` | `#ffff00` |

Fonte: `system-ui, -apple-system, "Segoe UI", sans-serif`, 14px/1.4. Títulos em maiúsculas, como nas planilhas.

### Tokens a acrescentar (reaproveitando valores que já existem na paleta)
| Token | Para quê | Claro | Escuro | Alto contraste |
|---|---|---|---|---|
| `--u-norte` | cor fixa da unidade CB Norte | `var(--s1)` | `var(--s1)` | `var(--s1)` |
| `--u-sul` | CB Sul | `var(--s2)` | `var(--s2)` | `var(--s2)` |
| `--u-cbar` | DL Barreiras | `#686868` (=`--section-strong`) | `#bbb` | `#fff` |
| `--u-ccrt` | DL Juazeiro | `#9c5700` (=`--mid`) | `#f2c94c` | `#00ff00` |
| `--shadow` | sombra de campos | `#0000000d` | `#00000040` | `transparent` |

Com isso as 4 unidades ficam distinguíveis no mesmo gráfico. Hoje NORTE e CBAR saem as duas vermelhas, e SUL e CCRT as duas azuis.

## 2. Unidades: nome e cor oficiais (um mapa só, em `docs/js/dados.js`)
| Código | Nome curto (abas, gráficos) | Nome longo (títulos) | Local na Listagem | Cor |
|---|---|---|---|---|
| `NORTE` | CB Norte | CB Norte (DA) | MATRIZ | `--u-norte` |
| `SUL` | CB Sul | CB Sul (DA) | FILIAL II | `--u-sul` |
| `CBAR` | DL Barreiras | DL Barreiras · LOG I | FILIAL I | `--u-cbar` |
| `CCRT` | DL Juazeiro | DL Juazeiro · LOG II | FILIAL III | `--u-ccrt` |

`km.js`, `montadores.js`, `views.js` e os exportadores leem daqui. Os rótulos das planilhas oficiais (`LOG I - BARREIRAS`, `BARREIRAS — LOG I`…) ficam **só** nos exportadores, porque precisam bater com o modelo `.xlsm`.

## 3. Componentes oficiais
| Componente | Classe / função | Uso |
|---|---|---|
| Cabeçalho do site | `<header>` + `cabecalhoSite(título)` | barra `--brand`, título, navegação, usuário, seletor de tema |
| Abas do módulo | `.abas` (um único `abas(modulo, itens, ativo, admin)`) | Resumo → unidades → grupo `.adm` (Importar, Parâmetros, Publicar, Exportar) |
| Faixa de seção | `.faixa` | título de bloco com borda esquerda `--brand` |
| Bloco / card | `.bloco`, `.card`, `.grid`, `.g2` | agrupamento; `.g2` = 2 colunas que viram 1 no celular |
| Indicadores (tiles) | `.tiles` > `.tile` | número grande + rótulo + meta + seta |
| Tabela | `.tw` > `table` (`th` em `--brand`; `tr.tot`, `tr.med`, `tr.pv`) | sempre dentro de `.tw`, que rola na horizontal no celular |
| Célula com farol | `.c-ok`, `.c-mid`, `.c-no` | **só dentro de tabela** (formatação condicional do Excel) |
| Rótulo de status | `.st.ok`, `.st.no`, `.st.na` | **fora de tabela** ("publicado", "sem dado") |
| Seta de tendência | `.t-up` / `.t-down` | ver regra abaixo |
| Gráfico de barras | `grafico()` (SVG, valor em cima da barra) | **um único estilo**: barras `--s1`/cor da unidade, linha de meta tracejada `--ink2`, série secundária `--s2` |
| Legenda | `legenda()`, `.legenda` | cores de farol e linhas especiais |
| Botões | `.btn`, `.btn.sec` | primário `--brand`, secundário contorno |
| Mensagens | `.aviso`, `.erro`, `.okmsg` | — |
| Progresso | `.barra` | pontos do PES |

### Regra única das setas
- **Direção:** ▲ = acima da meta (ou subiu); ▼ = abaixo da meta (ou caiu).
- **Cor:** `.t-up` (verde) = lado bom; `.t-down` (vermelho) = lado ruim.
- Exemplos: volume ▲ verde, porque mais é melhor; retorno ▲ vermelho, porque menos é melhor.

Montagem e PES já seguem essa regra. Toda página nova também segue.

## 4. Esqueleto de página de um acompanhamento
```
cabecalhoSite("<Acompanhamento>")
abas: Resumo | CB Norte | CB Sul | DL Barreiras | DL Juazeiro | [adm: Importar · Parâmetros · Publicar · Exportar]
seletorMes()
.faixa "RESUMO · <MÊS>"   → .tiles (um tile por indicador-chave, com meta e seta)
.faixa "POR UNIDADE"      → .tw tabela (unidades nas linhas, BASE · META · ACM · TEND.)
.faixa "DIA A DIA"        → grafico() + .tw tabela diária (tr.tot / tr.med)
legenda()
rodapé: "Atualizado em <data da importação>" (.status-atualizacao)
```
Unidades que não fazem parte do acompanhamento ficam fora das abas. Exemplo: Fill rate só tem CB Norte e CB Sul.

## 5. Proibido (checado no fim de cada mudança)
- Cor hexadecimal fora do `docs/css/hub.css`. Teste: `grep -rnE "#[0-9a-fA-F]{3,8}\b" docs/js docs/index.html` sem resultado.
- `style="..."` em `views.js`/`app.js`/`index.html`. Use classes utilitárias (`.ml-auto`, `.mw-640`, `.mw-900`, `.gap-16`…). Exceção: valores calculados como a largura da `.barra` e o `fill` de texto do SVG, que usam `var(--…)`.
- Bloco de tokens do tema escuro em dois lugares. Defina uma vez e aplique ao `@media` e ao `[data-theme=dark]`.

## 6. Checklist visual de toda página nova ou revisada
- [ ] Temas Claro, Escuro e Alto contraste legíveis (texto sobre `--brand`, faróis, setas).
- [ ] 375px de largura sem rolagem horizontal da página (só dentro de `.tw`).
- [ ] Só tokens e componentes desta página.
- [ ] Nomes de unidade vindos do mapa único.
- [ ] Gráfico no estilo de `grafico()`, com valor em cima da barra.

## 7. Imagens Frota
- O site `imagens-frotaV3` usa outra base: vermelho `#E30613`, neutros slate, Tailwind e ícones Lucide.
- No Hub, ele entra como **card no painel e link no cabeçalho**, sem mudar o site.
- Alinhar o visual dele, usando `--brand` `#c00000` e neutros `#f2f2f2/#1a1a1a`, é uma etapa separada no repositório `imagens-frotaV3`.
