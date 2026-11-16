// Renderização. Funções puras: dados -> HTML. Visual inspirado nas planilhas dos acompanhamentos.
import { UNIDADES } from './dados.js';

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
  const adm = admin ? [['importar', 'Importar', '#/montagem/importar'], ['parametros', 'Parâmetros', `#/montagem/parametros/${mes}`], ['publicar', 'Publicar', `#/montagem/publicar/${mes}`]] : [];
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
      + `<text x="${w - pr}" y="${(y(meta) - 5).toFixed(1)}" text-anchor="end" style="fill:var(--ink2);font-weight:600">${E(rotulo)} ${fmt(meta)}</text>`;
  }
  return s + '</svg>';
}

// ---------------------------------------------------------------- painel principal (só admin)
export function painelPrincipal() {
  const acomp = [['Montagem de cargas (DLs)', '#/montagem', 'ativo · Barreiras e Juazeiro'], ['KPI Distribuição e Logística', null, 'próxima fase'],
    ['PES Logístico', '#/pes', 'ativo · placar mensal dos DLs'], ['Cargas em aberto', null, 'planejado'], ['Montadores', null, 'planejado'],
    ['Perdas de estoque', null, 'planejado'], ['KM planejado × realizado', null, 'planejado'], ['Retorno por motivo', null, 'planejado'],
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
<div class="tw"><table class="kv"><tr><th colspan="2">VOLUME (cx unit)</th></tr>
${linha('Volume AA', fi(r.volume_aa))}${linha('Meta', fi(r.meta_volume))}${linha('Dia anterior (pré-venda)', fi(r.dia_anterior))}
${linha('ACM mês', fi(r.acm), 'dest')}${linha('Tendência vs meta', tend(fi(r.tendencia), r.tend_vs_meta), 'dest')}</table></div>
<div class="tw"><table class="kv"><tr><th colspan="2">FATURAMENTO (tarifa ${fd(r.tarifa, 2)})</th></tr>
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
  return `${ctx.topo}<div class="g2">${Object.keys(UNIDADES).map((c) => blocoDL(c, ms[c], ctx)).join('')}</div>${legenda()}`;
}

// ---------------------------------------------------------------- Montagem: detalhe diário da DL
export function paginaDetalhe(c, m, mot, ctx) {
  const r = m.resumo, t = m.total, med = m.media, rp = m.reprog, corS = cor(c);
  const metaDia = r.meta_volume && r.dias_uteis ? r.meta_volume / r.dias_uteis : null;
  const dias = m.dias.filter((d) => d.cx_unit || d.entregas);
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

  // B) reprogramação: montagem (todas as categorias) e PES (só REPROG)
  const lb = (d, k, rot, x = {}) => `<tr class="${k}"><td>${rot ?? dia(d)}</td><td>${fi(d.reprog_uc)}</td><td>${fi(d.reprog_cli)}</td><td>${fp(d.tx_reprog, 1)}</td>
<td class="sep">${fd(x.rp_cubos ?? d.rp_cubos)}</td><td>${fi(x.rp_uc_total ?? d.rp_uc_total)}</td><td>${fd(x.rp_reprog ?? d.rp_reprog)}</td>
<td class="${corMeta(x.pct ?? d.rp_pct, META_PES.reprog_vol)}">${fp(x.pct ?? d.rp_pct)}</td><td>${fi(x.rp_cli ?? d.rp_cli)}</td>
<td class="${corMeta(x.pct_cli ?? d.rp_pct_cli, META_PES.reprog_cli)}">${fp(x.pct_cli ?? d.rp_pct_cli)}</td></tr>`;
  const tabB = `<div class="tw"><table class="diario"><thead><tr><th rowspan="2" class="t">Dia</th><th colspan="3" class="grp">Montagem (REPROG + AGEND + PERNOITE)</th><th colspan="6" class="grp">Reprogramação DL's / PES (só REPROG) — meta ≤ ${fp(rp.meta, 0)}</th></tr>
<tr><th>Vol reprog</th><th>Cli reprog</th><th>Tx reprog</th><th class="sep">Cubos</th><th>UC total</th><th>Reprog (cx)</th><th>% vol.</th><th>Clientes</th><th>% cli.</th></tr></thead>
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
<h2>Cx unit por dia</h2><div class="card">${grafico(m.dias, 'cx_unit', corS, metaDia, 'meta diária')}</div>
<h2>Volume e montagem</h2>${tabA}
<h2>Reprogramação</h2>${tabB}
<h2>Retorno</h2><div class="card">${grafico(m.dias, 'ret_vol', corS, META_PES.ret_vol, 'meta PES', (v) => fp(v, 1), (v) => fp(v, 1))}</div>
<div class="g2" style="margin-top:14px">${tabC}${tabM}</div>${legenda()}`;
}

// ---------------------------------------------------------------- PES Logístico
export function abasPES(ativa, mes, admin) {
  const a = [['resumo', 'Placar', `#/pes/resumo/${mes}`]];
  const adm = admin ? [['digitacao', 'Digitação', `#/pes/digitacao/${mes}`], ['publicar', 'Publicar', `#/pes/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

const REGRA = { '<=': '≤', '>=': '≥', '=': '=' };
const valPES = (l, x) => (x == null ? '–' : l.pct ? fp(x, 2) : fd(x, Number.isInteger(x) ? 0 : 1));
const metaPES = (l) => `${REGRA[l.regra]} ${l.pct ? fp(l.meta, 0) : fi(l.meta)}`;
function faltaPES(l) {
  if (l.falta == null) return '';
  const n = l.faltaUn === 'clientes' ? fd(l.falta, 1) : fi(l.falta);
  return l.falta >= 0 ? `<span class="t-up">cabem ${n} ${l.faltaUn}</span>` : `<span class="t-down">estourou ${n.replace('-', '')} ${l.faltaUn}</span>`;
}

function blocoPES(c, pl, mes, admin) {
  if (!pl) return `<div class="bloco"><div class="faixa">${ROTULO[c]}</div><div class="corpo small">Placar de ${nomeMes(mes)} ainda não publicado.</div></div>`;
  const semMont = pl.linhas.filter((l) => l.auto).every((l) => l.real == null);
  const linhas = pl.linhas.map((l) => `<tr><td class="t">${E(l.nome)}${l.auto ? '' : ' <span class="tag">digitado</span>'}</td><td>${metaPES(l)}</td>
<td class="${l.bateu == null ? '' : l.bateu ? 'c-ok' : 'c-no'}">${valPES(l, l.real)}</td><td>${status(l.bateu, 'bateu', 'não bateu')}</td>
<td>${fi(l.possiveis)}</td><td><b>${fi(l.feitos)}</b></td><td>${l.solar == null ? '' : fi(l.solar)}</td><td class="t small">${faltaPES(l)}</td></tr>`).join('');
  const t = pl.total;
  return `<div class="bloco"><div class="faixa"><span>${ROTULO[c]}</span><span>${fi(t.feitos)} / ${fi(t.possiveis)} pts</span></div><div class="corpo">
${semMont ? `<div class="aviso">Sem dados da Montagem em ${nomeMes(mes)}: os 4 indicadores automáticos ficam sem dado.</div>` : ''}
${admin && pl.linhas.some((l) => !l.auto && l.real == null) ? `<div class="aviso">Há indicadores digitados em branco. <a href="#/pes/digitacao/${mes}">Preencher</a></div>` : ''}
<div class="tw"><table><thead><tr><th class="t">Indicador</th><th>Meta</th><th>Real</th><th>Status</th><th>Pontos possíveis</th><th>Pontos feitos</th><th>SOLAR</th><th class="t">Quanto falta</th></tr></thead>
<tbody>${linhas}<tr class="tot"><td class="t">TOTAL</td><td></td><td></td><td></td><td>${fi(t.possiveis)}</td><td>${fi(t.feitos)}</td><td>${t.solar == null ? '' : fi(t.solar)}</td><td></td></tr></tbody></table></div>
</div></div>`;
}

// placares: {CBAR: placar|null, CCRT: placar|null}
export function paginaPES(placares, { mes, admin, topo }) {
  return `${topo}<p class="sub">Programa de Excelência Solar — resultados logísticos. Ponto cheio só se bater a meta. Os 4 percentuais de retorno e reprogramação vêm da Montagem de Cargas do mês; os demais são digitados.</p>
<div class="g2">${Object.keys(UNIDADES).map((c) => blocoPES(c, placares[c], mes, admin)).join('')}</div>
<p class="small">Quanto falta: folga até a meta no acumulado do mês (cx unit ou clientes). "Estourou" = já passou da meta.</p>`;
}
