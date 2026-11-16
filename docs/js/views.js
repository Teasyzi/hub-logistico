// Renderização (porte de code/hub/paginas.py). Funções puras: dados -> HTML.
import { UNIDADES } from './dados.js';

export const E = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const META_PES = { ret_vol: 0.01, ret_cli: 0.02, reprog_vol: 0.03, reprog_cli: 0.03 };

const nf = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
export const fi = (x) => (x == null ? '–' : nf(0).format(x));
export const fd = (x, n = 1) => (x == null ? '–' : nf(n).format(x));
export const fp = (x, n = 2) => (x == null ? '–' : nf(n).format(x * 100) + '%');
export const fr = (x) => (x == null ? '–' : 'R$ ' + nf(0).format(x));
export const fdata = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const nomeMes = (mes) => `${MESES[+mes.slice(5, 7) - 1]}/${mes.slice(0, 4)}`;
const cor = (c) => `var(--s${UNIDADES[c].cor})`;

export function status(ok, tOk, tNo) {
  if (ok == null) return '<span class="st na">sem dado</span>';
  return ok ? `<span class="st ok">✓ ${E(tOk)}</span>` : `<span class="st no">✕ ${E(tNo)}</span>`;
}

export function seletorMes(meses, mes) {
  const ops = meses.map((m) => `<option value="${m}" ${m === mes ? 'selected' : ''}>${nomeMes(m)}</option>`).join('');
  return `Mês: <select id="selMes">${ops}</select>`;
}

export function grafico(dias, campo, corS, meta, rotulo, fmt = fi, altura = 200) {
  const pts = dias.map((d) => [d.data, d[campo]]);
  const vals = pts.map((p) => p[1]).filter((v) => v != null);
  if (!vals.length) return '<p class="small">Sem dados no período.</p>';
  const w = 900, pl = 56, pr = 12, pt = 12, pb = 26;
  const topo = Math.max(...vals, meta || 0) * 1.1 || 1;
  const n = pts.length, bw = (w - pl - pr) / n;
  const y = (v) => pt + (altura - pt - pb) * (1 - v / topo);
  let s = `<svg viewBox="0 0 ${w} ${altura}" width="100%" role="img" aria-label="gráfico diário">`;
  for (let k = 0; k <= 4; k++) {
    const v = (topo * k) / 4;
    s += `<line x1="${pl}" x2="${w - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--grid)"/>`
      + `<text x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`;
  }
  pts.forEach(([data, v], i) => {
    const x = pl + i * bw;
    if (v) {
      s += `<rect x="${(x + 1).toFixed(1)}" y="${y(v).toFixed(1)}" width="${Math.max(bw - 2, 1).toFixed(1)}" `
        + `height="${Math.max(y(0) - y(v), 1).toFixed(1)}" rx="3" fill="${corS}"><title>${fdata(data)}: ${fmt(v)}</title></rect>`;
    }
    if (i % 2 === 0 || n <= 16) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${altura - 8}" text-anchor="middle">${+data.slice(8)}</text>`;
  });
  s += `<line x1="${pl}" x2="${w - pr}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--axis)"/>`;
  if (meta) {
    s += `<line x1="${pl}" x2="${w - pr}" y1="${y(meta).toFixed(1)}" y2="${y(meta).toFixed(1)}" stroke="var(--ink2)" stroke-dasharray="5 4" stroke-width="1.5"/>`
      + `<text x="${w - pr}" y="${(y(meta) - 5).toFixed(1)}" text-anchor="end" style="fill:var(--ink2)">${E(rotulo)} ${fmt(meta)}</text>`;
  }
  return s + '</svg>';
}

export function blocoResumoDL(c, m, ctx) {
  const r = m.resumo, med = m.media, pv = m.prevenda, t = m.total, rp = m.reprog;
  const falta = ['dias_uteis', 'meta_volume', 'tarifa'].filter((k) => r[k] == null);
  const aviso = falta.length && ctx.admin ? `<div class="aviso">Parâmetros do mês faltando: ${falta.join(', ')}. <a href="#/parametros/${m.mes}">Preencher</a></div>` : '';
  const tendOk = r.tend_vs_meta == null ? null : r.tend_vs_meta >= 0;
  const pes = [['% retorno volume', t.ret_vol, META_PES.ret_vol], ['% retorno cliente', t.ret_cli, META_PES.ret_cli],
    ['% reprog. volume', rp.pct, META_PES.reprog_vol], ['% reprog. cliente', rp.pct_cli, META_PES.reprog_cli]]
    .map(([n, v, meta]) => `<tr><td>${n}</td><td>${fp(v)}</td><td>≤ ${fp(meta, 0)}</td><td>${status(v == null ? null : v <= meta, 'na meta', 'fora')}</td></tr>`).join('');
  const lp = (rot, a, b) => `<tr><td>${rot}</td><td>${a}</td><td>${b}</td></tr>`;
  return `<div class="card"><h3><span class="dot" style="background:${cor(c)}"></span>${E(UNIDADES[c].nome)} <span class="tag">${c}</span></h3>${aviso}
<div class="tiles">
 <div class="tile"><div class="l">Volume ACM (cx unit)</div><div class="v">${fi(r.acm)}</div><div class="d">meta ${fi(r.meta_volume)}</div></div>
 <div class="tile"><div class="l">Tendência do mês</div><div class="v">${fi(r.tendencia)}</div><div class="d">${status(tendOk, fp(r.tend_vs_meta, 1) + ' vs meta', fp(r.tend_vs_meta, 1) + ' vs meta')}</div></div>
 <div class="tile"><div class="l">Faturamento ACM</div><div class="v">${fr(r.fat_acm)}</div><div class="d">tendência ${fr(r.fat_tendencia)} (${fp(r.fat_tend_vs_meta, 1)})</div></div>
 <div class="tile"><div class="l">Dias úteis · trab. · rest.</div><div class="v">${fi(r.dias_uteis)} · ${r.dias_trabalhados} · ${fi(r.dias_restantes)}</div><div class="d">volume AA ${fi(r.volume_aa)}</div></div>
</div>
<h2>Montagem</h2>
<table class="kv"><tr><th class="t"></th><th>Pré-venda${pv ? ' ' + fdata(pv.data) : ''}</th><th>Média do mês</th></tr>
${lp('Cx unit plan', fi(pv?.cx_unit), fi(med.cx_unit))}
${lp('Cargas', fi(pv?.cargas), `${fd(med.cargas)}/dia (${fi(t.cargas)} no mês)`)}
${lp('Tx ocupação', fp(pv?.ocupacao, 1), fp(med.ocupacao, 1))}
${lp('Vol. reprog. (cx unit)', fi(pv?.reprog_uc), fi(med.reprog_uc))}
${lp('Tx reprog.', fp(pv?.tx_reprog, 1), fp(med.tx_reprog, 1))}
${lp('Clientes reprog.', fi(pv?.reprog_cli), fd(med.reprog_cli))}
${lp('Cubos por carga', fd(pv?.cubos_carga), fd(med.cubos_carga))}
${lp('Cx unit por carga', fd(pv?.cx_carga), fd(med.cx_carga))}
${lp('Entregas por carga', fd(pv?.entregas_carga), fd(med.entregas_carga))}
</table>
<h2>Indicadores PES (acumulado)</h2>
<table class="kv"><tr><th class="t"></th><th>Real</th><th>Meta</th><th></th></tr>${pes}</table>
<p style="margin:14px 0 0"><a class="btn" href="#/montagem/${c}/${m.mes}">Detalhe ${E(UNIDADES[c].nome)} →</a></p></div>`;
}

export function paginaInicio(ms, ctx) {
  const cards = Object.keys(UNIDADES).map((c) => {
    const m = ms[c];
    if (!m) return `<div class="tile"><div class="l">${E(UNIDADES[c].nome)}</div><div class="v">–</div><div class="d">sem dados publicados</div></div>`;
    const r = m.resumo, ok = r.tend_vs_meta == null ? null : r.tend_vs_meta >= 0;
    return `<div class="tile"><div class="l"><span class="dot" style="background:${cor(c)}"></span> ${E(UNIDADES[c].nome)} · volume ACM</div>
<div class="v">${fi(r.acm)}</div><div class="d">tendência ${fi(r.tendencia)} ${status(ok, fp(r.tend_vs_meta, 1), fp(r.tend_vs_meta, 1))}</div></div>
<div class="tile"><div class="l">${E(UNIDADES[c].nome)} · retorno vol. / reprog. vol.</div><div class="v">${fp(m.total.ret_vol)} · ${fp(m.reprog.pct)}</div><div class="d">metas PES ≤ 1% · ≤ 3%</div></div>`;
  }).join('');
  const acomp = [['Montagem de cargas (DLs)', `#/montagem/${ctx.mes}`, 'ativo'], ['KPI Distribuição e Logística', null, 'próxima fase'],
    ['PES Logístico', null, 'próxima fase'], ['Cargas em aberto', null, 'planejado'], ['Montadores', null, 'planejado'],
    ['Perdas de estoque', null, 'planejado'], ['KM planejado × realizado', null, 'planejado'], ['Retorno por motivo', null, 'planejado'],
    ['Fill rate', null, 'planejado'], ['Gestão à vista', null, 'planejado'], ['Custos de descarga', null, 'planejado']]
    .map(([n, h, s]) => `<div class="card"><h3>${E(n)}</h3><p class="small">${s}</p>${h ? `<a class="btn" href="${h}">Abrir →</a>` : ''}</div>`).join('');
  return `<h1>Painel principal</h1><p class="sub">Indicadores-chave de ${nomeMes(ctx.mes)}. ${ctx.cabecalho}</p>
<div class="tiles">${cards}</div><h2>Acompanhamentos</h2><div class="grid">${acomp}</div>`;
}

export function paginaMontagem(ms, ctx) {
  const blocos = Object.keys(UNIDADES).map((c) => (ms[c] ? blocoResumoDL(c, ms[c], ctx)
    : `<div class="card"><h3>${E(UNIDADES[c].nome)}</h3><p class="small">Sem dados publicados neste mês.</p></div>`)).join('');
  return `<h1>Montagem de cargas — ${nomeMes(ctx.mes)}</h1><p class="sub">Resumo das DLs (equivale à aba RESUMO). ${ctx.cabecalho}</p><div class="grid">${blocos}</div>`;
}

export function paginaDetalhe(c, m, mot, ctx) {
  const r = m.resumo, t = m.total, med = m.media, rp = m.reprog, corS = cor(c);
  const metaDia = r.meta_volume && r.dias_uteis ? r.meta_volume / r.dias_uteis : null;
  const dias = m.dias.filter((d) => d.cx_unit || d.entregas);
  const pv = m.prevenda?.data;
  const O = { resumo: 'Resumo', legado: 'planilha', manual: 'manual' };
  const linha = (d, cls = '', rot = null) => `<tr class="${cls}"><td>${rot ?? `${d.dia_semana} ${fdata(d.data)}`}</td>
<td>${fi(d.vol_cxf)}</td><td>${fi(d.entregas)}</td><td>${fi(d.cargas)}</td><td>${fi(d.cubos)}</td><td>${fp(d.ocupacao, 1)}</td>
<td>${fi(d.cx_unit)}</td><td>${fi(d.reprog_uc)}</td><td>${fi(d.reprog_cli)}</td><td>${fp(d.tx_reprog, 1)}</td><td>${fd(d.cubos_carga)}</td>
<td>${fd(d.cx_carga)}</td><td>${fd(d.entregas_carga)}</td><td>${fd(d.drop_cubos)}</td><td>${fd(d.drop_cx)}</td>
<td>${fp(d.ret_vol)}</td><td>${fp(d.ret_cli)}</td><td>${fp(d.ret_cli_clientes)}</td><td class="t small">${O[d.origem_plan] || ''}</td></tr>`;
  const vazio = { ocupacao: null, tx_reprog: null, cubos_carga: null, cx_carga: null, entregas_carga: null, drop_cubos: null, drop_cx: null };
  const tab = dias.map((d) => linha(d, d.data === pv ? 'pv' : '')).join('')
    + linha({ ...t, ...vazio }, 'tot', 'TOTAL') + linha({ ...med, ret_cli_clientes: null }, 'tot', 'MÉDIA');
  const rpLin = dias.filter((d) => d.rp_uc_total || d.rp_cli != null).map((d) => `<tr class="${d.data === pv ? 'pv' : ''}">
<td>${d.dia_semana} ${fdata(d.data)}</td><td>${fd(d.rp_cubos)}</td><td>${fi(d.rp_uc_total)}</td><td>${fd(d.rp_reprog)}</td>
<td>${fp(d.rp_pct)}</td><td>${fi(d.entregas)}</td><td>${fi(d.rp_cli)}</td><td>${fp(d.rp_pct_cli)}</td></tr>`).join('');
  const totMot = mot.reduce((a, x) => a + x.cx, 0) || 1;
  const motLin = mot.map((x) => `<tr><td class="t">${E(x.motivo)}</td><td>${fd(x.cx)}</td><td>${fp(x.cx / totMot, 1)}</td><td>${fi(x.clientes)}</td></tr>`).join('');
  const folga = (rp.folga_uc ?? 0) >= 0 ? `folga até a meta: ${fi(rp.folga_uc)}` : `acima da meta em ${fi(-rp.folga_uc)}`;
  const editar = ctx.admin ? ` <a class="btn sec" href="#/planejamento/${c}/${m.mes}">Editar planejamento</a> <a class="btn sec" href="#/parametros/${m.mes}">Parâmetros</a>` : '';
  return `<p><a href="#/montagem/${m.mes}">← Montagem de cargas</a></p>
<h1><span class="dot" style="background:${corS}"></span> ${E(UNIDADES[c].nome)} — ${nomeMes(m.mes)}</h1>
<p class="sub">Detalhe diário (aba ${c === 'CBAR' ? 'BARREIRAS' : 'JUAZEIRO'} e Reprogramação DL's). ${ctx.cabecalho}${editar}</p>
<div class="tiles">
 <div class="tile"><div class="l">Volume ACM</div><div class="v">${fi(r.acm)}</div><div class="d">meta ${fi(r.meta_volume)}</div></div>
 <div class="tile"><div class="l">Tendência vs meta</div><div class="v">${fp(r.tend_vs_meta, 1)}</div><div class="d">${fi(r.tendencia)} cx unit</div></div>
 <div class="tile"><div class="l">Faturamento ACM</div><div class="v">${fr(r.fat_acm)}</div><div class="d">tarifa ${fd(r.tarifa, 2)}</div></div>
 <div class="tile"><div class="l">Retorno volume</div><div class="v">${fp(t.ret_vol)}</div><div class="d">meta PES ≤ 1%</div></div>
 <div class="tile"><div class="l">% reprog. volume (PES)</div><div class="v">${fp(rp.pct)}</div><div class="d">${folga} cx unit</div></div>
</div>
<h2>Cx unit por dia</h2><div class="card">${grafico(m.dias, 'cx_unit', corS, metaDia, 'meta diária')}</div>
<h2>Retorno de volume por dia</h2><div class="card">${grafico(m.dias, 'ret_vol', corS, META_PES.ret_vol, 'meta PES', (v) => fp(v, 1))}</div>
<h2>Diário</h2><p class="small">Linha destacada = pré-venda (último Resumo). "Retorno cli. (planilha)" replica a fórmula atual; "por cliente" = clientes com retorno externo ÷ entregas.</p>
<div class="tw"><table><tr><th class="t">Dia</th><th>Vol plan cx fís</th><th>Entregas</th><th>Cargas</th><th>Cubos</th><th>Tx ocup.</th><th>Cx unit plan</th><th>Vol reprog</th><th>Cli reprog</th><th>Tx reprog</th><th>Cubos/veíc.</th><th>Cx unit/carga</th><th>Entregas/carga</th><th>Drop cubos</th><th>Drop cx unit</th><th>Retorno vol.</th><th>Retorno cli. (planilha)</th><th>Retorno cli. (por cliente)</th><th class="t">Origem plan.</th></tr>${tab}</table></div>
<h2>Reprogramação DL's (só cargas REPROG)</h2>
<div class="tw"><table><tr><th class="t">Dia</th><th>Cubos</th><th>Volume UC total</th><th>Reprogramação</th><th>% reprog.</th><th>Entregas plan</th><th>Reprog cli</th><th>% reprog. cli</th></tr>${rpLin}
<tr class="tot"><td>TOTAL</td><td>${fd(rp.rp_cubos)}</td><td>${fi(rp.rp_uc_total)}</td><td>${fd(rp.rp_reprog)}</td><td>${fp(rp.pct)}</td><td>${fi(rp.entregas)}</td><td>${fi(rp.rp_cli)}</td><td>${fp(rp.pct_cli)}</td></tr></table></div>
<h2>Retorno externo por motivo</h2>
<div class="tw"><table><tr><th class="t">Motivo</th><th>Cx unit</th><th>% do retorno</th><th>Clientes</th></tr>${motLin}</table></div>`;
}
