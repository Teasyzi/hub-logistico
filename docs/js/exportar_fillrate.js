// Exportação do Fill rate: planilha .xlsx do comparativo mês a mês, com as cores do site (tokens do tema claro
// do hub.css: cabeçalho --brand, faixa --section com borda --brand, GERAL/Totais --total, farol --good/--bad).
// O SheetJS gratuito não grava estilos, por isso o pacote é montado aqui com o JSZip (global, já carregado no site).
//   COMPARATIVO          o quadro do RESUMO de cada mês (CB NORTE, CB SUL, GERAL) com o link "Detalhes →" de cada
//                        revenda, e o acumulado do ano. É a aba que abre.
//   "JAN NORTE", …       uma aba por revenda e mês, depois do COMPARATIVO, no layout da planilha de Insuficiência:
//                        cabeçalho, "por data e produto", "por dia" e "por produto". O A1 volta para o COMPARATIVO.
// porMes: {AAAA-MM: {unidades: {NORTE|SUL: unidade calculada (totais, dias, produtos, detalhe)}, geral}}
import { UNIDADES_FR, META_FR, comparativoFR, resumoMesFR } from './fillrate.js?v=20261125-11';

const NOMES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const nomeMes = (mes) => `${NOMES[+mes.slice(5, 7) - 1]}/${mes.slice(0, 4)}`;
export const abaDetalheFR = (mes, u) => `${NOMES[+mes.slice(5, 7) - 1].slice(0, 3).replace('Ç', 'C')} ${u}`;
const serial = (iso) => (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000;
const codigo = (c) => (c == null ? '' : /^\d+$/.test(String(c)) ? Number(c) : String(c));

// Cores do tema claro do hub.css (ARGB).
const COR = { brand: 'FFC00000', branco: 'FFFFFFFF', ink: 'FF1A1A1A', ink2: 'FF555555', section: 'FFE7E7E7', total: 'FFFFFF00',
  good: 'FF006100', goodbg: 'FFC6EFCE', bad: 'FF9C0006', badbg: 'FFFFC7CE', borda: 'FFD0D0D0', norte: 'FFC00000', sul: 'FF1F4E79' };
const FMT = { cx: '#,##0.00', pct: '0.00%', meta: '0%', data: 'dd/mm/yyyy', cod: '0' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const col = (c) => { let s = ''; c++; while (c) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); } return s; };
const ref = (r, c) => `${col(c)}${r + 1}`;

// ---------------------------------------------------------------- estilos (styles.xml montado sob demanda)
function estilos() {
  const fonts = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'], numFmts = [], xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const idx = (lista, xml) => { let i = lista.indexOf(xml); if (i < 0) { lista.push(xml); i = lista.length - 1; } return i; };
  const cache = new Map();
  const fmtId = (f) => { if (!f) return 0; const i = numFmts.findIndex((x) => x.f === f); if (i >= 0) return numFmts[i].id; const id = 164 + numFmts.length; numFmts.push({ id, f }); return id; };
  // e: {b, i, u, sz, cor, fundo, borda: 'grade'|'faixa', fmt, h: 'left'|'center'|'right', wrap}
  const id = (e = {}) => {
    const k = JSON.stringify(e);
    if (cache.has(k)) return cache.get(k);
    const font = idx(fonts, `<font>${e.b ? '<b/>' : ''}${e.i ? '<i/>' : ''}${e.u ? '<u/>' : ''}<sz val="${e.sz || 11}"/><color rgb="${e.cor || COR.ink}"/><name val="Calibri"/><family val="2"/></font>`);
    const fill = e.fundo ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="${e.fundo}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const lado = (t, c) => `<${t} style="thin"><color rgb="${c}"/></${t}>`;
    const border = e.borda === 'grade' ? idx(borders, `<border>${lado('left', COR.borda)}${lado('right', COR.borda)}${lado('top', COR.borda)}${lado('bottom', COR.borda)}<diagonal/></border>`)
      : e.borda === 'faixa' ? idx(borders, `<border><left style="thick"><color rgb="${COR.brand}"/></left><right/><top/><bottom/><diagonal/></border>`) : 0;
    const nf = fmtId(e.fmt), al = e.h || e.wrap ? `<alignment${e.h ? ` horizontal="${e.h}"` : ''} vertical="center"${e.wrap ? ' wrapText="1"' : ''}/>` : '';
    xfs.push(`<xf numFmtId="${nf}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"${nf ? ' applyNumberFormat="1"' : ''}${font ? ' applyFont="1"' : ''}${fill ? ' applyFill="1"' : ''}${border ? ' applyBorder="1"' : ''}${al ? ' applyAlignment="1"' : ''}>${al}</xf>`);
    cache.set(k, xfs.length - 1);
    return xfs.length - 1;
  };
  const xml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.map((n) => `<numFmt numFmtId="${n.id}" formatCode="${esc(n.f)}"/>`).join('')}</numFmts>` : ''}
<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return { id, xml };
}

// Estilos usados nas duas abas, como no site.
function paleta(S) {
  const g = { borda: 'grade' };
  const corpo = (fmt, extra = {}) => S.id({ ...g, fmt, h: fmt ? 'right' : 'left', ...extra });
  const farol = (ok, extra = {}) => S.id({ ...g, fmt: FMT.pct, h: 'right', cor: ok ? COR.good : COR.bad, fundo: ok ? COR.goodbg : COR.badbg, ...extra });
  const tot = { fundo: COR.total, b: true };
  return {
    titulo: S.id({ b: true, sz: 14 }), nota: S.id({ i: true, sz: 9, cor: COR.ink2 }),
    faixa: S.id({ b: true, fundo: COR.section, borda: 'faixa' }), faixaResto: S.id({ fundo: COR.section }),
    cab: S.id({ ...g, b: true, cor: COR.branco, fundo: COR.brand, h: 'center', wrap: true }),
    txt: corpo(null), cx: corpo(FMT.cx), pct: corpo(FMT.pct), meta: corpo(FMT.meta, { h: 'center' }), data: corpo(FMT.data, { h: 'center' }), cod: corpo(FMT.cod, { h: 'left' }),
    ok: farol(true), no: farol(false),
    totTxt: corpo(null, tot), totCx: corpo(FMT.cx, tot), totPct: corpo(FMT.pct, tot), totMeta: corpo(FMT.meta, { ...tot, h: 'center' }),
    totOk: farol(true, { b: true }), totNo: farol(false, { b: true }),
    link: S.id({ ...g, b: true, u: true, cor: COR.brand, h: 'center' }), voltar: S.id({ b: true, u: true, cor: COR.brand }),
  };
}

// ---------------------------------------------------------------- folha
function folha(nome, { tab = null } = {}) {
  const cel = new Map(), links = [], altura = new Map();
  let maxR = 0, maxC = 0, larguras = [], congelar = 0;
  const set = (r, c, v, s, alvo) => {
    cel.set(r * 1024 + c, { r, c, v, s });
    if (alvo) links.push({ ref: ref(r, c), alvo, txt: v });
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  };
  const xml = () => {
    const linhas = new Map();
    for (const x of [...cel.values()].sort((a, b) => a.r - b.r || a.c - b.c)) { if (!linhas.has(x.r)) linhas.set(x.r, []); linhas.get(x.r).push(x); }
    const out = [];
    for (const [r, cs] of linhas) {
      const ht = altura.get(r);
      out.push(`<row r="${r + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>`);
      for (const { c, v, s } of cs) {
        const a = `r="${ref(r, c)}"${s ? ` s="${s}"` : ''}`;
        if (v == null || v === '') out.push(`<c ${a}/>`);
        else if (typeof v === 'number') out.push(Number.isFinite(v) ? `<c ${a}><v>${v}</v></c>` : `<c ${a}/>`);
        else out.push(`<c ${a} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`);
      }
      out.push('</row>');
    }
    const pane = congelar ? `<pane ySplit="${congelar}" topLeftCell="A${congelar + 1}" activePane="bottomLeft" state="frozen"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${tab ? `<sheetPr><tabColor rgb="${tab}"/></sheetPr>` : ''}
<dimension ref="A1:${ref(maxR, maxC)}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>
${larguras.length ? `<cols>${larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''}<sheetData>${out.join('')}</sheetData>
${links.length ? `<hyperlinks>${links.map((l) => `<hyperlink ref="${l.ref}" location="${esc(`'${l.alvo}'!A1`)}" display="${esc(l.txt)}"/>`).join('')}</hyperlinks>` : ''}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/></worksheet>`;
  };
  return { nome, set, xml, cols: (w) => { larguras = w; }, alto: (r, h) => altura.set(r, h), congelar: (n) => { congelar = n; } };
}

// ---------------------------------------------------------------- COMPARATIVO (o quadro do RESUMO de cada mês, sem a coluna Até)
const CAB = ['REVENDA', 'META %', 'META (CX UNIT)', 'PEDIDO ENTREGUE (CX UNIT)', 'FALTA DE ESTOQUE (CX UNIT)', 'INSUFICIÊNCIA %', 'FILL RATE %', 'ACIMA DA META (CX UNIT)', ''];
function linhaResumo(f, E, r, rot, x, alvo, tot = false) {
  const n = CAB.length;
  if (!x) { f.set(r, 0, rot, E.txt); f.set(r, 1, 'sem dados no mês', E.txt); for (let c = 2; c < n; c++) f.set(r, c, '', E.txt); return; }
  const t = x.totais, ok = t.insuf != null && t.insuf <= t.meta;
  f.set(r, 0, rot, tot ? E.totTxt : E.txt);
  f.set(r, 1, t.meta, tot ? E.totMeta : E.meta);
  f.set(r, 2, t.metaCx, tot ? E.totCx : E.cx);
  f.set(r, 3, t.entregue, tot ? E.totCx : E.cx);
  f.set(r, 4, t.falta, tot ? E.totCx : E.cx);
  f.set(r, 5, t.insuf, tot ? (ok ? E.totOk : E.totNo) : (ok ? E.ok : E.no));
  f.set(r, 6, t.fillRate, tot ? E.totPct : E.pct);
  f.set(r, 7, t.acimaMeta, tot ? E.totCx : E.cx);
  f.set(r, 8, alvo ? 'Detalhes →' : '', alvo ? E.link : (tot ? E.totTxt : E.txt), alvo);
}

function abaComparativo(E, ano, porMes, mesAtual) {
  const resumos = Object.fromEntries(Object.entries(porMes).map(([m, r]) => [m, resumoMesFR(r)]));
  const c = comparativoFR(resumos, ano), f = folha('COMPARATIVO', { tab: COR.brand }), n = CAB.length;
  f.set(0, 0, `FILL RATE · INSUFICIÊNCIA DE ESTOQUE — MÊS A MÊS ${ano}`, E.titulo); f.alto(0, 22);
  f.set(1, 0, `Insuficiência % = falta ÷ (pedido entregue + falta), em CX UNIT. Fill rate = 100% − insuficiência. Meta: insuficiência até ${META_FR * 100}% (verde); meta em CX UNIT = ${META_FR * 100}% do pedido.`, E.nota);
  let r = 3;
  const faixa = (txt) => { f.set(r, 0, txt, E.faixa); for (let k = 1; k < n; k++) f.set(r, k, '', E.faixaResto); f.alto(r, 20); r++; };
  const cab = () => { CAB.forEach((t, i) => f.set(r, i, t, E.cab)); f.alto(r, 32); r++; };
  for (const mes of c.meses) {
    const pega = (s) => s.linhas.find((l) => l.mes === mes);
    faixa(`${nomeMes(mes)}${mes === mesAtual ? ' (parcial)' : ''}`);
    cab();
    for (const u of Object.keys(UNIDADES_FR)) { const x = pega(c.unidades[u]); linhaResumo(f, E, r++, UNIDADES_FR[u].toUpperCase(), x, x ? abaDetalheFR(mes, u) : null); }
    linhaResumo(f, E, r++, 'GERAL', pega(c.geral), null, true);
    r++;
  }
  faixa(`ACUMULADO ${ano}`);
  cab();
  const acm = (s) => (s.acumulado ? { totais: s.acumulado } : null);
  for (const u of Object.keys(UNIDADES_FR)) linhaResumo(f, E, r++, UNIDADES_FR[u].toUpperCase(), acm(c.unidades[u]), null);
  linhaResumo(f, E, r++, 'GERAL', acm(c.geral), null, true);
  f.set(r + 1, 0, `Acumulado = falta ÷ pedido somados de ${c.meses.length} mês(es) (não é a média dos %). "Detalhes →" abre a aba da revenda no mês; o A1 de cada aba volta para cá.`, E.nota);
  f.cols([20, 9, 16, 22, 22, 15, 13, 21, 13]);
  return { f, meses: c.meses };
}

// ---------------------------------------------------------------- detalhe (layout da planilha de Insuficiência)
function abaDetalhe(E, u, mes, d) {
  const f = folha(abaDetalheFR(mes, u), { tab: u === 'SUL' ? COR.sul : COR.norte }), t = d.totais, ok = (p) => p != null && p <= t.meta;
  f.set(0, 0, '← COMPARATIVO', E.voltar, 'COMPARATIVO');
  f.set(0, 1, `${UNIDADES_FR[u].toUpperCase()} - INSUFICIÊNCIA DE ESTOQUE · ${nomeMes(mes)}`, E.titulo); f.alto(0, 22);
  ['META %', 'META (CX UNIT)', 'PEDIDO ENTREGUE', 'FALTA DE ESTOQUE', 'INSUFICIÊNCIA %', 'FILL RATE %', 'ACIMA DA META'].forEach((x, i) => f.set(2, 1 + i, x, E.cab));
  f.alto(2, 30);
  f.set(3, 1, t.meta, E.meta); f.set(3, 2, t.metaCx, E.cx); f.set(3, 3, t.entregue, E.cx); f.set(3, 4, t.falta, E.cx);
  f.set(3, 5, t.insuf, ok(t.insuf) ? E.ok : E.no); f.set(3, 6, t.fillRate, E.pct); f.set(3, 7, t.acimaMeta, E.cx);
  const faixa = (c0, c1, txt) => { f.set(5, c0, txt, E.faixa); for (let k = c0 + 1; k <= c1; k++) f.set(5, k, '', E.faixaResto); };
  faixa(1, 8, 'INFORMAÇÃO POR DATA E PRODUTO'); faixa(10, 13, 'INFORMAÇÃO POR DIA'); faixa(15, 20, 'INFORMAÇÃO POR PRODUTO');
  ['DA', 'CATEGORIA', 'CÓD', 'PROD DESCR', 'DATA', 'PEDIDO ENTREGUE', 'FALTA DE ESTOQUE', 'INSUF. %'].forEach((x, i) => f.set(6, 1 + i, x, E.cab));
  ['DATA', 'PEDIDO ENTREGUE', 'FALTA DE ESTOQUE', 'INSUF. %'].forEach((x, i) => f.set(6, 10 + i, x, E.cab));
  ['PROD DESCR', 'CATEGORIA', 'CÓD', 'FALTA DE ESTOQUE', '% DA FALTA', 'INSUF. %'].forEach((x, i) => f.set(6, 15 + i, x, E.cab));
  f.alto(6, 30); f.congelar(7);
  d.detalhe.forEach((x, i) => {
    const r = 7 + i;
    f.set(r, 1, UNIDADES_FR[u], E.txt); f.set(r, 2, x.cat, E.txt); f.set(r, 3, codigo(x.cod), E.cod); f.set(r, 4, x.prod, E.txt); f.set(r, 5, serial(x.data), E.data);
    f.set(r, 6, x.ent, E.cx); f.set(r, 7, x.falta, E.cx); f.set(r, 8, x.pct, ok(x.pct) ? E.ok : E.no);
  });
  f.set(7, 10, 'Totais', E.totTxt); f.set(7, 11, t.entregue, E.totCx); f.set(7, 12, t.falta, E.totCx); f.set(7, 13, t.insuf, ok(t.insuf) ? E.totOk : E.totNo);
  d.dias.forEach((x, i) => { const r = 8 + i; f.set(r, 10, serial(x.data), E.data); f.set(r, 11, x.ent, E.cx); f.set(r, 12, x.falta, E.cx); f.set(r, 13, x.pct, ok(x.pct) ? E.ok : E.no); });
  // O código do "por produto" sai do detalhe (o mesmo produto tem o mesmo código em todas as linhas).
  const cods = new Map(d.detalhe.map((x) => [x.prod, x.cod]));
  f.set(7, 15, 'Totais', E.totTxt); f.set(7, 16, '', E.totTxt); f.set(7, 17, '', E.totTxt); f.set(7, 18, t.falta, E.totCx); f.set(7, 19, 1, E.totPct); f.set(7, 20, t.insuf, ok(t.insuf) ? E.totOk : E.totNo);
  d.produtos.forEach((x, i) => {
    const r = 8 + i;
    f.set(r, 15, x.prod, E.txt); f.set(r, 16, x.cat, E.txt); f.set(r, 17, codigo(x.cod ?? cods.get(x.prod)), E.cod); f.set(r, 18, x.falta, E.cx); f.set(r, 19, x.partFalta, E.pct); f.set(r, 20, x.pct, ok(x.pct) ? E.ok : E.no);
  });
  f.cols([15, 12, 12, 10, 38, 11, 16, 16, 9, 2, 11, 16, 16, 9, 2, 38, 12, 10, 16, 11, 9]);
  return f;
}

// ---------------------------------------------------------------- pacote
export async function gerarComparativoFR(ano, porMes, { mesAtual = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  const S = estilos(), E = paleta(S), comp = abaComparativo(E, ano, porMes, mesAtual), folhas = [comp.f];
  for (const mes of comp.meses) for (const u of Object.keys(UNIDADES_FR)) {
    const d = porMes[mes]?.unidades?.[u];
    if (d?.temDados) folhas.push(abaDetalhe(E, u, mes, d));
  }
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${folhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0" firstSheet="0"/></bookViews>
<sheets>${folhas.map((f, i) => `<sheet name="${esc(f.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${folhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${folhas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  folhas.forEach((f, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, f.xml()));
  zip.file('xl/styles.xml', S.xml());   // por último: os estilos são criados enquanto as folhas são montadas
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export async function baixarComparativoFR(ano, porMes, opcoes = {}) {
  const bytes = await gerarComparativoFR(ano, porMes, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = `Fill rate - Insuficiencia - mes a mes ${ano}.xlsx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
