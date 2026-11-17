// Fluxo comum de exportação: carrega XLSM escolhido pelo usuário, altera células
// de uma cópia em memória e baixa um novo arquivo. O original nunca é enviado.
const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const DOC_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

function parseXml(s) {
  const d = new DOMParser().parseFromString(s, 'application/xml');
  if (d.getElementsByTagName('parsererror').length) throw new Error('O modelo Excel contém um XML inválido.');
  return d;
}

function documentoDe(node) {
  return node?.nodeType === 9 ? node : node?.ownerDocument;
}

export async function abrirModeloXlsm(file) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação XLSM não carregou. Atualize a página e tente novamente.');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const wbFile = zip.file('xl/workbook.xml'), relFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!wbFile || !relFile) throw new Error('Selecione um modelo Excel válido (.xlsx ou .xlsm).');
  const [wbXml, relXml] = await Promise.all([wbFile.async('string'), relFile.async('string')]);
  return { zip, workbook: parseXml(wbXml), relations: parseXml(relXml) };
}

export async function lerAbaXlsm(modelo, nome) {
  const sheets = modelo.workbook.getElementsByTagNameNS(MAIN, 'sheet');
  const sh = [...sheets].find((s) => s.getAttribute('name') === nome);
  if (!sh) throw new Error(`A aba ${nome} não existe no modelo.`);
  const id = sh.getAttributeNS(DOC_REL, 'id');
  const rel = [...modelo.relations.getElementsByTagNameNS(PKG_REL, 'Relationship')].find((r) => r.getAttribute('Id') === id);
  if (!rel) throw new Error(`Não localizei a relação da aba ${nome}.`);
  const target = rel.getAttribute('Target').replace(/^\//, '');
  const path = target.startsWith('xl/') ? target : `xl/${target}`;
  const file = modelo.zip.file(path);
  if (!file) throw new Error(`O XML da aba ${nome} não foi encontrado no modelo.`);
  const xml = await file.async('string');
  return { path, xml: parseXml(xml) };
}

function encontrarCelula(ws, ref) {
  return [...ws.getElementsByTagNameNS(MAIN, 'c')].find((c) => c.getAttribute('r') === ref) || null;
}

function indiceColuna(ref) {
  let n = 0;
  for (const c of ref.match(/^[A-Z]+/)[0]) n = n * 26 + c.charCodeAt(0) - 64;
  return n;
}

function nomeColuna(n) {
  let s = '';
  while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function atualizarDimensao(ws) {
  const refs = [...ws.getElementsByTagNameNS(MAIN, 'c')].map((c) => c.getAttribute('r')?.match(/^([A-Z]+)(\d+)$/)).filter(Boolean);
  if (!refs.length) return;
  const col = Math.max(...refs.map((r) => indiceColuna(`${r[1]}1`))), row = Math.max(...refs.map((r) => Number(r[2])));
  let dimension = ws.getElementsByTagNameNS(MAIN, 'dimension')[0];
  if (!dimension) {
    dimension = documentoDe(ws).createElementNS(MAIN, 'dimension');
    ws.documentElement.insertBefore(dimension, ws.documentElement.firstChild);
  }
  dimension.setAttribute('ref', `A1:${nomeColuna(col)}${row}`);
}

function criarCelulaXlsm(ws, ref) {
  const doc = documentoDe(ws), rowNum = ref.match(/\d+$/)[0];
  let row = [...ws.getElementsByTagNameNS(MAIN, 'row')].find((r) => r.getAttribute('r') === rowNum);
  if (!row) {
    const data = ws.getElementsByTagNameNS(MAIN, 'sheetData')[0];
    if (!data) throw new Error('A folha do modelo não possui sheetData.');
    row = doc.createElementNS(MAIN, 'row'); row.setAttribute('r', rowNum);
    const next = [...data.getElementsByTagNameNS(MAIN, 'row')].find((r) => Number(r.getAttribute('r')) > Number(rowNum));
    if (next) data.insertBefore(row, next); else data.appendChild(row);
  }
  const targetCol = indiceColuna(ref);
  const cells = [...row.getElementsByTagNameNS(MAIN, 'c')];
  const modelo = cells.find((c) => indiceColuna(c.getAttribute('r')) === targetCol - 1)
    || cells.find((c) => indiceColuna(c.getAttribute('r')) === targetCol + 1)
    || [...ws.getElementsByTagNameNS(MAIN, 'c')].find((c) => c.getAttribute('r').match(/\d+$/)[0] !== rowNum && indiceColuna(c.getAttribute('r')) === targetCol);
  const c = doc.createElementNS(MAIN, 'c'); c.setAttribute('r', ref);
  if (modelo?.hasAttribute('s')) c.setAttribute('s', modelo.getAttribute('s'));
  const next = cells.find((x) => indiceColuna(x.getAttribute('r')) > targetCol);
  if (next) row.insertBefore(c, next); else row.appendChild(c);
  return c;
}

function limparConteudo(c) {
  for (const n of [...c.childNodes]) if (n.nodeType === 1 && ['f', 'v', 'is'].includes(n.localName)) c.removeChild(n);
}

export function definirNumeroXlsm(ws, ref, valor) {
  const c = encontrarCelula(ws, ref);
  if (!c) throw new Error(`O modelo não tem a célula ${ref}.`);
  limparConteudo(c);
  if (valor == null || valor === '') { c.removeAttribute('t'); return; }
  const n = Number(valor);
  if (!Number.isFinite(n)) throw new Error(`Valor inválido para ${ref}.`);
  c.setAttribute('t', 'n');
  const v = documentoDe(ws).createElementNS(MAIN, 'v'); v.textContent = String(n); c.appendChild(v);
}

export function definirNumeroSeExistirXlsm(ws, ref, valor) {
  const c = encontrarCelula(ws, ref);
  if (!c) return false;
  definirNumeroXlsm(ws, ref, valor);
  return true;
}

export function definirNumeroPreservandoFormulaXlsm(ws, ref, valor) {
  const c = encontrarCelula(ws, ref);
  if (!c || c.getElementsByTagNameNS(MAIN, 'f').length) return false;
  definirNumeroXlsm(ws, ref, valor);
  return true;
}

export function definirNumeroCriandoXlsm(ws, ref, valor) {
  if (!encontrarCelula(ws, ref)) criarCelulaXlsm(ws, ref);
  definirNumeroXlsm(ws, ref, valor);
}

export function limparCelulaXlsm(ws, ref) {
  const c = encontrarCelula(ws, ref);
  if (!c) return false;
  limparConteudo(c); c.removeAttribute('t'); return true;
}

export function definirTextoCriandoXlsm(ws, ref, valor) {
  if (!encontrarCelula(ws, ref)) criarCelulaXlsm(ws, ref);
  definirTextoXlsm(ws, ref, valor);
}

export function definirTextoXlsm(ws, ref, valor) {
  const c = encontrarCelula(ws, ref);
  if (!c) throw new Error(`O modelo não tem a célula ${ref}.`);
  const doc = documentoDe(ws);
  limparConteudo(c); c.setAttribute('t', 'inlineStr');
  const is = doc.createElementNS(MAIN, 'is'), t = doc.createElementNS(MAIN, 't');
  t.textContent = String(valor); is.appendChild(t); c.appendChild(is);
}

export function definirTextoSeExistirXlsm(ws, ref, valor) {
  const c = encontrarCelula(ws, ref);
  if (!c) return false;
  definirTextoXlsm(ws, ref, valor);
  return true;
}

export async function baixarModeloXlsm(modelo, planilhas, nomeArquivo) {
  for (const { path, xml } of planilhas) { atualizarDimensao(xml); modelo.zip.file(path, new XMLSerializer().serializeToString(xml)); }
  let calc = modelo.workbook.getElementsByTagNameNS(MAIN, 'calcPr')[0];
  if (!calc) { calc = modelo.workbook.createElementNS(MAIN, 'calcPr'); modelo.workbook.documentElement.appendChild(calc); }
  calc.setAttribute('calcMode', 'auto'); calc.setAttribute('fullCalcOnLoad', '1'); calc.setAttribute('forceFullCalc', '1');
  modelo.zip.file('xl/workbook.xml', new XMLSerializer().serializeToString(modelo.workbook));
  const xlsx = nomeArquivo.toLowerCase().endsWith('.xlsx');
  const blob = await modelo.zip.generateAsync({ type: 'blob', mimeType: xlsx ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/vnd.ms-excel.sheet.macroEnabled.12', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nomeArquivo; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
