// Exportação do Retorno por motivo: um arquivo do mês, como a planilha "MM. Retorno - <Mês>.xlsx" (abas CB NORTE,
// CB SUL e DLS, com as molduras e os gráficos). O modelo (docs/modelos/retorno.xlsx, code/tools/modelo_retorno.ps1) é a
// própria planilha sem dados: as linhas 8–14 são os estilos de motivo, vazia, total, total sem cancelamento e base.
// Os totais vão como fórmulas. A regra do "sem cancelamento" é a do Hub: sai só CANCELAMENTO DE NF, do retorno e do
// volume. O retorno por motorista só vai quando os dados têm os nomes (rascunho do admin).
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const limpo = (v) => (ehNum(v) ? Math.round(v * 1e9) / 1e9 || 0 : v);
const nCol = (c) => [...c].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0);
const CANC = 'CANCELAMENTO DE NF';

function celula(ref, s, { v = null, f = null } = {}) {
  const st = s != null ? ` s="${s}"` : '';
  v = limpo(v);
  if (f) return ehNum(v) ? `<c r="${ref}"${st}><f>${esc(f)}</f><v>${v}</v></c>` : `<c r="${ref}"${st} t="str"><f>${esc(f)}</f><v>${esc(v ?? '')}</v></c>`;
  if (ehNum(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
  if (v != null && v !== '') return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  return `<c r="${ref}"${st}/>`;
}

function lerModelo(xml) {
  const ini = xml.indexOf('<sheetData>'), fim = xml.indexOf('</sheetData>');
  const linhas = new Map();
  for (const m of xml.slice(ini, fim).matchAll(/<row ([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = +m[1].match(/\br="(\d+)"/)[1], cels = new Map();
    for (const c of (m[2] || '').matchAll(/<c ([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g)) {
      const col = c[1].match(/\br="([A-Z]+)\d+"/)[1];
      cels.set(col, { s: c[1].match(/\bs="(\d+)"/)?.[1] ?? null, xml: c[0] });
    }
    linhas.set(r, { attrs: m[1].replace(/\s*\br="\d+"/, '').replace(/\s*\bspans="[^"]*"/, '').replace(/\s*\/$/, '').trim(), cels });
  }
  return { linhas, antes: xml.slice(0, ini), depois: xml.slice(fim + '</sheetData>'.length) };
}

// Um lado da aba (esquerda: colunas B..N; direita: P em diante). Devolve as linhas ocupadas.
// itens: [{nome, v}]; cols: [nome, valor, pct|null]; volume: ref do volume (ex.: $E$5) ou null.
function lado(grade, modelo, direita, { itens, cols, volume = null, vol = 0, semCanc = false, rotTotal = 'TOTAL RETORNO', minBase }) {
  const doLado = (col) => (nCol(col) >= 16) === direita;
  const [cN, cV, cP] = cols, n = Math.max(itens.length, 1), d0 = 8, dN = d0 + n - 1;
  const total = dN + 2, sc = semCanc ? total + 2 : null, base = Math.max((sc ?? total) + (direita ? 1 : 2), minBase);
  const por = (r, protoR, valores = {}) => {
    const proto = modelo.get(protoR), cels = grade.get(r) || new Map();
    for (const [col, c] of proto.cels) if (doLado(col)) cels.set(col, { s: c.s, xml: celula(`${col}${r}`, c.s, valores[col]) });
    for (const [col, v] of Object.entries(valores)) if (!cels.has(col)) cels.set(col, { s: null, xml: celula(`${col}${r}`, null, v) });
    grade.set(r, cels);
  };
  const soma = itens.reduce((s, x) => s + x.v, 0), canc = itens.filter((x) => x.nome === CANC).reduce((s, x) => s + x.v, 0);
  const pct = (ref, num, den) => (cP && volume ? { [cP]: { v: den ? num / den : 0, f: `IFERROR(${ref}/${volume},0)` } } : {});
  for (let r = d0; r < base; r++) {
    const i = r - d0;
    if (r <= dN) {
      const x = itens[i];
      por(r, 8, x ? { [cN]: { v: x.nome }, [cV]: { v: x.v }, ...pct(`${cV}${r}`, x.v, vol) } : {});
    } else if (r === total) por(r, 10, { [cN]: { v: rotTotal }, [cV]: { v: soma, f: `SUM(${cV}${d0}:${cV}${dN})` }, ...pct(`${cV}${r}`, soma, vol) });
    else if (r === sc) {
      const sumif = `SUMIF(${cN}${d0}:${cN}${dN},"${CANC}",${cV}${d0}:${cV}${dN})`;
      por(r, 12, {
        [cN]: { v: 'TOTAL RETORNO S/ CANCELAMENTO NF' }, [cV]: { v: soma - canc, f: `${cV}${total}-${sumif}` },
        ...(cP && volume ? { [cP]: { v: vol - canc ? (soma - canc) / (vol - canc) : 0, f: `IFERROR(${cV}${r}/(${volume}-${sumif}),0)` } } : {}),
      });
    } else por(r, 9);
  }
  por(base, 14);
  return { dN, total, sc, base };
}

// Aponta o gráfico para as linhas do mês e recoloca os destaques do total (900) e do sem cancelamento (901).
function ajustarGrafico(xml, esq, dir) {
  const m = xml.match(/\$(C|Q)\$8:\$\1\$\d+/);
  if (!m) return xml;
  const L = m[1] === 'C' ? esq : dir, ult = m[1] === 'C' || L.temPct ? (L.sc ?? L.total) : L.dN;
  let t = xml.replace(/\$(C|E|Q|R|S)\$8:\$\1\$\d+/g, (x, col) => `$${col}$8:$${col}$${ult}`);
  for (const [idx, linha] of [['900', L.total], ['901', L.sc]]) {
    const re = new RegExp(`<c:(dPt|dLbl)><c:idx val="${idx}"/>([\\s\\S]*?)</c:\\1>`, 'g');
    t = t.replace(re, (todo, tag) => (linha && linha <= ult ? todo.replace(`<c:idx val="${idx}"/>`, `<c:idx val="${linha - 8}"/>`) : ''));
  }
  return t;
}

const urlModelo = () => new URL('../modelos/retorno.xlsx', import.meta.url).href;
const ordenar = (lista) => [...lista].sort((a, b) => b.v - a.v);
const motivosDe = (d) => ordenar((d?.motivos || []).map((m) => ({ nome: m.motivo, v: m.cx })));
const volumeDe = (d) => d?.totais?.volume || 0;

// r = resultado do mês (calcularRetorno ou o publicado): {unidades: {NORTE, SUL, CBAR, CCRT}}.
export async function gerarRetornoXlsx(r, { modelo = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  const un = r?.unidades || {};
  if (!Object.values(un).some((d) => d?.temDados)) throw new Error('Não há dados de retorno para exportar neste mês.');
  const zip = await JSZip.loadAsync(modelo || await (await fetch(urlModelo())).arrayBuffer());
  const ler = (n) => zip.file(n).async('string');
  const abas = [
    { n: 1, u: 'NORTE', minE: 32, minD: 32 },
    { n: 2, u: 'SUL', minE: 32, minD: 32 },
    { n: 3, u: null, minE: 31, minD: 31 },
  ];
  for (const a of abas) {
    const alvo = `xl/worksheets/sheet${a.n}.xml`;
    const { linhas, antes, depois } = lerModelo(await ler(alvo));
    const grade = new Map([...linhas].filter(([k]) => k < 8).map(([k, l]) => [k, new Map(l.cels)]));
    const por = (ref, v) => {
      const [, col, row] = ref.match(/([A-Z]+)(\d+)/), cels = grade.get(+row), s = cels.get(col)?.s ?? null;
      cels.set(col, { s, xml: celula(ref, s, { v }) });
    };
    let esq, dir;
    if (a.u) {
      const d = un[a.u], vol = volumeDe(d);
      if (vol) por('E5', vol);
      esq = lado(grade, linhas, false, { itens: motivosDe(d), cols: ['C', 'D', 'E'], volume: '$E$5', vol, semCanc: true, minBase: a.minE });
      // Na planilha da CB SUL a lista vai do menor para o maior (o gráfico dela põe o maior em cima assim); na NORTE, o contrário.
      const motoristas = ordenar((d?.motoristas || []).map((m) => ({ nome: m.nome, v: m.rs })));
      if (a.u === 'SUL') motoristas.reverse();
      dir = lado(grade, linhas, true, { itens: motoristas, cols: ['Q', 'R', null], rotTotal: 'TOTAL', minBase: a.minD });
    } else {
      const ba = un.CBAR, jn = un.CCRT, vBa = volumeDe(ba), vJn = volumeDe(jn);
      if (vBa) por('E5', vBa);
      if (vJn) por('S5', vJn);
      const temCanc = (d) => motivosDe(d).some((x) => x.nome === CANC);
      esq = lado(grade, linhas, false, { itens: motivosDe(ba), cols: ['C', 'D', 'E'], volume: '$E$5', vol: vBa, semCanc: temCanc(ba), minBase: a.minE });
      dir = lado(grade, linhas, true, { itens: motivosDe(jn), cols: ['Q', 'R', 'S'], volume: '$S$5', vol: vJn, semCanc: temCanc(jn), minBase: a.minD });
      dir.temPct = true;
    }
    const ultima = Math.max(esq.base, dir.base);
    const out = [...grade].sort((x, y) => x[0] - y[0]).map(([k, cels]) => {
      const attrs = k < 8 ? linhas.get(k).attrs : '';
      return `<row r="${k}"${attrs ? ` ${attrs}` : ''}>${[...cels].sort((x, y) => nCol(x[0]) - nCol(y[0])).map(([, c]) => c.xml).join('')}</row>`;
    }).join('');
    zip.file(alvo, `${antes.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="B1:AC${ultima}"/>`)}<sheetData>${out}</sheetData>${depois}`);

    // Gráficos e âncoras desta aba: só crescem quando o mês tem mais linhas que o gráfico original.
    const rels = await ler(`xl/drawings/_rels/drawing${a.n}.xml.rels`);
    const extra = { e: 0, d: 0 };
    for (const m of rels.matchAll(/Target="\.\.\/charts\/(chart\d+)\.xml"/g)) {
      const nome = `xl/charts/${m[1]}.xml`, antigo = await ler(nome), novo = ajustarGrafico(antigo, esq, dir);
      const fim = (x) => x.match(/\$(C|Q)\$8:\$\1\$(\d+)/), a0 = fim(antigo), a1 = fim(novo);
      if (a0 && a1) extra[a0[1] === 'C' ? 'e' : 'd'] = Math.max(0, a1[2] - a0[2]);
      zip.file(nome, novo);
    }
    const desenho = `xl/drawings/drawing${a.n}.xml`;
    zip.file(desenho, (await ler(desenho)).replace(/<xdr:from><xdr:col>(\d+)<\/xdr:col>([\s\S]*?<xdr:to>[\s\S]*?<xdr:row>)(\d+)(<\/xdr:row>)/g,
      (todo, col, meio, row, resto) => `<xdr:from><xdr:col>${col}</xdr:col>${meio}${+row + extra[+col >= 15 ? 'd' : 'e']}${resto}`));
  }
  const wb = await ler('xl/workbook.xml');
  zip.file('xl/workbook.xml', /<calcPr/.test(wb) ? wb.replace(/<calcPr([^>]*?)\/>/, (t, x) => `<calcPr${x.replace(/\s*fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>'));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const nomeArquivoRetorno = (mes) => `${mes.slice(5, 7)}. Retorno - ${MESES[+mes.slice(5, 7) - 1]}.xlsx`;

export async function baixarRetorno(r, mes, opcoes = {}) {
  const bytes = await gerarRetornoXlsx(r, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = nomeArquivoRetorno(mes); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
