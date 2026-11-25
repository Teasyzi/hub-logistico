// Renderização. Funções puras: dados -> HTML. Visual inspirado nas planilhas dos acompanhamentos.
import { UNIDADES } from './dados.js?v=20261125-17';
import { faixaDe, DIAS_CRITICO } from './cargas.js?v=20261123-2';
import { buscaIdaVoltaKM, idaDaRota, idaNaRotaKM, nomeMotoristaKM, rotaNaSecao, semAtribuicaoKM, SECOES_PADRAO_KM } from './km.js?v=20261125-17';

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
    ['Perdas de estoque DLs', '#/perdas', 'em validação · Barreiras e Juazeiro'], ['KM planejado × realizado', '#/km', 'em validação · 4 unidades'], ['Retorno por motivo', '#/retorno', 'em validação · 4 unidades'], ['Transportes 1x1', '#/transportes', 'novo · ajudantes por carga · 4 unidades'],
    ['Fill rate · Insuficiência', '#/fillrate', 'novo · CB Norte e CB Sul'], ['Gestão à vista', null, 'planejado'], ['Custos de descarga', null, 'planejado']];
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
${mont('CX UNIT plan', fi(pv?.cx_unit), fi(med.cx_unit))}
${mont('Total cargas', fi(pv?.cargas), fi(t.cargas))}
${mont('Cargas por dia', '–', fd(med.cargas))}
${mont('Tx ocupação', fp(pv?.ocupacao, 1), fp(med.ocupacao, 1), corOcup(pv?.ocupacao), corOcup(med.ocupacao))}
${mont('Volume unit reprog', fi(pv?.reprog_uc), fi(med.reprog_uc))}
${mont('Tx reprog', fp(pv?.tx_reprog, 1), fp(med.tx_reprog, 1))}
${mont('Clientes reprog', fi(pv?.reprog_cli), fd(med.reprog_cli))}
${mont('Cubos por carga', fd(pv?.cubos_carga), fd(med.cubos_carga))}
${mont('CX UNIT por carga', fd(pv?.cx_carga), fd(med.cx_carga))}
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
<tr><th>Vol plan cx fís</th><th>CX UNIT plan</th><th>Cubos</th><th class="sep">Entregas</th><th>Cargas</th><th>Tx ocup.</th><th class="sep">Cubos</th><th>CX UNIT</th><th>Entregas</th><th class="sep">Cubos</th><th>CX UNIT</th></tr></thead>
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
  const tabM = `<div class="tw"><table><thead><tr><th class="t">Motivo (retorno externo)</th><th>CX UNIT</th><th>%</th><th>Clientes</th></tr></thead>
<tbody>${mot.map((x) => `<tr><td class="t">${E(x.motivo)}</td><td>${fd(x.cx)}</td><td>${fp(x.cx / totMot, 1)}</td><td>${fi(x.clientes)}</td></tr>`).join('')}</tbody></table></div>`;

  const folga = (rp.folga_uc ?? 0) >= 0 ? `folga ${fi(rp.folga_uc)} cx` : `acima da meta em ${fi(-rp.folga_uc)} cx`;
  const editar = ctx.admin ? ` <a class="btn sec" href="#/montagem/planejamento/${c}/${m.mes}">✎ Editar planejamento</a>` : '';
  return `${ctx.topo}
<div class="tiles">
 <div class="tile"><div class="l">Volume ACM (CX UNIT)</div><div class="v">${fi(r.acm)}</div><div class="d">meta ${fi(r.meta_volume)}</div></div>
 <div class="tile"><div class="l">Tendência vs meta</div><div class="v ${corSinal(r.tend_vs_meta)}">${fp(r.tend_vs_meta, 1)}</div><div class="d">${fi(r.tendencia)} CX UNIT</div></div>
 <div class="tile"><div class="l">Faturamento ACM</div><div class="v">${fr(r.fat_acm)}</div><div class="d">tendência ${fr(r.fat_tendencia)}</div></div>
 <div class="tile"><div class="l">Tx ocupação média</div><div class="v">${fp(med.ocupacao, 1)}</div><div class="d">${fd(med.cargas)} cargas/dia</div></div>
 <div class="tile"><div class="l">Retorno volume</div><div class="v">${fp(t.ret_vol)}</div><div class="d">${status(t.ret_vol == null ? null : t.ret_vol <= META_PES.ret_vol, 'meta ≤ 1%', 'meta ≤ 1%')}</div></div>
 <div class="tile"><div class="l">% reprog. volume (PES)</div><div class="v">${fp(rp.pct)}</div><div class="d">${status(rp.pct == null ? null : rp.pct <= rp.meta, folga, folga)}</div></div>
</div>
<p class="small">${editar}</p>
<h2>CX UNIT por dia · vendido e retorno</h2><div class="card">${graficoVendidoRetorno(m.dias)}</div>
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
<p class="small">vs meta: ▼ abaixo ou ▲ acima da meta no acumulado do mês, em CX UNIT ou clientes.</p>`;
}

// ---------------------------------------------------------------- KM planejado × realizado
export function abasKM(ativa, mes, admin) {
  const a = [['resumo', 'Resumo', `#/km/resumo/${mes}`], ['NORTE', 'CB NORTE', `#/km/NORTE/${mes}`], ['SUL', 'CB SUL', `#/km/SUL/${mes}`],
    ['CBAR', 'BARREIRAS', `#/km/CBAR/${mes}`], ['CCRT', 'JUAZEIRO', `#/km/CCRT/${mes}`]];
  const adm = admin ? [['importar', 'Importar', '#/km/importar'], ['parametros', 'Parâmetros', `#/km/parametros/${mes}`], ['publicar', 'Publicar', `#/km/publicar/${mes}`], ['exportar', 'Exportar', `#/km/exportar/${mes}`]] : [];
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

// Farol da dispersão: verde quando o realizado fica igual ou abaixo do planejado (foi bem no dia); amarelo até
// a meta acima do planejado (5%); vermelho além disso. Dia planejado sem nenhum abastecimento fica neutro.
export const farolKM = (disp, meta = 0.05) => disp == null ? '' : disp <= 0 ? 'c-ok' : disp <= meta ? 'c-mid' : 'c-no';
const semRealKM = (d) => !!(d && Math.round(d.planejado) && !Math.round(d.realizado));
const fsinal = (x) => x == null ? '–' : `${x > 0 ? '+' : ''}${fi(x)}`;
const fpSinal = (x) => x == null ? '–' : `${x > 0 ? '+' : ''}${fp(x, 1)}`;
const temDadoKM = (d) => d && (Math.round(d.planejado) || Math.round(d.realizado));
const textoNota = (l) => l.tipo === 'obs' ? l.texto : `${l.tipo === 'realizado' ? 'Realizado' : 'Planejado'} de ${fi(l.km)} km: ${fdata(l.de)} → ${l.para?.slice(0, 7) !== l.de?.slice(0, 7) ? `${fdata(l.para)}/${l.para.slice(0, 4)}` : fdata(l.para)}${l.texto ? ` · ${l.texto}` : ''}`;

// Planejado × realizado por dia, lado a lado no mesmo eixo, com a dispersão do dia em cima (cor do farol).
export function graficoKM(dias, meta = 0.05, altura = 270) {
  const pts = dias.filter(temDadoKM);
  if (!pts.length) return '<p class="small">Sem dados no período.</p>';
  const w = 1000, pl = 50, pr = 10, pt = 30, pb = 24, base = altura - pb;
  const topo = Math.max(1, ...pts.map((d) => Math.max(d.planejado, d.realizado))) * 1.15;
  const y = (v) => pt + (base - pt) * (1 - Math.max(v, 0) / topo);
  const band = (w - pl - pr) / pts.length, bw = Math.min(24, (band - 6) / 2);
  const corDisp = { 'c-ok': 'km-ok', 'c-mid': 'km-mid', 'c-no': 'km-no' };
  let s = `<div class="grafico-legenda"><span><i class="km-plan"></i>PLANEJADO (KM)</span><span><i class="km-real"></i>REALIZADO (KM)</span><span>% EM CIMA = DISPERSÃO DO DIA</span></div><svg viewBox="0 0 ${w} ${altura}" width="100%" role="img" aria-label="Km planejado e realizado por dia">`;
  for (let k = 0; k <= 4; k++) {
    const v = (topo * k) / 4, yy = y(v);
    s += `<line x1="${pl}" x2="${w - pr}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}" stroke="var(--grid)"/><text x="${pl - 6}" y="${(yy + 4).toFixed(1)}" text-anchor="end">${fk(v)}</text>`;
  }
  pts.forEach((d, i) => {
    const cx = pl + band * (i + 0.5), dica = `${fdata(d.data)} · planejado ${fi(d.planejado)} · realizado ${fi(d.realizado)} · diferença ${fsinal(d.diferenca)} km`;
    const op = d.acumulado ? ' opacity="0.45"' : '';
    s += `<rect x="${(cx - bw - 1).toFixed(1)}" y="${y(d.planejado).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, base - y(d.planejado)).toFixed(1)}" rx="2" class="km-plan"${op}><title>${dica}</title></rect>`
      + `<rect x="${(cx + 1).toFixed(1)}" y="${y(d.realizado).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, base - y(d.realizado)).toFixed(1)}" rx="2" class="km-real"${op}><title>${dica}</title></rect>`
      + `<text class="val ${semRealKM(d) || d.parcial ? '' : corDisp[farolKM(d.dispersao, meta)] || ''}" x="${cx.toFixed(1)}" y="${(y(Math.max(d.planejado, d.realizado)) - 6).toFixed(1)}" text-anchor="middle">${d.parcial ? 'parcial' : d.dispersao == null ? 's/ plan.' : semRealKM(d) ? 's/ real.' : fpSinal(d.dispersao)}</text>`
      + `<text x="${cx.toFixed(1)}" y="${altura - 7}" text-anchor="middle">${fdata(d.data)}</text>`;
  });
  return s + `<line x1="${pl}" x2="${w - pr}" y1="${base}" y2="${base}" stroke="var(--axis)"/></svg>`;
}

const legendaFarolKM = (meta) => `<div class="legenda"><span><i class="c-ok"></i>realizado igual ou abaixo do planejado</span><span><i class="c-mid"></i>até ${fp(meta, 0)} acima</span><span><i class="c-no"></i>mais de ${fp(meta, 0)} acima</span><span>dispersão = realizado ÷ planejado − 1 · "sem real." = dia planejado sem abastecimento lançado</span></div>`;

function avisosRevisaoKM(c, u, mes) {
  const r = u.revisao || {}, itens = [];
  const semTab = r.semTabela ? `<div class="aviso"><b>A tabela de ida e volta desta unidade está vazia</b>, por isso a ida e volta está zerada em todas as rotas. Importe a planilha "KM Planejado x Realizado" de um mês fechado em <a href="#/km/parametros/${mes}">⚙ Parâmetros</a>. Ela vale para todos os meses.</div>` : '';
  if (r.freteirosPendentes) itens.push(`${fi(r.freteirosPendentes)} rota(s) de FRETEIRO contando no planejado (${fi(r.kmFreteirosPendentes)} km)`);
  if (r.duplicadas) itens.push(`${fi(r.duplicadas)} rota(s) duplicada(s) fora do cálculo`);
  if (r.equipamentos || r.abastecimentosFora) itens.push(`equipamentos fora do cálculo: ${fi(r.equipamentos || 0)} rota(s) no planejado (${fi(r.kmEquipamentos || 0)} km) e ${fi(r.abastecimentosFora || 0)} abastecimento(s) do veículo 272 no realizado (${fi(r.kmRealizadoFora || 0)} km)`);
  if (r.semBase) itens.push(`${fi(r.semBase)} rota(s) de motorista cadastrado sem base (ida e volta zerada)`);
  if (r.idaNaRota) itens.push(`${fi(r.idaNaRota)} rota(s) com km que já parece incluir a ida e volta da base (filtro "Km da rota já inclui a ida e volta?")`);
  const semCad = (r.semCadastro || []).length ? `<div class="aviso"><b>${fi(r.semCadastro.length)} motorista(s) sem cadastro</b>, com a ida e volta zerada: ${r.semCadastro.map((x) => `${E(x.nome)} (${fi(x.rotas)} rota${x.rotas > 1 ? 's' : ''})`).join(', ')}. Se for motorista novo, inclua o nome completo e a base; se for outro nome de um motorista que já existe, inclua em Apelidos. <a href="#/km/parametros/${mes}">⚙ Parâmetros →</a></div>` : '';
  return semTab + semCad + (itens.length ? `<div class="aviso">${itens.join(' · ')}. <a href="#/km/${c}/${mes}">Revisar rotas →</a></div>` : '');
}

function cardUnidadeKM(c, u, { mes, admin }) {
  if (!u.temDados) return `<section class="bloco"><div class="faixa">${E(u.nome)}</div><div class="corpo"><div class="aviso">Sem dados de KM em ${nomeMes(mes)}.</div>${admin ? '<a class="btn sec" href="#/km/importar">Importar arquivos</a>' : ''}</div></section>`;
  const t = u.totais;
  return `<section class="bloco km-card"><div class="faixa">${E(u.nome)} <a class="btn sec" href="#/km/${c}/${mes}">Detalhe →</a></div><div class="corpo">
<div class="km-disp ${farolKM(t.dispersao, t.meta)}"><div class="l">Dispersão do mês</div><div class="v">${fpSinal(t.dispersao)}</div><div class="d">${t.dispersao == null ? '' : t.dispersao <= 0 ? 'realizado abaixo do planejado' : t.dentroMeta ? `acima do planejado, dentro de +${fp(t.meta, 0)}` : `acima da meta de +${fp(t.meta, 0)}`}</div></div>
<table class="kv km-kv"><tbody><tr><td>Planejado até ${u.ultimoDia ? fdata(u.ultimoDia) : '–'}</td><td>${fi(t.planejado)} km</td></tr><tr><td>Realizado</td><td>${fi(t.realizado)} km</td></tr><tr class="dest"><td>Diferença</td><td>${fsinal(t.diferenca)} km</td></tr><tr><td>Custo da dispersão</td><td>${fr(t.custo)}</td></tr></tbody></table>
${admin ? avisosRevisaoKM(c, u, mes) : ''}</div></section>`;
}

export function paginaKMResumo(resultado, { mes, admin, topo }) {
  const unidades = Object.entries(resultado.unidades);
  const meta = unidades.find(([, u]) => u.totais)?.[1].totais.meta || 0.05;
  const porData = Object.fromEntries(unidades.map(([c, u]) => [c, Object.fromEntries((u.dias || []).map((d) => [d.data, d]))]));
  const datas = [...new Set(unidades.flatMap(([, u]) => (u.dias || []).filter(temDadoKM).map((d) => d.data)))].sort();
  const cel = (d, m) => {
    if (!temDadoKM(d)) return '<td class="km-cel vazio">–</td>';
    const dica = `Planejado ${fi(d.planejado)} · Realizado ${fi(d.realizado)} · Diferença ${fsinal(d.diferenca)} km${d.ajustado ? ' · dia com km remanejado' : ''}`;
    if (d.parcial && Math.round(d.realizado)) return `<td class="km-cel pv" title="${E(dica)} · dia da extração da listagem: realizado ainda incompleto, fora do acumulado">${fi(d.planejado)}<span>realizado parcial</span></td>`;
    if (d.acumulado) return `<td class="km-cel pv" title="${E(dica)} · depois do último abastecimento lançado">${fi(d.planejado)}<span>planejado, sem realizado</span></td>`;
    if (!Math.round(d.planejado)) return `<td class="km-cel c-mid" title="${E(dica)}">sem plan.<span>${fsinal(d.realizado)} km</span></td>`;
    if (semRealKM(d)) return `<td class="km-cel" title="${E(dica)} · nenhum abastecimento lançado no dia">sem real.<span>${fi(d.planejado)} km plan.</span></td>`;
    return `<td class="km-cel ${farolKM(d.dispersao, m)}" title="${E(dica)}">${fpSinal(d.dispersao)}${d.ajustado ? ' ↔' : ''}<span>${fsinal(d.diferenca)} km</span></td>`;
  };
  const matriz = datas.length ? `<h2>Dispersão por dia</h2><p class="small">Cada célula mostra a dispersão do dia e, embaixo, a diferença em km (realizado − planejado). Passe o mouse para ver planejado e realizado. Clique no nome da unidade para abrir as rotas.</p>
<div class="tw scroll"><table class="km-farol"><thead><tr><th class="t">Dia</th>${unidades.map(([c, u]) => `<th><a href="#/km/${c}/${mes}">${E(u.nome)}</a></th>`).join('')}</tr></thead><tbody>
${datas.map((data) => `<tr><td class="t">${fdata(data)}</td>${unidades.map(([c, u]) => cel(porData[c][data], u.totais?.meta || meta)).join('')}</tr>`).join('')}
<tr class="tot"><td class="t">MÊS</td>${unidades.map(([, u]) => u.temDados ? `<td class="km-cel ${farolKM(u.totais.dispersao, u.totais.meta)}">${fpSinal(u.totais.dispersao)}<span>${fsinal(u.totais.diferenca)} km</span></td>` : '<td class="km-cel vazio">–</td>').join('')}</tr></tbody></table></div>
${legendaFarolKM(meta)}<p class="small">↔ dia com km remanejado à mão. Em amarelo-claro: dias que ficam fora do acumulado: o dia de hoje (ou o dia em que a listagem de abastecimentos foi tirada), com o realizado ainda incompleto, e os dias depois do último abastecimento lançado.</p>` : '';
  return `${topo}<div class="g2 km-cards">${unidades.map(([c, u]) => cardUnidadeKM(c, u, { mes, admin })).join('')}</div>${matriz}`;
}

// Página da unidade: indicadores, gráfico, tabela do dia (rotas + ida e volta = planejado) e, para o admin,
// as rotas de cada dia com motorista, placa e km editáveis, os lançamentos manuais e o resumo por motorista.
export function paginaKMUnidade(c, u, { mes, topo, admin, extras = '' }) {
  const t = u.totais;
  const dias = u.dias.filter((d) => temDadoKM(d) || d.notas?.length || d.ajustado);
  const notas = (d) => (d.notas || []).map(textoNota);
  const linhas = dias.map((d) => {
    const ns = notas(d), dica = ns.length ? ns.join('\n') : '';
    return `<tr class="${d.acumulado ? 'pv' : ''}" data-dia="${d.data}"><td class="t">${admin ? `<button type="button" class="lnk ver-dia" data-dia="${d.data}" title="Ver as rotas do dia">${fdata(d.data)}</button>` : fdata(d.data)}${d.acumulado ? (d.parcial ? ' <span class="tag" title="Realizado ainda incompleto: fica fora do acumulado">parcial</span>' : ' *') : ''}</td>
<td>${d.rotas == null ? '–' : fi(d.rotas)}</td><td>${d.kmRotas == null ? '–' : fi(d.kmRotas)}</td><td>${d.idaVolta == null ? '–' : fi(d.idaVolta)}</td>
<td class="km-plan-c">${fi(d.planejado)}</td><td class="km-real-c">${fi(d.realizado)}</td><td>${fsinal(d.diferenca)}</td>
<td class="${d.acumulado || semRealKM(d) ? '' : farolKM(d.dispersao, t.meta)}">${d.parcial ? 'parcial' : d.dispersao == null ? (Math.round(d.realizado) ? 'sem plan.' : '–') : semRealKM(d) ? 'sem real.' : fpSinal(d.dispersao)}</td>
<td class="t">${ns.length || d.ajustado ? `<span class="nota" title="${E(dica || 'Dia com km remanejado')}">✎${ns.length > 1 ? ns.length : ''}</span>` : ''}</td></tr>`;
  }).join('');
  const tabela = `<div class="tw scroll"><table class="diario km km-dia"><thead><tr><th class="t">Dia</th><th>Rotas</th><th>Km das rotas</th><th>Ida e volta</th><th>Planejado</th><th>Realizado</th><th>Diferença</th><th>Dispersão</th><th class="t">Obs.</th></tr></thead>
<tbody>${linhas || '<tr><td class="t" colspan="9">Sem dados neste mês.</td></tr>'}<tr class="tot"><td class="t">ACUMULADO</td><td></td><td></td><td></td><td>${fi(t.planejado)}</td><td>${fi(t.realizado)}</td><td>${fsinal(t.diferenca)}</td><td class="${farolKM(t.dispersao, t.meta)}">${fpSinal(t.dispersao)}</td><td></td></tr></tbody></table></div>
<p class="small">Planejado = km das rotas + ida e volta (uma por motorista no dia). * Depois do último abastecimento lançado: fica fora do acumulado. <b>parcial</b> = dia de hoje ou dia em que a listagem de abastecimentos foi tirada: o realizado ainda está incompleto e o dia fica fora do acumulado e das porcentagens. ✎ = observação ou km remanejado (passe o mouse). CPK usado no custo: ${fr(t.cpk)}/km.</p>`;
  return `${topo}
<div class="tiles"><div class="tile"><div class="l">Planejado até ${u.ultimoDia ? fdata(u.ultimoDia) : '–'}</div><div class="v">${fi(t.planejado)} km</div></div><div class="tile"><div class="l">Realizado</div><div class="v">${fi(t.realizado)} km</div></div><div class="tile"><div class="l">Diferença</div><div class="v">${fsinal(t.diferenca)} km</div></div><div class="tile km-disp ${farolKM(t.dispersao, t.meta)}"><div class="l">Dispersão</div><div class="v">${fpSinal(t.dispersao)}</div><div class="d">meta: até +${fp(t.meta, 0)}</div></div><div class="tile"><div class="l">Custo da dispersão</div><div class="v">${fr(t.custo)}</div></div></div>
${admin ? avisosRevisaoKM(c, u, mes).replace(/ <a [^>]*>Revisar rotas →<\/a>/, ' Veja em "Rotas do dia", abaixo.') : ''}
<section class="bloco"><div class="faixa">Planejado × realizado por dia</div><div class="corpo">${graficoKM(u.dias, t.meta)}${legendaFarolKM(t.meta)}</div></section>
<h2>Relatório diário</h2>${tabela}${extras}`;
}

// Lançamentos manuais: mover km de um dia para outro (ou para o mês seguinte) e observações.
export function blocoLancamentosKM(lancamentos, { mes }) {
  const [a, m] = mes.split('-').map(Number), fim = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const prox = new Date(Date.UTC(a, m + 1, 0)).toISOString().slice(0, 10);
  const tipo = { realizado: 'Mover realizado', planejado: 'Mover planejado', obs: 'Observação' };
  const linhas = lancamentos.map((l, i) => `<tr${l.doMesAnterior ? ' class="pv"' : ''}><td class="t">${E(tipo[l.tipo] || l.tipo)}${l.doMesAnterior ? ' (veio do mês anterior)' : ''}</td><td>${l.de ? fdata(l.de) : '–'}</td><td>${l.para ? (l.para.slice(0, 7) === mes ? fdata(l.para) : `${fdata(l.para)}/${l.para.slice(0, 4)}`) : '–'}</td><td>${l.tipo === 'obs' ? '–' : fi(l.km)}</td><td class="t">${E(l.texto || '')}</td><td>${l.doMesAnterior ? '' : `<button type="button" class="btn sec rem-lanc" data-i="${i}">Remover</button>`}</td></tr>`).join('');
  return `<section class="bloco" id="lancamentos"><div class="faixa">Remanejamentos e observações</div><div class="corpo">
<p class="small">Use para levar km de um dia para outro, por exemplo o realizado de um dia sem planejado para o dia seguinte. No fechamento, use para mandar o planejado de uma rota que virou o mês para o mês seguinte (escolha uma data do outro mês em "Para"). A observação sozinha funciona como um comentário no dia.</p>
<div class="tw"><table class="km-lanc"><thead><tr><th class="t">Tipo</th><th>De</th><th>Para</th><th>Km</th><th class="t">Observação</th><th></th></tr></thead><tbody>${linhas || '<tr><td class="t" colspan="6">Nenhum lançamento neste mês.</td></tr>'}
<tr class="novo"><td class="t"><select id="lTipo"><option value="realizado">Mover realizado</option><option value="planejado">Mover planejado</option><option value="obs">Observação</option></select></td>
<td><input type="date" id="lDe" min="${mes}-01" max="${fim}"></td><td><input type="date" id="lPara" min="${mes}-01" max="${prox}"></td><td><input type="text" id="lKm" placeholder="km"></td><td class="t"><input type="text" id="lTexto" placeholder="motivo ou comentário"></td><td><button type="button" class="btn" id="addLanc">Adicionar</button></td></tr></tbody></table></div>
<p><span id="msgLanc"></span></p></div></section>`;
}

// Revisão das rotas (só admin): seção, motorista, ida e volta, duplicadas e exclusão. Filtros no navegador.
const SECOES_MONTAGEM = ['ROTAS DO DIA', 'RECARGAS NA BASE', 'CARGAS CROSS', 'FINALIZANDO ROTAS', 'SAÍDA PARA OUTRO DIA'];
export function tabelaRotasKM(unidade, { rotas, secoes, parametros, abastecimentos = [] }, { duplicadas = [], espelhos = {}, equipamentos = {}, diaInicial = 'todos' } = {}) {
  const fret = (r) => /FRETEIRO/i.test(`${r.categoria || ''} ${r.motorista || ''}`);
  const comPlaca = ['NORTE', 'SUL'].includes(unidade), dups = new Set(duplicadas);
  const busca = buscaIdaVoltaKM(parametros), ativas = secoes || SECOES_PADRAO_KM;
  const temSecao = rotas.some((r) => r.secao), comIda = unidade !== 'CCRT';
  const secoesPresentes = SECOES_MONTAGEM.filter((s) => rotas.some((r) => r.secao === s));
  const foraSecao = (r) => !rotaNaSecao(r, ativas);
  const conta = (r) => !r.excluida && !foraSecao(r) && !dups.has(r.chave) && !espelhos[r.chave] && !equipamentos[r.chave];
  const marcaIda = (r) => comIda && conta(r) && idaNaRotaKM(r, busca);
  const idaTxt = (r) => { const i = idaDaRota({ ...r, idaManual: null }, busca); return { auto: i.valor, origem: i.origem }; };
  // Embaixo do motorista: a base do cadastro, ou o aviso de que ele não está cadastrado.
  const celNome = (r) => {
    if (!r.motorista || busca.vazia || semAtribuicaoKM(r.motorista)) return '';
    const m = busca.resolver(r.motorista);
    if (!m.cadastrado) return '<div class="small"><span class="st no">sem cadastro</span></div>';
    return `<div class="small">${m.base ? `base ${E(m.base)}` : '<span class="st no">sem base</span>'}</div>`;
  };
  // Sempre o nome completo do cadastro (o nome da montagem só fica quando não há cadastro).
  const nomeDe = (motorista) => nomeMotoristaKM({ motorista }, busca);
  const nomes = [...new Set([...busca.nomes, ...rotas.map((r) => nomeDe(r.motorista)).filter((n) => n && !semAtribuicaoKM(n))])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const motoristasRotas = [...new Set(rotas.map((r) => nomeDe(r.motorista)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const abast = new Map();
  for (const a of abastecimentos) { const k = `${a.data}|${String(a.placa || '').toUpperCase()}`; abast.set(k, (abast.get(k) || 0) + (Number(a.km) || 0)); }
  const vistos = new Set();
  const realPlaca = (r) => { const k = `${r.data}|${String(r.placa || '').toUpperCase()}`; if (!r.placa || vistos.has(k)) return ''; vistos.add(k); return abast.has(k) ? fi(abast.get(k)) : '0'; };
  const grupos = (r) => [fret(r) || /FRETEIRO/i.test(r.motoristaOriginal || '') ? 'freteiro' : '', r.ajustada || r.excluida ? 'ajustadas' : '', r.excluida ? 'excluidas' : '',
    dups.has(r.chave) || r.manter ? 'duplicada' : '', espelhos[r.chave] ? 'espelho' : '', equipamentos[r.chave] ? 'equipamento' : '', marcaIda(r) ? 'idanarota' : '', comIda && ['sem cadastro', 'sem base'].includes(idaTxt(r).origem) ? 'semtabela' : '', r.idaManual != null ? 'idamanual' : ''].filter(Boolean).join(' ');
  const etiqueta = (r) => r.excluida ? '<span class="st no">excluída</span>' : equipamentos[r.chave] ? `<span class="tag" title="Rota de equipamentos (descrição com EQUIPAMENTO ou veículo 272): fica fora do planejado.">${E(equipamentos[r.chave])} · não conta</span>` : espelhos[r.chave] ? `<span class="tag" title="A mesma rota (placa, descrição e km) está em ROTAS DO DIA de ${fdata(espelhos[r.chave])}. Só aquela conta.">repete ${fdata(espelhos[r.chave])} · não conta</span>` : foraSecao(r) ? '<span class="tag">seção fora do planejado</span>'
    : dups.has(r.chave) ? `<label class="chk" title="Rota repetida no mesmo dia (mesma placa, rota e km). Marque para contar mesmo assim."><span class="st no">duplicada</span><input type="checkbox" class="man"> manter</label>`
    : r.manter ? '<label class="chk"><span class="tag">repetida, mantida</span><input type="checkbox" class="man" checked> manter</label>'
    : fret(r) ? '<span class="badge">FRETEIRO · revisar</span>'
    : r.motorista !== r.motoristaOriginal ? '<span class="st ok">motorista trocado</span>' : /GENERICO|EXTRA/i.test(`${r.categoria || ''} ${r.motorista || ''}`) ? '<span class="tag">sem atribuição</span>' : '';
  const celIda = (r) => { const { auto, origem } = idaTxt(r);
    return `<td><input type="text" class="ida" value="${r.idaManual == null ? '' : E(String(r.idaManual))}" placeholder="${E(fd(auto, 0))}" title="Automático: ${E(fd(auto, 0))} km (${E(origem)}). Deixe vazio para usar o automático; 0 quando o motorista saiu da unidade." aria-label="Ida e volta">${marcaIda(r) ? `<div class="small"><span class="tag" title="O km da rota (${E(fd(r.km, 0))}) já chega a 85% da ida e volta da base (${E(fd(auto, 0))}): talvez a montagem já conte a viagem desde o CD. Digite 0 para zerar ou o próprio valor para manter.">km já inclui?</span></div>` : ''}</td>`; };
  const linhas = rotas.map((r) => `<tr class="${r.excluida || foraSecao(r) || dups.has(r.chave) || espelhos[r.chave] || equipamentos[r.chave] ? 'exc' : ''}" data-chave="${E(r.chave)}" data-padrao="${E(nomeDe(r.motoristaOriginal))}" data-troca="${E(r.motorista !== r.motoristaOriginal ? r.motorista || '' : '')}" data-mot="${E(nomeDe(r.motorista))}" data-grupos="${grupos(r)}" data-secao="${E(r.secao || '')}" data-dia="${r.data}"${diaInicial !== 'todos' && r.data !== diaInicial ? ' hidden' : ''}>
<td class="t">${fdata(r.data)}</td>${temSecao ? `<td class="t">${E(r.secao || '–')}</td>` : ''}<td class="t">${E(r.carga || '–')}</td><td class="t">${E(r.area || '–')}</td>${comPlaca ? `<td class="t">${E(r.placa || '–')}</td>` : ''}
<td class="t"><input type="text" class="mot" list="nomesKM" value="${E(nomeDe(r.motorista))}" aria-label="Motorista">${comIda ? celNome(r) : ''}</td>
<td>${fd(r.km, 1)}</td>${comIda ? celIda(r) : ''}${comPlaca ? `<td>${realPlaca(r)}</td>` : ''}<td>${etiqueta(r)}</td><td><input type="checkbox" class="exc" ${r.excluida ? 'checked' : ''} aria-label="Excluir rota"></td></tr>`).join('');
  const nCols = 6 + (temSecao ? 1 : 0) + (comPlaca ? 2 : 0) + (comIda ? 1 : 0);
  const caixaSecoes = temSecao ? `<p class="secoes-km"><b>Seções que entram no planejado:</b> ${secoesPresentes.map((s) => `<label class="chk"><input type="checkbox" class="secao" value="${E(s)}" ${ativas.includes(s) ? 'checked' : ''}> ${E(s)} (${fi(rotas.filter((r) => r.secao === s).length)})</label>`).join(' ')}</p>` : '';
  const diasRotas = [...new Set(rotas.map((r) => r.data))].sort();
  const opcDia = `<option value="todos">Todos os dias</option>${diasRotas.map((d) => `<option value="${d}" ${d === diaInicial ? 'selected' : ''}>${fdata(d)}</option>`).join('')}`;
  const opc = [['todas', 'Todas as rotas'], ['freteiro', 'Só FRETEIRO'], ['duplicada', 'Duplicadas'], ['espelho', 'Repetidas de outro dia (saída para / finalizando)'], ['equipamento', 'Equipamentos / veículo 272'], ...(comIda ? [['semtabela', 'Motorista sem cadastro ou sem base'], ['idanarota', 'Km da rota já inclui a ida e volta?'], ['idamanual', 'Ida e volta ajustada']] : []), ['ajustadas', 'Ajustadas ou excluídas'], ['excluidas', 'Só excluídas']]
    .map(([k, t]) => `<option value="${k}">${t}</option>`).join('');
  return `<section class="bloco" id="rotas"><div class="faixa">Rotas do dia</div><div class="corpo">
<p class="small">Troque o motorista quando a rota veio com o nome errado (ex.: FRETEIRO que foi um motorista da casa) e marque <b>Excluir</b> nas rotas que não entram.${comIda ? ' Na <b>Ida e volta</b>, o valor em cinza é o automático (base do motorista no cadastro); digite <b>0</b> quando o motorista veio buscar a carga na unidade.' : ''} Rotas repetidas saem sozinhas: no mesmo dia ficam como <b>duplicada</b>; a cópia em "SAÍDA PARA" ou "FINALIZANDO" de uma rota que está em "ROTAS DO DIA" do dia vizinho fica como <b>repete dd/mm</b>. Rotas de equipamentos (descrição com EQUIPAMENTO ou veículo 272) também saem sozinhas, e os abastecimentos do 272 ficam fora do realizado. Os ajustes continuam valendo depois de reimportar o dia.</p>
${caixaSecoes}
<p class="filtros-km"><label>Dia <select id="diaRotas">${opcDia}</select></label> <label>Motorista <select id="motRotas"><option value="">Todos</option>${motoristasRotas.map((n) => `<option value="${E(n)}">${E(n)}</option>`).join('')}</select></label> <label>Mostrar <select id="filtroRotas">${opc}</select></label> <button class="btn sec" id="marcarFret" type="button">Marcar as de FRETEIRO para excluir</button></p>
<datalist id="nomesKM">${nomes.map((n) => `<option value="${E(n)}">`).join('')}</datalist>
<div class="tw scroll"><table class="km-rotas"><thead><tr><th class="t">Dia</th>${temSecao ? '<th class="t">Seção</th>' : ''}<th class="t">Carga</th><th class="t">Rota / área</th>${comPlaca ? '<th class="t">Placa</th>' : ''}<th class="t">Motorista</th><th>Km rota</th>${comIda ? '<th>Ida e volta</th>' : ''}${comPlaca ? '<th title="Soma dos abastecimentos da placa no dia">Abastecido (km)</th>' : ''}<th>Situação</th><th>Excluir</th></tr></thead>
<tbody>${linhas || `<tr><td class="t" colspan="${nCols}">Nenhuma rota importada neste mês.</td></tr>`}</tbody></table></div>
<p><button class="btn" id="salvarRotas">Salvar ajustes das rotas</button> <span id="msg"></span></p>
<p class="small">O motorista aparece sempre com o nome completo do cadastro. Passe o mouse sobre a ida e volta para ver de onde veio o valor automático. <b>km já inclui?</b> marca a rota cujo km chega a 85% da ida e volta da base: confira se a montagem já conta a viagem desde o CD e, se for o caso, digite 0.</p></div></section>`;
}

export function blocoMotoristasKM(u) {
  const ls = u.motoristas || [];
  const rows = ls.map((x) => x.semRota
    ? `<tr class="pv"><td class="t">${E(x.motorista)}</td><td class="t" title="${E(x.placas)}">${fi(x.placas.split(', ').length)} placa(s)</td><td>–</td><td>–</td><td>–</td><td>–</td><td>–</td><td>${fi(x.realizado)}</td><td>–</td><td>–</td></tr>`
    : `<tr><td class="t">${x.motorista === 'Sem identificação' ? E(x.motorista) : `<button type="button" class="lnk ver-mot" data-mot="${E(x.motorista)}" title="Ver as rotas do motorista">${E(x.motorista)}</button>`}${x.semCadastro ? ' <span class="st no">sem cadastro</span>' : ''}</td><td class="t">${E(x.placas || '–')}</td><td>${fi(x.dias)}</td><td>${fi(x.rotas)}</td><td>${fi(x.kmRotas)}</td><td>${fi(x.idaVolta)}</td><td>${fi(x.planejado)}</td><td>${fi(x.realizado)}</td><td>${fsinal(x.realizado - x.planejado)}</td><td class="${farolKM(x.dispersao, u.totais.meta)}">${fpSinal(x.dispersao)}</td></tr>`).join('');
  return `<section class="bloco"><div class="faixa">Por motorista · mês</div><div class="corpo"><div class="tw scroll"><table class="km-mot"><thead><tr><th class="t">Motorista</th><th class="t">Placas</th><th>Dias</th><th>Rotas</th><th>Km das rotas</th><th>Ida e volta</th><th>Planejado</th><th>Realizado</th><th>Diferença</th><th>Dispersão</th></tr></thead><tbody>${rows || '<tr><td colspan="10" class="t">Sem rotas neste mês.</td></tr>'}</tbody></table></div>
<p class="small">O abastecimento cobre os km rodados desde o abastecimento anterior, por isso o realizado não é casado dia a dia. O realizado do mês de cada placa é dividido entre os motoristas que rodaram com ela, na proporção do km planejado de cada um. Só entram dias até o último abastecimento lançado, sem o dia parcial. Clique no nome para ver as rotas do motorista. "Placas sem rota no mês" são abastecimentos de placas que não aparecem em nenhuma rota (passe o mouse para ver quais).</p></div></section>`;
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
 <div class="tile"><div class="l">Críticas · ${DIAS_CRITICO}+ dias</div><div class="v ${cr.qtd ? 't-down' : 't-up'}">${fi(cr.qtd)}</div><div class="d">${cr.qtd ? `${fi(cr.cxu)} CX UNIT · limite: ${DIAS_CRITICO + 1} dias` : `nenhuma venda com ${DIAS_CRITICO} dias ou mais`}</div></div>
 <div class="tile"><div class="l">Vendas em aberto</div><div class="v">${fi(r.qtd)}</div><div class="d">${fi(r.clientes)} clientes</div></div>
 <div class="tile"><div class="l">CX UNIT em aberto</div><div class="v">${fi(r.cxu)}</div><div class="d">sem acerto no ERP</div></div>
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
<tr>${rs.map(() => '<th>Vendas</th><th>CX UNIT</th>').join('')}</tr></thead><tbody>${linhas}
<tr class="tot"><td class="t">TOTAL</td>${rs.map(([, r]) => `<td>${fi(r.qtd)}</td><td>${fi(r.cxu)}</td>`).join('')}</tr></tbody></table></div>`;
  const blocos = rs.map(([c, r]) => `<section class="bloco"><div class="faixa">${E(r.nome)} <a class="btn sec" href="#/cargas/${c}/${data}">Lista de clientes →</a></div><div class="corpo">
${tilesCargas(r)}<h3>CX UNIT em aberto por data de emissão</h3>${r.porEmissao.length ? graficoCargas(r) : '<p class="small">Nenhuma venda em aberto.</p>'}</div></section>`).join('');
  return `${topo}<p class="sub">Vendas emitidas e ainda não acertadas no ERP, extraídas da Consulta BI em ${fdataAno(data)}${res.emissaoDe ? ` · emissões de ${fdata(res.emissaoDe)} a ${fdata(res.emissaoAte)}` : ''}.</p>
<div class="tiles"><div class="tile"><div class="l">Críticas · ${DIAS_CRITICO}+ dias · total</div><div class="v ${total.criticas ? 't-down' : 't-up'}">${fi(total.criticas)}</div></div><div class="tile"><div class="l">Vendas em aberto · total</div><div class="v">${fi(total.qtd)}</div></div><div class="tile"><div class="l">CX UNIT em aberto · total</div><div class="v">${fi(total.cxu)}</div></div></div>
<h2>Por faixa de dias em aberto</h2>${tabela}${notaFaixas}<div class="g2">${blocos}</div>`;
}

export function paginaCargasRevenda(r, { data, topo, admin }) {
  const linhas = r.lista.map((l) => `<tr><td class="t">${E(l.cli)}</td>${admin ? `<td class="t">${E(l.nome || '')}</td>` : ''}<td>${fdataAno(l.emissao)}</td><td class="${faixaClasse(l.dias)}">${fi(l.dias)}</td><td>${fi(l.cxu)}</td></tr>`).join('');
  return `${topo}<p><a href="#/cargas/resumo/${data}">← Resumo</a></p>${tilesCargas(r)}
<h2>CX UNIT em aberto por data de emissão</h2><div class="card">${r.porEmissao.length ? graficoCargas(r) : '<p class="small">Nenhuma venda em aberto.</p>'}</div>
<h2>Vendas em aberto · da mais antiga para a mais recente</h2>${notaFaixas}
<div class="tw scroll"><table><thead><tr><th class="t">Cliente (código)</th>${admin ? '<th class="t">Razão social</th>' : ''}<th>Emissão</th><th>Dias em aberto</th><th>CX UNIT</th></tr></thead>
<tbody>${linhas || `<tr><td class="t small" colspan="${admin ? 5 : 4}">Nenhuma venda em aberto.</td></tr>`}
<tr class="tot"><td class="t">TOTAL</td>${admin ? '<td></td>' : ''}<td></td><td></td><td>${fi(r.cxu)}</td></tr></tbody></table></div>`;
}

const faixaClasse = (dias) => faixaDe(dias).classe;
