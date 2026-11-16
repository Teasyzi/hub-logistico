// Indicadores da Montagem de Cargas e Reprogramação DL's.
// Porte fiel de code/hub/montagem.py (validado contra as planilhas jan–nov/2026).
// Entradas em memória:
//   venda:   [{transporte, data, cxf, cxu}]
//   retorno: [{transporte, tipo, data, cli, mot, ext, cxf, cxu}]  (na ordem do arquivo)
//   plan:    {data: {entregas, cargas, ocupacao, reprog_uc, reprog_cli, uc_total, reprog_so_cubos, reprog_so_cli, origem}}
//   par:     {dias_uteis, dias_trabalhados, volume_aa, meta_volume, tarifa, faturamento_aa, meta_faturamento, meta_reprog}
//   prevendaData: 'AAAA-MM-DD' do último Resumo do centro

export const FATOR_CUBO = 1.6;
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export const div = (a, b) => (b ? a / b : null);
const media = (xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

export function diasDoMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  const n = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
}

export function calcular({ mes, venda, retorno, plan, par, prevendaData }) {
  const V = {}, R = {};
  for (const v of venda) {
    if (!v.data.startsWith(mes)) continue;
    const x = (V[v.data] ??= { cxf: 0, cxu: 0 });
    x.cxf += v.cxf || 0; x.cxu += v.cxu || 0;
  }
  // [S] da planilha: transportes distintos do dia cujo 1º registro de retorno é EXTERNO
  const primeiro = {}, transpDia = {}, cliExt = {};
  for (const r of retorno) {
    if (!(r.transporte in primeiro)) primeiro[r.transporte] = r.ext;
    if (!r.data.startsWith(mes)) continue;
    const x = (R[r.data] ??= { cxf: 0, cxu: 0, ext_u: 0 });
    x.cxf += r.cxf || 0; x.cxu += r.cxu || 0; if (r.ext) x.ext_u += r.cxu || 0;
    (transpDia[r.data] ??= new Set()).add(`${r.transporte}|${r.tipo}`);
    if (r.ext) (cliExt[r.data] ??= new Set()).add(`${r.transporte}|${r.cli}`);
  }
  const sCont = {};
  for (const [d, ts] of Object.entries(transpDia)) {
    sCont[d] = [...ts].filter((k) => primeiro[k.split('|')[0]]).length;
  }

  const dias = diasDoMes(mes).map((k) => {
    const v = V[k] || { cxf: 0, cxu: 0 }, rt = R[k] || { cxf: 0, cxu: 0, ext_u: 0 }, p = plan[k] || {};
    const C = v.cxf - rt.cxf, H = v.cxu - rt.cxu;
    const D = p.entregas ?? null, E = p.cargas ?? null, G = p.ocupacao ?? null;
    const I = p.reprog_uc ?? null, J = p.reprog_cli ?? null;
    const F = H / FATOR_CUBO, tem = C !== 0;
    const d = {
      data: k, dia_semana: DIAS_SEMANA[new Date(k + 'T12:00:00Z').getUTCDay()],
      vol_cxf: C, entregas: D, cargas: E, cubos: F, ocupacao: G, cx_unit: H, reprog_uc: I, reprog_cli: J,
      tx_reprog: I != null ? div(I, H) : null,
      cubos_carga: tem ? div(F, E) : null, cx_carga: tem ? div(H, E) : null,
      entregas_carga: tem && D ? div(D, E) : null,
      drop_cubos: tem ? div(F, D) : null, drop_cx: tem ? div(H, D) : null,
      ret_vol: v.cxu ? div(rt.ext_u, v.cxu) : null,
      ret_cli: D ? div(sCont[k] || 0, D) : null,
      ret_cli_clientes: D ? div((cliExt[k]?.size) || 0, D) : null,
      origem_plan: p.origem || null,
      rp_cubos: p.reprog_so_cubos ?? null, rp_uc_total: p.uc_total ?? null,
      rp_reprog: p.reprog_so_cubos != null ? p.reprog_so_cubos * FATOR_CUBO : null,
      rp_cli: p.reprog_so_cli ?? null,
    };
    d.rp_pct = d.rp_reprog != null && d.rp_uc_total ? div(d.rp_reprog, d.rp_uc_total) : null;
    d.rp_pct_cli = d.rp_cli != null && D ? div(d.rp_cli, D) : null;
    return d;
  });

  const soma = (c) => dias.reduce((a, x) => a + (x[c] || 0), 0);
  // [RESUMO D6] = COUNTIF(D10:D40,">0") - 1  (o -1 tira o dia da pré-venda)
  const comEntrega = dias.filter((x) => (x.entregas || 0) > 0).length;
  const diasTrab = par.dias_trabalhados != null ? Math.trunc(par.dias_trabalhados) : Math.max(comEntrega - 1, 0);
  const diasUteis = par.dias_uteis ?? null;
  const CAMPOS = ['vol_cxf', 'entregas', 'cargas', 'cubos', 'cx_unit', 'reprog_uc', 'reprog_cli'];
  const total = Object.fromEntries(CAMPOS.map((c) => [c, soma(c)]));
  const vendaU = Object.values(V).reduce((a, x) => a + x.cxu, 0);
  total.venda_cxu = vendaU;
  total.ret_ext_cxu = Object.values(R).reduce((a, x) => a + x.ext_u, 0);
  total.ret_vol = div(total.ret_ext_cxu, vendaU);
  total.ret_cli = div(Object.values(sCont).reduce((a, b) => a + b, 0), total.entregas);
  total.ret_cli_clientes = div(Object.values(cliExt).reduce((a, s) => a + s.size, 0), total.entregas);
  const med = Object.fromEntries(CAMPOS.map((c) => [c, div(total[c], diasTrab)]));
  med.ocupacao = media(dias.map((x) => x.ocupacao));
  med.tx_reprog = med.cx_unit ? div(med.reprog_uc || 0, med.cx_unit) : null;
  med.cubos_carga = med.cubos ? div(med.cubos, med.cargas) : null;
  med.cx_carga = med.cx_unit ? div(med.cx_unit, med.cargas) : null;
  med.entregas_carga = med.entregas ? div(med.entregas, med.cargas) : null;
  med.drop_cubos = med.cubos ? div(med.cubos, med.entregas) : null;
  med.drop_cx = med.cx_unit ? div(med.cx_unit, med.entregas) : null;
  med.ret_vol = media(dias.map((x) => x.ret_vol));
  med.ret_cli = media(dias.map((x) => x.ret_cli));

  const prevenda = dias.find((x) => x.data === prevendaData) || null;
  const tarifa = par.tarifa ?? null, metaV = par.meta_volume ?? null, metaF = par.meta_faturamento ?? null;
  const acm = total.cx_unit;
  const tend = diasTrab && diasUteis ? (acm / diasTrab) * diasUteis : null;
  const fatAcm = tarifa ? acm * tarifa : null;
  const fatTend = fatAcm && diasTrab && diasUteis ? (fatAcm / diasTrab) * diasUteis : null;
  const resumo = {
    dias_uteis: diasUteis, dias_trabalhados: diasTrab, dias_restantes: diasUteis != null ? diasUteis - diasTrab : null,
    volume_aa: par.volume_aa ?? null, meta_volume: metaV,
    dia_anterior: prevenda ? prevenda.cx_unit : null, acm, tendencia: tend,
    tend_vs_meta: tend && metaV ? tend / metaV - 1 : null,
    tarifa, faturamento_aa: par.faturamento_aa ?? null, meta_faturamento: metaF,
    fat_dia_anterior: prevenda && tarifa ? prevenda.cx_unit * tarifa : null,
    fat_acm: fatAcm, fat_tendencia: fatTend, fat_tend_vs_meta: fatTend && metaF ? fatTend / metaF - 1 : null,
  };
  const rp = {};
  for (const c of ['rp_cubos', 'rp_uc_total', 'rp_reprog', 'rp_cli']) rp[c] = soma(c);
  rp.entregas = total.entregas;
  rp.pct = div(rp.rp_reprog, rp.rp_uc_total);
  rp.pct_cli = div(rp.rp_cli, rp.entregas);
  rp.meta = par.meta_reprog ?? 0.03;
  rp.meta_uc = rp.meta ? rp.rp_uc_total * rp.meta : null;
  rp.folga_uc = rp.meta_uc != null ? rp.meta_uc - rp.rp_reprog : null;
  return { mes, dias, total, media: med, resumo, prevenda, reprog: rp };
}

// Pareto de motivos de retorno externo do mês (cx unit e clientes)
export function motivos(retorno, mes, limite = 12) {
  const m = {};
  for (const r of retorno) {
    if (!r.ext || !r.data.startsWith(mes)) continue;
    const x = (m[r.mot || '(sem motivo)'] ??= { motivo: r.mot || '(sem motivo)', cx: 0, cli: new Set() });
    x.cx += r.cxu || 0; x.cli.add(`${r.transporte}|${r.cli}`);
  }
  return Object.values(m).map((x) => ({ motivo: x.motivo, cx: x.cx, clientes: x.cli.size }))
    .sort((a, b) => b.cx - a.cx).slice(0, limite);
}
