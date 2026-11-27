// Exportação da Gestão à vista: um arquivo por DL, IGUAL à planilha oficial "GESTÃO À VISTA - CB LOG CBAR / CB LOG II CCRT".
// O modelo (docs/modelos/gestao_a_vista_<DL>.xlsx) é a própria planilha oficial sem dados e sem nomes (gerado por
// code/tools/modelo_gestao.ps1): as abas, estilos, tema, larguras, colunas agrupadas e os 28 gráficos ficam como estão.
// O Hub só preenche a aba Dados, célula a célula, com o mesmo estilo de cada célula do modelo:
//   - linhas digitadas: o valor (ou "-", como na planilha);
//   - linhas calculadas: a FÓRMULA (com o resultado em cache), corrigida pelas decisões da ficha §10:
//     cubos = volume/1,68 e divisões vazias quando falta o valor (antes davam 0 e entravam no Acum);
//     Acum = média só dos meses com valor (TRIXLOG também: antes era 99,5 fixo).
//   - os blocos de anos anteriores (colunas agrupadas à direita): ano − 1, ano − 2…
// E regrava o cache dos gráficos (meses e valores), para eles já abrirem certos. O Excel recalcula tudo ao abrir.
// anos: {AAAA: valores {mes: {linha: v}}} (o ano exportado e os anteriores que houver).
import { LINHAS_GV, LINHA_GV, UNIDADES_GV, FATOR_CUBOS, calcularAnoGV } from './gestao.js?v=20261127-1';

const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const colNum = (s) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const colLetra = (c) => { let s = ''; c++; while (c) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); } return s; };
const partes = (ref) => { const m = ref.match(/^([A-Z]+)(\d+)$/); return { c: colNum(m[1]), r: +m[2] }; };
const serialMes = (ano, mes) => (Date.UTC(ano, mes - 1, 1) - Date.UTC(1899, 11, 30)) / 86400000;
const numXml = (v) => String(+v.toPrecision(15));

// Lê as células da aba (XML) em linhas: [{r, attrs, cels: [{ref, c, s, xml}]}].
function lerLinhas(xml) {
  const dados = xml.match(/<sheetData>([\s\S]*?)<\/sheetData>|<sheetData\/>/);
  const linhas = [];
  for (const m of (dados[1] || '').matchAll(/<row ([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = +m[1].match(/\br="(\d+)"/)[1], cels = [];
    for (const c of (m[2] || '').matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = c[1].match(/\br="([A-Z]+\d+)"/)[1], s = c[1].match(/\bs="(\d+)"/)?.[1] ?? null;
      cels.push({ ref, c: partes(ref).c, s, attrs: c[1], corpo: c[2] ?? null, xml: c[0] });
    }
    linhas.push({ r, attrs: m[1], cels });
  }
  return { linhas, antes: xml.slice(0, dados.index), depois: xml.slice(dados.index + dados[0].length) };
}

// Blocos de anos pela linha 3 do modelo: meses (datas) seguidos da coluna "Acum". Bloco 0 = ano exportado.
function blocos(linha3, sharedStrings) {
  const out = [];
  let atual = null;
  for (const x of [...linha3.cels].sort((a, b) => a.c - b.c)) {
    const v = x.corpo?.match(/<v>([^<]*)<\/v>/)?.[1];
    const ehTexto = /\bt="s"/.test(x.attrs), texto = ehTexto && v != null ? sharedStrings[+v] : null;
    if (!ehTexto && v != null && +v > 30000) {
      const d = new Date(Date.UTC(1899, 11, 30) + +v * 86400000);
      if (!atual || x.c !== atual.meses.at(-1).c + 1) { atual = { meses: [], acum: null }; out.push(atual); }
      atual.meses.push({ c: x.c, mes: d.getUTCMonth() + 1 });
    } else if (texto && /^acum$/i.test(texto.trim()) && atual && !atual.acum) atual.acum = x.c;
  }
  return out;
}

function formulaMes(x, L) {
  const C = (l) => `${L}${l}`;
  if (x.tipo === 'cubos') return `IF(${C(6)}="","",${C(6)}/${String(FATOR_CUBOS).replace(',', '.')})`;
  if (x.erro === '-') return `IFERROR(${C(x.num)}/${C(x.den)},"-")`;
  return `IF(${C(x.num)}="","",IFERROR(${C(x.num)}/${C(x.den)},""))`;
}
function formulaAcum(x, L, ini, fim) {
  if (x.acum === 'razao') return `IFERROR(${L}${x.num}/${L}${x.den},"")`;
  return `IFERROR(AVERAGE(${ini}${x.l}:${fim}${x.l}),"${x.acum === 'traco' ? '-' : ''}")`;
}
// Célula com o estilo do modelo: número, texto ou fórmula (com o resultado em cache).
function celula(ref, s, { v = null, f = null }) {
  const st = s != null ? ` s="${s}"` : '';
  if (f) {
    if (ehNum(v)) return `<c r="${ref}"${st}><f>${esc(f)}</f><v>${numXml(v)}</v></c>`;
    return `<c r="${ref}"${st} t="str"><f>${esc(f)}</f><v>${esc(v ?? '')}</v></c>`;
  }
  if (ehNum(v)) return `<c r="${ref}"${st}><v>${numXml(v)}</v></c>`;
  if (v != null && v !== '') return `<c r="${ref}"${st} t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  return `<c r="${ref}"${st}/>`;
}

function abaDados(xml, sharedStrings, ano, calc, valoresDe = () => null) {
  const { linhas, antes, depois } = lerLinhas(xml);
  const porLinha = new Map(linhas.map((x) => [x.r, x]));
  const bs = blocos(porLinha.get(3), sharedStrings);
  // Posições que o Hub reescreve: {ref: xml}.
  const novas = new Map();
  const estilo = (ref) => {
    const { r } = partes(ref);
    return porLinha.get(r)?.cels.find((x) => x.ref === ref)?.s ?? null;
  };
  bs.forEach((b, k) => {
    const a = ano - k, cc = calc(a), ini = colLetra(b.meses[0].c), fim = colLetra(b.meses.at(-1).c);
    for (const { c, mes } of b.meses) {
      const L = colLetra(c);
      novas.set(`${L}3`, celula(`${L}3`, estilo(`${L}3`), { v: serialMes(a, mes) }));
      for (const x of LINHAS_GV) {
        const ref = `${L}${x.l}`, v = cc ? cc.linhas[x.l].m[mes - 1] : null;
        // Linha calculada com valor digitado à mão no Hub: vai o valor (sem fórmula), como alguém faria na planilha.
        const digitado = x.tipo !== 'in' && typeof valoresDe(a)?.[mes]?.[x.l] === 'number';
        novas.set(ref, celula(ref, estilo(ref), x.tipo === 'in' || digitado ? { v } : { v, f: formulaMes(x, L) }));
      }
    }
    if (b.acum != null) {
      const L = colLetra(b.acum);
      for (const x of LINHAS_GV) {
        const ref = `${L}${x.l}`;
        novas.set(ref, celula(ref, estilo(ref), { v: cc ? cc.linhas[x.l].acum : null, f: formulaAcum(x, L, ini, fim) }));
      }
    }
  });
  // Fórmulas compartilhadas cujo "mestre" foi reescrito: as filhas que sobraram perdem a fórmula (ficam só com o estilo).
  const mestres = new Set();
  for (const ln of linhas) for (const x of ln.cels) if (!novas.has(x.ref)) { const si = x.corpo?.match(/<f t="shared" ref="[^"]*" si="(\d+)"/)?.[1]; if (si) mestres.add(si); }
  const sobra = (x) => {
    const si = x.corpo?.match(/<f t="shared" si="(\d+)"\s*\/>/)?.[1];
    return si && !mestres.has(si) ? (x.s != null ? `<c r="${x.ref}" s="${x.s}"/>` : `<c r="${x.ref}"/>`) : x.xml;
  };
  const corpo = linhas.map((ln) => {
    const refs = new Map(ln.cels.map((x) => [x.ref, sobra(x)]));
    for (const [ref, x] of novas) if (partes(ref).r === ln.r) refs.set(ref, x);
    const cels = [...refs.entries()].sort((p, q) => partes(p[0]).c - partes(q[0]).c).map((e) => e[1]).join('');
    return `<row ${ln.attrs}>${cels}</row>`;
  }).join('');
  return { xml: `${antes}<sheetData>${corpo}</sheetData>${depois}`, blocos: bs };
}

// Cache dos gráficos: meses do bloco 0 (B3:M3, N vazio, O = "Acum") e os valores da linha de cada série.
function graficoComCache(xml, ano, bloco0, cc) {
  const pos = (c) => c - bloco0.meses[0].c;   // índice do ponto dentro de B:O
  const nPts = (bloco0.acum ?? bloco0.meses.at(-1).c) - bloco0.meses[0].c + 1;
  const cats = bloco0.meses.map(({ c, mes }) => `<c:pt idx="${pos(c)}"><c:v>${MES3[mes - 1]}/${String(ano).slice(2)}</c:v></c:pt>`).join('')
    + (bloco0.acum != null ? `<c:pt idx="${pos(bloco0.acum)}"><c:v>Acum</c:v></c:pt>` : '');
  xml = xml.replace(/(<c:cat><c:strRef><c:f>[^<]*<\/c:f>)<c:strCache>[\s\S]*?<\/c:strCache>/g, `$1<c:strCache><c:ptCount val="${nPts}"/>${cats}</c:strCache>`);
  return xml.replace(/<c:val><c:numRef><c:f>([^<]*)<\/c:f><c:numCache>([\s\S]*?)<\/c:numCache>/g, (t, f, cache) => {
    const l = +f.match(/\$(\d+):/)?.[1], fc = cache.match(/<c:formatCode>[\s\S]*?<\/c:formatCode>/)?.[0] || '';
    const ln = cc?.linhas[l];
    let pts = '';
    if (ln) {
      for (const { c, mes } of bloco0.meses) if (ehNum(ln.m[mes - 1])) pts += `<c:pt idx="${pos(c)}"><c:v>${numXml(ln.m[mes - 1])}</c:v></c:pt>`;
      if (bloco0.acum != null && ehNum(ln.acum)) pts += `<c:pt idx="${pos(bloco0.acum)}"><c:v>${numXml(ln.acum)}</c:v></c:pt>`;
    }
    return `<c:val><c:numRef><c:f>${f}</c:f><c:numCache>${fc}<c:ptCount val="${nPts}"/>${pts}</c:numCache>`;
  });
}

const urlModelo = (u) => new URL(`../modelos/gestao_a_vista_${u}.xlsx`, import.meta.url).href;

export async function gerarGestaoGV(u, ano, anos, { modelo = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  if (!UNIDADES_GV[u]) throw new Error(`DL desconhecido: ${u}`);
  const buf = modelo || await (await fetch(urlModelo(u))).arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const ler = (n) => zip.file(n).async('string');
  // Aba Dados pelo workbook.xml (não pela posição).
  const wb = await ler('xl/workbook.xml'), rels = await ler('xl/_rels/workbook.xml.rels');
  const rid = wb.match(/<sheet name="Dados"[^>]*r:id="(rId\d+)"/)[1];
  const alvo = `xl/${rels.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`)).slice(1).find(Boolean).replace(/^\/?xl\//, '')}`;
  const ss = [...(await ler('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  const memo = new Map(), calc = (a) => { if (!memo.has(a)) memo.set(a, anos[a] ? calcularAnoGV(anos[a]) : null); return memo.get(a); };
  const d = abaDados(await ler(alvo), ss, +ano, calc, (a) => anos[a]);
  zip.file(alvo, d.xml);
  // O Excel recalcula as fórmulas ao abrir (a aba oculta PLAN 2024 e os gráficos leem a Dados).
  zip.file('xl/workbook.xml', wb.replace(/<calcPr([^>]*?)\/>/, (t, a) => `<calcPr${a.replace(/\s*fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`));
  const cc0 = calc(+ano);
  for (const n of Object.keys(zip.files).filter((n) => /^xl\/charts\/chart\d+\.xml$/.test(n))) zip.file(n, graficoComCache(await ler(n), +ano, d.blocos[0], cc0));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export const nomeArquivoGV = (u, ano) => `GESTÃO À VISTA - ${UNIDADES_GV[u]} ${ano}.xlsx`;

export async function baixarGestaoGV(u, ano, anos, opcoes = {}) {
  const bytes = await gerarGestaoGV(u, ano, anos, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = nomeArquivoGV(u, ano); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { LINHA_GV };
