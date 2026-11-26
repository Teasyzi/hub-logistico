// KPI Distribuição e Logística: o painel da aba "LOGÍSTICA E DISTRIBUIÇÃO" (ficha AUDITORIA/KPI_Distribuicao_Logistica.md §10).
// Cada célula da planilha tem uma entrada no catálogo (a chave é o endereço: "D7", "N21", "X8"…), com o tipo:
//   'in'   digitado pelo admin (ou importado do KPI antigo);
//   'meta' meta do mês (digitada, importada; sem valor no mês, vale a do mês anterior);
//   'auto' vem dos outros acompanhamentos do Hub (fonte em .fonte), e pode ser digitada por cima;
//   'calc' conta feita aqui, como a planilha (volume por carga, cubagem ÷ 1,66, tendência, % de perdas…).
// O que vale em cada célula: digitado à mão > metas da planilha de perdas > automático do Hub > KPI importado
// > (só metas) mês anterior.

export const UNIDADES_KPI = { NORTE: 'CB Norte', SUL: 'CB Sul', CBAR: 'DL Barreiras', CCRT: 'DL Juazeiro' };
const U4 = ['NORTE', 'SUL', 'CBAR', 'CCRT'];
export const FATOR_CUBOS_KPI = 1.66;
const MES_NOME = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const div = (a, b) => (ehNum(a) && ehNum(b) && b !== 0 ? a / b : null);

// ---------------------------------------------------------------- catálogo
// fmt: 'i' inteiro, 'd1'/'d2' decimais, 'p0'/'p1'/'p2'/'p3' %, 'r2' R$ com centavos (Kardex).
// melhor: 'maior' | 'menor' = farol contra a meta (a célula da meta na mesma linha, coluna .meta), como a
// formatação condicional da planilha. traco: sem valor, aparece "-" (como na planilha); traco '' = texto vazio
// (U26:U29 da planilha, onde o farol trata o texto vazio diferente da célula vazia).
export const CELULAS_KPI = {};
export const BLOCOS_KPI = [];
const cel = (r, x) => { CELULAS_KPI[r] = { r, ...x }; return r; };
const V = (r) => (v) => v(r);

// Fontes do automático (o que .fonte quer dizer).
export const FONTES_KPI = {
  montagem: 'Montagem de Cargas', retorno: 'Retorno por motivo', perdas: 'Perdas de estoque', km: 'KM planejado × realizado',
  '1x1': 'Transportes 1x1', fillrate: 'Fill rate',
};

// Bloco com uma linha por unidade (linha inicial r0). colunas: [{c, h, cel: (u, i, r) => definição | null}].
function blocoU(id, col, tit, r0, us, base, colunas, extra = {}) {
  const linhas = us.map((u, i) => {
    const r = r0 + i;
    return { rot: UNIDADES_KPI[u], u, cels: colunas.map((k) => { const d = k.cel(u, i, r); return d ? cel(`${k.c}${r}`, { u, ...d }) : null; }) };
  });
  BLOCOS_KPI.push({ id, col, tit, base, cab: colunas.map((k) => k.h), linhas, ...extra });
}

// Coluna 1 · DISTRIBUIÇÃO (B:D): só ACM. As médias por carga são contas das linhas de baixo.
blocoU('vol', 1, 'VOLUME MÉDIO POR CARGA - CX. UNIT', 7, U4, 'C', [
  { c: 'D', h: 'ACM', cel: (u, i) => ({ t: 'calc', fmt: 'i', f: (v) => div(v(`D${19 + i}`), v(`D${25 + i}`)) }) }]);
blocoU('ped', 1, 'MÉDIA DE PEDIDOS POR CARGA', 13, U4, 'C', [
  { c: 'D', h: 'ACM', cel: (u, i) => ({ t: 'calc', fmt: 'i', f: (v) => div(v(`D${31 + i}`), v(`D${25 + i}`)) }) }]);
const dlMont = (fonte, campo) => (u) => (u === 'CBAR' || u === 'CCRT' ? { t: 'auto', fonte, campo } : { t: 'in' });
blocoU('volacm', 1, 'VOLUME KO ACUMULADO - CX. UNIT', 19, U4, 'C', [
  { c: 'D', h: 'ACM', cel: (u) => ({ fmt: 'i', ...dlMont('montagem', 'acm')(u) }) }]);
blocoU('cargas', 1, 'CARGAS ACUMULADAS', 25, U4, 'C', [
  { c: 'D', h: 'ACM', cel: (u) => ({ fmt: 'i', ...dlMont('montagem', 'cargas')(u) }) }]);
blocoU('pedidos', 1, 'PEDIDOS ACUMULADOS', 31, U4, 'C', [
  { c: 'D', h: 'ACM', cel: (u) => ({ fmt: 'i', ...dlMont('montagem', 'entregas')(u) }) }]);

// Coluna 2 · DISTRIBUIÇÃO (F:I): META e ACM.
const meta = (fmt) => ({ c: 'H', h: 'META', cel: () => ({ t: 'meta', fmt }) });
blocoU('cub', 2, 'CUBAGEM MÉDIA POR CARGA', 7, U4, 'G', [meta('i'),
  { c: 'I', h: 'ACM', cel: (u, i) => ({ t: 'calc', fmt: 'i', melhor: 'maior', f: (v) => div(v(`D${7 + i}`), FATOR_CUBOS_KPI) }) }]);
blocoU('retvol', 2, 'ÍNDICE DE RETORNO - POR VOLUME / CX. UNIT', 13, U4, 'G', [meta('p2'),
  { c: 'I', h: 'ACM', cel: (u) => ({ t: 'auto', fmt: 'p2', melhor: 'menor', ...(u === 'NORTE' || u === 'SUL' ? { fonte: 'retorno', campo: 'pctSemCanc' } : { fonte: 'montagem', campo: 'ret_vol' }) }) }]);
blocoU('retped', 2, 'ÍNDICE DE RETORNO - POR PEDIDOS', 19, U4, 'G', [meta('p2'),
  { c: 'I', h: 'ACM', cel: (u) => ({ fmt: 'p2', melhor: 'menor', ...dlMont('montagem', 'ret_cli')(u) }) }]);
blocoU('tx', 2, 'PROJETO 1X1 AJUDANTES POR CARGA', 25, U4, 'G', [
  { c: 'H', h: 'META', cel: () => ({ t: 'auto', fmt: 'd2', fonte: '1x1', campo: 'meta' }) },
  { c: 'I', h: 'ACM', cel: () => ({ t: 'auto', fmt: 'd2', melhor: 'menor', fonte: '1x1', campo: 'realizado' }) }]);
blocoU('cash', 2, 'CASHDRIVE E GREENMILE', 31, U4, 'G', [meta('p0'),
  { c: 'I', h: 'ACM', cel: () => ({ t: 'in', fmt: 'p0', melhor: 'maior', traco: true }) }]);

// Coluna 3 · REMESSA E ESTOQUE (K:N).
const metaM = (fmt) => ({ c: 'M', h: 'META', cel: () => ({ t: 'meta', fmt }) });
blocoU('ephora', 3, 'EASY PALLET CAIXAS/MONTADOR/HORA · Operacional', 7, U4, 'L', [metaM('i'),
  { c: 'N', h: 'ACM', cel: () => ({ t: 'in', fmt: 'i', melhor: 'maior' }) }]);
blocoU('epdia', 3, 'EASY PALLET CAIXAS/MONTADOR/DIA · Gerencial', 13, U4, 'L', [metaM('i'),
  { c: 'N', h: 'ACM', cel: () => ({ t: 'in', fmt: 'i', melhor: 'maior' }) }]);
blocoU('perdasrs', 3, 'PERDAS DE ESTOQUE R$', 19, U4, 'L', [metaM('i'),
  { c: 'N', h: 'ACM', cel: (u) => (u === 'NORTE' ? { t: 'calc', fmt: 'i', melhor: 'menor', f: V('X10') }
    : u === 'SUL' ? { t: 'calc', fmt: 'i', melhor: 'menor', f: V('Y10') }
      : { t: 'auto', fmt: 'i', melhor: 'menor', fonte: 'perdas', campo: 'rotaEstoque' }) }]);
blocoU('perdaspct', 3, 'PERDAS DE ESTOQUE %', 25, U4, 'L', [metaM('p3'),
  { c: 'N', h: 'ACM', cel: (u, i) => ({ t: 'calc', fmt: 'p3', melhor: 'menor',
    f: [(v) => div(v('N19'), v('X12')), (v) => div(v('N20'), v('Y12')), (v) => div(v('N21'), v('FAT_CBAR')), (v) => div(v('N22'), v('FAT_CCRT'))][i] }) }]);
blocoU('fill', 3, 'FILL RATE', 31, ['NORTE', 'SUL'], 'L', [metaM('p1'),
  { c: 'N', h: 'ACM', cel: () => ({ t: 'auto', fmt: 'p2', melhor: 'menor', fonte: 'fillrate', campo: 'insuf' }) }]);
// Faturamento ACM dos DLs (aba "Montagem das cargas" D20/I20): base do % de perdas dos DLs. Não aparece no painel.
cel('FAT_CBAR', { t: 'auto', fmt: 'r2', u: 'CBAR', fonte: 'montagem', campo: 'fat_acm', oculta: true });
cel('FAT_CCRT', { t: 'auto', fmt: 'r2', u: 'CCRT', fonte: 'montagem', campo: 'fat_acm', oculta: true });

// Coluna 4 · FROTA/DISTRIBUIÇÃO (P:U).
const metaR = (fmt) => ({ c: 'R', h: 'META', cel: () => ({ t: 'meta', fmt }) });
// Dias da base de cada unidade (Q = úteis, R = trabalhados): DA (32) para Norte e Sul, DL CBAR (33), DL CCRT (34).
const LINHA_DIAS = { NORTE: 32, SUL: 32, CBAR: 33, CCRT: 34 };
const tendencia = (r, ld) => (v) => { const a = v(`S${r}`), q = v(`Q${ld}`), t = v(`R${ld}`); return ehNum(a) && ehNum(q) && ehNum(t) && t !== 0 ? (a / t) * q : null; };
blocoU('trix', 4, 'TRIXLOG', 7, U4, 'Q', [metaR('d1'),
  { c: 'S', h: 'ACM', cel: () => ({ t: 'in', fmt: 'd1', melhor: 'maior' }) }]);
blocoU('km', 4, 'QUILOMETRAGEM', 13, U4, 'Q', [metaR('i'),
  { c: 'S', h: 'ACM', cel: () => ({ t: 'auto', fmt: 'i', fonte: 'km', campo: 'realizado' }) },
  { c: 'T', h: 'TEND.', cel: (u, i, r) => ({ t: 'calc', fmt: 'i', f: tendencia(r, LINHA_DIAS[u]) }) },
  { c: 'U', h: '% VS META', cel: (u, i, r) => ({ t: 'calc', fmt: 'p1', f: (v) => { const x = div(v(`T${r}`), v(`R${r}`)); return x == null ? null : x - 1; } }) }]);
blocoU('kml', 4, 'MÉDIA DE CONSUMO KM/LITRO', 19, U4, 'Q', [metaR('d2'),
  { c: 'S', h: 'ACM', cel: () => ({ t: 'in', fmt: 'd2', melhor: 'maior' }) }]);
blocoU('kmpr', 4, "KM'S PLANEJADO VS REALIZADO", 26, U4, 'Q', [
  { c: 'R', h: 'PLANEJ.', cel: () => ({ t: 'auto', fmt: 'i', fonte: 'km', campo: 'planejado', traco: true }) },
  { c: 'S', h: 'REAL.', cel: () => ({ t: 'auto', fmt: 'i', fonte: 'km', campo: 'realizado', traco: true }) },
  { c: 'T', h: 'DIF KM', cel: (u, i, r) => ({ t: 'calc', fmt: 'i', traco: true, f: (v) => (ehNum(v(`S${r}`)) && ehNum(v(`R${r}`)) ? v(`R${r}`) - v(`S${r}`) : null) }) },   // como a planilha: planejado − realizado
  { c: 'U', h: '%', cel: (u, i, r) => ({ t: 'calc', fmt: 'p1', traco: '', f: (v) => { const x = div(v(`S${r}`), v(`R${r}`)); return x == null ? null : x - 1; } }) }], { cabRot: 'ACUMULADO' });
// BASES: dias úteis, trabalhados e restantes (digitados, inclusive as unidades que a Montagem não cobre).
{
  const linhas = [['DA', 32], ['DL CBAR', 33], ['DL CCRT', 34], ['FROTA OT', 35]].map(([rot, r]) => ({ rot, cels: [
    cel(`Q${r}`, { t: 'in', fmt: 'i' }), cel(`R${r}`, { t: 'in', fmt: 'i' }),
    cel(`S${r}`, { t: 'calc', fmt: 'i', f: (v) => (ehNum(v(`Q${r}`)) && ehNum(v(`R${r}`)) ? v(`Q${r}`) - v(`R${r}`) : null) })] }));
  BLOCOS_KPI.push({ id: 'bases', col: 4, tit: 'BASES', base: 'P', cab: ['D. ÚTEIS', 'TRAB.', 'REST.'], linhas, semBase: true });
}
// Frota OT: TRIXLOG, quilometragem (com tendência pelos dias da FROTA OT) e média.
for (const [id, tit, r0] of [['otjn', 'FROTA OT LOG II - JN', 38], ['otcbar', 'FROTA OT LOG I - CBAR', 43], ['otpux', 'FROTA PUXADA NORTE', 48]]) {
  const linhas = [
    { rot: 'TRIXLOG', cels: [cel(`R${r0}`, { t: 'meta', fmt: 'd1' }), cel(`S${r0}`, { t: 'in', fmt: 'd1', melhor: 'maior' }), cel(`T${r0}`, { t: 'calc', fmt: 'i', traco: true, f: () => null })] },
    { rot: 'Quilometragem', cels: [cel(`R${r0 + 1}`, { t: 'meta', fmt: 'i' }), cel(`S${r0 + 1}`, { t: 'in', fmt: 'i' }), cel(`T${r0 + 1}`, { t: 'calc', fmt: 'i', f: tendencia(r0 + 1, 35) })] },
    { rot: 'Média', cels: [cel(`R${r0 + 2}`, { t: 'meta', fmt: 'd2' }), cel(`S${r0 + 2}`, { t: 'in', fmt: 'd2', melhor: 'maior' }), cel(`T${r0 + 2}`, { t: 'calc', fmt: 'd2', traco: true, f: () => null })] },
  ];
  BLOCOS_KPI.push({ id, col: 4, tit, base: 'Q', cab: ['META', 'ACM', 'TEND.'], linhas });
}
// Frota OT: o farol do TRIXLOG e da média compara com a META da mesma linha (coluna R).
for (const r of [38, 40, 43, 45, 48, 50]) CELULAS_KPI[`S${r}`].meta = `R${r}`;

// Kardex VDER0002 (colunas W:Y, ocultas na planilha): ocorrências 24 e 28 = perdas CB, ocorrência 1 = base do %.
{
  const linhas = [['OCO. 24', 8], ['OCO. 28', 9], ['TOTAL', 10], ['OCO. 1', 12]].map(([rot, r]) => ({ rot, cels: r === 10
    ? [cel('X10', { t: 'calc', fmt: 'r2', f: (v) => (ehNum(v('X8')) || ehNum(v('X9')) ? (v('X8') || 0) + (v('X9') || 0) : null) }),
      cel('Y10', { t: 'calc', fmt: 'r2', f: (v) => (ehNum(v('Y8')) || ehNum(v('Y9')) ? (v('Y8') || 0) + (v('Y9') || 0) : null) })]
    : [cel(`X${r}`, { t: 'in', fmt: 'r2', u: 'NORTE' }), cel(`Y${r}`, { t: 'in', fmt: 'r2', u: 'SUL' })] }));
  BLOCOS_KPI.push({ id: 'kardex', col: 3, tit: 'PARA ATUALIZAR PERDAS DE ESTOQUE CB', base: 'W', cab: ['NORTE', 'SUL'], linhas, kardex: true });
}

// A meta de cada célula com farol é a coluna antes dela na mesma linha (H→I, M→N, R→S).
const ANTES = { I: 'H', N: 'M', S: 'R' };
for (const c of Object.values(CELULAS_KPI)) if (c.melhor && !c.meta) c.meta = `${ANTES[c.r[0]]}${c.r.slice(1)}`;

export const ENTRADAS_KPI = Object.values(CELULAS_KPI).filter((c) => c.t !== 'calc').map((c) => c.r);
// Ordem das contas: as que dependem de outras contas vêm depois (Kardex → perdas R$ → perdas %; volume → cubagem; km → tendência → %).
const ORDEM_CALC = Object.values(CELULAS_KPI).filter((c) => c.t === 'calc').map((c) => c.r)
  .sort((a, b) => peso(a) - peso(b));
function peso(r) {
  if (/^[XY]10$/.test(r)) return 0;
  if (/^N(19|20)$/.test(r)) return 1;
  if (/^D(7|8|9|10|13|14|15|16)$/.test(r) || /^S3[2-5]$/.test(r)) return 1;
  if (/^N2[5-8]$/.test(r) || /^I(7|8|9|10)$/.test(r) || /^T/.test(r)) return 2;
  return 3;
}

// ---------------------------------------------------------------- cálculo do mês
// valores: {ref: número} (o que vale nas células de entrada) → {ref: número | null} com as contas.
export function calcularKPI(valores = {}) {
  const out = {};
  for (const r of ENTRADAS_KPI) out[r] = ehNum(valores[r]) ? valores[r] : null;
  const v = (r) => out[r] ?? null;
  for (const r of ORDEM_CALC) { const x = CELULAS_KPI[r].f(v); out[r] = ehNum(x) ? x : null; }
  return out;
}
// Farol: 'ok' | 'no' | null, como a formatação condicional (igual à meta conta como bom).
export function farolKPI(ref, cc) {
  const c = CELULAS_KPI[ref];
  if (!c?.melhor) return null;
  const a = cc[ref], m = cc[c.meta];
  if (!ehNum(a) || !ehNum(m)) return null;
  return (c.melhor === 'maior' ? a >= m : a <= m) ? 'ok' : 'no';
}
export const temDadosKPI = (valores = {}) => ENTRADAS_KPI.some((r) => CELULAS_KPI[r].t !== 'meta' && ehNum(valores[r]));

// ---------------------------------------------------------------- automático (outros acompanhamentos do Hub)
// fontes: {montagem: {CBAR: resultado, CCRT}, retorno, perdas, km, tx, fillrate} (resultados de cada módulo no mês).
export function autoDoMesKPI({ montagem = {}, retorno = null, perdas = null, km = null, tx = null, fillrate = null } = {}) {
  const pega = {
    montagem: (u, k) => {
      const r = montagem[u];
      if (!(r?.total?.cx_unit > 0)) return null;
      return { acm: r.resumo?.acm, cargas: r.total.cargas || null, entregas: r.total.entregas || null, ret_vol: r.total.ret_vol, ret_cli: r.total.ret_cli, fat_acm: r.resumo?.fat_acm }[k];
    },
    retorno: (u, k) => { const d = retorno?.unidades?.[u]; return d?.temDados ? d.totais?.[k] : null; },
    perdas: (u, k) => { const d = perdas?.dls?.[u]; return d?.temDados ? d.totais?.[k] : null; },
    km: (u, k) => { const d = km?.unidades?.[u]; return d?.temDados && d.totais?.realizado > 0 ? d.totais[k] : null; },
    '1x1': (u, k) => { const d = tx?.unidades?.[u]; return d?.totais?.cargas > 0 ? d.totais[k] : null; },
    fillrate: (u, k) => { const d = fillrate?.unidades?.[u]; return d?.temDados ? d.totais?.[k] : null; },
  };
  const valores = {}, origem = {};
  for (const c of Object.values(CELULAS_KPI)) {
    if (c.t !== 'auto') continue;
    const x = pega[c.fonte](c.u, c.campo);
    if (ehNum(x)) { valores[c.r] = x; origem[c.r] = c.fonte; }
  }
  return { valores, origem };
}

// ---------------------------------------------------------------- o que vale em cada célula
export const ORIGENS_KPI = { manual: 'digitado', metas: 'planilha de metas de perdas', kpi: 'KPI importado', anterior: 'mês anterior' };
const FORCA = { manual: 5, metas: 4, kpi: 2 };
// doc: {valores, origem, auto, autoOrigem}; anterior: {valores} já efetivos do mês anterior (para as metas).
export function efetivoKPI(doc, anterior = null) {
  const valores = {}, origem = {};
  const imp = doc?.valores || {}, oi = doc?.origem || {}, au = doc?.auto || {}, oa = doc?.autoOrigem || {};
  for (const r of ENTRADAS_KPI) {
    let v = null, o = null;
    if ((oi[r] === 'manual' || oi[r] === 'metas') && ehNum(imp[r])) { v = imp[r]; o = oi[r]; }
    else if (ehNum(au[r])) { v = au[r]; o = `hub:${oa[r] || ''}`; }
    else if (ehNum(imp[r])) { v = imp[r]; o = oi[r]; }
    else if (CELULAS_KPI[r].t === 'meta' && ehNum(anterior?.valores?.[r])) { v = anterior.valores[r]; o = 'anterior'; }
    if (v != null) { valores[r] = v; origem[r] = o; }
  }
  return { valores, origem };
}

// Junta importações: entradas [{r, v, origem}]; uma origem mais fraca não troca uma mais forte.
export function aplicarKPI(doc, entradas) {
  const valores = { ...(doc?.valores || {}) }, origem = { ...(doc?.origem || {}) };
  let n = 0, mantidos = 0;
  for (const e of entradas) {
    if (origem[e.r] && FORCA[origem[e.r]] > FORCA[e.origem]) { mantidos++; continue; }
    valores[e.r] = e.v; origem[e.r] = e.origem; n++;
  }
  return { valores, origem, n, mantidos };
}
// Edição à mão: vazio tira o digitado e a célula volta ao que vier do Hub, das importações ou do mês anterior.
export function editarKPI(doc, edicoes) {
  const valores = { ...(doc?.valores || {}) }, origem = { ...(doc?.origem || {}) };
  for (const { r, v } of edicoes) {
    if (v == null) { if (origem[r] === 'manual') { delete valores[r]; delete origem[r]; } continue; }
    valores[r] = v; origem[r] = 'manual';
  }
  return { valores, origem };
}

// ---------------------------------------------------------------- leitura dos arquivos (workbook do SheetJS)
const txt = (v) => String(v ?? '').trim();
const norm = (s) => txt(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const mesDoTexto = (s) => { const t = norm(s); const i = MES_NOME.findIndex((m) => t.includes(m)); return i < 0 ? null : i + 1; };
const mm = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}`;

// KPI antigo (qualquer mês de 2026): todas as células de entrada que têm número. O mês vem do nome do arquivo
// ("KPI Distribuição e Logística - Novembro.xlsx") ou do "FECHAMENTO DE <MÊS>" da aba "Montagem das cargas";
// o ano, do "ATUALIZADO EM: dd/mm/aaaa" dessa aba (ou o ano escolhido).
function lerKPIArquivo(wb, nomeArquivo, anoPadrao) {
  const ws = wb.Sheets['LOGÍSTICA E DISTRIBUIÇÃO'], wm = wb.Sheets['Montagem das cargas'];
  if (norm(ws?.C9?.v) !== 'DL BARREIRAS' || norm(ws?.C10?.v) !== 'DL JUAZEIRO' || !norm(ws?.K18?.v).startsWith('PERDAS DE ESTOQUE'))
    throw new Error('O KPI mudou de layout: esperava "DL Barreiras" em C9, "DL Juazeiro" em C10 e "PERDAS DE ESTOQUE R$" em K18.');
  let mes = mesDoTexto(nomeArquivo.replace(/\.[^.]+$/, '').replace(/^.*KPI/i, '')) || mesDoTexto(wm?.B4?.v);
  const at = txt(wm?.B3?.v).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  let ano = at ? +at[3] - (mes === 12 && +at[2] === 1 ? 1 : 0) : anoPadrao;
  if (!mes) throw new Error('Não achei o mês do KPI no nome do arquivo (ex.: "KPI Distribuição e Logística - Novembro.xlsx").');
  const entradas = [];
  for (const r of ENTRADAS_KPI) {
    if (CELULAS_KPI[r].oculta) continue;
    const v = ws[r]?.v;
    if (ehNum(v)) entradas.push({ r, v, origem: 'kpi' });
  }
  // Faturamento ACM dos DLs, da aba "Montagem das cargas" (D20 Barreiras, I20 Juazeiro), quando ela está lá.
  if (wm && norm(wm.B20?.v).includes('ACM')) {
    if (ehNum(wm.D20?.v)) entradas.push({ r: 'FAT_CBAR', v: wm.D20.v, origem: 'kpi' });
    if (ehNum(wm.I20?.v)) entradas.push({ r: 'FAT_CCRT', v: wm.I20.v, origem: 'kpi' });
  }
  return { tipo: 'KPI Distribuição e Logística', meses: { [mm(ano, mes)]: entradas } };
}

// Planilha de metas de perdas ("Perdas de Estoque 2026.xlsx"): bloco "META <ano>" de cada aba, mês a mês.
//   CB Norte / CB Sul: R$ = linha PERDAS DE ESTOQUE (com vencimentos), % = coluna B da linha OPERACIONAL;
//   CB CBAR / CB CCRT: R$ e % = linha OPERACIONAL. (Como o KPI usa: ficha §10.4.)
const ABAS_METAS = { NORTE: 'Perdas - CB Norte', SUL: 'Perdas - CB Sul', CBAR: 'Perdas - CB CBAR', CCRT: 'Perdas - CB CCRT' };
const LINHA_META_RS = { NORTE: 'M19', SUL: 'M20', CBAR: 'M21', CCRT: 'M22' }, LINHA_META_PCT = { NORTE: 'M25', SUL: 'M26', CBAR: 'M27', CCRT: 'M28' };
const COLS = 'ABCDEFGHIJKLMNOPQ';
function lerMetasPerdas(wb) {
  const meses = {};
  for (const [u, aba] of Object.entries(ABAS_METAS)) {
    const ws = wb.Sheets[aba];
    if (!ws) throw new Error(`Falta a aba "${aba}" na planilha de metas de perdas.`);
    const ref = XLSX.utils.decode_range(ws['!ref']);
    let cab = null;
    for (let r = 1; r <= ref.e.r + 1; r++) if (/^META \d{4}$/.test(norm(ws[`B${r}`]?.v))) cab = r;
    if (!cab) throw new Error(`Não achei o bloco "META <ano>" (coluna B) na aba "${aba}".`);
    const linha = (rot) => { for (let r = cab + 1; r <= cab + 14; r++) if (norm(ws[`A${r}`]?.v) === rot) return r; return null; };
    const lRS = linha(u === 'NORTE' || u === 'SUL' ? 'PERDAS DE ESTOQUE' : 'OPERACIONAL'), lPct = linha('OPERACIONAL');
    if (!lRS || !lPct) throw new Error(`Na aba "${aba}" faltam as linhas OPERACIONAL / PERDAS DE ESTOQUE do bloco de metas.`);
    const pct = ws[`B${lPct}`]?.v;
    for (let c = 2; c <= 13; c++) {
      const serial = ws[`${COLS[c]}${cab}`]?.v;
      if (!ehNum(serial)) continue;
      const d = new Date(Math.round((serial - 25569) * 86400000)), k = mm(d.getUTCFullYear(), d.getUTCMonth() + 1);
      const rs = ws[`${COLS[c]}${lRS}`]?.v;
      const es = (meses[k] ??= []);
      if (ehNum(rs)) es.push({ r: LINHA_META_RS[u], v: rs, origem: 'metas' });
      if (ehNum(pct)) es.push({ r: LINHA_META_PCT[u], v: pct, origem: 'metas' });
    }
  }
  return { tipo: 'Metas de perdas de estoque', meses };
}

export function lerArquivoKPI(wb, nomeArquivo, anoPadrao = new Date().getFullYear()) {
  if (wb.Sheets['LOGÍSTICA E DISTRIBUIÇÃO']) return lerKPIArquivo(wb, nomeArquivo, anoPadrao);
  if (wb.Sheets['Perdas - CB Norte'] && wb.Sheets['Perdas - CB CBAR']) return lerMetasPerdas(wb);
  return { tipo: null, meses: {} };
}
