// Renderização. Funções puras: dados -> HTML. Visual inspirado nas planilhas dos acompanhamentos.
import { UNIDADES } from './dados.js?v=20261123-5';
import { faixaDe, DIAS_CRITICO } from './cargas.js?v=20261123-2';

export const E = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const META_PES = { ret_vol: 0.01, ret_cli: 0.02, reprog_vol: 0.03, reprog_cli: 0.03 };
const ROTULO = { CBAR: 'BARREIRAS — LOG I', CCRT: 'JUAZEIRO — LOG II' };

const nf = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
export const fi = (x) => (x == null ? '–' : nf(0).format(x));
export const fd = (x, n = 1) => (x == null ? '–' : nf(n).format(x));
export const fp = (x, n = 2) => (x == null ? '–' : nf(n).format(x * 100) + '%');
export const fr = (x) => (x == null ? '–' : 'R$ ' + nf(0).format(x));
const fk = (x) => (x == null ? '' : Math.abs(x) >= 1000 ? nf(1).format(x / 1000) + 'k' : nf(0).format(x));
export const fdata = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const nomeMes = (mes) => `${MESES[+mes.slice(5, 7) - 1]}/${mes.slice(0, 4)}`;
const cor = (c) => `var(--s${UNIDADES[c].cor})`;

// ---------------------------------------------------------------- regras de cor (iguais às planilhas)
export const corOcup = (v) => (v == null ? '' : v > 0.65 ? 'c-ok' : v >= 0.6 ? 'c-mid' : 'c-no');   // Montagem G
const corMeta = (v, meta) => (v == null ? '' : v <= meta ? 'c-ok' : 'c-no');                          // ≤ meta = bom
const corSinal = (v) => (v == null ? '' : v >= 0 ? 't-up' : 't-down');                                // tendência vs meta

export function status(ok, tOk, tNo) {
  if (ok == null) return '<span class="st na">sem dado</span>';
  return ok ? `<span class="st ok">✓ ${E(tOk)}</span>` : `<span class="st no">✕ ${E(tNo)}</span>`;
}

export function seletorMes(meses, mes) {
  return `Mês: <select id="selMes">${meses.map((m) => `<option value="${m}" ${m === mes ? 'selected' : ''}>${nomeMes(m)}</option>`).join('')}</select>`;
}

export const legenda = () => `<div class="legenda">
<span><i style="background:var(--goodbg)"></i>dentro da meta</span><span><i style="background:var(--midbg)"></i>atenção (ocupação 60–65%)</span>
<span><i style="background:var(--badbg)"></i>fora da meta</span><span><i style="background:var(--pv)"></i>pré-venda</span>
<span><i style="background:var(--total)"></i>total</span><span><i style="background:var(--media)"></i>média</span></div>`;

// abas internas do acompanhamento Montagem
export function abasMontagem(ativa, mes, admin) {
  const a = [['resumo', 'Resumo', `#/montagem/resumo/${mes}`], ['CBAR', 'Barreiras', `#/montagem/CBAR/${mes}`], ['CCRT', 'Juazeiro', `#/montagem/CCRT/${mes}`]];
  const adm = admin ? [['importar', 'Importar', '#/montagem/importar'], ['parametros', 'Parâmetros', `#/montagem/parametros/${mes}`], ['publicar', 'Publicar', `#/montagem/publicar/${mes}`], ['exportar', 'Exportar', `#/montagem/exportar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// ---------------------------------------------------------------- gráfico de barras com valor em cima
export function grafico(dias, campo, corS, meta, rotulo, fmt = fi, fmtBarra = fk, altura = 230) {
  const pts = dias.filter((d) => d[campo]).map((d) => [d.data, d[campo]]);
  if (!pts.length) return '<p class="small">Sem dados no período.</p>';
  const w = 1000, pl = 50, pr = 10, pt = 22, pb = 24;
  const topo = Math.max(...pts.map((p) => p[1]), meta || 0) * 1.12 || 1;
  const n = pts.length, bw = Math.min((w - pl - pr) / n, 70);
  const x0 = pl + ((w - pl - pr) - bw * n) / 2;
  const y = (v) => pt + (altura - pt - pb) * (1 - v / topo);
  let s = `<svg viewBox="0 0 ${w} ${altura}" width="100%" role="img" aria-label="gráfico diário">`;
  for (let k = 0; k <= 4; k++) {
    const v = (topo * k) / 4;
    s += `<line x1="${pl}" x2="${w - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--grid)"/><text x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`;
  }
  pts.forEach(([data, v], i) => {
    const x = x0 + i * bw, cx = x + bw / 2;
    s += `<rect x="${(x + 3).toFixed(1)}" y="${y(v).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${Math.max(y(0) - y(v), 1).toFixed(1)}" rx="3" fill="${corS}"><title>${fdata(data)}: ${fmt(v)}</title></rect>`
      + `<text class="val" x="${cx.toFixed(1)}" y="${(y(v) - 5).toFixed(1)}" text-anchor="middle">${fmtBarra(v)}</text>`
      + `<text x="${cx.toFixed(1)}" y="${altura - 7}" text-anchor="middle">${fdata(data)}</text>`;
  });
  s += `<line x1="${pl}" x2="${w - pr}" y1="${y(0).toFixed(1)}" y2="${y(0).toFixed(1)}" stroke="var(--axis)"/>`;
  if (meta) {
    s += `<line x1="${pl}" x2="${w - pr}" y1="${y(meta).toFixed(1)}" y2="${y(meta).toFixed(1)}" stroke="var(--ink2)" stroke-dasharray="6 4" stroke-width="1.5"/>`
      + `<text x="${pl + 5}" y="${(y(meta) - 5).toFixed(1)}" text-anchor="start" style="fill:var(--ink2);font-weight:600">${E(rotulo)} ${fmt(meta)}</text>`;
  }
  return s + '</svg>';
}

// Vendido × retorno por dia, as duas séries em CX UNIT no MESMO eixo (barras lado a lado), para a
// comparação ser visual e proporcional. O % do vendido aparece em cima da barra de retorno.
export function graficoVendidoRetorno(dias, altura = 290) {
  const pts = dias.filter((d) => d.volume_vendido_cxu || d.retorno_cxu);
  if (!pts.length) return '<p class="small">Sem dados de volume neste período.</p>';
  const w = 1000, pl = 50, pr = 10, pt = 34, pb = 24, base = altura - pb;
  const topo = Math.max(1, ...pts.map((d) => Math.max(d.volume_vendido_cxu || 0, d.retorno_cxu || 0))) * 1.1;
  const y = (v) => pt + (base - pt) * (1 - v / topo);
  const band = (w - pl - pr) / pts.length, bw = Math.min(30, (band - 8) / 2);
  let s = `<div class="grafico-legenda"><span><i class="vendido"></i>VENDIDO (CX UNIT)</span><span><i class="retorno"></i>RETORNO (CX UNIT · % DO VENDIDO)</span></div><svg viewBox="0 0 ${w} ${altura}" width="100%" role="img" aria-label="Caixas unitárias vendidas e retornadas por dia, na mesma escala">`;
  for (let k = 0; k <= 4; k++) {
    const v = (topo * k) / 4, yy = y(v);
    s += `<line x1="${pl}" x2="${w - pr}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="var(--grid)"/><text x="${pl - 6}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${fk(v)}</text>`;
  }
  pts.forEach((d, i) => {
    const cx = pl + band * (i + 0.5), sold = d.volume_vendido_cxu || 0, ret = d.retorno_cxu || 0;
    const pct = sold > 0 ? ret / sold : null, xv = cx - bw - 1, xr = cx + 1;
    const dica = `${fdata(d.data)} · vendido ${fi(sold)} · retorno ${fi(ret)} CX UNIT${pct == null ? '' : ` (${fp(pct)} do vendido)`}`;
    s += `<rect x="${xv.toFixed(1)}" y="${y(sold).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, base - y(sold)).toFixed(1)}" rx="2" fill="var(--brand)"><title>${dica}</title></rect>`
      + `<rect x="${xr.toFixed(1)}" y="${y(ret).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, base - y(ret)).toFixed(1)}" rx="2" fill="var(--s2)"><title>${dica}</title></rect>`
      + `<text class="val" x="${(xv + bw / 2).toFixed(1)}" y="${(y(sold) - 5).toFixed(1)}" text-anchor="middle">${fk(sold)}</text>`
      + (pct == null ? '' : `<text class="val ret" x="${(xr + bw / 2).toFixed(1)}" y="${(y(ret) - 5).toFixed(1)}" text-anchor="middle">${fp(pct, 1)}</text>`)
      + `<text x="${cx.toFixed(1)}" y="${altura - 7}" text-anchor="middle">${fdata(d.data)}</text>`;
  });
  s += `<line x1="${pl}" x2="${w - pr}" y1="${base}" y2="${base}" stroke="var(--axis)"/>`;
  return s + '</svg>';
}

// ---------------------------------------------------------------- painel principal (só admin)
export function painelPrincipal() {
  const acomp = [['Montagem de cargas (DLs)', '#/montagem', 'ativo · Barreiras e Juazeiro'], ['KPI Distribuição e Logística', null, 'próxima fase'],
    ['PES Logístico', '#/pes', 'ativo · placar mensal dos DLs'], ['Cargas em aberto', '#/cargas', 'novo · CB Norte e CB Sul (Consulta BI)'], ['Montadores', '#/montadores/NORTE', 'em validação · dados locais'],
    ['Perdas de estoque', null, 'planejado'], ['KM planejado × realizado', '#/km', 'em validação · 4 unidades'], ['Retorno por motivo', null, 'planejado'],
    ['Fill rate', null, 'planejado'], ['Gestão à vista', null, 'planejado'], ['Custos de descarga', null, 'planejado']];
  return `<h1>Painel principal</h1><p class="sub">Acompanhamentos do Hub. Cada um tem link próprio para enviar por e-mail; quem recebe vê só aquele acompanhamento.</p>
<div class="grid">${acomp.map(([n, h, s]) => `<div class="bloco"><div class="faixa">${E(n)}</div><div class="corpo"><p class="small">${s}</p>
${h ? `<a class="btn" href="${h}">Abrir</a> <button class="btn sec" data-copiar="${h}">Copiar link</button>` : ''}</div></div>`).join('')}
<div class="bloco"><div class="faixa">Acessos</div><div class="corpo"><p class="small">Quem pode ver o que foi publicado.</p><a class="btn" href="#/acessos">Gerenciar</a></div></div></div>`;
}

// ---------------------------------------------------------------- Montagem: resumo (aba RESUMO da planilha)
function blocoDL(c, m, ctx) {
  if (!m) return `<div class="bloco"><div class="faixa">${ROTULO[c]}</div><div class="corpo small">Sem dados neste mês.</div></div>`;
  const r = m.resumo, med = m.media, pv = m.prevenda, t = m.total, rp = m.reprog;
  const falta = ['dias_uteis', 'meta_volume', 'tarifa'].filter((k) => r[k] == null);
  const aviso = falta.length && ctx.admin ? `<div class="aviso">Faltam parâmetros: ${falta.join(', ')}. <a href="#/montagem/parametros/${m.mes}">Preencher</a></div>` : '';
  const linha = (rot, v, cls = '') => `<tr class="${cls}"><td>${rot}</td><td>${v}</td></tr>`;
  const tend = (v, pct) => `${v} <span class="${corSinal(pct)}">${pct == null ? '' : (pct >= 0 ? '▲ ' : '▼ ') + fp(pct, 1)}</span>`;
  const mont = (rot, a, b, ca = '', cb = '') => `<tr><td>${rot}</td><td class="${ca}">${a}</td><td class="${cb}">${b}</td></tr>`;
  const pes = [['% retorno volume', t.ret_vol, META_PES.ret_vol], ['% retorno cliente', t.ret_cli, META_PES.ret_cli],
    ['% reprog. volume', rp.pct, META_PES.reprog_vol], ['% reprog. cliente', rp.pct_cli, META_PES.reprog_cli]]
    .map(([n, v, meta]) => `<tr><td>${n}</td><td class="${corMeta(v, meta)}">${fp(v)}</td><td>≤ ${fp(meta, 0)}</td></tr>`).join('');
  return `<div class="bloco"><div class="faixa"><span>${ROTULO[c]}</span><a class="btn sec" style="padding:3px 10px" href="#/montagem/${c}/${m.mes}">Detalhe diário →</a></div><div class="corpo">${aviso}
<div class="chips"><span class="chip">Dias úteis<b>${fi(r.dias_uteis)}</b></span><span class="chip">Trabalhados<b>${r.dias_trabalhados}</b></span><span class="chip">Restantes<b>${fi(r.dias_restantes)}</b></span></div>
<div class="g2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:10px">
<div class="tw"><table class="kv"><tr><th colspan="2">VOLUME (CX UNIT)</th></tr>
${linha('Volume AA', fi(r.volume_aa))}${linha('Meta', fi(r.meta_volume))}${linha('Dia anterior (pré-venda)', fi(r.dia_anterior))}
${linha('ACM mês', fi(r.acm), 'dest')}${linha('Tendência vs meta', tend(fi(r.tendencia), r.tend_vs_meta), 'dest')}</table></div>
<div class="tw faturamento"><table class="kv"><caption class="tarifa">TARIFA R$ ${fd(r.tarifa, 2)}</caption><tr><th colspan="2">FATURAMENTO</th></tr>
${linha('Faturamento AA', fr(r.faturamento_aa))}${linha('Meta', fr(r.meta_faturamento))}${linha('Dia anterior (pré-venda)', fr(r.fat_dia_anterior))}
${linha('ACM mês', fr(r.fat_acm), 'dest')}${linha('Tendência vs meta', tend(fr(r.fat_tendencia), r.fat_tend_vs_meta), 'dest')}</table></div></div>
<h2>Montagem de cargas</h2>
<div class="tw"><table class="kv"><tr><th class="t"></th><th>Pré-venda${pv ? ' ' + fdata(pv.data) : ''}</th><th>Média do mês</th></tr>
${mont('Cx unit plan', fi(pv?.cx_unit), fi(med.cx_unit))}
${mont('Total cargas', fi(pv?.cargas), fi(t.cargas))}
${mont('Cargas por dia', '–', fd(med.cargas))}
${mont('Tx ocupação', fp(pv?.ocupacao, 1), fp(med.ocupacao, 1), corOcup(pv?.ocupacao), corOcup(med.ocupacao))}
${mont('Volume unit reprog', fi(pv?.reprog_uc), fi(med.reprog_uc))}
${mont('Tx reprog', fp(pv?.tx_reprog, 1), fp(med.tx_reprog, 1))}
${mont('Clientes reprog', fi(pv?.reprog_cli), fd(med.reprog_cli))}
${mont('Cubos por carga', fd(pv?.cubos_carga), fd(med.cubos_carga))}
${mont('Cx unit por carga', fd(pv?.cx_carga), fd(med.cx_carga))}
${mont('Notas (entregas) por carga', fd(pv?.entregas_carga), fd(med.entregas_carga))}</table></div>
<h2>Indicadores PES — acumulado</h2>
<div class="tw"><table class="kv"><tr><th class="t">Indicador</th><th>Real</th><th>Meta</th></tr>${pes}</table></div>
</div></div>`;
}

export function paginaResumo(ms, ctx) {
  return `${ctx.topo}<div class="g2 montagem-resumo">${Object.keys(UNIDADES).map((c) => blocoDL(c, ms[c], ctx)).join('')}</div>${legenda()}`;
}

// ---------------------------------------------------------------- Montagem: detalhe diário da DL
export function paginaDetalhe(c, m, mot, ctx) {
  const r = m.resumo, t = m.total, med = m.media, rp = m.reprog, corS = cor(c);
  const dias = m.dias.filter((d) => {
    const campos = [d.volume_vendido_cxu, d.retorno_cxu, d.vol_cxf, d.cx_unit, d.entregas, d.cargas,
      d.cubos, d.reprog_uc, d.reprog_cli, d.rp_cubos, d.rp_uc_total, d.rp_reprog, d.rp_cli];
    return d.origem_plan != null || d.ocupacao != null || campos.some((x) => x != null && Number(x) !== 0);
  });
  const pv = m.prevenda?.data;
  const origem = { resumo: '', legado: '', manual: ' <span class="tag" title="editado à mão">m</span>' };
  const dia = (d) => `${d.dia_semana} ${fdata(d.data)}${origem[d.origem_plan] || ''}`;
  const cls = (d) => (d.data === pv ? 'pv' : '');

  // A) volume e montagem
  const la = (d, k, rot) => `<tr class="${k}"><td>${rot ?? dia(d)}</td><td>${fi(d.vol_cxf)}</td><td>${fi(d.cx_unit)}</td><td>${fi(d.cubos)}</td>
<td class="sep">${fi(d.entregas)}</td><td>${fi(d.cargas)}</td><td class="${corOcup(d.ocupacao)}">${fp(d.ocupacao, 1)}</td>
<td class="sep">${fd(d.cubos_carga, 0)}</td><td>${fd(d.cx_carga, 0)}</td><td>${fd(d.entregas_carga)}</td><td class="sep">${fd(d.drop_cubos)}</td><td>${fd(d.drop_cx)}</td></tr>`;
  const nulos = { ocupacao: null, cubos_carga: null, cx_carga: null, entregas_carga: null, drop_cubos: null, drop_cx: null };
  const tabA = `<div class="tw"><table class="diario"><thead><tr><th rowspan="2" class="t">Dia</th><th colspan="3" class="grp">Volume</th><th colspan="3" class="grp">Planejamento</th><th colspan="3" class="grp">Por carga</th><th colspan="2" class="grp">Drop (por entrega)</th></tr>
<tr><th>Vol plan cx fís</th><th>Cx unit plan</th><th>Cubos</th><th class="sep">Entregas</th><th>Cargas</th><th>Tx ocup.</th><th class="sep">Cubos</th><th>Cx unit</th><th>Entregas</th><th class="sep">Cubos</th><th>Cx unit</th></tr></thead>
<tbody>${dias.map((d) => la(d, cls(d))).join('')}</tbody>${la({ ...t, ...nulos }, 'tot', 'TOTAL')}${la(med, 'med', 'MÉDIA')}</table></div>`;

  // B) Reprogramação do PES, considerando apenas a categoria REPROG.
  const lb = (d, k, rot, x = {}) => `<tr class="${k}"><td>${rot ?? dia(d)}</td><td class="sep">${fd(x.rp_cubos ?? d.rp_cubos)}</td><td>${fi(x.rp_uc_total ?? d.rp_uc_total)}</td><td>${fd(x.rp_reprog ?? d.rp_reprog)}</td>
<td class="${corMeta(x.pct ?? d.rp_pct, META_PES.reprog_vol)}">${fp(x.pct ?? d.rp_pct)}</td><td>${fi(x.rp_cli ?? d.rp_cli)}</td>
<td class="${corMeta(x.pct_cli ?? d.rp_pct_cli, META_PES.reprog_cli)}">${fp(x.pct_cli ?? d.rp_pct_cli)}</td></tr>`;
  const tabB = `<div class="tw"><table class="diario"><thead><tr><th rowspan="2" class="t">Dia</th><th colspan="6" class="grp">Reprogramação DL's / PES — meta ≤ ${fp(rp.meta, 0)}</th></tr>
<tr><th class="sep">Cubos</th><th>UC total</th><th>Reprog (cx)</th><th>% vol.</th><th>Clientes</th><th>% cli.</th></tr></thead>
<tbody>${dias.map((d) => lb(d, cls(d))).join('')}</tbody>
${lb({ ...t, tx_reprog: null }, 'tot', 'TOTAL', { rp_cubos: rp.rp_cubos, rp_uc_total: rp.rp_uc_total, rp_reprog: rp.rp_reprog, pct: rp.pct, rp_cli: rp.rp_cli, pct_cli: rp.pct_cli })}</table></div>`;

  // C) retorno diário + motivos
  const lc = (d, k, rot) => `<tr class="${k}"><td>${rot ?? dia(d)}</td><td class="${corMeta(d.ret_vol, META_PES.ret_vol)}">${fp(d.ret_vol)}</td>
<td class="${corMeta(d.ret_cli, META_PES.ret_cli)}">${fp(d.ret_cli)}</td><td class="${corMeta(d.ret_cli_clientes, META_PES.ret_cli)}">${fp(d.ret_cli_clientes)}</td></tr>`;
  const tabC = `<div class="tw"><table class="diario"><thead><tr><th class="t">Dia</th><th>Retorno vol.<br>(≤ 1%)</th><th>Retorno cli.<br>planilha (≤ 2%)</th><th>Retorno cli.<br>por cliente</th></tr></thead>
<tbody>${dias.map((d) => lc(d, cls(d))).join('')}</tbody>${lc(t, 'tot', 'ACUMULADO')}</table></div>`;
  const totMot = mot.reduce((a, x) => a + x.cx, 0) || 1;
  const tabM = `<div class="tw"><table><thead><tr><th class="t">Motivo (retorno externo)</th><th>Cx unit</th><th>%</th><th>Clientes</th></tr></thead>
<tbody>${mot.map((x) => `<tr><td class="t">${E(x.motivo)}</td><td>${fd(x.cx)}</td><td>${fp(x.cx / totMot, 1)}</td><td>${fi(x.clientes)}</td></tr>`).join('')}</tbody></table></div>`;

  const folga = (rp.folga_uc ?? 0) >= 0 ? `folga ${fi(rp.folga_uc)} cx` : `acima da meta em ${fi(-rp.folga_uc)} cx`;
  const editar = ctx.admin ? ` <a class="btn sec" href="#/montagem/planejamento/${c}/${m.mes}">✎ Editar planejamento</a>` : '';
  return `${ctx.topo}
<div class="tiles">
 <div class="tile"><div class="l">Volume ACM (cx unit)</div><div class="v">${fi(r.acm)}</div><div class="d">meta ${fi(r.meta_volume)}</div></div>
 <div class="tile"><div class="l">Tendência vs meta</div><div class="v ${corSinal(r.tend_vs_meta)}">${fp(r.tend_vs_meta, 1)}</div><div class="d">${fi(r.tendencia)} cx unit</div></div>
 <div class="tile"><div class="l">Faturamento ACM</div><div class="v">${fr(r.fat_acm)}</div><div class="d">tendência ${fr(r.fat_tendencia)}</div></div>
 <div class="tile"><div class="l">Tx ocupação média</div><div class="v">${fp(med.ocupacao, 1)}</div><div class="d">${fd(med.cargas)} cargas/dia</div></div>
 <div class="tile"><div class="l">Retorno volume</div><div class="v">${fp(t.ret_vol)}</div><div class="d">${status(t.ret_vol == null ? null : t.ret_vol <= META_PES.ret_vol, 'meta ≤ 1%', 'meta ≤ 1%')}</div></div>
 <div class="tile"><div class="l">% reprog. volume (PES)</div><div class="v">${fp(rp.pct)}</div><div class="d">${status(rp.pct == null ? null : rp.pct <= rp.meta, folga, folga)}</div></div>
</div>
<p class="small">${editar}</p>
<h2>Cx unit por dia · vendido e retorno</h2><div class="card">${graficoVendidoRetorno(m.dias)}</div>
<h2>Volume e montagem</h2>${tabA}
<h2>Reprogramação</h2>${tabB}
<h2>Indicadores e motivos de retorno</h2><div class="g2" style="margin-top:14px">${tabC}${tabM}</div>${legenda()}`;
}

// ---------------------------------------------------------------- PES Logístico
export function abasPES(ativa, mes, admin) {
  const a = [['resumo', 'Placar', `#/pes/resumo/${mes}`]];
  const adm = admin ? [['digitacao', 'Digitação', `#/pes/digitacao/${mes}`], ['publicar', 'Publicar', `#/pes/publicar/${mes}`], ['exportar', 'Exportar', `#/pes/exportar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

const REGRA = { '<=': '≤', '>=': '≥', '=': '=' };
const valPES = (l, x) => (x == null ? '–' : l.pct ? fp(x, 2) : fd(x, Number.isInteger(x) ? 0 : 1));
const metaPES = (l) => `${REGRA[l.regra]} ${l.pct ? fp(l.meta, 0) : fi(l.meta)}`;
// Distância até a meta: ▲ acima / ▼ abaixo, com a quantidade (verde = lado bom, vermelho = lado ruim)
function faltaPES(l) {
  if (l.falta == null) return '';
  const q = Math.abs(l.falta), n = l.faltaUn === 'clientes' ? fd(q, 1) : fi(q);
  const abaixo = l.falta >= 0;   // nos automáticos a meta é "≤": folga positiva = real abaixo da meta
  return `<span class="${abaixo ? 't-up' : 't-down'}">${abaixo ? '▼' : '▲'} ${n} ${l.faltaUn}</span>`;
}

function blocoPES(c, pl, mes, admin) {
  if (!pl) return `<div class="bloco"><div class="faixa">${ROTULO[c]}</div><div class="corpo small">Placar de ${nomeMes(mes)} ainda não publicado.</div></div>`;
  const semMont = pl.linhas.filter((l) => l.auto).every((l) => l.real == null);
  const linhas = pl.linhas.map((l) => `<tr><td class="t">${E(l.nome.replace(/ \(.*\)$/, ''))}${l.auto ? '' : ' <span class="tag">digitado</span>'}</td><td>${metaPES(l)}</td>
<td class="${l.bateu == null ? '' : l.bateu ? 'c-ok' : 'c-no'}"><b>${valPES(l, l.real)}</b></td>
<td>${faltaPES(l)}</td><td>${fi(l.possiveis)}</td><td><b>${fi(l.feitos)}</b></td><td>${l.solar == null ? '' : fi(l.solar)}</td></tr>`).join('');
  const t = pl.total, pct = t.possiveis ? t.feitos / t.possiveis : 0;
  const batidas = pl.linhas.filter((l) => l.bateu).length, dig = pl.linhas.filter((l) => !l.auto), digOk = dig.filter((l) => l.real != null).length;
  return `<div class="bloco"><div class="faixa"><span>${ROTULO[c]}</span></div><div class="corpo">
<div class="pes-resumo"><div class="pes-pontos"><span class="v">${fi(t.feitos)}</span><span class="l">de ${fi(t.possiveis)} pontos</span>
<div class="barra" role="img" aria-label="${fi(t.feitos)} de ${fi(t.possiveis)} pontos"><i style="width:${(pct * 100).toFixed(1)}%"></i></div></div>
<div class="chips"><span class="chip">Metas batidas<b>${batidas} de ${pl.linhas.length}</b></span><span class="chip">Digitados preenchidos<b>${digOk} de ${dig.length}</b></span>${t.solar == null ? '' : `<span class="chip">SOLAR<b>${fi(t.solar)}</b></span>`}</div></div>
${semMont ? `<div class="aviso">Sem dados da Montagem em ${nomeMes(mes)}: os 4 indicadores automáticos ficam sem dado.</div>` : ''}
${admin && digOk < dig.length ? `<div class="aviso">Há indicadores digitados em branco. <a href="#/pes/digitacao/${mes}">Preencher</a></div>` : ''}
<div class="tw"><table class="pes"><thead><tr><th class="t">Indicador</th><th>Meta</th><th>Real</th><th>vs meta</th><th>Pontos possíveis</th><th>Pontos feitos</th><th>SOLAR</th></tr></thead>
<tbody>${linhas}<tr class="tot"><td class="t">TOTAL</td><td></td><td></td><td></td><td>${fi(t.possiveis)}</td><td>${fi(t.feitos)}</td><td>${t.solar == null ? '' : fi(t.solar)}</td></tr></tbody></table></div>
</div></div>`;
}

// placares: {CBAR: placar|null, CCRT: placar|null}
export function paginaPES(placares, { mes, admin, topo }) {
  return `${topo}<p class="sub">Programa de Excelência Solar — resultados logísticos. Ponto cheio só se bater a meta. Os 4 percentuais de retorno e reprogramação vêm da Montagem de Cargas do mês; os demais são digitados.</p>
<div class="pes-dls">${Object.keys(UNIDADES).map((c) => blocoPES(c, placares[c], mes, admin)).join('')}</div>
<p class="small">vs meta: ▼ abaixo ou ▲ acima da meta no acumulado do mês, em cx unit ou clientes.</p>`;
}

// ---------------------------------------------------------------- KM planejado × realizado
export function abasKM(ativa, mes, admin) {
  const a = [['resumo', 'Resumo', `#/km/resumo/${mes}`], ['NORTE', 'CB NORTE', `#/km/NORTE/${mes}`], ['SUL', 'CB SUL', `#/km/SUL/${mes}`],
    ['CBAR', 'BARREIRAS', `#/km/CBAR/${mes}`], ['CCRT', 'JUAZEIRO', `#/km/CCRT/${mes}`]];
  const adm = admin ? [['importar', 'Importar', '#/km/importar'], ['rotas', 'Rotas', `#/km/rotas/NORTE/${mes}`], ['parametros', 'Parâmetros', `#/km/parametros/${mes}`], ['publicar', 'Publicar', `#/km/publicar/${mes}`], ['exportar', 'Exportar', `#/km/exportar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k,t,h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k,t,h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

export function abasMontadores(ativa, mes) {
  const abas = [['NORTE','CB Norte',`#/montadores/NORTE/${mes}`], ['SUL','CB Sul',`#/montadores/SUL/${mes}`],
    ['CBAR','Barreiras',`#/montadores/CBAR/${mes}`], ['CCRT','Juazeiro',`#/montadores/CCRT/${mes}`], ['importar','Importar','#/montadores/importar'], ['exportar','Exportar',`#/montadores/exportar/${mes}`]];
  return `<nav class="abas">${abas.map(([k,t,h]) => `<a class="${k === ativa ? 'on' : ''} ${['importar','exportar'].includes(k) ? 'adm' : ''}" href="${h}">${['importar','exportar'].includes(k) ? '⚙ ' : ''}${t}</a>`).join('')}</nav>`;
}

const unidadeMontador = { NORTE:'CB NORTE', SUL:'CB SUL', CBAR:'BARREIRAS — LOG I', CCRT:'JUAZEIRO — LOG II' };
export function paginaMontadoresUnidade(base, rows, {mes, topo}) {
  const diarista = (p) => p.diario.some((d) => d.diarista) || [p.nome,p.login,p.tipo,p.vinculo,p.categoria].some((v) => /diarista/i.test(String(v || '')));
  const rankings = rows.filter((p) => !diarista(p));
  const todosDias = rows.flatMap((p) => p.diario), ultimaData = todosDias.map((d) => d.data).sort().at(-1);
  const porMes = [...rankings].sort((a,b) => b.caixas-a.caixas || b.mediaCxHora-a.mediaCxHora);
  const porUltimoDia = rankings.map((p) => ({...p, ultimo: p.diario.find((d) => d.data === ultimaData)})).filter((p) => p.ultimo)
    .sort((a,b) => b.ultimo.cxHora-a.ultimo.cxHora || b.ultimo.caixas-a.ultimo.caixas);
  const tabelaRanking = (lista, valor) => `<div class="tw scroll"><table><thead><tr><th>#</th><th class="t">Montador</th><th>Login</th><th>${valor === 'Caixas no mês' ? 'Cx mês' : 'CX/H'}</th><th>${valor === 'Caixas no mês' ? 'Dias' : 'Cx últ. dia'}</th><th>Situação</th></tr></thead><tbody>${lista.map((p,i) => `<tr><td>${i+1}</td><td class="t">${E(p.nome)}</td><td class="t">${E(p.login)}</td><td>${valor === 'Caixas no mês' ? fi(p.caixas) : fd(p.ultimo.cxHora,2)}</td><td>${valor === 'Caixas no mês' ? fi(p.dias) : fi(p.ultimo.caixas)}</td><td>${p.observacao ? '<span class="badge">Em observação</span>' : '<span class="badge pub" title="Encontrado no cadastro DA/DL">Validado</span>'}</td></tr>`).join('') || `<tr><td class="t" colspan="6">Sem dados neste período.</td></tr>`}</tbody></table></div>`;
  const ordenados = [...rows].sort((a,b) => b.caixas-a.caixas || a.nome.localeCompare(b.nome,'pt-BR'));
  const datas = [...new Set(todosDias.map((d) => d.data))].sort();
  const porPessoaDia = new Map();
  for (const p of rows) for (const d of p.diario) porPessoaDia.set(`${p.login}|${d.data}`, d);
  const cabecalho = ordenados.map((p) => `<th class="grp" title="${E(p.login)}">${E(p.nome)}${diarista(p) ? ' · diarista' : p.observacao ? ' · observação' : ''}</th>`).join('');
  const mediaDia = (data) => { const vals = ordenados.map((p) => porPessoaDia.get(`${p.login}|${data}`)?.cxHora).filter((v) => v != null); return vals.length ? vals.reduce((a,b) => a+b,0)/vals.length : null; };
  const corpo = datas.map((data) => `<tr><td class="t">${fdata(data)}</td>${ordenados.map((p) => {
    const d = porPessoaDia.get(`${p.login}|${data}`);
    const dica = d ? `title="Erros ${fi(d.erros)} · Paletes ${fi(d.paletes)} · Misto ${fi(d.misto)} · LP Duplo ${fi(d.lpDuplo)} · Container ${fi(d.container)} · Gaveta ${fi(d.gaveta)}"` : '';
    return `<td ${dica} class="${d && d.cxHora >= 350 ? 'c-ok' : ''}">${d ? fd(d.cxHora,2) : '–'}</td>`;
  }).join('')}<td>${fd(mediaDia(data),2)}</td></tr>`).join('');
  const rodapeMedia = ordenados.map((p) => `<td>${fd(p.mediaCxHora,2)}</td>`).join('');
  const detalhamento = `<div class="tw scroll"><table class="montadores-matriz"><thead><tr><th class="t sticky">Dia</th>${cabecalho}<th>Média do dia</th></tr></thead><tbody>${corpo || `<tr><td class="t" colspan="${ordenados.length+2}">Sem dados diários neste período.</td></tr>`}<tr class="med"><td class="t">Média CX/H no mês</td>${rodapeMedia}<td>–</td></tr></tbody></table></div>`;
  const observados = rows.filter((p) => p.observacao);
  const avisos = [rows.some(diarista) ? 'Diaristas aparecem no detalhamento e ficam fora dos rankings.' : '',
    observados.length ? `Logins em observação — não localizados no cadastro DA/DL e aguardando conferência: ${observados.map((p) => `${E(p.login)} (${E(p.nome)})`).join(', ')}.` : ''].filter(Boolean).join(' ');
  return `${topo}<p class="sub">${E(unidadeMontador[base])} · ${E(nomeMes(mes))}</p><div class="g2 montadores-rankings"><section class="bloco"><div class="faixa">Ranking do mês · caixas</div><div class="corpo">${tabelaRanking(porMes,'Caixas no mês')}</div></section><section class="bloco"><div class="faixa">Último dia com montagem · ${ultimaData ? fdata(ultimaData) : '–'} · CX/H</div><div class="corpo">${tabelaRanking(porUltimoDia,'CX/H')}</div></section></div>${avisos ? `<div class="aviso">${avisos}</div>` : ''}<h2>Detalhamento diário por montador</h2><p class="small">A matriz mostra somente CX/H por dia. Passe o mouse sobre o valor para consultar erros, paletes, misto, LP duplo, container e gaveta. Verde indica pelo menos 350 CX/H.</p>${detalhamento}`;
}

export function paginaKMResumo(resultado, { mes, admin, topo }) {
  const unidades = Object.entries(resultado.unidades), datas = [...new Set(unidades.flatMap(([,u]) => u.dias.map((d) => d.data)))].sort();
  const celulas = (d, futuro = false) => `<td class="${futuro ? 'pv' : ''}">${fi(d?.planejado ?? 0)}</td><td class="${futuro ? 'pv' : ''}">${fi(d?.realizado ?? 0)}</td><td class="${futuro ? 'pv' : ''}">${fi(d?.diferenca ?? 0)}</td><td class="${futuro ? 'pv' : ''}">${fp(d?.dispersao)}</td>`;
  const grupos = unidades.map(([,u]) => `<th class="grp" colspan="4">${E(u.nome)}</th>`).join('');
  const sub = unidades.map(() => '<th>Planejado (km)</th><th>Realizado (km)</th><th>Diferença (km)</th><th>Dispersão</th>').join('');
  const porData = Object.fromEntries(unidades.map(([c,u]) => [c,Object.fromEntries(u.dias.map((d) => [d.data,d]))]));
  const corpo = datas.map((data) => {
    const futuro = unidades.length > 0 && unidades.every(([c]) => porData[c][data]?.acumulado);
    return `<tr><td class="t">${fdata(data)}${futuro ? ' *' : ''}</td>${unidades.map(([c]) => { const d = porData[c][data]; return celulas(d, d?.acumulado); }).join('')}</tr>`;
  }).join('');
  const acumulado = unidades.map(([,u]) => celulas(u.totais)).join('');
  const secoes = unidades.map(([c,u]) => {
    if (!u.temDados) return `<section class="bloco"><div class="faixa">${E(u.nome)}</div><div class="corpo"><div class="aviso">Sem dados de KM em ${nomeMes(mes)}.</div>${admin ? '<a class="btn sec" href="#/km/importar">Importar arquivos</a>' : ''}</div></section>`;
    const t = u.totais, meta = status(t.dentroMeta, `dentro de ±${fp(t.meta,0)}`, `fora de ±${fp(t.meta,0)}`);
    const linhas = u.dias.map((d) => `<tr class="${d.acumulado ? 'pv' : ''}"><td class="t">${fdata(d.data)}${d.acumulado ? ' *' : ''}</td>${celulas(d)}</tr>`).join('');
    const detalhe = unidades.length > 1
      ? `<p><a class="btn sec" href="#/km/${c}/${mes}">Detalhe diário →</a></p>`
      : `<div class="tw scroll"><table class="diario km"><thead><tr><th class="t">Dia</th><th>Planejado</th><th>Realizado</th><th>Diferença</th><th>Dispersão</th></tr></thead><tbody>${linhas}<tr class="tot"><td class="t">ACUMULADO</td>${celulas(t)}</tr></tbody></table></div><p class="small">* Depois do último abastecimento lançado. CPK usado no custo: ${fr(t.cpk)}/km.</p>`;
    return `<section class="bloco"><div class="faixa">${E(u.nome)}${admin && ['NORTE','SUL'].includes(c) ? ` <a class="btn sec" href="#/km/motoristas/${c}/${mes}">Motoristas/placas →</a>` : ''}</div><div class="corpo">
${admin && u.revisao?.freteirosPendentes ? `<div class="aviso">${fi(u.revisao.freteirosPendentes)} rota(s) de FRETEIRO ainda contam no planejado (${fi(u.revisao.kmFreteirosPendentes)} km). <a href="#/km/rotas/${c}/${mes}">Revisar rotas →</a></div>` : ''}
<div class="tiles"><div class="tile"><div class="l">Planejado até ${u.ultimoDia ? fdata(u.ultimoDia) : '–'}</div><div class="v">${fi(t.planejado)} km</div></div><div class="tile"><div class="l">Realizado</div><div class="v">${fi(t.realizado)} km</div></div><div class="tile"><div class="l">Diferença · dispersão</div><div class="v">${fi(t.diferenca)} km · ${fp(t.dispersao)}</div><div class="d">${meta}</div></div><div class="tile"><div class="l">Custo da dispersão</div><div class="v">${fr(t.custo)}</div></div></div>
${detalhe}</div></section>`;
  }).join('<div style="height:16px"></div>');
  const resumo = unidades.length > 1 ? `<h2>Relatório diário por unidade</h2><div class="tw scroll"><table class="diario km km-matriz"><thead><tr><th rowspan="2" class="t">Dia</th>${grupos}</tr><tr>${sub}</tr></thead><tbody>${corpo}<tr class="tot"><td class="t">ACUMULADO</td>${acumulado}</tr></tbody></table></div><p class="small">* Os campos em cinza são posteriores ao último abastecimento informado naquela unidade e ficam fora do acumulado.</p>` : '';
  return `${topo}<p class="sub">KM planejado × realizado · visão diária no formato do relatório de quilometragem.</p>${resumo}${secoes}`;
}

// Revisão das rotas planejadas (só admin): trocar motorista e excluir rota (ex.: FRETEIRO confirmado).
// O filtro é feito no navegador (atributo data-grupos de cada linha), sem mudar a rota da página.
const NOMES_KM = { NORTE: 'CB Norte', SUL: 'CB Sul', CBAR: 'DL Barreiras', CCRT: 'DL Juazeiro' };
export function paginaKMRotas(unidade, rotas, { mes, topo }) {
  const fret = (r) => /FRETEIRO/i.test(`${r.categoria || ''} ${r.motorista || ''}`);
  const comPlaca = ['NORTE', 'SUL'].includes(unidade);
  const nomes = [...new Set(rotas.map((r) => r.motoristaOriginal).filter((n) => n && !/FRETEIRO/i.test(n)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const pend = rotas.filter((r) => fret(r) && !r.excluida), kmPend = pend.reduce((s, r) => s + (Number(r.km) || 0), 0);
  const grupos = (r) => [fret(r) || /FRETEIRO/i.test(r.motoristaOriginal || '') ? 'freteiro' : '', r.ajustada || r.excluida ? 'ajustadas' : '', r.excluida ? 'excluidas' : ''].filter(Boolean).join(' ');
  const etiqueta = (r) => r.excluida ? '<span class="st no">excluída</span>' : fret(r) ? '<span class="badge">FRETEIRO · revisar</span>'
    : r.ajustada ? '<span class="st ok">motorista trocado</span>' : /GENERICO|EXTRA/i.test(`${r.categoria || ''} ${r.motorista || ''}`) ? '<span class="tag">sem atribuição</span>' : '';
  const linhas = rotas.map((r) => `<tr class="${r.excluida ? 'exc' : ''}" data-chave="${E(r.chave)}" data-original="${E(r.motoristaOriginal || '')}" data-grupos="${grupos(r)}">
<td class="t">${fdata(r.data)}</td><td class="t">${E(r.carga || '–')}</td><td class="t">${E(r.area || '–')}</td>${comPlaca ? `<td class="t">${E(r.placa || '–')}</td>` : ''}
<td class="t"><input type="text" class="mot" list="nomesKM" value="${E(r.motorista || '')}" title="No arquivo: ${E(r.motoristaOriginal || '–')}"></td>
<td>${fd(r.km, 1)}</td><td>${etiqueta(r)}</td><td><input type="checkbox" class="exc" ${r.excluida ? 'checked' : ''} aria-label="Excluir rota"></td></tr>`).join('');
  const unidadesNav = Object.entries(NOMES_KM).map(([c, n]) => `<a class="${c === unidade ? 'on' : ''}" href="#/km/rotas/${c}/${mes}">${n}</a>`).join('');
  const opc = [['todas', 'Todas as rotas'], ['freteiro', 'Só FRETEIRO'], ['ajustadas', 'Ajustadas ou excluídas'], ['excluidas', 'Só excluídas']]
    .map(([k, t]) => `<option value="${k}">${t}</option>`).join('');
  return `${topo}<nav class="abas">${unidadesNav}</nav>
<p class="sub">Rotas do planejado de ${E(NOMES_KM[unidade])} em ${E(nomeMes(mes))}. Troque o motorista quando a rota veio com o nome errado (ex.: FRETEIRO que na verdade foi um motorista da casa) e marque <b>Excluir</b> nas rotas que não entram no planejado. Os ajustes continuam valendo depois de reimportar o dia.</p>
${pend.length ? `<div class="aviso">${fi(pend.length)} rota(s) de FRETEIRO ainda contam no planejado (${fi(kmPend)} km). Confira e exclua as que realmente foram de freteiro.</div>` : '<p class="small">Nenhuma rota de FRETEIRO pendente nesta unidade.</p>'}
<p><label>Mostrar <select id="filtroRotas">${opc}</select></label> <button class="btn sec" id="marcarFret" type="button">Marcar todas as de FRETEIRO para excluir</button></p>
<datalist id="nomesKM">${nomes.map((n) => `<option value="${E(n)}">`).join('')}</datalist>
<div class="tw scroll"><table class="km-rotas"><thead><tr><th class="t">Dia</th><th class="t">Carga</th><th class="t">Rota / área</th>${comPlaca ? '<th class="t">Placa</th>' : ''}<th class="t">Motorista</th><th>Km</th><th>Situação</th><th>Excluir</th></tr></thead>
<tbody>${linhas || `<tr><td class="t" colspan="${comPlaca ? 8 : 7}">Nenhuma rota importada neste mês.</td></tr>`}</tbody></table></div>
<p><button class="btn" id="salvarRotas">Salvar ajustes</button> <span id="msg"></span></p>
<p class="small">Passe o mouse sobre o motorista para ver o nome que veio no arquivo. A ida e volta passa a seguir o motorista informado aqui.</p>`;
}

export function paginaKMMotoristas(u, { mes, topo }) {
  const rows = u.motoristas.map((x) => `<tr><td class="t">${E(x.motorista)}</td><td>${E(x.placa || '–')}</td><td>${fi(x.planejado)}</td><td>${fi(x.realizado)}</td><td>${fi(x.realizado-x.planejado)}</td><td>${fi(x.semRota || 0)}</td></tr>`).join('');
  return `${topo}<p><a href="#/km/resumo/${mes}">← Resumo</a></p><h2>Detalhe por motorista e placa · ${E(u.nome)}</h2><div class="tw scroll"><table><thead><tr><th class="t">Motorista</th><th>Placa</th><th>Planejado</th><th>Realizado</th><th>Diferença</th><th>Abast. sem rota</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="t">Sem rotas ou abastecimentos.</td></tr>'}</tbody></table></div><p class="small">Somente CB Norte e CB Sul têm atribuição por placa e dia. Nomes e placas ficam restritos ao administrador.</p>`;
}

// ---------------------------------------------------------------- Cargas em aberto (DAs)
export function abasCargas(ativa, data, admin) {
  const q = data ? `/${data}` : '';
  const a = [['resumo', 'Resumo', `#/cargas/resumo${q}`], ['NORTE', 'CB Norte', `#/cargas/NORTE${q}`], ['SUL', 'CB Sul', `#/cargas/SUL${q}`]];
  const adm = admin ? [['importar', 'Importar', '#/cargas/importar'], ['publicar', 'Publicar', `#/cargas/publicar${q}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

const fdataAno = (iso) => `${fdata(iso)}/${iso.slice(0, 4)}`;
// Reaproveita id="selMes" para ligarTopo() funcionar igual aos outros acompanhamentos.
export function seletorData(datas, data) {
  return `Extração: <select id="selMes">${datas.map((d) => `<option value="${d}" ${d === data ? 'selected' : ''}>${fdataAno(d)}</option>`).join('')}</select>`;
}

const criticas = (r) => r.faixas.find((f) => f.nivel === 'critico') || { qtd: 0, cxu: 0 };

function tilesCargas(r) {
  const ma = r.maisAntiga, cr = criticas(r);
  return `<div class="tiles">
 <div class="tile"><div class="l">Críticas · ${DIAS_CRITICO}+ dias</div><div class="v ${cr.qtd ? 't-down' : 't-up'}">${fi(cr.qtd)}</div><div class="d">${cr.qtd ? `${fi(cr.cxu)} cx unit · limite: ${DIAS_CRITICO + 1} dias` : `nenhuma venda com ${DIAS_CRITICO} dias ou mais`}</div></div>
 <div class="tile"><div class="l">Vendas em aberto</div><div class="v">${fi(r.qtd)}</div><div class="d">${fi(r.clientes)} clientes</div></div>
 <div class="tile"><div class="l">Cx unit em aberto</div><div class="v">${fi(r.cxu)}</div><div class="d">sem acerto no ERP</div></div>
 <div class="tile"><div class="l">Mais antiga</div><div class="v ${ma && ma.dias >= DIAS_CRITICO ? 't-down' : ''}">${ma ? `${fi(ma.dias)} ${ma.dias === 1 ? 'dia' : 'dias'}` : '–'}</div><div class="d">${ma ? `emissão ${fdata(ma.emissao)} · cliente ${E(ma.cli)}` : 'nenhuma venda em aberto'}</div></div>
 <div class="tile"><div class="l">Tempo médio de acerto</div><div class="v">${r.acerto?.diasMedio == null ? '–' : `${fd(r.acerto.diasMedio, 1)} dias`}</div><div class="d">${r.acerto ? `${fi(r.acerto.qtd)} vendas já acertadas no período` : 'sem vendas acertadas no export'}</div></div>
</div>`;
}

function graficoCargas(r) {
  return grafico(r.porEmissao, 'cxu', r.cor, null, '', fk, fk);
}

const notaFaixas = `<p class="small">Dias em aberto = data da extração − data de emissão. Urgência: até 2 dias normal · 3 a ${DIAS_CRITICO - 1} dias atenção · ${DIAS_CRITICO} dias ou mais crítico (a carga não pode chegar a ${DIAS_CRITICO + 1} dias sem acerto).</p>`;

export function paginaCargasResumo(res, { data, topo, admin }) {
  const rs = Object.entries(res.revendas);
  const total = { qtd: rs.reduce((s, [, r]) => s + r.qtd, 0), cxu: rs.reduce((s, [, r]) => s + r.cxu, 0), criticas: rs.reduce((s, [, r]) => s + criticas(r).qtd, 0) };
  const linhas = rs[0][1].faixas.map((f, i) => `<tr><td class="t ${f.classe}">${E(f.rotulo)}</td>${rs.map(([, r]) => `<td>${fi(r.faixas[i].qtd)}</td><td>${fi(r.faixas[i].cxu)}</td>`).join('')}</tr>`).join('');
  const tabela = `<div class="tw scroll"><table><thead><tr><th class="t" rowspan="2">Dias em aberto</th>${rs.map(([, r]) => `<th class="grp" colspan="2">${E(r.nome)}</th>`).join('')}</tr>
<tr>${rs.map(() => '<th>Vendas</th><th>Cx unit</th>').join('')}</tr></thead><tbody>${linhas}
<tr class="tot"><td class="t">TOTAL</td>${rs.map(([, r]) => `<td>${fi(r.qtd)}</td><td>${fi(r.cxu)}</td>`).join('')}</tr></tbody></table></div>`;
  const blocos = rs.map(([c, r]) => `<section class="bloco"><div class="faixa">${E(r.nome)} <a class="btn sec" href="#/cargas/${c}/${data}">Lista de clientes →</a></div><div class="corpo">
${tilesCargas(r)}<h3>Cx unit em aberto por data de emissão</h3>${r.porEmissao.length ? graficoCargas(r) : '<p class="small">Nenhuma venda em aberto.</p>'}</div></section>`).join('');
  return `${topo}<p class="sub">Vendas emitidas e ainda não acertadas no ERP, extraídas da Consulta BI em ${fdataAno(data)}${res.emissaoDe ? ` · emissões de ${fdata(res.emissaoDe)} a ${fdata(res.emissaoAte)}` : ''}.</p>
<div class="tiles"><div class="tile"><div class="l">Críticas · ${DIAS_CRITICO}+ dias · total</div><div class="v ${total.criticas ? 't-down' : 't-up'}">${fi(total.criticas)}</div></div><div class="tile"><div class="l">Vendas em aberto · total</div><div class="v">${fi(total.qtd)}</div></div><div class="tile"><div class="l">Cx unit em aberto · total</div><div class="v">${fi(total.cxu)}</div></div></div>
<h2>Por faixa de dias em aberto</h2>${tabela}${notaFaixas}<div class="g2">${blocos}</div>`;
}

export function paginaCargasRevenda(r, { data, topo, admin }) {
  const linhas = r.lista.map((l) => `<tr><td class="t">${E(l.cli)}</td>${admin ? `<td class="t">${E(l.nome || '')}</td>` : ''}<td>${fdataAno(l.emissao)}</td><td class="${faixaClasse(l.dias)}">${fi(l.dias)}</td><td>${fi(l.cxu)}</td></tr>`).join('');
  return `${topo}<p><a href="#/cargas/resumo/${data}">← Resumo</a></p>${tilesCargas(r)}
<h2>Cx unit em aberto por data de emissão</h2><div class="card">${r.porEmissao.length ? graficoCargas(r) : '<p class="small">Nenhuma venda em aberto.</p>'}</div>
<h2>Vendas em aberto · da mais antiga para a mais recente</h2>${notaFaixas}
<div class="tw scroll"><table><thead><tr><th class="t">Cliente (código)</th>${admin ? '<th class="t">Razão social</th>' : ''}<th>Emissão</th><th>Dias em aberto</th><th>Cx unit</th></tr></thead>
<tbody>${linhas || `<tr><td class="t small" colspan="${admin ? 5 : 4}">Nenhuma venda em aberto.</td></tr>`}
<tr class="tot"><td class="t">TOTAL</td>${admin ? '<td></td>' : ''}<td></td><td></td><td>${fi(r.cxu)}</td></tr></tbody></table></div>`;
}

const faixaClasse = (dias) => faixaDe(dias).classe;
