// Exportação do REPROG: um arquivo por revenda, IGUAL à aba Resumo da planilha oficial "CB NORTE/SUL - REPROGRAMAÇÃO".
// O modelo (docs/modelos/reprog_<NORTE|SUL>.xlsx, gerado por code/tools/modelo_reprog.ps1) é a própria planilha sem
// clientes e sem nomes: estilos, tema, larguras, farol (formatação condicional) e página ficam como estão. O Hub preenche:
//   - o quadro por supervisor (E:G): código, nome e CLI REPRO = CONT.SE na coluna SUP da lista (fórmula com o resultado);
//   - a linha do total (SOMA do quadro);
//   - a lista (B:J): código, razão social, cidade, vendedor, supervisor, dia de rota e DIAS REPROGRAMADOS, na ordem da tela.
// Os dados do cadastro vão como valor (a planilha usava PROCV na aba base, que não vai junto).
import { REVENDAS_RP, fdataRP } from './reprog.js?v=20261126-06';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const numOuTexto = (v) => (/^\d+$/.test(String(v ?? '')) ? +v : v);

function celula(ref, s, { v = null, f = null } = {}) {
  const st = s != null ? ` s="${s}"` : '';
  if (f) return ehNum(v) ? `<c r="${ref}"${st}><f>${esc(f)}</f><v>${v}</v></c>` : `<c r="${ref}"${st} t="str"><f>${esc(f)}</f><v>${esc(v ?? '')}</v></c>`;
  if (ehNum(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
  if (v != null && v !== '') return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  return `<c r="${ref}"${st}/>`;
}

// Linhas do modelo: [{r, abre (atributos sem r), cels: {col: {s, xml}}, textos: {col: texto}}].
function lerModelo(xml, ss) {
  const ini = xml.indexOf('<sheetData>'), fim = xml.indexOf('</sheetData>');
  const linhas = [];
  for (const m of xml.slice(ini, fim).matchAll(/<row ([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = +m[1].match(/\br="(\d+)"/)[1], cels = {}, textos = {};
    for (const c of (m[2] || '').matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = c[1].match(/\br="([A-Z]+)\d+"/)[1];
      cels[col] = { s: c[1].match(/\bs="(\d+)"/)?.[1] ?? null, xml: c[0] };
      const v = c[2]?.match(/<v>(\d+)<\/v>/)?.[1];
      if (/\bt="s"/.test(c[1]) && v != null) textos[col] = ss[+v];
    }
    linhas.push({ r, attrs: m[1].replace(/\s*\br="\d+"/, ''), cels, textos });
  }
  return { linhas, antes: xml.slice(0, ini), depois: xml.slice(fim + '</sheetData>'.length) };
}

const urlModelo = (u) => new URL(`../modelos/reprog_${u}.xlsx`, import.meta.url).href;

// r = resumoRP(...) (as linhas já na ordem da tela).
export async function gerarReprogRP(u, dia, r, { modelo = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  if (!REVENDAS_RP[u]) throw new Error(`Revenda desconhecida: ${u}`);
  const zip = await JSZip.loadAsync(modelo || await (await fetch(urlModelo(u))).arrayBuffer());
  const ler = (n) => zip.file(n).async('string');
  const ss = [...(await ler('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  const alvo = 'xl/worksheets/sheet1.xml';
  const { linhas, antes, depois } = lerModelo(await ler(alvo), ss);
  const L = (r0) => linhas.find((x) => x.r === r0);
  const cab = linhas.find((x) => Object.values(x.textos).includes('CÓD CLIENTE'));
  const tot = linhas.find((x) => Object.values(x.textos).some((t) => /^CB (NORTE|SUL)$/.test(t)));
  const modSup = L(3), modDado = linhas.find((x) => x.r === cab.r + 1);
  if (!cab || !tot || !modSup || !modDado) throw new Error('Modelo da exportação incompleto.');
  const st = (ln, col) => ln.cels[col]?.s ?? null;
  const row = (rn, attrs, cels) => `<row r="${rn}"${attrs ? ` ${attrs}` : ''}>${cels.join('')}</row>`;
  // Posições: quadro a partir da linha 3, total logo depois, uma linha vazia, cabeçalho e a lista.
  const nSup = r.quadro.length, rTot = 3 + nSup, rCab = rTot + 2, d0 = rCab + 1, dN = Math.max(d0, rCab + r.linhas.length);
  const out = [];
  for (const x of linhas.filter((x) => x.r <= 2)) out.push(row(x.r, x.attrs, Object.values(x.cels).map((c) => c.xml)));
  r.quadro.forEach((s, i) => {
    const rn = 3 + i, cels = [];
    if (i === 0) for (const col of ['A', 'B', 'C']) if (modSup.cels[col]) cels.push(celula(`${col}${rn}`, st(modSup, col)));
    // Clientes fora do cadastro ("—"): a coluna SUP da lista fica vazia, então vai o número (CONT.SE de vazio não conta).
    const semCad = s.sup === '—';
    cels.push(celula(`E${rn}`, st(modSup, 'E'), { v: semCad ? '—' : numOuTexto(s.sup) }));
    cels.push(celula(`F${rn}`, st(modSup, 'F'), { v: s.nome || (semCad ? 'SEM CADASTRO' : '') }));
    cels.push(celula(`G${rn}`, st(modSup, 'G'), semCad ? { v: s.n } : { v: s.n, f: `COUNTIF($G$${d0}:$G$${dN},E${rn})` }));
    out.push(row(rn, modSup.attrs, cels));
  });
  out.push(row(rTot, tot.attrs, [celula(`E${rTot}`, st(tot, 'E')), tot.cels.F.xml.replace(/r="F\d+"/, `r="F${rTot}"`),
    celula(`G${rTot}`, st(tot, 'G'), { v: r.linhas.length, f: `SUM(G3:G${rTot - 1})` })]));
  out.push(row(rCab, cab.attrs, Object.entries(cab.cels).map(([col, c]) => c.xml.replace(/r="[A-Z]+\d+"/, `r="${col}${rCab}"`))));
  r.linhas.forEach((l, i) => {
    const rn = d0 + i, v = { B: l.cli, C: l.razao || l.nomeRel || '', D: l.cidade, E: numOuTexto(l.vend), F: l.vendNome, G: numOuTexto(l.sup), H: l.supNome, I: l.pasta, J: l.dias ?? null };
    out.push(row(rn, modDado.attrs, Object.keys(v).map((col) => celula(`${col}${rn}`, st(modDado, col), { v: v[col] }))));
  });
  const ult = d0 + Math.max(0, r.linhas.length - 1);
  const a = antes.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:J${ult}"/>`);
  const dp = depois.replace(/<xm:sqref>J\d+:J\d+<\/xm:sqref>/, `<xm:sqref>J${d0}:J${ult}</xm:sqref>`);
  zip.file(alvo, `${a}<sheetData>${out.join('')}</sheetData>${dp}`);
  const wb = await ler('xl/workbook.xml');
  zip.file('xl/workbook.xml', /<calcPr/.test(wb) ? wb.replace(/<calcPr([^>]*?)\/>/, (t, x) => `<calcPr${x.replace(/\s*fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>'));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export const nomeArquivoRP = (u, dia) => `${REVENDAS_RP[u]} - REPROGRAMAÇÃO ${fdataRP(dia).slice(0, 5).replace('/', '-')}.xlsx`;

export async function baixarReprogRP(u, dia, r, opcoes = {}) {
  const bytes = await gerarReprogRP(u, dia, r, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = nomeArquivoRP(u, dia); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
