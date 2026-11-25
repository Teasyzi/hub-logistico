// Telas do Fill rate / Insuficiência de estoque, como a planilha: aba RESUMO (o quadro da aba Resumo) e uma aba
// por revenda (CB NORTE, CB SUL) com o cabeçalho, "por dia", "por produto" e "por data e produto". Sem gráfico.
// As funções pagina* são puras (dados → HTML) e servem à prévia local; as tela* usam o Firestore e o contexto do app.
import { E, fi, fd, fp, fdata, nomeMes, seletorMes } from './views.js?v=20261125-7';
import { UNIDADES_FR, META_FR, lerArquivoFR } from './fillrate.js?v=20261125-7';
import * as F from './dados_fillrate.js?v=20261125-7';
import * as D from './dados.js?v=20261125-7';

const fcx = (x) => (x == null ? '–' : fd(x, 2));
const farol = (pct, meta) => (pct == null ? '' : pct <= meta ? 'c-ok' : 'c-no');
const nomeAba = (u) => UNIDADES_FR[u].toUpperCase();
// Regra única das setas: ▲ acima da meta (vermelho, lado ruim); ▼ dentro da meta (verde).
const seta = (t) => (t.insuf == null ? '' : t.dentroMeta ? '<span class="t-up">▼</span>' : '<span class="t-down">▲</span>');

export function abasFR(ativa, mes, admin) {
  const a = [['resumo', 'RESUMO', `#/fillrate/resumo/${mes}`], ...Object.keys(UNIDADES_FR).map((u) => [u, nomeAba(u), `#/fillrate/${u}/${mes}`])];
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
  return `<section class="bloco"><div class="faixa">Informação por dia</div><div class="corpo"><div class="tw scroll fr-alta"><table><thead><tr><th class="t">Data</th><th>Pedido entregue</th><th>Falta de estoque</th><th>Insuf. %</th></tr></thead><tbody>
${d.dias.map(lin).join('')}
<tr class="tot"><td class="t">Totais</td><td>${fcx(t.entregue)}</td><td>${fcx(t.falta)}</td><td>${fp(t.insuf)}</td></tr></tbody></table></div></div></section>`;
}

function quadroProdutos(d) {
  const t = d.totais;
  const lin = (x) => `<tr><td class="t">${E(x.prod)}</td><td class="t">${E(x.cat)}</td><td>${fcx(x.falta)}</td><td>${fp(x.partFalta, 1)}</td><td class="${farol(x.pct, t.meta)}">${fp(x.pct)}</td></tr>`;
  return `<section class="bloco"><div class="faixa">Informação por produto</div><div class="corpo"><div class="tw scroll fr-alta"><table><thead><tr><th class="t">Prod descr</th><th class="t">Categoria</th><th>Falta de estoque</th><th>% da falta</th><th>Insuf. %</th></tr></thead><tbody>
<tr class="tot"><td class="t">Totais</td><td class="t">${fi(t.produtosComFalta)} de ${fi(t.produtos)} com falta</td><td>${fcx(t.falta)}</td><td>100%</td><td>${fp(t.insuf)}</td></tr>
${d.produtos.map(lin).join('')}</tbody></table></div></div></section>`;
}

function quadroDetalhe(d) {
  const t = d.totais, cats = [...new Set(d.detalhe.map((x) => x.cat).filter(Boolean))].sort(), dias = d.dias.map((x) => x.data);
  const lin = (x) => `<tr data-dia="${x.data}" data-cat="${E(x.cat)}" data-falta="${x.falta > 0 ? 1 : 0}" data-txt="${E(x.prod.toLowerCase())}"><td class="t">${fdata(x.data)}</td><td class="t">${E(x.cat)}</td><td class="t">${E(x.prod)}</td><td>${fcx(x.ent)}</td><td>${fcx(x.falta)}</td><td class="${farol(x.pct, t.meta)}">${fp(x.pct)}</td></tr>`;
  return `<section class="bloco"><div class="faixa">Informação por data e produto</div><div class="corpo">
<div class="filtros-tx fr-filtros">
<label>Dia <select data-f="dia"><option value="">Todos</option>${dias.map((x) => `<option value="${x}">${fdata(x)}</option>`).join('')}</select></label>
<label>Categoria <select data-f="cat"><option value="">Todas</option>${cats.map((c) => `<option value="${E(c)}">${E(c)}</option>`).join('')}</select></label>
<label><input type="checkbox" data-f="falta"> só com falta</label>
<label>Buscar <input type="text" data-f="txt" placeholder="produto"></label>
<span class="small" data-f="n">${fi(d.detalhe.length)} linhas</span></div>
<div class="tw scroll fr-alta"><table class="fr-detalhe"><thead><tr><th class="t">Data</th><th class="t">Categoria</th><th class="t">Prod descr</th><th>Pedido entregue</th><th>Falta de estoque</th><th>Insuf. %</th></tr></thead><tbody>
${d.detalhe.map(lin).join('')}</tbody></table></div>
<p class="small">Uma linha por produto e dia, como no relatório, da maior falta para a menor. Insuf. % = falta ÷ (entregue + falta) da linha.</p></div></section>`;
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
  return `${topo}${tiles(d)}${explica(t.meta)}<div class="fr-lado">${quadroDias(d)}${quadroProdutos(d)}</div>${quadroDetalhe(d)}${info}`;
}

// ---------------------------------------------------------------- telas (Firestore)
async function topoFR(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? [ctx.mesAtual(), mes, ...(await F.mesesFRPublicados())] : await F.mesesFRPublicados());
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

async function telaUnidade(ctx, u, mes) {
  ctx.html('<p class="small">Calculando o fill rate…</p>');
  const topo = await topoFR(ctx, u, mes, `${UNIDADES_FR[u]} · ${nomeMes(mes)}`), r = await resultado(ctx, mes);
  const vazio = !r.unidades?.[u]?.temDados && !rascunho(ctx);
  ctx.html(vazio ? `${topo}<div class="aviso">O fill rate de ${E(UNIDADES_FR[u])} em ${nomeMes(mes)} ainda não foi publicado.</div>` : paginaUnidadeFR(u, r.unidades?.[u], { mes, admin: rascunho(ctx), topo }));
  ligarFiltrosFR(); status(r.atualizado); ctx.ligarTopo((m) => `#/fillrate/${u}/${m}`);
}

function historico(imps) {
  const q = (r) => (r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '');
  const l = imps.length ? imps.map((r) => `<tr><td class="t">${q(r)}</td><td class="t">${E(r.arquivo)}</td><td class="t">${E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${E(r.periodo || '')}</td><td class="t">${E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="t small">Ainda não há importações do Fill rate.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Linhas</th><th class="t">Mês</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

async function telaImportar(ctx, mes) {
  const topo = await topoFR(ctx, 'importar', mes, 'Importar arquivos', false);
  ctx.html(`${topo}<p class="sub">O relatório de insuficiência (DA · Categ Prod · Prod Descr · Data · Pedido Entregue · Falta de Estoque), com CB Norte e CB Sul no mesmo arquivo. Também aceita a planilha antiga "MM - Insuficiência - &lt;Mês&gt;.xlsx", para trazer o histórico.</p>
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou selecione</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div><div id="res"></div>
<p class="small">O mês sai da coluna Data. O relatório é acumulado do mês: reimportar substitui o mês inteiro de cada revenda que o arquivo traz.</p>
<h2>Últimas importações do Fill rate</h2><div id="hist">${historico(await D.ultimasImportacoes('fillrate'))}</div>`);
  let ultimoMes = mes;
  const processar = async (files) => {
    let rows = '';
    for (const f of files) {
      try {
        const x = lerArquivoFR(XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false }));
        if (!x.tipo) throw new Error('Não reconheci o arquivo: esperava o relatório de insuficiência (colunas DA, Prod Descr, Data, Pedido Entregue, Falta de Estoque) ou a planilha antiga (abas CB NORTE / CB SUL).');
        const n = await F.gravarFR(x.meses, f.name), meses = Object.keys(x.meses).sort();
        ultimoMes = meses.at(-1) || ultimoMes;
        const resumo = meses.map((m) => `${nomeMes(m)}: ${Object.entries(x.meses[m]).map(([u, d]) => `${UNIDADES_FR[u]} ${fi(d.linhas.length)} linhas`).join(', ')}`).join(' · ');
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: n, periodo: meses.map(nomeMes).join(', '), acompanhamento: 'fillrate' });
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
  if (!ctx.adminNaTela()) { location.replace(`#/fillrate/resumo/${mes}`); return; }
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  location.replace(`#/fillrate/resumo/${mes}`);
}
