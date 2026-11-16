// Leitura das planilhas no navegador (SheetJS, global XLSX) — porte de code/hub/importar.py.
// Só números e códigos saem daqui: nomes de clientes e motoristas são descartados.

export function num(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return +v;
  let s = String(v).trim().replace(/ /g, '');
  if (!s) return 0;
  const pct = s.endsWith('%');
  s = s.replace(/%$/, '').trim();
  const neg = s.endsWith('-') || s.startsWith('-');
  s = s.replace(/^-+|-+$/g, '').trim();
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  let x = s ? parseFloat(s) : 0;
  if (Number.isNaN(x)) return 0;
  if (neg) x = -x;
  return pct ? x / 100 : x;
}

export function texto(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isInteger(v)) return String(v);
  return String(v).trim();
}

// serial do Excel (sistema 1900) ou texto dd/mm/aaaa -> 'AAAA-MM-DD'
export function iso(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const m = String(v).trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).slice(0, 10);
  return null;
}

// linhas da aba sempre a partir de A1 (índice 0 = linha 1, coluna A), mesmo se o intervalo usado começar depois
function linhas(ws) {
  if (!ws || !ws['!ref']) return [];
  const r = XLSX.utils.decode_range(ws['!ref']);
  r.s.r = 0; r.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: r });
}

// devolve {cab: [...], dados: [{col: valor}]} a partir da linha que contém `coluna`
function tabela(ws, coluna) {
  const ls = linhas(ws);
  const i = ls.findIndex((l) => l && l.some((v) => v != null && String(v).trim() === coluna));
  if (i < 0) return { cab: [], dados: [] };
  const vistos = {};
  const cab = ls[i].map((v) => {
    const n = v == null ? '' : String(v).trim();
    vistos[n] = (vistos[n] || 0) + 1;
    return vistos[n] === 1 ? n : `${n} #${vistos[n]}`;
  });
  const dados = [];
  for (const l of ls.slice(i + 1)) {
    if (!l || l.every((v) => v == null)) continue;
    const o = {};
    cab.forEach((c, k) => { if (c) o[c] = l[k] ?? null; });
    dados.push(o);
  }
  return { cab, dados };
}

function abaCom(wb, coluna) {
  return wb.SheetNames.find((n) => linhas(wb.Sheets[n]).slice(0, 30)
    .some((l) => l && l.some((v) => v != null && String(v).trim() === coluna)));
}

export function detectar(wb) {
  const abas = new Set(wb.SheetNames);
  if (abas.has('Resumo Geral') && abas.has('Paradas')) return 'resumo';
  if (['RESUMO', 'BARREIRAS', 'JUAZEIRO', 'Venda Barreiras'].every((a) => abas.has(a))) return 'montagem';
  if (abas.has('BARREIRAS') && abas.has('JUAZEIRO') && !abas.has('Venda Barreiras')
      && linhas(wb.Sheets.BARREIRAS).some((l) => l && l.some((v) => String(v ?? '').trim() === 'VOLUME UC TOTAL'))) return 'reprog';
  const aba = abaCom(wb, 'Transporte');
  if (aba) {
    const { cab } = tabela(wb.Sheets[aba], 'Transporte');
    if (cab.includes('Motivo Nome')) return 'retorno';
    if (cab.includes('Taxa Ocupação') && cab.includes('Cxs Unitaria')) return 'venda';
  }
  return null;
}

export function lerVenda(ws) {
  return tabela(ws, 'Transporte').dados.map((x) => ({
    centro: texto(x['Centro']), transporte: texto(x['Transporte']), data: iso(x['Dt Remessa']),
    cxf: num(x['Cxs Fisicas']), cxu: num(x['Cxs Unitaria']), cubos: num(x['Cubos']),
    ocup: num(x['Taxa Ocupação']), clientes: num(x['Total Cliente']),
  })).filter((v) => v.centro && v.transporte && v.data);
}

export function lerRetorno(ws) {
  return tabela(ws, 'Motivo Nome').dados.map((x) => ({
    centro: texto(x['Centro']), transporte: texto(x['Transporte']), tipo: texto(x['Tipo de transporte']),
    data: iso(x['Dt Remessa']), cli: texto(x['Cliente']), mot: texto(x['Motivo Nome']),
    ext: String(x['Retorno'] ?? '').trim().toUpperCase() === 'EXTERNO',
    cxf: num(x['Cxs Fisica)']), cxu: num(x['Cxs Unitarias)']),
  })).filter((r) => r.centro && r.data && r.transporte);
}

// Resumo de Planejamento: linha 7 (rótulos) e 8 (valores salvos — não recalcula a data C8)
export function lerResumo(wb) {
  const ls = linhas(wb.Sheets['Resumo Geral']);
  const i = ls.findIndex((l) => l && String(l[1] ?? '').trim() === 'Unidade');
  const cab = ls[i], val = ls[i + 1];
  const campo = (nome) => { const k = cab.findIndex((c) => String(c ?? '').trim() === nome); return k >= 0 ? val[k] : null; };
  const paradas = tabela(wb.Sheets['Paradas'], 'Carga').dados;
  const soReprog = paradas.filter((p) => String(p['Carga'] ?? '').trim().toUpperCase() === 'REPROG');
  return {
    centro: texto(cab[2]), data: iso(val[2]),
    entregas: num(campo('Entregas Plan')), cargas: num(campo('Cargas')), ocupacao: num(campo('Ocupação')),
    reprog_uc: num(campo('Reprog')), reprog_cli: num(campo('Reprog Cli')), uc_total: num(campo('UC Total')),
    reprog_so_cubos: soReprog.reduce((a, p) => a + num(p['Cubos']), 0), reprog_so_cli: soReprog.length,
  };
}

const ABA_CENTRO = { BARREIRAS: 'CBAR', JUAZEIRO: 'CCRT' };

// Planilha antiga da Montagem (histórico): bases coladas + planejamento digitado + parâmetros do RESUMO
export function lerMontagemLegada(wb) {
  const venda = [...lerVenda(wb.Sheets['Venda Barreiras']), ...lerVenda(wb.Sheets['Venda Juazeiro'])];
  const retorno = [...lerRetorno(wb.Sheets['Retorno Barreiras']), ...lerRetorno(wb.Sheets['Retorno Juazeiro'])];
  const plan = [], meses = new Set();
  for (const [aba, centro] of Object.entries(ABA_CENTRO)) {
    linhas(wb.Sheets[aba]).forEach((v, idx) => {
      const n = idx + 1;  // linha da planilha (a aba começa em A1)
      if (n < 10 || n > 40 || !v || typeof v[1] !== 'number') return;
      const data = iso(v[1]); meses.add(data.slice(0, 7));
      const g = (k) => (typeof v[k] === 'number' ? v[k] : null);
      if (g(3)) plan.push({ centro, data, entregas: g(3), cargas: g(4), ocupacao: g(6), reprog_uc: g(8), reprog_cli: g(9) });
    });
  }
  const mes = [...meses].sort().pop();
  const res = linhas(wb.Sheets.RESUMO);
  const par = { CBAR: {}, CCRT: {} };
  const mapa = { dias_uteis: 5, volume_aa: 10, meta_volume: 11, tarifa: 16, faturamento_aa: 17, meta_faturamento: 18 };
  for (const [centro, col] of [['CBAR', 3], ['CCRT', 8]]) {
    for (const [chave, lin] of Object.entries(mapa)) {
      const v = res[lin - 1]?.[col];
      if (typeof v === 'number') par[centro][chave] = v;
    }
  }
  return { venda, retorno, plan, par, mes };
}

// Reprogramação DL's antiga (histórico): cubos REPROG (C), UC total (D) e clientes REPROG (O) por dia
export function lerReprogLegada(wb) {
  const out = [];
  for (const [aba, centro] of Object.entries(ABA_CENTRO)) {
    linhas(wb.Sheets[aba]).forEach((v, idx) => {
      if (idx + 1 < 7 || !v || typeof v[1] !== 'number') return;
      const g = (k) => (typeof v[k] === 'number' ? v[k] : null);
      if (g(2) == null && g(14) == null) return;
      out.push({ centro, data: iso(v[1]), reprog_so_cubos: g(2) ?? 0, uc_total: g(3), reprog_so_cli: g(14) ?? 0 });
    });
  }
  return out;
}

export async function lerArquivo(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false, cellFormula: false, cellStyles: false });
  const tipo = detectar(wb);
  if (tipo === 'venda') return { tipo, linhas: lerVenda(wb.Sheets[abaCom(wb, 'Transporte')]) };
  if (tipo === 'retorno') return { tipo, linhas: lerRetorno(wb.Sheets[abaCom(wb, 'Transporte')]) };
  if (tipo === 'resumo') return { tipo, plan: lerResumo(wb) };
  if (tipo === 'montagem') return { tipo, ...lerMontagemLegada(wb) };
  if (tipo === 'reprog') return { tipo, reprog: lerReprogLegada(wb) };
  return { tipo: null };
}
