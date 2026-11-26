// Telas da Gestão à vista, como a planilha: uma aba por DL (CB LOG CBAR · Barreiras, CB LOG II CCRT · Juazeiro) com o
// quadro da aba Dados (jan–dez + Acum) e, embaixo, os gráficos de cada aba de gráfico da planilha, na mesma ordem.
// No rascunho, o admin edita os valores digitados (✎). O botão exporta a planilha igual à oficial (exportar_gestao.js).
// As funções pagina* são puras (dados → HTML) e servem à prévia local; as tela* usam o Firestore e o contexto do app.
import { E, fi, fd, fp } from './views.js?v=20261126-10';
import { UNIDADES_GV, CIDADE_GV, LINHAS_GV, LINHA_GV, GRAFICOS_GV, ORIGENS_GV, FONTES_AUTO_GV, rotuloGV, calcularAnoGV, lerArquivoGV } from './gestao.js?v=20261126-10';
import { baixarGestaoGV } from './exportar_gestao.js?v=20261126-10';
import * as G from './dados_gestao.js?v=20261126-10';
import * as D from './dados.js?v=20261126-10';

const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const nomeAbaGV = (u) => `${UNIDADES_GV[u]} · ${CIDADE_GV[u]}`;

// Formato de cada linha (fmt em gestao.js). '-' e vazio como na planilha.
export function fmtGV(v, fmt) {
  if (v === '-') return '-';
  if (!ehNum(v)) return '';
  if (fmt === 'p') return fp(v, 2);
  if (fmt === 'r') return `R$ ${fi(v)}`;
  if (fmt === 'r2') return `R$ ${fd(v, 2)}`;
  if (fmt === 'd1') return fd(v, 1);
  if (fmt === 'd2') return fd(v, 2);
  return fi(v);
}
// Texto do campo de edição (sem R$ nem milhar; % em pontos percentuais).
const paraCampo = (v, fmt) => (!ehNum(v) ? '' : String(+(fmt === 'p' ? v * 100 : v).toFixed(6)).replace('.', ','));
export function lerCampoGV(s, fmt) {
  let t = String(s ?? '').trim().replace(/R\$|\s|%/g, '');
  if (!t || t === '-') return null;
  if (/,/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`Valor inválido: "${s}"`);
  return fmt === 'p' ? n / 100 : n;
}

export function abasGV(ativa, ano, admin) {
  const a = Object.keys(UNIDADES_GV).map((u) => [u, nomeAbaGV(u), `#/gestao/${u}/${ano}`]);
  const adm = admin ? [['importar', 'Importar', `#/gestao/importar/${ano}`], ['publicar', 'Publicar', `#/gestao/publicar/${ano}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${E(t)}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

const textoOrigem = (o) => (o.startsWith('hub:') ? `automático · ${FONTES_AUTO_GV[o.slice(4)] || o.slice(4)}` : ORIGENS_GV[o] || o);

// ---------------------------------------------------------------- quadro (aba Dados, B:O)
function quadro(u, ano, cc, origem, admin) {
  const a2 = String(ano).slice(2);
  const cab = `<tr><th class="t">${E(UNIDADES_GV[u])}</th>${MES3.map((m) => `<th>${m}/${a2}</th>`).join('')}<th>Acum</th></tr>`;
  const linhas = LINHAS_GV.map((x) => {
    const ln = cc.linhas[x.l];
    const tds = ln.m.map((v, i) => {
      const o = origem?.[i + 1]?.[x.l];
      const cls = [x.tipo === 'in' ? 'gv-in' : 'gv-calc', o === 'manual' ? 'manual' : '', o?.startsWith('hub:') ? 'auto' : ''].filter(Boolean).join(' ');
      const tit = admin && o ? ` title="${E(textoOrigem(o))}"` : '';
      return `<td class="${cls}" data-l="${x.l}" data-m="${i + 1}"${tit}>${E(fmtGV(v, x.fmt))}</td>`;
    }).join('');
    return `<tr><td class="t">${E(rotuloGV(x, u))}</td>${tds}<td class="gv-acum">${E(fmtGV(ln.acum, x.fmt))}</td></tr>`;
  }).join('');
  return `<div class="tw scroll gv-dados"><table><thead>${cab}</thead><tbody>${linhas}</tbody></table></div>`;
}

// ---------------------------------------------------------------- gráficos (um por linha da planilha; retorno com duas séries)
const COR = ['var(--s1)', 'var(--s2)'];
export function graficoGV(cc, g, u, ano) {
  const a2 = String(ano).slice(2), cats = [...MES3.map((m) => `${m}/${a2}`), 'Acum'];
  const series = g.l.map((l) => ({ x: LINHA_GV[l], v: [...cc.linhas[l].m, cc.linhas[l].acum].map((v) => (ehNum(v) ? v : null)) }));
  const titulo = g.titulo || rotuloGV(series[0].x, u);
  const todos = series.flatMap((s) => s.v).filter((v) => v != null);
  if (!todos.length) return `<div class="gv-graf"><div class="gv-tit">${E(titulo)}</div><p class="small">Sem valores em ${ano}.</p></div>`;
  const w = 640, h = 240, pl = 8, pr = 8, pt = 22, pb = 24;
  const max = Math.max(...todos, 0) * 1.15 || 1, min = Math.min(...todos, 0) * 1.15;
  const y = (v) => pt + (h - pt - pb) * (1 - (v - min) / (max - min || 1)), band = (w - pl - pr) / cats.length;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${E(titulo)}">`;
  s += `<line x1="${pl}" x2="${w - pr}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--axis)"/>`;
  cats.forEach((c, i) => { s += `<text x="${(pl + band * (i + 0.5)).toFixed(1)}" y="${h - 7}" text-anchor="middle">${c}</text>`; });
  series.forEach((se, k) => {
    const bw = Math.min(30, band * 0.5) / series.length;
    if (g.t === 'barra') {
      se.v.forEach((v, i) => {
        if (v == null) return;
        const cx = pl + band * (i + 0.5) + (k - (series.length - 1) / 2) * bw, y0 = y(0), y1 = y(v);
        s += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(y0 - y1)).toFixed(1)}" rx="2" fill="${COR[k]}"><title>${cats[i]}: ${E(fmtGV(v, se.x.fmt))}</title></rect>`
          + `<text class="val" x="${cx.toFixed(1)}" y="${(y1 - 5).toFixed(1)}" text-anchor="middle">${E(fmtGV(v, se.x.fmt))}</text>`;
      });
    } else {
      const pts = se.v.map((v, i) => (v == null ? null : [pl + band * (i + 0.5), y(v)]));
      let d = '';
      pts.forEach((p, i) => { if (p) d += `${d && pts[i - 1] ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`; });
      s += `<path d="${d}" fill="none" stroke="${COR[k]}" stroke-width="2.5"/>`;
      pts.forEach((p, i) => { if (p) s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${COR[k]}"><title>${E(rotuloGV(se.x, u))} · ${cats[i]}: ${E(fmtGV(se.v[i], se.x.fmt))}</title></circle><text class="val" x="${p[0].toFixed(1)}" y="${(p[1] - 8 - k * 11).toFixed(1)}" text-anchor="middle">${E(fmtGV(se.v[i], se.x.fmt))}</text>`; });
    }
  });
  const leg = series.length > 1 ? `<div class="grafico-legenda">${series.map((se, k) => `<span><i class="gv-leg${k}"></i>${E(rotuloGV(se.x, u))}</span>`).join('')}</div>` : '';
  return `<div class="gv-graf"><div class="gv-tit">${E(titulo)}</div>${s}</svg>${leg}</div>`;
}

function graficos(cc, u, ano) {
  return GRAFICOS_GV.map((ab) => `<section class="bloco gv-aba"><div class="faixa">${E(ab.aba)}</div><div class="corpo"><div class="g2">${ab.g.map((g) => graficoGV(cc, g, u, ano)).join('')}</div></div></section>`).join('');
}

export function paginaUnidadeGV(u, x, { ano, admin, topo, exportar = true }) {
  const cc = calcularAnoGV(x?.valores || {});
  const vazio = !cc.mesesComDados.length;
  const botoes = `<p class="gv-botoes">${exportar ? `<button class="btn" id="exportarGV" ${vazio ? 'disabled' : ''}>⬇ Exportar planilha (.xlsx)</button> ` : ''}${admin ? '<button class="btn sec" id="autoGV">↻ Atualizar do Hub</button> <button class="btn sec" id="editarGV">✎ Editar valores</button> <button class="btn" id="gravarGV" hidden>Gravar</button> <button class="btn sec" id="cancelarGV" hidden>Cancelar</button> ' : ''}<span id="msgGV" class="small"></span></p>`;
  const aviso = vazio ? `<div class="aviso">Sem dados de ${E(nomeAbaGV(u))} em ${ano}.${admin ? ` <a href="#/gestao/importar/${ano}">Importar</a> a planilha da Gestão à vista, o KPI do mês ou a planilha de Perdas, ou use ✎ para digitar.` : ''}</div>` : '';
  const nota = `<p class="small">Como a aba Dados da planilha. Acum = média dos meses com valor (cubos por dia, cubos por carga e perdas % = razão dos Acum). Cubos = CX UNIT ÷ ${fd(1.68, 2)}. Perdas = PERDAS TOTAL da unidade (com inventário), depois do fechamento.${admin ? ' Em azul: automático, dos outros acompanhamentos do Hub (Montagem, Perdas, KM, 1x1 e, para o resto, o KPI do Hub; atualiza sozinho ao abrir, para o mês atual e o anterior, e em ↻ para o ano todo). Em vermelho: digitado à mão (vale por cima de tudo; apagar ou pôr zero volta ao automático). O resto vem das importações (KPI, Perdas, planilha antiga). Passe o mouse num valor para ver de onde ele veio.' : ''}</p>`;
  return `${topo}${botoes}${aviso}${quadro(u, ano, cc, x?.origem, admin)}${nota}${graficos(cc, u, ano)}`;
}

// ✎ Editar: troca as células digitadas por campos; Gravar manda só o que mudou. salvar(edicoes) → doc gravado.
export function ligarEdicaoGV(raiz, x, salvar, depois) {
  const b = raiz.querySelector('#editarGV'), ok = raiz.querySelector('#gravarGV'), nao = raiz.querySelector('#cancelarGV'), msg = raiz.querySelector('#msgGV');
  if (!b) return;
  const cc = calcularAnoGV(x?.valores || {});
  b.onclick = () => {
    for (const td of raiz.querySelectorAll('.gv-dados td.gv-in, .gv-dados td.gv-calc')) {
      const l = +td.dataset.l, m = +td.dataset.m, f = LINHA_GV[l].fmt, v = cc.linhas[l].m[m - 1];
      td.innerHTML = `<input type="text" inputmode="decimal" value="${E(paraCampo(v, f))}" data-ini="${E(paraCampo(v, f))}" aria-label="${E(`${rotuloGV(LINHA_GV[l], '')} ${MES3[m - 1]}`)}">`;
    }
    b.hidden = true; ok.hidden = false; nao.hidden = false;
    msg.textContent = 'Percentuais em pontos (0,45 = 0,45%). Vazio ou zero = volta ao automático (Hub, importação ou fórmula).';
  };
  nao.onclick = () => depois();
  ok.onclick = async () => {
    const edicoes = [];
    try {
      for (const inp of raiz.querySelectorAll('.gv-dados td input')) {
        if (inp.value.trim() === inp.dataset.ini) continue;
        const td = inp.closest('td'), l = +td.dataset.l;
        edicoes.push({ mes: +td.dataset.m, l, v: lerCampoGV(inp.value, LINHA_GV[l].fmt) });
      }
    } catch (e) { msg.textContent = e.message; return; }
    if (!edicoes.length) { depois(); return; }
    ok.disabled = true; msg.textContent = 'Gravando…';
    try { await salvar(edicoes); depois(); } catch (e) { msg.textContent = e.message; ok.disabled = false; }
  };
}

// ---------------------------------------------------------------- telas (Firestore)
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
const anoP = (s) => (/^\d{4}$/.test(s || '') ? +s : null);

async function topoGV(ctx, aba, ano, titulo, comAno = true) {
  let sel = '';
  if (comAno) {
    const anos = new Set([...(ctx.adminNaTela() ? [new Date().getFullYear(), 2026, 2025, 2024] : []), ...(await G.anosPublicadosGV()), ano]);
    sel = `Ano: <select id="selMes">${[...anos].sort().reverse().map((a) => `<option value="${a}" ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}</select>`;
    if (ctx.adminNaTela() && UNIDADES_GV[aba]) sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
  }
  return `<h1>Gestão à vista — ${E(titulo)}</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasGV(aba, ano, ctx.adminNaTela())}`;
}
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };

const autoFeito = new Set();
async function telaUnidade(ctx, u, ano) {
  ctx.html('<p class="small">Lendo a Gestão à vista…</p>');
  const adm = rascunho(ctx), topo = await topoGV(ctx, u, ano, `${nomeAbaGV(u)} · ${ano}`);
  // Rascunho: o mês atual e o anterior se atualizam sozinhos com os outros acompanhamentos (uma vez por abertura do ano).
  if (adm && !autoFeito.has(ano)) {
    autoFeito.add(ano);
    const hoje = new Date(), mAt = hoje.getFullYear() === ano ? hoje.getMonth() + 1 : null;
    if (mAt) {
      ctx.html(`${topo}<p class="small">Atualizando com os outros acompanhamentos do Hub…</p>`);
      try { await G.atualizarAutomaticoGV(ano, [mAt - 1, mAt].filter((m) => m >= 1)); } catch { /* sem acesso: segue com o que já está gravado */ }
    }
  }
  const x = adm ? await G.lerEfetivoGV(u, ano) : await G.lerPublicadoGV(u, ano);
  if (!x && !adm) { ctx.html(`${topo}<div class="aviso">A Gestão à vista de ${ano} ainda não foi publicada.</div>`); ctx.ligarTopo((a) => `#/gestao/${u}/${a}`); return; }
  ctx.html(paginaUnidadeGV(u, x, { ano, admin: adm, topo }));
  status(x?.atualizado); ctx.ligarTopo((a) => `#/gestao/${u}/${a}`);
  const recarregar = () => telaUnidade(ctx, u, ano);
  if (adm) ligarEdicaoGV(document, x, (ed) => G.gravarEdicoesGV(u, ano, ed), recarregar);
  const ba = document.getElementById('autoGV');
  if (ba) ba.onclick = async () => {
    const msg = document.getElementById('msgGV');
    ba.disabled = true;
    try {
      const r = await G.atualizarAutomaticoGV(ano, null, (t) => { msg.textContent = t; });
      msg.textContent = `✓ ${r.meses.length} mês(es) atualizados${r.falhas.length ? ` · sem acesso ou com erro: ${r.falhas.join(', ')}` : ''}`;
      setTimeout(recarregar, 1200);
    } catch (err) { msg.innerHTML = ctx.erro(err); ba.disabled = false; }
  };
  const b = document.getElementById('exportarGV');
  if (b) b.onclick = async () => {
    const msg = document.getElementById('msgGV');
    b.disabled = true; msg.textContent = 'Montando a planilha…';
    try { await baixarGestaoGV(u, ano, await G.lerAnosGV(u, ano, !adm)); msg.textContent = '✓ planilha gerada'; } catch (err) { msg.innerHTML = ctx.erro(err); }
    b.disabled = false;
  };
}

function historico(imps) {
  const q = (r) => (r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '');
  const l = imps.length ? imps.map((r) => `<tr><td class="t">${q(r)}</td><td class="t">${E(r.arquivo)}</td><td class="t">${E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${E(r.periodo || '')}</td><td class="t">${E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="t small">Ainda não há importações da Gestão à vista.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Valores</th><th class="t">Período</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

export const explicaImportarGV = `<p class="sub">Aceita três arquivos (pode soltar vários de uma vez):</p><ul class="small">
<li><b>Planilha da Gestão à vista</b> ("GESTÃO À VISTA - CB LOG CBAR / CB LOG II CCRT.xlsx" de 2024, 2025, 2026): traz o ano dela e os blocos dos anos anteriores.</li>
<li><b>KPI Distribuição e Logística</b> do mês: dias úteis, volume, ocupação, faturamento, retorno, ajudantes, Green Mile, Easy Pallet, cargas, pedidos, KM, km/litro e TRIXLOG dos dois DLs. O mês vem da aba "Montagem das cargas" (FECHAMENTO DE &lt;MÊS&gt;/&lt;ANO&gt;).</li>
<li><b>Perdas de estoque</b> do DL ("AAAA - MM Perdas de Estoque - Barreiras/Juazeiro.xlsx"): o PERDAS TOTAL da aba Resumo.</li></ul>
<p class="small">Custos (distribuição, manutenção, pneus) e empilhadeiras não vêm de arquivo: digite em ✎ Editar valores. Um valor digitado à mão não é trocado por importação; o KPI e as Perdas valem por cima da planilha antiga.</p>`;

async function telaImportar(ctx, ano) {
  const topo = await topoGV(ctx, 'importar', ano, 'Importar arquivos', false);
  ctx.html(`${topo}${explicaImportarGV}
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou selecione</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div><div id="res"></div>
<h2>Últimas importações da Gestão à vista</h2><div id="hist">${historico(await D.ultimasImportacoes('gestao'))}</div>`);
  const processar = async (files) => {
    let rows = '';
    for (const f of files) {
      try {
        const x = lerArquivoGV(XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false }), f.name, ano);
        if (!x.tipo) throw new Error('Não reconheci o arquivo: esperava a planilha da Gestão à vista (aba Dados), o KPI do mês (aba LOGÍSTICA E DISTRIBUIÇÃO) ou a planilha de Perdas do DL (aba Resumo com PERDAS TOTAL).');
        const r = await G.gravarImportacaoGV(x);
        const resumo = Object.entries(r).map(([u, anos]) => `${CIDADE_GV[u]}: ${Object.entries(anos).map(([a, y]) => `${a} ${fi(y.n)} valor(es)${y.mantidos ? `, ${fi(y.mantidos)} mantido(s) (digitados ou de fonte mais forte)` : ''}`).join('; ')}`).join(' · ');
        const n = Object.values(r).flatMap((a) => Object.values(a)).reduce((s, y) => s + y.n, 0);
        const periodo = x.mes ? `${MES3[x.mes - 1]}/${x.ano}` : [...new Set(Object.values(r).flatMap((a) => Object.keys(a)))].sort().join(', ');
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: n, periodo, acompanhamento: 'gestao' });
        rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo)}</td><td class="t">${E(periodo)} · ${E(resumo)}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${E(f.name)}</td><td colspan="3" class="st no">${E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Conteúdo</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/gestao/CBAR/${ano}">Conferir rascunho</a></p>`;
    document.getElementById('hist').innerHTML = historico(await D.ultimasImportacoes('gestao'));
  };
  const drop = document.getElementById('drop');
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

async function telaPublicar(ctx, ano) {
  const topo = await topoGV(ctx, 'publicar', ano, `Publicar · ${ano}`), link = `${location.origin}${location.pathname}#/gestao/CBAR/${ano}`;
  ctx.html(`${topo}<p>Publica a Gestão à vista de ${ano} dos dois DLs (quadro e gráficos). Os leitores também podem exportar a planilha.</p><p><a class="btn sec" href="#/gestao/CBAR/${ano}">Conferir antes</a> <button class="btn" id="pub">Publicar Gestão à vista ${ano}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input class="campo-link" type="text" readonly value="${E(link)}"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await G.publicarGV(ano); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((a) => `#/gestao/publicar/${a}`);
}

// p = partes da rota (#/gestao/<CBAR|CCRT|importar|publicar>/<ano>). A aba CB LOG CBAR é a que abre no link.
export async function rotearGV(p, ctx) {
  const sub = p[1], ano = anoP(p[2]) || (ctx.adminNaTela() ? new Date().getFullYear() : (await G.anosPublicadosGV())[0] || new Date().getFullYear());
  if (!sub) { location.replace(`#/gestao/CBAR/${ano}`); return; }
  if (UNIDADES_GV[sub]) return telaUnidade(ctx, sub, ano);
  if (!ctx.adminNaTela()) { location.replace(`#/gestao/CBAR/${ano}`); return; }
  if (sub === 'importar') return telaImportar(ctx, ano);
  if (sub === 'publicar') return telaPublicar(ctx, ano);
  location.replace(`#/gestao/CBAR/${ano}`);
}
