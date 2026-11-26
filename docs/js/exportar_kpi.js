// Exportação do KPI: IGUAL à aba "LOGÍSTICA E DISTRIBUIÇÃO" da planilha oficial. O modelo (docs/modelos/kpi.xlsx,
// gerado por code/tools/modelo_kpi.ps1) é a própria aba sem os números: estilos, tema, larguras, mesclagens, colunas
// ocultas do Kardex, formatação condicional (farol) e área de impressão ficam como estão. O Hub escreve o número de
// cada célula do catálogo (kpi.js) no lugar dela, como valor (a planilha oficial também guarda valores).
// A aba oculta "Montagem das cargas" não vai: os números dela que o KPI usa já estão nas células.
import { CELULAS_KPI, calcularKPI } from './kpi.js?v=20261126-05';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function celula(ref, s, v, traco) {
  const st = s != null ? ` s="${s}"` : '';
  if (ehNum(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
  if (traco === '') return `<c r="${ref}"${st} t="inlineStr"><is><t></t></is></c>`;
  if (traco) return `<c r="${ref}"${st} t="inlineStr"><is><t>-</t></is></c>`;
  return `<c r="${ref}"${st}/>`;
}

const urlModelo = () => new URL('../modelos/kpi.xlsx', import.meta.url).href;

// valores: o que vale nas células de entrada do mês (efetivoKPI ou publicado).
export async function gerarKPI(mes, valores, { modelo = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  const zip = await JSZip.loadAsync(modelo || await (await fetch(urlModelo())).arrayBuffer());
  const alvo = 'xl/worksheets/sheet1.xml', xml = await zip.file(alvo).async('string');
  const cc = calcularKPI(valores);
  const feitas = new Set();
  const novo = xml.replace(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g, (tudo, ref, attrs) => {
    const c = CELULAS_KPI[ref];
    if (!c || c.oculta) return tudo;
    feitas.add(ref);
    return celula(ref, attrs.match(/\bs="(\d+)"/)?.[1] ?? null, cc[ref], c.traco);
  });
  const faltam = Object.values(CELULAS_KPI).filter((c) => !c.oculta && !feitas.has(c.r)).map((c) => c.r);
  if (faltam.length) throw new Error(`Modelo da exportação incompleto: faltam as células ${faltam.join(', ')}.`);
  zip.file(alvo, novo);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export const nomeArquivoKPI = (mes) => `KPI Distribuição e Logística - ${MESES[+mes.slice(5, 7) - 1]}.xlsx`;

export async function baixarKPI(mes, valores, opcoes = {}) {
  const bytes = await gerarKPI(mes, valores, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = nomeArquivoKPI(mes); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
