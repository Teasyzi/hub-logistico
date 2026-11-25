// Exportação do Fill rate: planilha .xlsx do comparativo mês a mês, IGUAL à planilha oficial
// "MM - Insuficiência - <Mês>.xlsx": usa os estilos e o tema da própria planilha (modelo_fillrate.js) e põe cada valor
// na mesma célula, com o mesmo estilo, larguras, mesclagens e formatação condicional.
//   COMPARATIVO          (só CB NORTE e CB SUL, sem linha GERAL, como o Resumo) o quadro da aba Resumo da planilha (REVENDA · META% · META · PEDIDO ENTREGUE (coluna F oculta,
//                        como no Resumo) · FALTA DE ESTOQUE · % FILL RATE · INSUFICIÊNCIA) de cada mês, com a faixa
//                        amarela do mês e o link "Detalhes →" em CB NORTE e CB SUL; no fim, o acumulado do ano.
//   "JAN NORTE", …       a aba CB NORTE / CB SUL da planilha daquele mês, célula a célula. O K1 volta ao COMPARATIVO.
// Valores, não fórmulas: os números são os do Hub (regras da ficha §11, p. ex. meta = 2% do pedido).
// Os rótulos são os da planilha ("% FILL RATE" no quadro é a insuficiência, como lá; o fill rate fica no N3).
// porMes: {AAAA-MM: {unidades: {NORTE|SUL: unidade calculada (totais, dias, produtos, detalhe)}, geral}}
import { UNIDADES_FR, comparativoFR, resumoMesFR } from './fillrate.js?v=20261125-14';
import { STYLES_XML, THEME_XML } from './modelo_fillrate.js?v=20261125-14';

const NOMES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const nomeMes = (mes) => `${NOMES[+mes.slice(5, 7) - 1]}/${mes.slice(0, 4)}`;
export const abaDetalheFR = (mes, u) => `${NOMES[+mes.slice(5, 7) - 1].slice(0, 3).replace('Ç', 'C')} ${u}`;
const serial = (iso) => (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000;
const codigo = (c) => (c == null ? '' : /^\d+$/.test(String(c)) ? Number(c) : String(c));
const DA = { NORTE: 'CB CE Norte', SUL: 'CB CE Sul' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const col = (c) => { let s = ''; c++; while (c) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); } return s; };
const ref = (r, c) => `${col(c)}${r + 1}`;
const C = (letra) => letra.charCodeAt(0) - 65;   // 'B' → 1

// Estilos da planilha + um só acrescentado: o link (negrito, sublinhado, vermelho do cabeçalho), no fim da lista.
function estilosPlanilha() {
  const nFont = +STYLES_XML.match(/<fonts count="(\d+)"/)[1], nXf = +STYLES_XML.match(/<cellXfs count="(\d+)"/)[1];
  const xml = STYLES_XML
    .replace(/<fonts count="\d+"/, `<fonts count="${nFont + 1}"`)
    .replace('</fonts>', '<font><b/><u/><sz val="11"/><color rgb="FFC00000"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>')
    .replace(/<cellXfs count="\d+"/, `<cellXfs count="${nXf + 1}"`)
    .replace('</cellXfs>', `<xf numFmtId="0" fontId="${nFont}" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs>`);
  return { xml, link: nXf };
}

// ---------------------------------------------------------------- folha (células com o índice de estilo da planilha)
function folha(nome, { cols, zoom = 85 }) {
  const cel = new Map(), links = [], merges = [], cfs = [];
  let maxR = 0, maxC = 0;
  const set = (r, c, v, s, alvo) => {
    cel.set(r * 1024 + c, { r, c, v, s });
    if (alvo) links.push({ ref: ref(r, c), alvo, txt: v });
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  };
  // Mescla com o estilo de cada célula do trecho (como a planilha guarda): s0 na primeira, sMeio no meio, sFim na última.
  const mescla = (r, c0, c1, v, s0, sMeio = s0, sFim = sMeio) => {
    set(r, c0, v, s0);
    for (let c = c0 + 1; c <= c1; c++) set(r, c, null, c === c1 ? sFim : sMeio);
    merges.push(`${ref(r, c0)}:${ref(r, c1)}`);
  };
  // Formatação condicional da planilha: menor que X → dxfMenor; maior que X → dxfMaior.
  const cf = (sqref, x, dxfMenor, dxfMaior) => cfs.push({ sqref, x, dxfMenor, dxfMaior });
  const xml = () => {
    const linhas = new Map();
    for (const x of [...cel.values()].sort((a, b) => a.r - b.r || a.c - b.c)) { if (!linhas.has(x.r)) linhas.set(x.r, []); linhas.get(x.r).push(x); }
    const out = [];
    for (const [r, cs] of linhas) {
      out.push(`<row r="${r + 1}">`);
      for (const { c, v, s } of cs) {
        const a = `r="${ref(r, c)}"${s ? ` s="${s}"` : ''}`;
        if (v == null || v === '') out.push(`<c ${a}/>`);
        else if (typeof v === 'number') out.push(Number.isFinite(v) ? `<c ${a}><v>${v}</v></c>` : `<c ${a}/>`);
        else out.push(`<c ${a} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`);
      }
      out.push('</row>');
    }
    let prio = 1;
    const cfXml = cfs.map((x) => `<conditionalFormatting sqref="${x.sqref}"><cfRule type="cellIs" dxfId="${x.dxfMenor}" priority="${prio++}" operator="lessThan"><formula>${x.x}</formula></cfRule><cfRule type="cellIs" dxfId="${x.dxfMaior}" priority="${prio++}" operator="greaterThan"><formula>${x.x}</formula></cfRule></conditionalFormatting>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:${ref(maxR, maxC)}"/><sheetViews><sheetView showGridLines="0" zoomScale="${zoom}" zoomScaleNormal="${zoom}" workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="14.4"/>
<cols>${cols}</cols><sheetData>${out.join('')}</sheetData>
${merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}${cfXml}${links.length ? `<hyperlinks>${links.map((l) => `<hyperlink ref="${l.ref}" location="${esc(`'${l.alvo}'!A1`)}" display="${esc(l.txt)}"/>`).join('')}</hyperlinks>` : ''}
<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  };
  return { nome, set, mescla, cf, xml };
}

// Larguras da planilha (CB NORTE e Resumo), em unidades do Excel.
const COLS_UNIDADE = '<col min="1" max="1" width="0.33203125" customWidth="1"/><col min="2" max="4" width="15.6640625" customWidth="1"/><col min="5" max="5" width="40" customWidth="1"/><col min="6" max="6" width="21.33203125" style="1" customWidth="1"/><col min="7" max="7" width="17.88671875" style="2" customWidth="1"/><col min="8" max="8" width="18.44140625" style="2" customWidth="1"/><col min="9" max="9" width="11.33203125" style="2" customWidth="1"/><col min="10" max="10" width="0.5546875" customWidth="1"/><col min="11" max="11" width="23.6640625" style="1" customWidth="1"/><col min="12" max="12" width="19.5546875" style="3" customWidth="1"/><col min="13" max="13" width="0.5546875" customWidth="1"/><col min="14" max="14" width="30.5546875" style="3" customWidth="1"/><col min="15" max="15" width="19.5546875" style="3" customWidth="1"/>';
const COLS_RESUMO = '<col min="2" max="2" width="16.33203125" style="1" customWidth="1"/><col min="3" max="4" width="18.44140625" customWidth="1"/><col min="5" max="5" width="0.5546875" customWidth="1"/><col min="6" max="6" width="23.6640625" hidden="1" customWidth="1"/><col min="7" max="7" width="19.5546875" customWidth="1"/><col min="8" max="8" width="0.5546875" customWidth="1"/><col min="9" max="9" width="29.109375" customWidth="1"/><col min="10" max="10" width="17.5546875" customWidth="1"/><col min="11" max="11" width="14.6640625" customWidth="1"/>';

// ---------------------------------------------------------------- COMPARATIVO (o quadro da aba Resumo, mês a mês)
function abaComparativo(S, ano, porMes, mesAtual) {
  const resumos = Object.fromEntries(Object.entries(porMes).map(([m, r]) => [m, resumoMesFR(r)]));
  const c = comparativoFR(resumos, ano), f = folha('COMPARATIVO', { cols: COLS_RESUMO, zoom: 100 });
  const B = C('B'), J = C('J'), K = C('K');
  f.mescla(0, B, J, `FILL RATE - INSUFICIÊNCIA DE ESTOQUE - MÊS A MÊS ${ano}`, 46);
  const hoje = new Date(), iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  f.mescla(1, B, J, serial(iso), 47, 48);
  let r = 3;
  const cab = () => {
    [['B', 'REVENDA', 5], ['C', 'META%', 5], ['D', 'META', 5], ['F', 'PEDIDO ENTREGUE', 17], ['G', 'FALTA DE ESTOQUE', 5], ['I', '% FILL RATE', 5], ['J', 'INSUFICIÊNCIA', 8]]
      .forEach(([l, t, s]) => f.set(r, C(l), t, s));
    r++;
  };
  const linha = (rot, x, alvo) => {
    f.set(r, C('B'), rot, 6);
    if (x) {
      const t = x.totais;
      f.set(r, C('C'), t.meta, 6); f.set(r, C('D'), t.metaCx, 7); f.set(r, C('F'), t.entregue, 10); f.set(r, C('G'), t.falta, 7);
      f.set(r, C('I'), t.insuf, 6); f.set(r, C('J'), t.acimaMeta, 9);
      f.cf(ref(r, C('I')), `$C$${r + 1}`, 5, 4); f.cf(ref(r, C('J')), '0', 1, 0);
    } else { f.set(r, C('C'), 'sem dados no mês', 6); for (const l of ['D', 'F', 'G', 'I', 'J']) f.set(r, C(l), null, l === 'J' ? 9 : 6); }
    if (alvo) f.set(r, K, 'Detalhes →', S.link, alvo);
    r++;
  };
  for (const mes of c.meses) {
    const pega = (s) => s.linhas.find((l) => l.mes === mes);
    f.mescla(r++, B, J, `${nomeMes(mes)}${mes === mesAtual ? ' (PARCIAL)' : ''}`, 43, 44, 45);
    cab();
    for (const u of Object.keys(UNIDADES_FR)) { const x = pega(c.unidades[u]); linha(UNIDADES_FR[u].toUpperCase(), x, x ? abaDetalheFR(mes, u) : null); }
    r++;
  }
  f.mescla(r++, B, J, `ACUMULADO ${ano}`, 43, 44, 45);
  cab();
  const acm = (s) => (s.acumulado ? { totais: s.acumulado } : null);
  for (const u of Object.keys(UNIDADES_FR)) linha(UNIDADES_FR[u].toUpperCase(), acm(c.unidades[u]), null);
  return { f, meses: c.meses };
}

// ---------------------------------------------------------------- detalhe (a aba CB NORTE / CB SUL da planilha)
function abaDetalhe(S, u, mes, d, mesAtual) {
  const f = folha(abaDetalheFR(mes, u), { cols: COLS_UNIDADE }), t = d.totais, B = C('B'), E = C('E');
  const dxf = u === 'SUL' ? { n: [9, 8], o: [7, 6] } : { n: [13, 12], o: [11, 10] };
  f.mescla(0, B, E, `${UNIDADES_FR[u].toUpperCase()} - INSUFICIÊNCIA DE ESTOQUE`, 46);
  f.set(0, C('K'), '← COMPARATIVO', S.link, 'COMPARATIVO');
  f.mescla(1, B, E, d.ultimoDia ? serial(d.ultimoDia.data) : null, 47, 48);
  f.mescla(2, B, E, mes === mesAtual ? null : `FECHAMENTO DE ${NOMES[+mes.slice(5, 7) - 1]}'${mes.slice(2, 4)}`, 52);
  f.set(2, C('N'), t.fillRate, 35);
  [['H', 'META%', 5], ['I', 'META', 5], ['K', 'PEDIDO ENTREGUE', 17], ['L', 'FALTA DE ESTOQUE', 5], ['N', '% FILL RATE', 5], ['O', 'INSUFICIÊNCIA', 8]].forEach(([l, x, s]) => f.set(3, C(l), x, s));
  [['H', t.meta, 6], ['I', t.metaCx, 7], ['K', t.entregue, 10], ['L', t.falta, 7], ['N', t.insuf, 38], ['O', t.acimaMeta, 9]].forEach(([l, v, s]) => f.set(4, C(l), v, s));
  f.cf('N5', '$H$5', ...dxf.n); f.cf('O5', '0', ...dxf.o);
  f.mescla(7, B, C('I'), 'INFORMAÇÃO POR DATA E PRODUTO', 43, 44, 45);
  f.mescla(7, C('K'), C('L'), 'INFORMAÇÃO POR DIA', 50, 51);
  f.mescla(7, C('N'), C('O'), 'INFORMAÇÃO POR PRODUTO', 49);
  [['B', 'DA', 27], ['C', 'CATEGORIA', 27], ['D', 'CÓD', 27], ['E', 'PROD DESCR', 27], ['F', 'DATA', 27], ['G', 'PEDIDO ENTREGUE', 28], ['H', 'FALTA DE ESTOQUE', 28], ['I', '% FILL RATE', 28],
    ['K', 'DATA', 12], ['L', 'FALTA DE ESTOQUE', 13], ['N', 'PROD DESCR', 12], ['O', 'FALTA DE ESTOQUE', 13]].forEach(([l, x, s]) => f.set(8, C(l), x, s));
  // Por data e produto: uma linha por produto e dia, da maior falta para a menor (a ordem do relatório).
  d.detalhe.forEach((x, i) => {
    const r = 9 + i;
    f.set(r, C('B'), DA[u], 26); f.set(r, C('C'), x.cat, 26); f.set(r, C('D'), codigo(x.cod), 39); f.set(r, C('E'), x.prod, 40);
    f.set(r, C('F'), serial(x.data), 34); f.set(r, C('G'), x.ent, 30); f.set(r, C('H'), x.falta, 31);
    f.set(r, C('I'), x.ent + x.falta > 0 ? 1 - x.falta / (x.ent + x.falta) : 1, 36);   // % FILL RATE da linha, como na planilha
  });
  // Por dia: todos os dias do mês, como na planilha (dia sem relatório = 0).
  f.set(9, C('K'), 'Totais', 14); f.set(9, C('L'), t.falta, 16);
  const porDia = new Map(d.dias.map((x) => [x.data, x.falta])), ultimo = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();
  for (let dia = 1; dia <= ultimo; dia++) {
    const iso = `${mes}-${String(dia).padStart(2, '0')}`;
    f.set(9 + dia, C('K'), serial(iso), 34); f.set(9 + dia, C('L'), porDia.get(iso) || 0, 24);
  }
  // Por produto: todos os produtos, da maior falta para a menor (como a lista da planilha).
  f.set(9, C('N'), 'Totais', 14); f.set(9, C('O'), t.falta, 16);
  d.produtos.forEach((p, i) => { f.set(10 + i, C('N'), p.prod, 11); f.set(10 + i, C('O'), p.falta, 15); });
  return f;
}

// ---------------------------------------------------------------- pacote
export async function gerarComparativoFR(ano, porMes, { mesAtual = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  const S = estilosPlanilha(), comp = abaComparativo(S, ano, porMes, mesAtual), folhas = [comp.f];
  for (const mes of comp.meses) for (const u of Object.keys(UNIDADES_FR)) {
    const d = porMes[mes]?.unidades?.[u];
    if (d?.temDados) folhas.push(abaDetalhe(S, u, mes, d, mesAtual));
  }
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${folhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0" firstSheet="0"/></bookViews>
<sheets>${folhas.map((f, i) => `<sheet name="${esc(f.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  const n = folhas.length;
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${folhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId${n + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`);
  folhas.forEach((f, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, f.xml()));
  zip.file('xl/styles.xml', S.xml);
  zip.file('xl/theme/theme1.xml', THEME_XML);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export async function baixarComparativoFR(ano, porMes, opcoes = {}) {
  const bytes = await gerarComparativoFR(ano, porMes, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = `Fill rate - Insuficiencia - mes a mes ${ano}.xlsx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
