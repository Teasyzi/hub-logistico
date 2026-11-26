// Exportação das Perdas: um arquivo por DL, IGUAL à aba Resumo da planilha "Perdas de Estoque - <DL>".
// O modelo (docs/modelos/perdas_<CBAR|CCRT>.xlsx, gerado por code/tools/modelo_perdas.ps1) é a própria planilha sem
// dados: estilos, tema, larguras, mesclas e setas ficam como estão. As posições saem dos rótulos do modelo (Barreiras e
// Juazeiro têm linhas diferentes). As somas da aba viram fórmulas com o resultado; o que a planilha buscava nas abas
// ocultas (relatórios do SAP) vai como valor, porque elas não vão junto.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const limpo = (v) => (ehNum(v) ? Math.round(v * 1e9) / 1e9 || 0 : v);
const nCol = (c) => [...c].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0);
const MOTIVOS = ['INVENTARIO', 'ROTA', 'ESTOQUE', 'TRANSPORTE'];

function celula(ref, s, { v = null, f = null } = {}) {
  const st = s != null ? ` s="${s}"` : '';
  v = limpo(v);
  if (f) return ehNum(v) ? `<c r="${ref}"${st}><f>${esc(f)}</f><v>${v}</v></c>` : `<c r="${ref}"${st} t="str"><f>${esc(f)}</f><v>${esc(v ?? '')}</v></c>`;
  if (ehNum(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
  if (v != null && v !== '') return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  return `<c r="${ref}"${st}/>`;
}

function lerModelo(xml, ss) {
  const ini = xml.indexOf('<sheetData>'), fim = xml.indexOf('</sheetData>');
  const linhas = new Map();
  for (const m of xml.slice(ini, fim).matchAll(/<row ([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = +m[1].match(/\br="(\d+)"/)[1], cels = new Map();
    for (const c of (m[2] || '').matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = c[1].match(/\br="([A-Z]+)\d+"/)[1], v = c[2]?.match(/<v>(\d+)<\/v>/)?.[1];
      cels.set(col, { s: c[1].match(/\bs="(\d+)"/)?.[1] ?? null, xml: c[0], texto: /\bt="s"/.test(c[1]) && v != null ? ss[+v].trim() : null });
    }
    linhas.set(r, { attrs: m[1].replace(/\s*\br="\d+"/, '').replace(/\s*\/$/, ''), cels });
  }
  return { linhas, antes: xml.slice(0, ini), depois: xml.slice(fim + '</sheetData>'.length) };
}

const urlModelo = (c) => new URL(`../modelos/perdas_${c}.xlsx`, import.meta.url).href;
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// c = 'CBAR' | 'CCRT'; d = resultado do DL (calcularPerdas ou o publicado).
export async function gerarPerdasXlsx(c, d, { modelo = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  if (!d?.temDados) throw new Error('Não há dados de perdas para exportar.');
  const zip = await JSZip.loadAsync(modelo || await (await fetch(urlModelo(c))).arrayBuffer());
  const ler = (n) => zip.file(n).async('string');
  const ss = [...(await ler('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'));
  const alvo = 'xl/worksheets/sheet1.xml';
  const { linhas, antes, depois } = lerModelo(await ler(alvo), ss);

  const achar = (col, texto, aPartir = 1) => [...linhas].find(([r, l]) => r >= aPartir && l.cels.get(col)?.texto === texto)?.[0];
  const cabCat = achar('C', 'CATEGORIA'), totCat = achar('C', 'TOTAL'), cabProd = achar('B', 'CATEGORIA');
  const ajusteR = achar('C', 'AJUSTES DE PREÇO');
  if (!cabCat || !totCat || !cabProd || !ajusteR || !linhas.get(cabProd + 1)) throw new Error('Modelo da exportação incompleto.');

  const por = (r, col, dado, estiloDe = null) => {
    const l = linhas.get(r), atual = l.cels.get(col);
    const s = estiloDe != null ? linhas.get(estiloDe).cels.get(col)?.s ?? null : atual?.s ?? null;
    l.cels.set(col, { s, xml: celula(`${col}${r}`, s, dado) });
  };

  if (d.ultimoDia) por(3, 'A', { v: `ATUALIZADO DIA: ${dataBR(d.ultimoDia)}` });

  // ---- produtos (ordem da tela: pelo Total, do maior para o menor)
  const produtos = d.produtos.map((p) => ({ ...p, soma: p.INVENTARIO + p.ROTA + p.ESTOQUE })).sort((a, b) => b.soma - a.soma);
  const p0 = cabProd + 1, pN = p0 + Math.max(0, produtos.length - 1), modProd = linhas.get(p0);
  produtos.forEach((p, i) => {
    const r = p0 + i, valores = {
      B: { v: p.categoria }, C: { v: p.produto }, D: { v: p.INVENTARIO }, E: { v: p.ROTA }, F: { v: p.ESTOQUE },
      G: { v: p.ROTA + p.ESTOQUE, f: `SUM(E${r}:F${r})` }, H: { v: p.soma, f: `SUM(D${r}:F${r})` }, J: { v: p.TRANSPORTE },
    };
    const cels = new Map([...modProd.cels].map(([col, x]) => [col, { s: x.s, xml: celula(`${col}${r}`, x.s, valores[col]) }]));
    for (const [col, v] of Object.entries(valores)) if (!cels.has(col)) cels.set(col, { s: null, xml: celula(`${col}${r}`, null, v) });
    linhas.set(r, { attrs: modProd.attrs, cels });
  });

  // ---- por categoria. Categoria fora da lista (ou material sem cadastro) vai na linha vazia antes do TOTAL.
  const livre = totCat - 1, soma = Object.fromEntries(['D', 'E', 'F', 'J'].map((k) => [k, 0]));
  const fixas = new Map();
  for (let r = cabCat + 1; r < ajusteR; r++) { const nome = linhas.get(r)?.cels.get('C')?.texto; if (nome) fixas.set(nome, r); }
  const porNome = new Map(d.categorias.map((x) => [x.categoria, x]));
  const outras = d.categorias.filter((x) => !fixas.has(x.categoria) && MOTIVOS.some((k) => Math.abs(x[k]) >= 0.005));
  const intervalo = (col) => `$${col}$${p0}:$${col}$${pN}`;
  const linhaCat = (r, v, nomes, estiloDe = null) => {
    const sf = (col) => nomes.map((n) => `SUMIF(${intervalo('B')},"${n.replace(/"/g, '""')}",${intervalo(col)})`).join('+');
    const x = { D: v.INVENTARIO || 0, E: v.ROTA || 0, F: v.ESTOQUE || 0, J: v.TRANSPORTE || 0 };
    for (const col of ['D', 'E', 'F', 'J']) { por(r, col, { v: x[col], f: sf(col) }, estiloDe); soma[col] += x[col]; }
    por(r, 'G', { v: x.E + x.F, f: `SUM(E${r}:F${r})` }, estiloDe);
    por(r, 'H', { v: x.D + x.E + x.F, f: `SUM(D${r}:F${r})` }, estiloDe);
  };
  for (const [nome, r] of fixas) linhaCat(r, porNome.get(nome) || {}, [nome]);
  if (outras.length) {
    if (!linhas.has(livre)) linhas.set(livre, { attrs: '', cels: new Map() });
    por(livre, 'C', { v: outras.length === 1 ? outras[0].categoria : 'OUTRAS' }, fixas.values().next().value);
    const v = Object.fromEntries(MOTIVOS.map((k) => [k, outras.reduce((s, x) => s + x[k], 0)]));
    linhaCat(livre, v, outras.map((x) => x.categoria), fixas.values().next().value);
  }
  const ajuste = d.totais.ajustePreco || 0;
  if (ajuste) por(ajusteR, 'D', { v: ajuste });
  soma.D += ajuste;
  por(ajusteR, 'G', { v: 0, f: `SUM(E${ajusteR}:F${ajusteR})` });
  por(ajusteR, 'H', { v: ajuste, f: `SUM(D${ajusteR}:F${ajusteR})` });
  por(ajusteR, 'J', { v: 0 });
  const de = cabCat + 1, totais = { ...soma, G: soma.E + soma.F, H: soma.D + soma.E + soma.F };
  for (const col of ['D', 'E', 'F', 'G', 'H', 'J']) por(totCat, col, { v: totais[col], f: `SUM(${col}${de}:${col}${livre})` });

  // ---- blocos de CX UNIT (sinal do SAP: negativo = perda)
  const volume = d.totais.volume || 0;
  const bloco = (titulo, rotCol) => {
    const cab = achar(rotCol, titulo);
    if (!cab) throw new Error(`Modelo sem o bloco ${titulo}.`);
    const r = (rot) => achar(rotCol, rot, cab + 1);
    return { vol: r('VOLUME CX UNIT'), cx: r('TT PERDAS CX UNIT'), pct: r('%'), custo: r('CUSTO P/ CX UNIT'), total: r('TOTAL CUSTO') };
  };
  const geral = bloco('PERDAS EM CXS UNITÁRIAS', 'L');
  const blocos = [['ESTOQUE', 'L', 'M', 'N'], ['ROTA', 'O', 'P', 'Q'], ['TRANSPORTE', 'L', 'M', 'N'], ['INVENTARIO', 'O', 'P', 'Q']]
    .map(([k, rot, val, parte]) => ({ k, val, parte, ...bloco(k === 'INVENTARIO' ? 'INVENTÁRIO' : k, rot) }));
  const totalCx = 0 - d.totais.totalCx, totalRs = 0 - d.totais.total;
  const cxDe = (m) => 0 - d.motivos[m].cx, rsDe = (m) => 0 - d.motivos[m].rs;
  por(geral.vol, 'M', { v: volume });
  for (const b of blocos) {
    const cx = cxDe(b.k), rs = rsDe(b.k);
    por(b.vol, b.val, { v: volume, f: `M${geral.vol}` });
    por(b.cx, b.val, { v: cx });
    por(b.pct, b.val, { v: volume ? cx / volume : 0, f: `IFERROR(${b.val}${b.cx}/${b.val}${b.vol},0)` });
    por(b.total, b.val, { v: rs });
    por(b.custo, b.val, { v: cx ? rs / cx : 0, f: `IFERROR(${b.val}${b.total}/${b.val}${b.cx},0)` });
    por(b.cx, b.parte, { v: totalCx ? cx / totalCx : 0, f: `IFERROR(${b.val}${b.cx}/$M$${geral.cx},0)` });
    por(b.total, b.parte, { v: totalRs ? rs / totalRs : 0, f: `IFERROR(${b.val}${b.total}/$M$${geral.total},0)` });
  }
  const somaBlocos = (campo) => `SUM(${blocos.map((b) => `${b.val}${b[campo]}`).join(',')})`;
  por(geral.cx, 'M', { v: totalCx, f: somaBlocos('cx') });
  por(geral.total, 'M', { v: totalRs, f: somaBlocos('total') });
  por(geral.pct, 'M', { v: volume ? totalCx / volume : 0, f: `IFERROR(M${geral.cx}/M${geral.vol},0)` });
  por(geral.custo, 'M', { v: totalCx ? totalRs / totalCx : 0, f: `IFERROR(M${geral.total}/M${geral.cx},0)` });

  // ---- remonta a planilha; as faixas das setas e dos destaques passam a ir até o último produto.
  const out = [...linhas].sort((a, b) => a[0] - b[0]).map(([r, l]) => {
    const cels = [...l.cels].sort((a, b) => nCol(a[0]) - nCol(b[0])).map(([, x]) => x.xml).join('');
    const attrs = l.attrs.replace(/\s*\bspans="[^"]*"/, '');
    return `<row r="${r}"${attrs ? ` ${attrs.trim()}` : ''}>${cels}</row>`;
  }).join('');
  const faixas = (t) => t.replace(/(:[A-Z]+)(\d+)/g, (m, col, r) => (+r > cabProd + 1 ? `${col}${pN}` : m));
  const dp = depois.replace(/sqref="([^"]*)"/g, (m, s) => `sqref="${faixas(s)}"`).replace(/<xm:sqref>([^<]*)<\/xm:sqref>/g, (m, s) => `<xm:sqref>${faixas(s)}</xm:sqref>`);
  const a = antes.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:Q${pN}"/>`);
  zip.file(alvo, `${a}<sheetData>${out}</sheetData>${dp}`);
  const wb = await ler('xl/workbook.xml');
  zip.file('xl/workbook.xml', /<calcPr/.test(wb) ? wb.replace(/<calcPr([^>]*?)\/>/, (t, x) => `<calcPr${x.replace(/\s*fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>'));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export const nomeArquivoPerdas = (c, mes) => `${mes.replace('-', ' - ')} Perdas de Estoque - ${c === 'CBAR' ? 'Barreiras' : 'Juazeiro'}.xlsx`;

export async function baixarPerdas(c, d, mes, opcoes = {}) {
  const bytes = await gerarPerdasXlsx(c, d, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = nomeArquivoPerdas(c, mes); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
