// Exportação das Cargas em aberto, como a planilha "Acompanhamento de Cargas em aberto.xlsx": a lista das vendas sem
// acerto (das mais antigas para as mais novas) e o quadro "carga em aberto mais antiga". O modelo (docs/modelos/
// cargas.xlsx, code/tools/modelo_cargas.ps1) é a própria planilha sem clientes. "ATUALIZADO EM" leva a data da extração
// (na planilha era HOJE(), que mudava o arquivo salvo a cada dia). A razão social só vai quando os dados a trazem
// (rascunho do admin).
import { REVENDAS } from './cargas.js?v=20261126-09';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const serie = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);

function celula(ref, s, { v = null, f = null } = {}) {
  const st = s != null ? ` s="${s}"` : '';
  if (f) return ehNum(v) ? `<c r="${ref}"${st}><f>${esc(f)}</f><v>${v}</v></c>` : `<c r="${ref}"${st} t="str"><f>${esc(f)}</f><v>${esc(v ?? '')}</v></c>`;
  if (ehNum(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
  if (v != null && v !== '') return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  return `<c r="${ref}"${st}/>`;
}

const urlModelo = () => new URL('../modelos/cargas.xlsx', import.meta.url).href;

// res = calcularCargas(foto) (ou o publicado): {data, revendas: {NORTE: {lista: [{cli, nome?, emissao, dias, cxu}]}, SUL}}.
export async function gerarCargasXlsx(res, { modelo = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  const lista = Object.entries(res?.revendas || {}).flatMap(([c, r]) => r.lista.map((l) => ({ ...l, rev: REVENDAS[c].bi })))
    .sort((a, b) => a.emissao.localeCompare(b.emissao) || b.cxu - a.cxu);
  if (!res?.data || !lista.length) throw new Error('Não há cargas em aberto para exportar nesta data.');
  const zip = await JSZip.loadAsync(modelo || await (await fetch(urlModelo())).arrayBuffer());
  const alvo = 'xl/worksheets/sheet1.xml', xml = await zip.file(alvo).async('string');
  const ini = xml.indexOf('<sheetData>'), fim = xml.indexOf('</sheetData>');
  const linhas = new Map();
  for (const m of xml.slice(ini, fim).matchAll(/<row ([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = +m[1].match(/\br="(\d+)"/)[1], cels = new Map();
    for (const c of (m[2] || '').matchAll(/<c ([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g)) cels.set(c[1].match(/\br="([A-Z]+)\d+"/)[1], { s: c[1].match(/\bs="(\d+)"/)?.[1] ?? null, xml: c[0] });
    linhas.set(r, { attrs: m[1].replace(/\s*\br="\d+"/, '').replace(/\s*\bspans="[^"]*"/, '').trim(), cels });
  }
  const mod = linhas.get(6);
  if (!mod || !linhas.get(3)) throw new Error('Modelo da exportação incompleto.');
  const st = (r, col) => linhas.get(r)?.cels.get(col)?.s ?? null;
  const hoje = serie(res.data), ult = 5 + lista.length;
  const out = [];
  const linha = (r, attrs, cels) => out.push(`<row r="${r}"${attrs ? ` ${attrs}` : ''}>${cels.join('')}</row>`);
  for (const r of [1, 2, 3, 4, 5]) {
    const l = linhas.get(r);
    if (!l) continue;
    linha(r, l.attrs, [...l.cels].map(([col, c]) => (r === 3 && col === 'B' ? celula('B3', c.s, { v: hoje }) : c.xml)));
  }
  // Quadro lateral (I6:L8): carga em aberto mais antiga de cada revenda.
  const lateral = (r) => {
    const l = linhas.get(r), cels = [];
    if (!l) return cels;
    for (const [col, c] of l.cels) {
      if (!['I', 'J', 'K', 'L'].includes(col)) continue;
      if (r <= 7 && (col === 'K' || col === 'L')) {
        const rev = r === 6 ? REVENDAS.NORTE.bi : REVENDAS.SUL.bi, antiga = lista.find((x) => x.rev === rev)?.dias ?? 0;
        cels.push(col === 'K' ? celula(`K${r}`, c.s, { v: antiga, f: `IFERROR(VLOOKUP(I${r},A:G,7,0),0)` })
          : celula(`L${r}`, c.s, { v: antiga === 1 ? 'DIA' : 'DIAS', f: `IF(K${r}=1,"DIA","DIAS")` }));
      } else cels.push(c.xml);
    }
    return cels;
  };
  for (let r = 6; r <= Math.max(ult, 8); r++) {
    const l = lista[r - 6];
    const dados = l ? [
      celula(`A${r}`, st(6, 'A'), { v: l.rev }), celula(`B${r}`, st(6, 'B'), { v: l.cli }), celula(`C${r}`, st(6, 'C'), { v: l.nome || '' }),
      celula(`D${r}`, st(6, 'D'), { v: '-' }), celula(`E${r}`, st(6, 'E'), { v: serie(l.emissao) }), celula(`F${r}`, st(6, 'F'), { v: l.cxu }),
      celula(`G${r}`, st(6, 'G'), { v: hoje - serie(l.emissao), f: `IF(D${r}="-",$B$3-E${r},0)` }),
    ] : [];
    linha(r, (r <= 8 ? linhas.get(r) : mod)?.attrs ?? mod.attrs, [...dados, ...(r <= 8 ? lateral(r) : [])]);
  }
  const faixa = (t) => t.replace(/G6:G\d+/g, `G6:G${Math.max(6, ult)}`);
  const antes = xml.slice(0, ini).replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:L${Math.max(ult, 8)}"/>`);
  const depois = faixa(xml.slice(fim + '</sheetData>'.length));
  zip.file(alvo, `${antes}<sheetData>${out.join('')}</sheetData>${depois}`);
  const wb = await zip.file('xl/workbook.xml').async('string');
  zip.file('xl/workbook.xml', /<calcPr/.test(wb) ? wb.replace(/<calcPr([^>]*?)\/>/, (t, x) => `<calcPr${x.replace(/\s*fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>'));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export const nomeArquivoCargas = (data) => `Acompanhamento de Cargas em aberto ${data.slice(8, 10)}-${data.slice(5, 7)}.xlsx`;

export async function baixarCargas(res, opcoes = {}) {
  const bytes = await gerarCargasXlsx(res, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = nomeArquivoCargas(res.data); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
