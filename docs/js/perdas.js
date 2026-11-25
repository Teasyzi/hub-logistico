// Perdas de estoque dos DLs (Barreiras e Juazeiro): leitura dos relatórios do SAP e cálculo puro.
// Regras (AUDITORIA/Perdas_de_Estoque_DLs.md §11), iguais nos dois DLs:
//   - MB59: 551 = ESTOQUE; 928 = ROTA; 928 com referência de transferência/transporte = TRANSPORTE; outro = VERIFICAR.
//   - CX UNIT do MB59 (quantidade em UN) = qtd × Fat.Conv2 ÷ Qtd/Un.
//   - CX UNIT do inventário (diferença em CX, caixa física) = qtd × Fat.Conv2. A planilha antiga usava o Qtd/Un
//     (o PROCV pegava a coluna errada) e o resultado saía em unidades.
//   - Perda = −valor do SAP: perda fica positiva; sobra de inventário fica negativa.
//   - % do KPI = perdas de rota + estoque (R$) ÷ faturamento acumulado do mês (não a tendência).
export const DLS_PERDAS = { CBAR: 'DL Barreiras', CCRT: 'DL Juazeiro' };
export const MOTIVOS_PERDAS = ['INVENTARIO', 'ROTA', 'ESTOQUE', 'TRANSPORTE'];
export const ROTULO_MOTIVO = { INVENTARIO: 'Inventário', ROTA: 'Rota', ESTOQUE: 'Estoque', TRANSPORTE: 'Transporte', VERIFICAR: 'Verificar' };

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const txt = (v) => (v == null ? '' : typeof v === 'number' && Number.isInteger(v) ? String(v) : String(v).trim());
// Número do SAP: 1.234,56 · 1234.56 · 96- (sinal no fim) · número já convertido.
export function numSAP(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim();
  if (!s) return 0;
  const neg = /-$/.test(s) || /^-/.test(s);
  s = s.replace(/-/g, '').replace(/R\$\s*/i, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const x = Number(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(x) ? (neg ? -x : x) : 0;
}
// Data do SAP: número de série do Excel, Date, dd.mm.aaaa ou dd/mm/aaaa.
export function dataSAP(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v > 20000 && v < 80000 ? new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10) : null;
  if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const m = String(v).trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const iso = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}
const linhas = (ws) => XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
const centroDL = (v) => { const s = txt(v).toUpperCase(); return s === 'CBAR' || s === 'CCRT' ? s : null; };

// Acha a linha de cabeçalho que tem todos os testes; devolve {i, col(teste)}.
function cabecalho(rows, obrig) {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const c = (rows[i] || []).map(norm);
    if (obrig.every((re) => c.some((x) => re.test(x)))) return { i, col: (...res) => c.findIndex((x) => res.some((re) => re.test(x))) };
  }
  return null;
}

// MB59 (movimentos de material): o mesmo layout em Barreiras (.XLSX) e Juazeiro (.xls), e na aba Relatório da planilha.
export function lerMB59(rows) {
  const h = cabecalho(rows, [/^tipo de movimento$/, /^montante em mi$/]);
  if (!h) return null;
  const c = { centro: h.col(/^centro$/), lanc: h.col(/^data de lancamento$/), doc: h.col(/^data do documento$/), mat: h.col(/^material$/),
    texto: h.col(/^texto breve material$/), tipo: h.col(/^tipo de movimento$/), qtd: h.col(/^qtd um registro$/, /^quantidade$/),
    um: h.col(/^um registro$/), ref: h.col(/^referencia$/), valor: h.col(/^montante em mi$/), dep: h.col(/^deposito$/) };
  const out = [];
  for (const r of rows.slice(h.i + 1)) {
    if (!r) continue;
    const tipo = Number(txt(r[c.tipo])), centro = centroDL(r[c.centro]), data = dataSAP(r[c.lanc]) || dataSAP(r[c.doc]);
    if (!tipo || !centro || !data) continue;
    out.push({ centro, data, mat: txt(r[c.mat]), texto: txt(r[c.texto]), tipo, qtd: numSAP(r[c.qtd]), um: txt(r[c.um]).toUpperCase() || 'UN',
      ref: txt(r[c.ref]), valor: numSAP(r[c.valor]), dep: c.dep >= 0 ? txt(r[c.dep]) : '' });
  }
  return out;
}

// Diferenças de inventário. Dois layouts do SAP: "Documento inventário … Valor diferença pos./neg." (Barreiras)
// e "Doc.inv. … Dif.pos./Dif.neg." (Juazeiro). A diferença vem em CX (UM básica).
export function lerInventario(rows) {
  const h = cabecalho(rows, [/^material$/, /^qtd diferenca$|^qtd difer$/, /^valor diferenca pos$|^dif pos$/]);
  if (!h) return null;
  const c = { doc: h.col(/^documento inventario$|^doc inv$/), mat: h.col(/^material$/), texto: h.col(/^texto breve material$/), centro: h.col(/^centro$|^cen$/),
    qtd: h.col(/^qtd diferenca$|^qtd difer$/), um: h.col(/^um basica$|^umb$/), pos: h.col(/^valor diferenca pos$|^dif pos$/), neg: h.col(/^valor diferenca neg$|^dif neg$/) };
  const out = [];
  for (const r of rows.slice(h.i + 1)) {
    if (!r || !txt(r[c.mat])) continue;
    const centro = centroDL(r[c.centro]);
    if (!centro) continue;
    out.push({ centro, doc: txt(r[c.doc]), mat: txt(r[c.mat]), texto: txt(r[c.texto]), qtd: numSAP(r[c.qtd]), um: txt(r[c.um]).toUpperCase() || 'CX',
      valor: numSAP(r[c.pos]) + numSAP(r[c.neg]) });
  }
  return out;
}

// De-para de produtos (aba "base" da planilha): COD SOLAR → COD CB e COD CB → descrição, categoria, Qtd/Un, Fat.Conv2.
export function lerBaseProdutos(rows) {
  const h = cabecalho(rows, [/^cod solar$/, /^cod cb$/, /^reduzido$/, /^fat conv2$/]);
  if (!h) return null;
  const c = { sol: h.col(/^cod solar$/), cb: h.col(/^cod cb$/), red: h.col(/^reduzido$/), desc: h.col(/^descricao$/), cat: h.col(/^categoria$/), qtd: h.col(/^qtd un$/), fc: h.col(/^fat conv2$/) };
  // Código repetido: vale a primeira linha, como o PROCV da planilha.
  const solar = {}, produtos = {};
  for (const r of rows.slice(h.i + 1)) {
    if (!r) continue;
    if (txt(r[c.sol]) && txt(r[c.cb]) && !(txt(r[c.sol]) in solar)) solar[txt(r[c.sol])] = txt(r[c.cb]);
    // Fat.Conv2 0 vale (ex.: GÁS CARBÔNICO): entra no R$ e na categoria, sem CX UNIT.
    if (txt(r[c.red]) && (numSAP(r[c.fc]) || txt(r[c.cat])) && !(txt(r[c.red]) in produtos)) produtos[txt(r[c.red])] = { d: txt(r[c.desc]), c: txt(r[c.cat]).toUpperCase(), q: numSAP(r[c.qtd]) || 1, f: numSAP(r[c.fc]) };
  }
  return { solar, produtos };
}

// Base de referência de produtos (PRODUTOS.xlsx, cadastro geral da distribuidora): Reduzido, Descricao, Categoria
// ("01-SSD"), Un, Qtd/Un, Fat.Conv2. Não tem todos os produtos e não entra na conta: serve só para sugerir o produto
// provável de um material sem cadastro, que fica em observação até o admin confirmar.
const CATEGORIAS_FORA_REFERENCIA = /^(80|81|82|83|84|85|30)-/; // material de expediente, limpeza, manutenção, EPI, óleo, gás de empilhadeira, caminhão
export function lerReferenciaProdutos(rows) {
  const h = cabecalho(rows, [/^reduzido$/, /^descricao$/, /^qtd un$/, /^fat conv2$/]);
  if (!h || h.col(/^cod solar$/) >= 0) return null;
  // O "Reduzido" da base é o material do SAP (casou com 630 de 646 materiais dos cadastros de nov/26).
  const c = { red: h.col(/^reduzido$/), desc: h.col(/^descricao$/), cat: h.col(/^categoria$/), un: h.col(/^un$/), qtd: h.col(/^qtd un$/), fc: h.col(/^fat conv2$/), ativo: h.col(/^ativo$/) };
  const itens = {};
  for (const r of rows.slice(h.i + 1)) {
    const k = txt(r?.[c.red]), cat = txt(r?.[c.cat]);
    if (!k || CATEGORIAS_FORA_REFERENCIA.test(cat) || k in itens) continue;
    itens[k] = [txt(r[c.desc]), cat.replace(/^\d+\s*-\s*/, '').toUpperCase(), numSAP(r[c.qtd]) || 1, numSAP(r[c.fc]), txt(r[c.un]).toUpperCase(), c.ativo >= 0 ? (numSAP(r[c.ativo]) ? 1 : 0) : 1];
  }
  return itens;
}
// Produto provável na base de referência: pelo material do SAP e, se não achar, pelo COD CB.
export function sugestaoProduto(referencia, mat, cb = null) {
  const x = referencia?.[txt(mat)] || (cb != null ? referencia?.[txt(cb)] : null);
  return x ? { d: x[0], c: x[1], q: x[2], f: x[3], un: x[4], ativo: x[5] } : null;
}
// Materiais do cadastro do DL cujo Qtd/Un ou Fat.Conv2 não bate com a base de referência (para conferir).
export function comparaReferencia(base = {}, referencia = {}) {
  const out = [];
  for (const [mat, cb] of Object.entries(base.solar || {})) {
    const p = base.produtos?.[cb], r = sugestaoProduto(referencia, mat, cb);
    if (p && r && r.f > 0 && (Math.abs(p.f - r.f) > 0.0005 || p.q !== r.q)) out.push({ mat, descricao: p.d, cadastro: `Qtd/Un ${p.q} · Fat.Conv2 ${p.f}`, referencia: `Qtd/Un ${r.q} · Fat.Conv2 ${r.f} (${r.d})` });
  }
  return out;
}

// Lê um arquivo de Perdas: MB59, inventário, ou a planilha antiga "Perdas de Estoque - <DL>.xlsx" (que traz os três
// e o volume do DL digitado na aba Relatório). Devolve {tipo, movimentos, inventario, base, volume, mes}.
export function lerPlanilhaPerdas(wb, nomeArquivo = '') {
  const res = { movimentos: [], inventario: [], base: null, volume: null, mes: null };
  for (const nome of wb.SheetNames) {
    const rows = linhas(wb.Sheets[nome]);
    const ref = lerReferenciaProdutos(rows);
    if (ref) { res.referencia = ref; continue; }
    const b = lerBaseProdutos(rows);
    if (b) { res.base = b; continue; }
    const mv = lerMB59(rows);
    if (mv) {
      res.movimentos.push(...mv);
      // Planilha antiga: "VOLUME DL" digitado ao lado (Relatório!AA/AB).
      for (const r of rows) { const i = (r || []).findIndex((v) => norm(v) === 'volume dl'); if (i >= 0 && typeof r[i + 1] === 'number') res.volume = r[i + 1]; }
      continue;
    }
    const inv = lerInventario(rows);
    if (inv) res.inventario.push(...inv);
  }
  const m = norm(nomeArquivo).match(/\b(20\d{2}) (\d{2})\b/);
  if (m) res.mes = `${m[1]}-${m[2]}`;
  // Planilha do mês ("2026 - 10 Perdas…"): linhas do MB59 lançadas em outro mês ficam de fora. Ex.: a de out/26 de
  // Barreiras tem 144 linhas lançadas em 03/11 que também estão na de novembro (seriam contadas duas vezes).
  res.foraDoMes = 0;
  if (res.mes && res.base) {
    const dentro = res.movimentos.filter((x) => x.data.startsWith(res.mes));
    res.foraDoMes = res.movimentos.length - dentro.length;
    res.movimentos = dentro;
  }
  // DL do arquivo: pelo centro das linhas ou pelo nome (o cadastro de produtos é guardado por DL).
  const centros = new Set([...res.movimentos, ...res.inventario].map((x) => x.centro));
  res.dl = centros.size === 1 ? [...centros][0] : /barreiras|cbar/.test(norm(nomeArquivo)) ? 'CBAR' : /juazeiro|ccrt/.test(norm(nomeArquivo)) ? 'CCRT' : null;
  const partes = [res.movimentos.length && 'MB59', res.inventario.length && 'inventário', res.base && 'cadastro de produtos', res.referencia && 'base de referência de produtos'].filter(Boolean);
  res.tipo = partes.length ? partes.join(' + ') : null;
  return res;
}

// ---------------------------------------------------------------- cálculo
export function motivoPerda(m) {
  const t = Number(m.tipo), ref = norm(m.ref);
  if (t === 928 && /transf|transporte/.test(ref)) return 'TRANSPORTE';
  if (t === 551) return 'ESTOQUE';
  if (t === 928) return 'ROTA';
  return 'VERIFICAR';
}

// Cadastro por DL (cada planilha tinha a sua aba "base", e elas divergem em alguns produtos). O do próprio DL vale;
// o do outro DL só completa o que faltar.
export function baseDoDL(bases = {}, dl) {
  const proprio = bases[dl] || {}, outro = Object.entries(bases).filter(([k]) => k !== dl).map(([, v]) => v)[0] || {};
  return { solar: { ...(outro.solar || {}), ...(proprio.solar || {}) }, produtos: { ...(outro.produtos || {}), ...(proprio.produtos || {}) } };
}

// Materiais que os dois DLs convertem de jeito diferente (para o admin acertar). Compara o que cada DL usa de fato
// (de-para + produto): código reduzido curto num DL e longo no outro, com os mesmos fatores, não é divergência.
// Diferença de arredondamento no Fat.Conv2 (até 0,0005) também não.
export function divergenciasProdutos(bases = {}) {
  const a = bases.CBAR || {}, b = bases.CCRT || {}, pa = buscaProdutos(a), pb = buscaProdutos(b), out = [];
  for (const m of new Set([...Object.keys(a.solar || {}), ...Object.keys(b.solar || {})])) {
    const x = pa(m), y = pb(m);
    if (x && y && (x.q !== y.q || Math.abs(x.f - y.f) > 0.0005 || x.c !== y.c)) out.push({ tipo: 'material', codigo: m, descricao: x.d || y.d,
      CBAR: `COD CB ${x.cb} · Qtd/Un ${x.q} · Fat.Conv2 ${x.f} · ${x.c}`, CCRT: `COD CB ${y.cb} · Qtd/Un ${y.q} · Fat.Conv2 ${y.f} · ${y.c}` });
  }
  return out;
}

export function buscaProdutos(base = {}) {
  const solar = base.solar || {}, produtos = base.produtos || {};
  return (mat) => { const k = txt(mat), cb = solar[k] ?? (produtos[k] ? k : null); return cb != null && produtos[cb] ? { cb, ...produtos[cb] } : null; };
}

// CX UNIT de uma linha: em UN divide pelo Qtd/Un; em CX (caixa física) é direto × Fat.Conv2.
export const cxUnit = (qtd, um, p) => !p ? 0 : String(um).toUpperCase() === 'CX' ? qtd * p.f : qtd * p.f / (p.q || 1);

export function calcularPerdasDL({ movimentos = [], inventario = [], base = {}, referencia = null, volume = null, faturamento = null, fatTendencia = null, ajustePreco = 0 }) {
  const prod = buscaProdutos(base);
  const motivos = Object.fromEntries([...MOTIVOS_PERDAS, 'VERIFICAR'].map((k) => [k, { rs: 0, cx: 0, linhas: 0 }]));
  const cats = new Map(), produtos = new Map(), semCad = new Map(), porDia = new Map();
  const somar = (motivo, mat, texto, valor, qtd, um, data) => {
    const p = prod(mat), rs = -valor, cx = -cxUnit(qtd, um, p);
    const mo = motivos[motivo]; mo.rs += rs; mo.cx += cx; mo.linhas++;
    if (!p) { const s = semCad.get(mat) || { mat, texto, rs: 0, linhas: 0 }; s.rs += rs; s.linhas++; semCad.set(mat, s); }
    if (motivo === 'VERIFICAR') return;
    const cat = p?.c || 'SEM CADASTRO', k = p ? p.cb : `M${mat}`;
    if (!cats.has(cat)) cats.set(cat, Object.fromEntries(MOTIVOS_PERDAS.map((x) => [x, 0])));
    cats.get(cat)[motivo] += rs;
    if (!produtos.has(k)) produtos.set(k, { produto: texto || p?.d || mat, categoria: cat, ...Object.fromEntries(MOTIVOS_PERDAS.map((x) => [x, 0])), cx: 0 });
    const pr = produtos.get(k); pr[motivo] += rs; pr.cx += cx;
    if (data) { if (!porDia.has(data)) porDia.set(data, { data, ROTA: 0, ESTOQUE: 0, TRANSPORTE: 0 }); porDia.get(data)[motivo] += rs; }
  };
  for (const m of movimentos) somar(motivoPerda(m), m.mat, m.texto, m.valor, m.qtd, m.um, m.data);
  for (const i of inventario) somar('INVENTARIO', i.mat, i.texto, i.valor, i.qtd, i.um || 'CX', null);
  const soma = (campo) => MOTIVOS_PERDAS.reduce((s, k) => s + motivos[k][campo], 0);
  const total = soma('rs'), totalCx = soma('cx'), rotaEstoque = motivos.ROTA.rs + motivos.ESTOQUE.rs;
  const vol = Number(volume) || null, fat = Number(faturamento) || null, fatT = Number(fatTendencia) || null, ajuste = Number(ajustePreco) || 0;
  for (const k of [...MOTIVOS_PERDAS, 'VERIFICAR']) {
    const m = motivos[k];
    m.pctVolume = vol ? m.cx / vol : null; m.custoCx = m.cx ? m.rs / m.cx : null; m.pctTotal = total ? m.rs / total : null;
  }
  const listaProdutos = [...produtos.values()].map((p) => ({ ...p, total: MOTIVOS_PERDAS.reduce((s, k) => s + p[k], 0) }))
    .sort((a, b) => b.total - a.total);
  const categorias = [...cats].map(([categoria, v]) => ({ categoria, ...v, rotaEstoque: v.ROTA + v.ESTOQUE, total: MOTIVOS_PERDAS.reduce((s, k) => s + v[k], 0) }))
    .sort((a, b) => b.total - a.total);
  return {
    temDados: movimentos.length > 0 || inventario.length > 0,
    motivos, categorias, produtos: listaProdutos, porDia: [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data)),
    // Material sem cadastro: o produto provável da base de referência vai junto, em observação (não entra na conta).
    semCadastro: [...semCad.values()].map((s) => ({ ...s, sugestao: sugestaoProduto(referencia, s.mat) })).sort((a, b) => b.rs - a.rs),
    ultimoDia: movimentos.map((m) => m.data).sort().at(-1) || null,
    totais: {
      rotaEstoque, total, totalCx, volume: vol, faturamento: fat, fatTendencia: fatT, ajustePreco: ajuste, fechamentoOp: total + ajuste,
      pctVolume: vol ? totalCx / vol : null, custoCx: totalCx ? total / totalCx : null,
      pctKPI: fat ? rotaEstoque / fat : null, pctKPITendencia: fatT ? rotaEstoque / fatT : null,
    },
  };
}

// dados = {CBAR: {movimentos, inventario, volumePlanilha}}, bases = {CBAR: {solar, produtos}, CCRT: …},
// parametros = {CBAR: {volume, faturamento, fatTendencia, ajustePreco}}, montagem = {CBAR: {acm, fat_acm, fat_tendencia}}.
export function calcularPerdas({ mes, dados = {}, bases = {}, referencia = null, parametros = {}, montagem = {} }) {
  const dls = {};
  for (const [c, nome] of Object.entries(DLS_PERDAS)) {
    const d = dados[c] || {}, p = parametros[c] || {}, mo = montagem[c] || {};
    const escolhe = (manual, ...auto) => { const v = [manual, ...auto].find((x) => x != null && x !== '' && Number(x)); return v == null ? null : Number(v); };
    const fonte = (manual, auto) => manual != null && manual !== '' && Number(manual) ? 'manual' : auto ? 'Montagem' : null;
    const volume = escolhe(p.volume, mo.acm, d.volumePlanilha), faturamento = escolhe(p.faturamento, mo.fat_acm), fatTendencia = escolhe(p.fatTendencia, mo.fat_tendencia);
    const r = calcularPerdasDL({ movimentos: (d.movimentos || []).filter((m) => m.data?.startsWith(mes)), inventario: d.inventario || [], base: baseDoDL(bases, c), referencia, volume, faturamento, fatTendencia, ajustePreco: p.ajustePreco });
    r.fontes = { volume: fonte(p.volume, mo.acm) || (d.volumePlanilha ? 'planilha' : null), faturamento: fonte(p.faturamento, mo.fat_acm), fatTendencia: fonte(p.fatTendencia, mo.fat_tendencia) };
    dls[c] = { dl: c, nome, ...r };
  }
  return { mes, dls };
}

// O que vai para os leitores: totais, motivos, categorias, produtos e dias. Sem a lista de materiais sem cadastro.
export function agregadoPublicadoPerdas(resultado) {
  return Object.fromEntries(Object.entries(resultado.dls).map(([c, d]) => {
    const { semCadastro, ...resto } = d;
    return [c, { ...resto, semCadastro: semCadastro.length }];
  }));
}
