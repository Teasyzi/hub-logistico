// Telas do KPI Distribuição e Logística. O painel segue a planilha (4 colunas: Distribuição, Distribuição, Remessa e
// Estoque, Frota/Distribuição), com cada indicador num cartão de bordas arredondadas: unidade · META · ACM (e TEND.,
// % quando a planilha tem), com o farol da formatação condicional. No rascunho, o admin vê de onde veio cada número
// (passando o mouse), edita (✎), atualiza do Hub (↻) e vê o quadro do Kardex (OCO. 24, 28 e 1).
// As funções pagina* são puras (dados → HTML) e servem à prévia local; as tela* usam o Firestore e o contexto do app.
import { E, fi, fd, fp, nomeMes, seletorMes, mesesAdmin } from './views.js?v=20261126-12';
import { CELULAS_KPI, BLOCOS_KPI, FONTES_KPI, ORIGENS_KPI, FATOR_CUBOS_KPI, calcularKPI, farolKPI, temDadosKPI, lerArquivoKPI } from './kpi.js?v=20261126-12';
import { baixarKPI } from './exportar_kpi.js?v=20261126-12';
import * as K from './dados_kpi.js?v=20261126-12';
import * as D from './dados.js?v=20261126-12';

const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const COLUNAS = { 1: 'DISTRIBUIÇÃO', 2: 'DISTRIBUIÇÃO', 3: 'REMESSA E ESTOQUE', 4: 'FROTA/ DISTRIBUIÇÃO' };

export function fmtKPI(v, fmt, traco = false) {
  if (!ehNum(v)) return traco === true ? '-' : '';
  if (fmt === 'p0') return fp(v, 0);
  if (fmt === 'p1') return fp(v, 1);
  if (fmt === 'p2') return fp(v, 2);
  if (fmt === 'p3') return fp(v, 3);
  if (fmt === 'd1') return fd(v, 1);
  if (fmt === 'd2') return fd(v, 2);
  if (fmt === 'r2') return `R$ ${fd(v, 2)}`;
  return fi(v);
}
const ehPct = (fmt) => /^p/.test(fmt);
const paraCampo = (v, fmt) => (!ehNum(v) ? '' : String(+(ehPct(fmt) ? v * 100 : v).toFixed(6)).replace('.', ','));
export function lerCampoKPI(s, fmt) {
  let t = String(s ?? '').trim().replace(/R\$|\s|%/g, '');
  if (!t || t === '-') return null;
  if (/,/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`Valor inválido: "${s}"`);
  return ehPct(fmt) ? n / 100 : n;
}
const textoOrigem = (o) => (o?.startsWith('hub:') ? `automático · ${FONTES_KPI[o.slice(4)] || o.slice(4)}` : ORIGENS_KPI[o] || o || '');
const TIPO = { in: 'digitado', meta: 'meta', auto: 'automático do Hub', calc: 'conta' };

export function abasKPI(ativa, mes, admin) {
  const a = [['painel', 'Painel', `#/kpi/painel/${mes}`]];
  const adm = admin ? [['importar', 'Importar', `#/kpi/importar/${mes}`], ['publicar', 'Publicar', `#/kpi/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${E(t)}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// ---------------------------------------------------------------- cartões
function td(ref, cc, origem, admin) {
  if (!ref) return '<td></td>';
  const c = CELULAS_KPI[ref], o = origem?.[ref];
  const far = farolKPI(ref, cc);
  const cls = ['kpi-v', c.t === 'calc' ? 'kpi-calc' : 'kpi-in', far ? `c-${far}` : '', admin && o === 'manual' ? 'manual' : '', admin && o?.startsWith('hub:') ? 'auto' : '', admin && o === 'anterior' ? 'anterior' : ''].filter(Boolean).join(' ');
  const tit = admin ? ` title="${E(`${ref} · ${c.t === 'calc' ? TIPO.calc : textoOrigem(o) || `${TIPO[c.t]} · sem valor`}`)}"` : '';
  return `<td class="${cls}" data-ref="${ref}"${tit}>${E(fmtKPI(cc[ref], c.fmt, c.traco))}</td>`;
}
function cartao(b, cc, origem, admin) {
  const cab = `<tr><th class="t">${E(b.cabRot || (b.semBase ? 'BASES' : 'BASE'))}</th>${b.cab.map((h) => `<th>${E(h)}</th>`).join('')}</tr>`;
  const linhas = b.linhas.map((l) => `<tr><td class="t">${E(l.rot)}</td>${l.cels.map((r) => td(r, cc, origem, admin)).join('')}</tr>`).join('');
  return `<section class="bloco kpi-card${b.kardex ? ' kpi-kardex' : ''}"><div class="faixa">${E(b.tit)}</div><div class="corpo"><table class="kpi-t"><thead>${cab}</thead><tbody>${linhas}</tbody></table></div></section>`;
}

export function paginaKPI(x, { mes, admin, topo, exportar = true }) {
  const valores = x?.valores || {}, cc = calcularKPI(valores), vazio = !temDadosKPI(valores);
  const botoes = `<p class="kpi-botoes">${exportar ? `<button class="btn" id="exportarKPI" ${vazio ? 'disabled' : ''}>⬇ Exportar planilha (.xlsx)</button> ` : ''}${admin ? '<button class="btn sec" id="autoKPI">↻ Atualizar do Hub</button> <button class="btn sec" id="editarKPI">✎ Editar valores</button> <button class="btn" id="gravarKPI" hidden>Gravar</button> <button class="btn sec" id="cancelarKPI" hidden>Cancelar</button> ' : ''}<span id="msgKPI" class="small"></span></p>`;
  const aviso = vazio ? `<div class="aviso">Sem dados do KPI em ${E(nomeMes(mes))}.${admin ? ` <a href="#/kpi/importar/${mes}">Importe</a> o KPI do mês ou a planilha de metas de perdas, use ↻ para trazer o que o Hub já tem ou ✎ para digitar.` : ''}</div>` : '';
  const cols = [1, 2, 3, 4].map((k) => `<div class="kpi-col"><div class="kpi-sec">${E(COLUNAS[k])}</div>${BLOCOS_KPI.filter((b) => b.col === k && (!b.kardex || admin)).map((b) => cartao(b, cc, x?.origem, admin)).join('')}</div>`).join('');
  const nota = `<p class="small">Como a aba LOGÍSTICA E DISTRIBUIÇÃO da planilha. Verde/vermelho = farol contra a meta, como na planilha. Cubagem = volume por carga ÷ ${fd(FATOR_CUBOS_KPI, 2)}. Tendência = ACM ÷ dias trabalhados × dias úteis da base. Perdas CB = Kardex OCO. 24 + 28 (% sobre a OCO. 1); perdas dos DLs = rota + estoque (% sobre o faturamento ACM da Montagem).${admin ? ' <b>Rascunho:</b> em azul, automático dos outros acompanhamentos (Montagem, Retorno, Perdas, KM, 1x1 e Fill rate); em vermelho, digitado à mão (vale por cima de tudo; apagar volta ao automático ou ao importado); em cinza, meta herdada do mês anterior. Passe o mouse num número para ver de onde ele veio.' : ''}</p>`;
  return `${topo}${botoes}${aviso}<div class="kpi-grade">${cols}</div>${nota}`;
}

// ✎ Editar: campos nas células que não são conta; Gravar manda só o que mudou. salvar(edicoes) grava.
export function ligarEdicaoKPI(raiz, x, salvar, depois) {
  const b = raiz.querySelector('#editarKPI'), ok = raiz.querySelector('#gravarKPI'), nao = raiz.querySelector('#cancelarKPI'), msg = raiz.querySelector('#msgKPI');
  if (!b) return;
  const cc = calcularKPI(x?.valores || {});
  b.onclick = () => {
    for (const el of raiz.querySelectorAll('.kpi-grade td.kpi-in')) {
      const ref = el.dataset.ref, f = CELULAS_KPI[ref].fmt, ini = paraCampo(cc[ref], f);
      el.innerHTML = `<input type="text" inputmode="decimal" value="${E(ini)}" data-ini="${E(ini)}" aria-label="${E(ref)}">`;
    }
    b.hidden = true; ok.hidden = false; nao.hidden = false;
    msg.textContent = 'Percentuais em pontos (0,75 = 0,75%). Vazio = volta ao automático, ao importado ou à meta do mês anterior.';
  };
  nao.onclick = () => depois();
  ok.onclick = async () => {
    const edicoes = [];
    try {
      for (const inp of raiz.querySelectorAll('.kpi-grade td input')) {
        if (inp.value.trim() === inp.dataset.ini) continue;
        const ref = inp.closest('td').dataset.ref;
        edicoes.push({ r: ref, v: lerCampoKPI(inp.value, CELULAS_KPI[ref].fmt) });
      }
    } catch (e) { msg.textContent = e.message; return; }
    if (!edicoes.length) { depois(); return; }
    ok.disabled = true; msg.textContent = 'Gravando…';
    try { await salvar(edicoes); depois(); } catch (e) { msg.textContent = e.message; ok.disabled = false; }
  };
}

// ---------------------------------------------------------------- telas (Firestore)
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
async function topoKPI(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? mesesAdmin(mes, await K.mesesKPIPublicados()) : await K.mesesKPIPublicados());
    meses.add(mes);
    sel = seletorMes([...meses].sort().reverse(), mes);
    if (ctx.adminNaTela() && aba === 'painel') sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
  }
  return `<h1>KPI Distribuição e Logística</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasKPI(aba, mes, ctx.adminNaTela())}`;
}
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };

const autoFeito = new Set();
async function telaPainel(ctx, mes) {
  ctx.html('<p class="small">Lendo o KPI…</p>');
  const adm = rascunho(ctx), topo = await topoKPI(ctx, 'painel', mes, `LOGÍSTICA E DISTRIBUIÇÃO - GRUPO CB · ${nomeMes(mes)}`);
  // Rascunho do mês atual e do anterior: atualiza sozinho com os outros acompanhamentos (uma vez por abertura).
  if (adm && !autoFeito.has(mes) && mes >= K.mesAnteriorKPI(ctx.mesAtual())) {
    autoFeito.add(mes);
    ctx.html(`${topo}<p class="small">Atualizando com os outros acompanhamentos do Hub…</p>`);
    try { await K.atualizarAutomaticoKPI(mes); } catch { /* sem acesso: segue com o que já está gravado */ }
  }
  const x = adm ? await K.lerEfetivoKPI(mes) : await K.lerPublicadoKPI(mes);
  if (!x && !adm) { ctx.html(`${topo}<div class="aviso">O KPI de ${E(nomeMes(mes))} ainda não foi publicado.</div>`); ctx.ligarTopo((m) => `#/kpi/painel/${m}`); return; }
  ctx.html(paginaKPI(x, { mes, admin: adm, topo }));
  status(x?.atualizado); ctx.ligarTopo((m) => `#/kpi/painel/${m}`);
  const recarregar = () => telaPainel(ctx, mes);
  if (adm) ligarEdicaoKPI(document, x, (ed) => K.gravarEdicoesKPI(mes, ed), recarregar);
  const ba = document.getElementById('autoKPI');
  if (ba) ba.onclick = async () => {
    const msg = document.getElementById('msgKPI');
    ba.disabled = true; msg.textContent = 'Lendo os outros acompanhamentos…';
    try {
      const r = await K.atualizarAutomaticoKPI(mes);
      msg.textContent = `✓ ${r.n} número(s) do Hub${r.falhas.length ? ` · sem acesso ou com erro: ${r.falhas.join(', ')}` : ''}`;
      setTimeout(recarregar, 1200);
    } catch (err) { msg.innerHTML = ctx.erro(err); ba.disabled = false; }
  };
  const b = document.getElementById('exportarKPI');
  if (b) b.onclick = async () => {
    const msg = document.getElementById('msgKPI');
    b.disabled = true; msg.textContent = 'Montando a planilha…';
    try { await baixarKPI(mes, x.valores); msg.textContent = '✓ planilha gerada'; } catch (err) { msg.innerHTML = ctx.erro(err); }
    b.disabled = false;
  };
}

function historico(imps) {
  const q = (r) => (r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '');
  const l = imps.length ? imps.map((r) => `<tr><td class="t">${q(r)}</td><td class="t">${E(r.arquivo)}</td><td class="t">${E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${E(r.periodo || '')}</td><td class="t">${E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="t small">Ainda não há importações do KPI.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Valores</th><th class="t">Período</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

export const explicaImportarKPI = `<p class="sub">Aceita dois arquivos (pode soltar vários de uma vez):</p><ul class="small">
<li><b>KPI Distribuição e Logística</b> de um mês ("KPI Distribuição e Logística - Novembro.xlsx"): todos os números digitados e as metas. O mês vem do nome do arquivo; o ano, do "ATUALIZADO EM" da aba "Montagem das cargas" (ou o ano do mês escolhido).</li>
<li><b>Metas de perdas de estoque</b> ("Perdas de Estoque 2026.xlsx"): a meta de perdas R$ e % de cada unidade, mês a mês (CB Norte/Sul: R$ com vencimentos, % operacional; DLs: operacional).</li></ul>
<p class="small">O que o Hub já calcula (volume, cargas, pedidos e retorno dos DLs; retorno dos DAs; perdas dos DLs; quilometragem; 1x1; fill rate) vale por cima do KPI importado. Um valor digitado à mão não é trocado por importação.</p>`;

async function telaImportar(ctx, mes) {
  const topo = await topoKPI(ctx, 'importar', mes, 'Importar arquivos', false);
  ctx.html(`${topo}${explicaImportarKPI}
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou selecione</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div><div id="res"></div>
<h2>Últimas importações do KPI</h2><div id="hist">${historico(await D.ultimasImportacoes('kpi'))}</div>`);
  const processar = async (files) => {
    let rows = '', ultimo = mes;
    for (const f of files) {
      try {
        const x = lerArquivoKPI(XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false }), f.name, +mes.slice(0, 4));
        if (!x.tipo) throw new Error('Não reconheci o arquivo: esperava o KPI do mês (aba LOGÍSTICA E DISTRIBUIÇÃO) ou a planilha de metas de perdas (abas "Perdas - CB Norte"…).');
        const r = await K.gravarImportacaoKPI(x);
        const meses = Object.keys(r).sort(), n = Object.values(r).reduce((s, y) => s + y.n, 0), mant = Object.values(r).reduce((s, y) => s + y.mantidos, 0);
        if (meses.length) ultimo = meses.at(-1);
        const periodo = meses.length === 1 ? nomeMes(meses[0]) : meses.length ? `${nomeMes(meses[0])} a ${nomeMes(meses.at(-1))}` : '';
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: n, periodo, acompanhamento: 'kpi' });
        rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo)}</td><td class="t">${E(periodo)} · ${fi(n)} valor(es)${mant ? `, ${fi(mant)} mantido(s) (digitados)` : ''}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${E(f.name)}</td><td colspan="3" class="st no">${E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Conteúdo</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/kpi/painel/${ultimo}">Conferir rascunho</a></p>`;
    document.getElementById('hist').innerHTML = historico(await D.ultimasImportacoes('kpi'));
  };
  const drop = document.getElementById('drop');
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

async function telaPublicar(ctx, mes) {
  const topo = await topoKPI(ctx, 'publicar', mes, `Publicar · ${nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/kpi/painel/${mes}`;
  ctx.html(`${topo}<p>Publica o painel do KPI de ${E(nomeMes(mes))} (sem o quadro do Kardex). Os leitores também podem exportar a planilha.</p><p><a class="btn sec" href="#/kpi/painel/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar KPI ${E(nomeMes(mes))}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input class="campo-link" type="text" readonly value="${E(link)}"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await K.publicarKPI(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((m) => `#/kpi/publicar/${m}`);
}

// p = partes da rota (#/kpi/<painel|importar|publicar>/<mes>).
export async function rotearKPI(p, ctx) {
  const sub = p[1], mes = ctx.mesP(p[2]) || (ctx.adminNaTela() ? ctx.mesAtual() : (await K.mesesKPIPublicados())[0] || ctx.mesAtual());
  if (!sub || sub === 'painel') return telaPainel(ctx, mes);
  if (!ctx.adminNaTela()) { location.replace(`#/kpi/painel/${mes}`); return; }
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  location.replace(`#/kpi/painel/${mes}`);
}
