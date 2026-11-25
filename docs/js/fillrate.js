// Fill rate / Insuficiência de estoque (CB Norte e CB Sul): leitura dos arquivos e cálculo puro.
// Regras (AUDITORIA/Fill_Rate_Insuficiencia.md §10–11, decididas em 25/11/2026):
//   - Fonte: o relatório "DA | Categ Prod | Prod Descr | Data | Pedido Entregue | Falta de Estoque" (CX UNIT),
//     uma linha por DA × produto × dia, as duas revendas no mesmo arquivo. Também aceita a planilha antiga
//     "MM - Insuficiência - <Mês>.xlsx" (abas CB NORTE / CB SUL), para trazer o histórico.
//   - Insuficiência % = falta ÷ (entregue + falta); fill rate = 1 − insuficiência. Meta: insuficiência ≤ 2%.
//   - Meta em CX UNIT = 2% do pedido (entregue + falta), na mesma base do %. Acima da meta = falta − meta.
//   - Falta zero num dia é real (havia estoque para tudo o que foi pedido).
export const UNIDADES_FR = { NORTE: 'CB Norte', SUL: 'CB Sul' };
export const META_FR = 0.02;

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const chave = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const texto = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const numero = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim();
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const x = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(x) ? x : 0;
};
const p2 = (n) => String(n).padStart(2, '0');
// Data do relatório: número de série do Excel, Date ou texto dd/mm/aaaa (ou aaaa-mm-dd). Devolve 'AAAA-MM-DD' ou null.
export function dataISO(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(+v)) return `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`;
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${p2(m[2])}-${p2(m[1])}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
const unidadeDA = (v) => { const k = chave(v); return /\bnorte\b/.test(k) ? 'NORTE' : /\bsul\b/.test(k) ? 'SUL' : null; };

// Sempre a partir de A1 (índice 0 = linha 1, coluna A): as abas da planilha começam em B.
function linhas(ws) {
  if (!ws || !ws['!ref']) return [];
  const r = XLSX.utils.decode_range(ws['!ref']);
  r.s.r = 0; r.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: r });
}

// Acha o cabeçalho (relatório: linha 1; planilha: linha 9) e devolve as colunas do bloco "por data e produto".
// Na planilha, "DATA", "PROD DESCR" e "FALTA DE ESTOQUE" se repetem nos quadros por dia e por produto: vale a primeira.
function cabecalho(rows) {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cab = (rows[i] || []).map(chave), col = (...n) => cab.findIndex((c) => n.includes(c));
    const c = { da: col('da'), cat: col('categ prod', 'categoria'), prod: col('prod descr'), data: col('data'), ent: col('pedido entregue'), falta: col('falta de estoque') };
    if (c.prod >= 0 && c.data >= 0 && c.ent >= 0 && c.falta >= 0) return { i, c };
  }
  return null;
}

// Devolve {tipo, meses:{AAAA-MM:{NORTE|SUL:{linhas:[{cat,prod,data,ent,falta}]}}}, ignoradas:[DA], linhas} ou {tipo:null}.
// unidadeFixa: na planilha antiga o DA sai do nome da aba (a coluna DA repete a revenda).
function lerBloco(rows, unidadeFixa, out, ign) {
  const h = cabecalho(rows);
  if (!h) return 0;
  let n = 0;
  for (const l of rows.slice(h.i + 1)) {
    if (!l) continue;
    const prod = texto(l[h.c.prod]), data = dataISO(l[h.c.data]);
    if (!prod || !data) continue;
    const u = unidadeFixa || unidadeDA(l[h.c.da]);
    if (!u) { const da = texto(l[h.c.da]); if (da) ign.add(da); continue; }
    const mes = data.slice(0, 7), dest = ((out[mes] ??= {})[u] ??= { linhas: [] });
    dest.linhas.push({ cat: h.c.cat >= 0 ? texto(l[h.c.cat]) : '', prod, data, ent: numero(l[h.c.ent]), falta: numero(l[h.c.falta]) });
    n++;
  }
  return n;
}

export function lerArquivoFR(wb) {
  const out = {}, ign = new Set();
  let n = 0, tipo = null;
  const abas = [['CB NORTE', 'NORTE'], ['CB SUL', 'SUL']].filter(([a]) => wb.Sheets[a]);
  if (abas.length) {
    for (const [a, u] of abas) n += lerBloco(linhas(wb.Sheets[a]), u, out, ign);
    if (n) tipo = 'planilha de Insuficiência (abas CB NORTE / CB SUL)';
  }
  if (!n) {
    for (const s of wb.SheetNames) { n += lerBloco(linhas(wb.Sheets[s]), null, out, ign); if (n) break; }
    if (n) tipo = 'relatório de insuficiência (DA · Prod Descr · Data · Pedido Entregue · Falta de Estoque)';
  }
  return n ? { tipo, meses: out, ignoradas: [...ign], linhas: n } : { tipo: null, meses: {}, ignoradas: [], linhas: 0 };
}

// Formato compacto para o Firestore (sem arrays aninhados): produtos [{p, c}] e linhas [[iProduto, dia, entregue, falta]].
export function compactar(lista) {
  const idx = new Map(), produtos = [], ls = [];
  for (const x of lista) {
    const k = `${x.prod}\u0000${x.cat}`;
    if (!idx.has(k)) { idx.set(k, produtos.length); produtos.push({ p: x.prod, c: x.cat }); }
    ls.push([idx.get(k), +x.data.slice(8, 10), x.ent, x.falta]);
  }
  return { produtos, linhas: ls };
}
export function descompactar({ produtos = [], linhas: ls = [] }, mes) {
  return ls.map(([i, d, ent, falta]) => ({ prod: produtos[i]?.p ?? '?', cat: produtos[i]?.c ?? '', data: `${mes}-${p2(d)}`, ent, falta }));
}

const insuf = (ent, falta) => (ent + falta > 0 ? falta / (ent + falta) : null);

// Uma unidade no mês: linhas [{cat,prod,data,ent,falta}] → totais, por dia, por produto e detalhe.
export function calcularUnidadeFR(lista = [], { meta = META_FR } = {}) {
  const entregue = lista.reduce((s, x) => s + x.ent, 0), falta = lista.reduce((s, x) => s + x.falta, 0), pedido = entregue + falta;
  const pct = insuf(entregue, falta), metaCx = meta * pedido;
  const porDia = new Map(), porProd = new Map(), repetidas = new Map();
  for (const x of lista) {
    const d = porDia.get(x.data) || { data: x.data, ent: 0, falta: 0, linhas: 0 };
    d.ent += x.ent; d.falta += x.falta; d.linhas++; porDia.set(x.data, d);
    const kp = chave(x.prod), p = porProd.get(kp) || { prod: x.prod, cat: x.cat, ent: 0, falta: 0, dias: 0 };
    p.ent += x.ent; p.falta += x.falta; if (x.falta > 0) p.dias++; porProd.set(kp, p);
    const kr = `${kp}|${x.data}`; repetidas.set(kr, (repetidas.get(kr) || 0) + 1);
  }
  const dias = [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data)).map((d) => ({ ...d, pct: insuf(d.ent, d.falta) }));
  const produtos = [...porProd.values()].map((p) => ({ ...p, pct: insuf(p.ent, p.falta), partFalta: falta ? p.falta / falta : null }))
    .sort((a, b) => b.falta - a.falta || a.prod.localeCompare(b.prod));
  const detalhe = [...lista].sort((a, b) => b.falta - a.falta || a.data.localeCompare(b.data)).map((x) => ({ ...x, pct: insuf(x.ent, x.falta) }));
  const ultimo = dias.at(-1) || null;
  return {
    temDados: lista.length > 0,
    totais: { entregue, falta, pedido, insuf: pct, fillRate: pct == null ? null : 1 - pct, meta, metaCx, acimaMeta: falta - metaCx,
      dentroMeta: pct == null ? null : pct <= meta, linhas: lista.length, dias: dias.length, produtos: produtos.length,
      produtosComFalta: produtos.filter((p) => p.falta > 0).length, diasSemFalta: dias.filter((d) => d.falta === 0).length },
    ultimoDia: ultimo,
    dias, produtos, detalhe,
    repetidas: [...repetidas.values()].filter((n) => n > 1).length,
  };
}

// dados: {NORTE|SUL: {linhas:[...], arquivo}} → {mes, unidades, geral}
export function calcularFR({ mes, dados = {}, meta = META_FR }) {
  const unidades = {};
  for (const [u, nome] of Object.entries(UNIDADES_FR)) {
    const d = dados[u] || {};
    unidades[u] = { unidade: u, nome, mes, arquivo: d.arquivo || null, ...calcularUnidadeFR(d.linhas || [], { meta }) };
  }
  const us = Object.values(unidades).filter((d) => d.temDados);
  const entregue = us.reduce((s, d) => s + d.totais.entregue, 0), falta = us.reduce((s, d) => s + d.totais.falta, 0), pct = insuf(entregue, falta);
  const geral = { entregue, falta, pedido: entregue + falta, insuf: pct, fillRate: pct == null ? null : 1 - pct, meta,
    metaCx: meta * (entregue + falta), acimaMeta: falta - meta * (entregue + falta), dentroMeta: pct == null ? null : pct <= meta };
  return { mes, unidades, geral };
}

// O que os leitores veem: tudo (não há nomes de pessoas), mas com o detalhe compactado para caber no documento.
export function agregadoPublicadoFR(r) {
  return Object.fromEntries(Object.entries(r.unidades).map(([u, d]) => [u, {
    unidade: u, nome: d.nome, mes: d.mes, temDados: d.temDados, totais: d.totais, ultimoDia: d.ultimoDia, dias: d.dias, produtos: d.produtos,
    detalhe: compactar(d.detalhe),
  }]));
}
export function lerAgregadoFR(u, placar) {
  return { ...placar, detalhe: descompactar(placar.detalhe || {}, placar.mes).map((x) => ({ ...x, pct: insuf(x.ent, x.falta) })) };
}
