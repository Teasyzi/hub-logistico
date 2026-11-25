// Telas do Fill rate / Insuficiência de estoque, como a planilha: aba RESUMO (o quadro da aba Resumo) e uma aba
// por revenda (CB NORTE, CB SUL) com o cabeçalho, "por dia", "por produto" e "por data e produto". Sem gráfico.
// As funções pagina* são puras (dados → HTML) e servem à prévia local; as tela* usam o Firestore e o contexto do app.
import { E, fi, fd, fp, fdata, nomeMes, seletorMes, mesesAdmin } from './views.js?v=20261125-22';
import { UNIDADES_FR, META_FR, lerArquivoFR, comparativoFR, chaveProduto } from './fillrate.js?v=20261125-22';
import { baixarComparativoFR } from './exportar_fillrate.js?v=20261125-22';
import * as F from './dados_fillrate.js?v=20261125-22';
import * as D from './dados.js?v=20261125-22';

const fcx = (x) => (x == null ? '–' : fd(x, 2));
const farol = (pct, meta) => (pct == null ? '' : pct <= meta ? 'c-ok' : 'c-no');
const nomeAba = (u) => UNIDADES_FR[u].toUpperCase();
// Regra única das setas: ▲ acima da meta (vermelho, lado ruim); ▼ dentro da meta (verde).
const seta = (t) => (t.insuf == null ? '' : t.dentroMeta ? '<span class="t-up">▼</span>' : '<span class="t-down">▲</span>');

export function abasFR(ativa, mes, admin) {
  const a = [['resumo', 'RESUMO', `#/fillrate/resumo/${mes}`], ...Object.keys(UNIDADES_FR).map((u) => [u, nomeAba(u), `#/fillrate/${u}/${mes}`]), ['comparativo', 'MÊS A MÊS', `#/fillrate/comparativo/${mes}`]];
  const adm = admin ? [['importar', 'Importar', `#/fillrate/importar/${mes}`], ['publicar', 'Publicar', `#/fillrate/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

const explica = (meta) => `<p class="small">Insuficiência % = falta de estoque ÷ (pedido entregue + falta), em CX UNIT; fill rate = 100% − insuficiência. Meta: insuficiência até ${fp(meta, 0)} (verde). Meta em CX UNIT = ${fp(meta, 0)} do pedido (entregue + falta). Acima da meta = falta − meta (negativo: dentro da meta).</p>`;

// ---------------------------------------------------------------- RESUMO (aba Resumo da planilha + linha GERAL)
export function paginaResumoFR(r, { mes, admin, topo }) {
  const us = Object.keys(UNIDADES_FR).map((u) => r.unidades?.[u]).filter(Boolean);
  if (!us.some((d) => d.temDados)) return `${topo}<div class="aviso">Sem dados de insuficiência em ${nomeMes(mes)}.${admin ? ` <a href="#/fillrate/importar/${mes}">Importar</a>` : ''}</div>`;
  const meta = us.find((d) => d.temDados)?.totais.meta ?? META_FR;
  const lin = (rot, t, ud, cls = '') => `<tr class="${cls}"><td class="t">${rot}</td><td>${fp(t.meta, 0)}</td><td>${fcx(t.metaCx)}</td><td>${fcx(t.entregue)}</td><td>${fcx(t.falta)}</td>
<td class="${farol(t.insuf, t.meta)}">${fp(t.insuf)}</td><td>${fp(t.fillRate)}</td><td>${fcx(t.acimaMeta)}</td><td>${ud ? fdata(ud.data) : ''}</td></tr>`;
  const linhas = us.map((d) => (d.temDados ? lin(`<a href="#/fillrate/${d.unidade}/${mes}">${nomeAba(d.unidade)}</a>`, d.totais, d.ultimoDia)
    : `<tr><td class="t">${nomeAba(d.unidade)}</td><td colspan="8" class="t small">sem dados no mês</td></tr>`)).join('');
  const ultimo = us.map((d) => d.ultimoDia?.data).filter(Boolean).sort().at(-1);
  const tabela = `<div class="tw scroll fr-resumo"><table><thead><tr><th class="t">Revenda</th><th>Meta %</th><th>Meta (CX UNIT)</th><th>Pedido entregue (CX UNIT)</th><th>Falta de estoque (CX UNIT)</th><th>Insuficiência %</th><th>Fill rate %</th><th>Acima da meta (CX UNIT)</th><th>Até</th></tr></thead><tbody>
${linhas}${lin('GERAL', r.geral, ultimo ? { data: ultimo } : null, 'tot')}</tbody></table></div>`;
  const sem = admin ? us.filter((d) => !d.temDados).map((d) => `<div class="aviso">Sem o relatório de ${E(d.nome)} em ${nomeMes(mes)}. <a href="#/fillrate/importar/${mes}">Importar</a></div>`).join('') : '';
  return `${topo}${sem}${tabela}${explica(meta)}<p class="small">GERAL = as duas revendas somadas. O KPI usa a insuficiência % de cada revenda.</p>`;
}

// ---------------------------------------------------------------- unidade
function tiles(d) {
  const t = d.totais;
  return `<div class="tiles">
<div class="tile"><div class="l">Insuficiência %</div><div class="v">${fp(t.insuf)} ${seta(t)}</div><div class="d">meta até ${fp(t.meta, 0)} · ${t.dentroMeta ? 'dentro da meta' : 'acima da meta'}</div></div>
<div class="tile"><div class="l">Fill rate %</div><div class="v">${fp(t.fillRate)}</div><div class="d">100% − insuficiência</div></div>
<div class="tile"><div class="l">Pedido entregue</div><div class="v">${fi(t.entregue)}</div><div class="d">CX UNIT</div></div>
<div class="tile"><div class="l">Falta de estoque</div><div class="v">${fi(t.falta)}</div><div class="d">CX UNIT · meta ${fi(t.metaCx)}</div></div>
<div class="tile"><div class="l">Acima da meta</div><div class="v">${fi(t.acimaMeta)}</div><div class="d">CX UNIT (falta − meta)</div></div></div>`;
}

function quadroDias(d) {
  const t = d.totais;
  const lin = (x) => `<tr><td class="t">${fdata(x.data)}</td><td>${fcx(x.ent)}</td><td>${fcx(x.falta)}</td><td class="${farol(x.pct, t.meta)}">${fp(x.pct)}</td></tr>`;
  return `<section class="bloco"><div class="faixa">Informação por dia</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Data</th><th>Pedido entregue</th><th>Falta de estoque</th><th>Insuf. %</th></tr></thead><tbody>
${d.dias.map(lin).join('')}
<tr class="tot"><td class="t">Totais</td><td>${fcx(t.entregue)}</td><td>${fcx(t.falta)}</td><td>${fp(t.insuf)}</td></tr></tbody></table></div></div></section>`;
}

function quadroProdutos(d) {
  const t = d.totais;
  const lin = (x) => `<tr><td class="t">${E(x.prod)}</td><td class="t">${E(x.cat)}</td><td>${fcx(x.falta)}</td><td>${fp(x.partFalta, 1)}</td><td class="${farol(x.pct, t.meta)}">${fp(x.pct)}</td></tr>`;
  // Mesma altura do "por dia" (o grid estica os dois blocos); a lista rola dentro do bloco.
  return `<section class="bloco fr-prod"><div class="faixa">Informação por produto</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Prod descr</th><th class="t">Categoria</th><th>Falta de estoque</th><th>% da falta</th><th>Insuf. %</th></tr></thead><tbody>
<tr class="tot"><td class="t">Totais</td><td class="t">${fi(t.produtosComFalta)} de ${fi(t.produtos)} com falta</td><td>${fcx(t.falta)}</td><td>100%</td><td>${fp(t.insuf)}</td></tr>
${d.produtos.map(lin).join('')}</tbody></table></div></div></section>`;
}

// Célula do código: no rascunho do admin tem o lápis para editar à mão (vale para todas as linhas do produto).
const celCodigo = (cod, manual, admin) => `<td class="t fr-cod${manual ? ' manual' : ''}"${manual ? ' title="Código editado à mão"' : ''}><span class="v">${cod == null ? '–' : E(cod)}</span>${admin ? '<button type="button" class="fr-lapis" title="Editar o código" aria-label="Editar o código">✎</button>' : ''}</td>`;

function quadroDetalhe(d, admin) {
  const t = d.totais, cats = [...new Set(d.detalhe.map((x) => x.cat).filter(Boolean))].sort(), dias = d.dias.map((x) => x.data);
  const lin = (x) => `<tr data-dia="${x.data}" data-cat="${E(x.cat)}" data-falta="${x.falta > 0 ? 1 : 0}" data-prodk="${E(chaveProduto(x.prod))}" data-prod="${E(x.prod)}" data-txt="${E(`${x.cod ?? ''} ${x.prod}`.toLowerCase())}"><td class="t">${fdata(x.data)}</td><td class="t">${E(x.cat)}</td>${celCodigo(x.cod, x.codManual, admin)}<td class="t">${E(x.prod)}</td><td>${fcx(x.ent)}</td><td>${fcx(x.falta)}</td><td class="${farol(x.pct, t.meta)}">${fp(x.pct)}</td></tr>`;
  return `<section class="bloco"><div class="faixa">Informação por data e produto</div><div class="corpo">
<div class="filtros-tx fr-filtros">
<label>Dia <select data-f="dia"><option value="">Todos</option>${dias.map((x) => `<option value="${x}">${fdata(x)}</option>`).join('')}</select></label>
<label>Categoria <select data-f="cat"><option value="">Todas</option>${cats.map((c) => `<option value="${E(c)}">${E(c)}</option>`).join('')}</select></label>
<label><input type="checkbox" data-f="falta"> só com falta</label>
<label>Buscar <input type="text" data-f="txt" placeholder="produto ou código"></label>
<span class="small" data-f="n">${fi(d.detalhe.length)} linhas</span></div>
<div class="tw scroll fr-alta"><table class="fr-detalhe"><thead><tr><th class="t">Data</th><th class="t">Categoria</th><th class="t">Cód.</th><th class="t">Prod descr</th><th>Pedido entregue</th><th>Falta de estoque</th><th>Insuf. %</th></tr></thead><tbody>
${d.detalhe.map(lin).join('')}</tbody></table></div>
<p class="small">Uma linha por produto e dia, como no relatório, da maior falta para a menor. Insuf. % = falta ÷ (entregue + falta) da linha.${admin ? ' O código vem do cadastro de produtos; o ✎ edita à mão (em vermelho), para todas as linhas do produto, e vale também nos outros meses. Deixar vazio volta ao código do cadastro. Publique de novo para os leitores verem.' : ''}</p></div></section>`;
}

// Lápis do código: troca a célula por um campo; Enter ou ✓ grava, Esc ou ✕ cancela.
// salvar(prod, cod) → {cod, manual}: grava e devolve o código que passa a valer.
export function ligarCodigosFR(raiz = document, salvar) {
  const corpo = raiz.querySelector('.fr-detalhe tbody');
  if (!corpo || !salvar) return;
  const aplicar = (tr0, r) => {
    for (const tr of corpo.querySelectorAll(`tr[data-prodk="${CSS.escape(tr0.dataset.prodk)}"]`)) {
      const td = tr.querySelector('.fr-cod');
      td.outerHTML = celCodigo(r.cod, r.manual, true);
      tr.dataset.txt = `${r.cod ?? ''} ${tr.dataset.prod}`.toLowerCase();
    }
  };
  corpo.addEventListener('click', (e) => {
    const b = e.target.closest('.fr-lapis');
    if (!b || b.dataset.ok || b.dataset.nao) return;   // ✓ e ✕ têm o próprio onclick
    const td = b.closest('td'), tr = td.closest('tr'), atual = td.querySelector('.v').textContent.replace('–', '');
    td.innerHTML = `<input type="text" class="fr-cod-ed" value="${E(atual)}" aria-label="Código do produto"><button type="button" class="fr-lapis" data-ok="1" title="Gravar">✓</button><button type="button" class="fr-lapis" data-nao="1" title="Cancelar">✕</button>`;
    const inp = td.querySelector('input');
    inp.focus(); inp.select();
    const cancelar = () => { td.outerHTML = celCodigo(atual || null, td.classList.contains('manual'), true); };
    const gravar = async () => {
      inp.disabled = true;
      try { aplicar(tr, await salvar(tr.dataset.prod, inp.value.trim())); } catch (err) { inp.disabled = false; inp.title = err.message; inp.classList.add('erro-campo'); }
    };
    td.querySelector('[data-ok]').onclick = gravar;
    td.querySelector('[data-nao]').onclick = cancelar;
    inp.onkeydown = (ev) => { if (ev.key === 'Enter') gravar(); else if (ev.key === 'Escape') cancelar(); };
  });
}

// Filtros do detalhe (dia, categoria, só com falta, busca). Chamar depois de pôr o HTML na página.
export function ligarFiltrosFR(raiz = document) {
  const box = raiz.querySelector('.fr-filtros'), corpo = raiz.querySelector('.fr-detalhe tbody');
  if (!box || !corpo) return;
  const v = (k) => box.querySelector(`[data-f="${k}"]`);
  const aplicar = () => {
    const dia = v('dia').value, cat = v('cat').value, soFalta = v('falta').checked, txt = v('txt').value.trim().toLowerCase();
    let n = 0;
    for (const tr of corpo.rows) {
      const ok = (!dia || tr.dataset.dia === dia) && (!cat || tr.dataset.cat === cat) && (!soFalta || tr.dataset.falta === '1') && (!txt || tr.dataset.txt.includes(txt));
      tr.hidden = !ok; if (ok) n++;
    }
    v('n').textContent = `${fi(n)} linha(s)`;
  };
  box.addEventListener('input', aplicar); box.addEventListener('change', aplicar);
}

export function paginaUnidadeFR(u, d, { mes, admin, topo }) {
  if (!d || !d.temDados) return `${topo}<div class="aviso">Sem dados de insuficiência de ${E(UNIDADES_FR[u])} em ${nomeMes(mes)}.${admin ? ` <a href="#/fillrate/importar/${mes}">Importar</a>` : ''}</div>`;
  const t = d.totais;
  const info = admin ? `<p class="small">Fonte: ${E(d.arquivo || 'arquivo importado')} · ${fi(t.linhas)} linhas, ${fi(t.dias)} dias${d.ultimoDia ? ` (até ${fdata(d.ultimoDia.data)})` : ''}, ${fi(t.produtos)} produtos.${t.diasSemFalta ? ` ${fi(t.diasSemFalta)} dia(s) com falta zero (havia estoque para todo o pedido).` : ''}${d.repetidas ? ` ${fi(d.repetidas)} produto(s) aparecem duas vezes no mesmo dia: as linhas são somadas.` : ''}</p>` : '';
  const semCod = admin && d.semCodigo?.length ? `<div class="aviso">${fi(d.semCodigo.length)} produto(s) sem código no cadastro: ${E(d.semCodigo.slice(0, 8).join('; '))}${d.semCodigo.length > 8 ? '…' : ''}. Importe o cadastro de produtos (ou a planilha de Insuficiência com a aba PRODUTOS) em <a href="#/fillrate/importar/${mes}">⚙ Importar</a>.</div>` : '';
  return `${topo}${tiles(d)}${semCod}${explica(t.meta)}<div class="fr-lado">${quadroDias(d)}${quadroProdutos(d)}</div>${quadroDetalhe(d, admin)}${info}`;
}

// ---------------------------------------------------------------- MÊS A MÊS: o quadro do RESUMO de cada mês, com Detalhes
const NOMES_MES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
export const nomeMesLongo = (mes) => `${NOMES_MES[+mes.slice(5, 7) - 1]}/${mes.slice(0, 4)}`;

// Gráfico de barras da falta de estoque (CX UNIT) mês a mês de uma revenda: em cima da barra, a falta em CX UNIT e,
// logo abaixo, a insuficiência % do mês (falta ÷ pedido); o mês embaixo.
// linhas: [{mes, totais}] (comparativoFR). cor: token da revenda (--s1 Norte, --s2 Sul).
const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function graficoMesesFR(linhas, cor, mesAtual = null) {
  if (!linhas.length) return '<p class="small">Sem meses com dados.</p>';
  const w = 640, h = 260, pl = 46, pr = 8, pt = 36, pb = 26, max = Math.max(...linhas.map((l) => l.totais.falta), 1) * 1.12;
  const y = (v) => pt + (h - pt - pb) * (1 - v / max), band = (w - pl - pr) / linhas.length, bw = Math.min(46, band * 0.62);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Falta de estoque em CX UNIT por mês">`;
  for (let k = 0; k <= 4; k++) { const v = (max * k) / 4, yy = y(v).toFixed(1); s += `<line x1="${pl}" x2="${w - pr}" y1="${yy}" y2="${yy}" stroke="var(--grid)"/><text x="${pl - 6}" y="${(+yy + 4).toFixed(1)}" text-anchor="end">${fi(v)}</text>`; }
  linhas.forEach((l, i) => {
    const t = l.totais, cx = pl + band * (i + 0.5), x = cx - bw / 2, rot = `${MES3[+l.mes.slice(5, 7) - 1]}${l.mes === mesAtual ? '*' : ''}`;
    s += `<rect x="${x.toFixed(1)}" y="${y(t.falta).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, y(0) - y(t.falta)).toFixed(1)}" rx="2" fill="${cor}"><title>${nomeMesLongo(l.mes)}: ${fi(t.falta)} CX UNIT de falta · insuficiência ${fp(t.insuf)}</title></rect>`
      + `<text class="val" x="${cx.toFixed(1)}" y="${(y(t.falta) - 18).toFixed(1)}" text-anchor="middle">${fi(t.falta)}</text>`
      + `<text class="fr-pct ${t.dentroMeta ? 'ok' : 'no'}" x="${cx.toFixed(1)}" y="${(y(t.falta) - 5).toFixed(1)}" text-anchor="middle">${fp(t.insuf, 1)}</text>`
      + `<text x="${cx.toFixed(1)}" y="${h - 8}" text-anchor="middle">${rot}</text>`;
  });
  return `${s}<line x1="${pl}" x2="${w - pr}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--axis)"/></svg>`;
}

export function paginaComparativoFR(resumos, { ano, admin, topo, mesAtual = null }) {
  const c = comparativoFR(resumos, ano);
  const exportar = `<p><button class="btn" id="exportarFR" ${c.meses.length ? '' : 'disabled'}>⬇ Exportar planilha (.xlsx)</button> <span id="msgExp" class="small"></span></p>`;
  if (!c.meses.length) return `${topo}<div class="aviso">Sem dados de insuficiência em ${ano}.${admin ? ` <a href="#/fillrate/importar/${ano}-01">Importar</a> o relatório ou as planilhas antigas de cada mês.` : ''}</div>`;
  const cab = '<tr><th class="t">Revenda</th><th>Meta %</th><th>Meta (CX UNIT)</th><th>Pedido entregue (CX UNIT)</th><th>Falta de estoque (CX UNIT)</th><th>Insuficiência %</th><th>Fill rate %</th><th>Acima da meta (CX UNIT)</th><th class="t"></th></tr>';
  const lin = (rot, x, link, cls = '') => (x ? `<tr class="${cls}"><td class="t">${rot}</td><td>${fp(x.totais.meta, 0)}</td><td>${fcx(x.totais.metaCx)}</td><td>${fcx(x.totais.entregue)}</td><td>${fcx(x.totais.falta)}</td>
<td class="${farol(x.totais.insuf, x.totais.meta)}">${fp(x.totais.insuf)}</td><td>${fp(x.totais.fillRate)}</td><td>${fcx(x.totais.acimaMeta)}</td>
<td class="t">${link ? `<a class="btn sec fr-det" href="${link}">Detalhes</a>` : ''}</td></tr>` : `<tr><td class="t">${rot}</td><td colspan="8" class="t small">sem dados no mês</td></tr>`);
  const doMes = (l) => l.mes;
  const blocos = c.meses.map((mes) => {
    const pega = (s) => s.linhas.find((l) => doMes(l) === mes);
    const us = Object.keys(UNIDADES_FR).map((u) => lin(nomeAba(u), pega(c.unidades[u]), pega(c.unidades[u]) ? `#/fillrate/${u}/${mes}` : null)).join('');
    return `<section class="bloco fr-mes"><div class="faixa"><span>${nomeMesLongo(mes)}${mes === mesAtual ? ' <span class="small">(parcial)</span>' : ''}</span></div><div class="corpo"><div class="tw scroll fr-resumo"><table><thead>${cab}</thead><tbody>
${us}</tbody></table></div></div></section>`;
  }).join('');
  const acm = (s) => (s.acumulado ? { totais: s.acumulado, ultimoDia: s.linhas.at(-1)?.ultimoDia } : null);
  const acumulado = `<section class="bloco fr-mes"><div class="faixa"><span>ACUMULADO ${ano}</span></div><div class="corpo"><div class="tw scroll fr-resumo"><table><thead>${cab}</thead><tbody>
${Object.keys(UNIDADES_FR).map((u) => lin(nomeAba(u), acm(c.unidades[u]), null)).join('')}</tbody></table></div>
<p class="small">Acumulado = falta ÷ pedido somados de ${fi(c.meses.length)} mês(es) (não é a média dos %).</p></div></section>`;
  const faltam = admin ? (() => {
    const fim = mesAtual && mesAtual.startsWith(`${ano}-`) ? +mesAtual.slice(5, 7) : 12;
    const sem = [];
    for (let m = 1; m <= fim; m++) { const k = `${ano}-${String(m).padStart(2, '0')}`; for (const u of Object.keys(UNIDADES_FR)) if (!resumos[k]?.[u]) sem.push(`${NOMES_MES[m - 1].slice(0, 3).toLowerCase()} ${UNIDADES_FR[u]}`); }
    return sem.length ? `<div class="aviso">Sem dados: ${E(sem.join(', '))}. <a href="#/fillrate/importar/${ano}-01">Importar</a> o relatório ou a planilha antiga do mês.</div>` : '';
  })() : '';
  const COR_U = { NORTE: 'var(--s1)', SUL: 'var(--s2)' };
  const graficos = `<div class="g2 fr-graficos">${Object.keys(UNIDADES_FR).map((u) => `<section class="bloco"><div class="faixa">${nomeAba(u)} · falta de estoque (CX UNIT) mês a mês</div><div class="corpo">${graficoMesesFR(c.unidades[u].linhas, COR_U[u], mesAtual)}</div></section>`).join('')}</div><p class="small">Em cima de cada barra: a falta de estoque em CX UNIT e, embaixo dela, a insuficiência % do mês (falta ÷ pedido; verde até a meta de 2%).${c.meses.includes(mesAtual) ? ' * mês em andamento (parcial).' : ''}</p>`;
  return `${topo}${faltam}${exportar}${graficos}${blocos}${acumulado}${explica(META_FR)}<p class="small">Detalhes abre a aba da revenda naquele mês (por dia, por produto e por data e produto). Na planilha exportada, o mesmo quadro e os dois gráficos ficam na aba COMPARATIVO, com um link para a aba de detalhe de cada revenda e mês.</p>`;
}

// ---------------------------------------------------------------- telas (Firestore)
async function topoFR(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? mesesAdmin(mes, await F.mesesFRPublicados()) : await F.mesesFRPublicados());
    meses.add(mes);
    sel = seletorMes([...meses].sort().reverse(), mes);
    if (ctx.adminNaTela() && (aba === 'resumo' || UNIDADES_FR[aba])) {
      sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
    }
  }
  return `<h1>Fill rate · Insuficiência de estoque — ${E(titulo)}</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasFR(aba, mes, ctx.adminNaTela())}`;
}
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
async function resultado(ctx, mes) {
  if (rascunho(ctx)) return F.calcularFRAoVivo(mes);
  const x = await F.lerFRPublicado(mes);
  return { ...x, atualizado: x.publicadoEm };
}
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };

async function telaResumo(ctx, mes) {
  ctx.html('<p class="small">Calculando o fill rate…</p>');
  const topo = await topoFR(ctx, 'resumo', mes, nomeMes(mes)), r = await resultado(ctx, mes);
  const vazio = !Object.values(r.unidades || {}).some((d) => d.temDados) && !rascunho(ctx);
  ctx.html(vazio ? `${topo}<div class="aviso">O fill rate de ${nomeMes(mes)} ainda não foi publicado.</div>` : paginaResumoFR(r, { mes, admin: rascunho(ctx), topo }));
  status(r.atualizado); ctx.ligarTopo((m) => `#/fillrate/resumo/${m}`);
}

async function telaComparativo(ctx, mes) {
  ctx.html('<p class="small">Montando o comparativo…</p>');
  const ano = mes.slice(0, 4), adm = rascunho(ctx);
  const [resumos, pub] = await Promise.all([adm ? F.lerResumosFR(ano) : F.lerResumosPublicadosFR(), F.mesesFRPublicados()]);
  const anos = [...new Set([ctx.mesAtual().slice(0, 4), ano, ...pub.map((m) => m.slice(0, 4))])].sort().reverse();
  let sel = `Ano: <select id="selMes">${anos.map((a) => `<option value="${a}-01" ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}</select>`;
  if (ctx.adminNaTela()) sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
  const topo = `<h1>Fill rate · Insuficiência de estoque — Mês a mês ${E(ano)}</h1><p class="sub">${sel}</p>${abasFR('comparativo', mes, ctx.adminNaTela())}`;
  ctx.html(paginaComparativoFR(resumos, { ano, admin: adm, topo, mesAtual: ctx.mesAtual() }));
  ctx.ligarTopo((m) => `#/fillrate/comparativo/${m}`);
  const b = document.getElementById('exportarFR');
  if (b) b.onclick = async () => {
    const msg = document.getElementById('msgExp');
    b.disabled = true; msg.textContent = 'Lendo os meses…';
    try {
      const meses = Object.keys(resumos).filter((m) => m.startsWith(`${ano}-`)).sort();
      const porMes = adm ? await F.calcularFRMeses(meses) : Object.fromEntries(await Promise.all(meses.map(async (m) => [m, await F.lerFRPublicado(m)])));
      msg.textContent = 'Montando a planilha…';
      await baixarComparativoFR(ano, porMes, { mesAtual: ctx.mesAtual() });
      msg.textContent = '✓ planilha gerada';
    } catch (err) { msg.innerHTML = ctx.erro(err); }
    b.disabled = false;
  };
}

async function telaUnidade(ctx, u, mes) {
  ctx.html('<p class="small">Calculando o fill rate…</p>');
  const topo = await topoFR(ctx, u, mes, `${UNIDADES_FR[u]} · ${nomeMes(mes)}`), r = await resultado(ctx, mes);
  const vazio = !r.unidades?.[u]?.temDados && !rascunho(ctx);
  ctx.html(vazio ? `${topo}<div class="aviso">O fill rate de ${E(UNIDADES_FR[u])} em ${nomeMes(mes)} ainda não foi publicado.</div>` : paginaUnidadeFR(u, r.unidades?.[u], { mes, admin: rascunho(ctx), topo }));
  ligarFiltrosFR(); if (rascunho(ctx)) ligarCodigosFR(document, F.gravarCodigoManualFR);
  status(r.atualizado); ctx.ligarTopo((m) => `#/fillrate/${u}/${m}`);
}

function historico(imps) {
  const q = (r) => (r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '');
  const l = imps.length ? imps.map((r) => `<tr><td class="t">${q(r)}</td><td class="t">${E(r.arquivo)}</td><td class="t">${E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${E(r.periodo || '')}</td><td class="t">${E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="t small">Ainda não há importações do Fill rate.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Linhas</th><th class="t">Mês</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

async function telaImportar(ctx, mes) {
  const topo = await topoFR(ctx, 'importar', mes, 'Importar arquivos', false);
  ctx.html(`${topo}<p class="sub">O relatório de insuficiência (DA · Categ Prod · Prod Descr · Data · Pedido Entregue · Falta de Estoque), com CB Norte e CB Sul no mesmo arquivo. Também aceita a planilha antiga "MM - Insuficiência - &lt;Mês&gt;.xlsx", para trazer o histórico, e o cadastro de produtos do ERP (colunas Descricao e Reduzido), que dá o código dos produtos. A planilha de out/26 em diante já traz o cadastro na aba PRODUTOS.</p>
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou selecione</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div><div id="res"></div>
<p class="small">O mês sai da coluna Data. O relatório é acumulado do mês: reimportar substitui o mês inteiro de cada revenda que o arquivo traz.</p>
<h2>Últimas importações do Fill rate</h2><div id="hist">${historico(await D.ultimasImportacoes('fillrate'))}</div>`);
  let ultimoMes = mes;
  const processar = async (files) => {
    let rows = '';
    for (const f of files) {
      try {
        const x = lerArquivoFR(XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false }));
        if (!x.tipo) throw new Error('Não reconheci o arquivo: esperava o relatório de insuficiência (colunas DA, Prod Descr, Data, Pedido Entregue, Falta de Estoque), a planilha antiga (abas CB NORTE / CB SUL) ou o cadastro de produtos (colunas Descricao e Reduzido).');
        const n = await F.gravarFR(x.meses, f.name), meses = Object.keys(x.meses).sort();
        const nCad = x.cadastro ? await F.gravarCadastroFR(x.cadastro, f.name) : null;
        ultimoMes = meses.at(-1) || ultimoMes;
        const resumo = [...meses.map((m) => `${nomeMes(m)}: ${Object.entries(x.meses[m]).map(([u, d]) => `${UNIDADES_FR[u]} ${fi(d.linhas.length)} linhas`).join(', ')}`),
          nCad != null && `cadastro: ${fi(x.produtosCadastro)} produtos lidos (${fi(nCad)} no total)`].filter(Boolean).join(' · ');
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: n || x.produtosCadastro || 0, periodo: meses.map(nomeMes).join(', '), acompanhamento: 'fillrate' });
        rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo)}</td><td class="t">${E(resumo)}${x.ignoradas.length ? ` · DA ignorado: ${E(x.ignoradas.join(', '))}` : ''}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${E(f.name)}</td><td colspan="3" class="st no">${E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Conteúdo</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/fillrate/resumo/${ultimoMes}">Conferir rascunho</a></p>`;
    document.getElementById('hist').innerHTML = historico(await D.ultimasImportacoes('fillrate'));
  };
  const drop = document.getElementById('drop');
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

async function telaPublicar(ctx, mes) {
  const topo = await topoFR(ctx, 'publicar', mes, `Publicar · ${nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/fillrate/resumo/${mes}`;
  ctx.html(`${topo}<p>Publica o resumo e as abas CB NORTE e CB SUL (por dia, por produto e por data e produto).</p><p><a class="btn sec" href="#/fillrate/resumo/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar fill rate ${nomeMes(mes)}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input class="campo-link" type="text" readonly value="${E(link)}"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await F.publicarFR(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((m) => `#/fillrate/publicar/${m}`);
}

// p = partes da rota (#/fillrate/<sub>/<mes>). A aba RESUMO é a que abre no link.
export async function rotearFR(p, ctx) {
  const sub = p[1], mes = ctx.mesP(p[2]) || (ctx.adminNaTela() ? ctx.mesAtual() : (await F.mesesFRPublicados())[0] || ctx.mesAtual());
  if (UNIDADES_FR[sub]) return telaUnidade(ctx, sub, mes);
  if (!sub || sub === 'resumo') return telaResumo(ctx, mes);
  if (sub === 'comparativo') return telaComparativo(ctx, mes);
  if (!ctx.adminNaTela()) { location.replace(`#/fillrate/resumo/${mes}`); return; }
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  location.replace(`#/fillrate/resumo/${mes}`);
}
