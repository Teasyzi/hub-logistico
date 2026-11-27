// Exportação do 1x1 do mês, como a planilha "NN - Acompanhamento de transportes - 1x1": RESUMO e uma aba por unidade
// (lista de cargas, quadro por dia e quadro por motorista). O modelo (docs/modelos/transportes.xlsx,
// code/tools/modelo_transportes.ps1) é a própria planilha sem cargas e sem nomes. Só entram as cargas que contam.
// O possível vai como a fórmula da planilha; quando há abono (automático ou do admin), vai o valor.
import { UNIDADES_TX, META_CUB_TX, TOLERANCIA_TX, resumoTX } from './transportes.js?v=20261127-2';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const limpo = (v) => (ehNum(v) ? Math.round(v * 1e9) / 1e9 || 0 : v);
const nCol = (c) => [...c].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0);
const serie = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);
const media = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);

function celula(ref, s, { v = null, f = null } = {}) {
  const st = s != null ? ` s="${s}"` : '';
  v = limpo(v);
  if (f) return ehNum(v) ? `<c r="${ref}"${st}><f>${esc(f)}</f><v>${v}</v></c>` : `<c r="${ref}"${st} t="str"><f>${esc(f)}</f><v>${esc(v ?? '-')}</v></c>`;
  if (ehNum(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
  if (v != null && v !== '') return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  return `<c r="${ref}"${st}/>`;
}

function lerAba(xml) {
  const ini = xml.indexOf('<sheetData>'), fim = xml.indexOf('</sheetData>');
  const linhas = new Map();
  for (const m of xml.slice(ini, fim).matchAll(/<row ([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = +m[1].match(/\br="(\d+)"/)[1], cels = new Map();
    for (const c of (m[2] || '').matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = c[1].match(/\br="([A-Z]+)\d+"/)[1];
      cels.set(col, { s: c[1].match(/\bs="(\d+)"/)?.[1] ?? null, f: c[2]?.match(/<f>([\s\S]*?)<\/f>/)?.[1] ?? null, xml: c[0] });
    }
    linhas.set(r, { attrs: m[1].replace(/\s*\br="\d+"/, '').replace(/\s*\bspans="[^"]*"/, '').replace(/\s*\/$/, '').trim(), cels });
  }
  return { linhas, antes: xml.slice(0, ini), depois: xml.slice(fim + '</sheetData>'.length) };
}

const montar = (linhas) => [...linhas].sort((a, b) => a[0] - b[0]).map(([r, l]) => `<row r="${r}"${l.attrs ? ` ${l.attrs}` : ''}>${[...l.cels].sort((a, b) => nCol(a[0]) - nCol(b[0])).map(([, c]) => c.xml).join('')}</row>`).join('');
// Grava numa célula do modelo, mantendo o estilo; sem f, mantém a fórmula que o modelo tiver quando manter = true.
function por(linhas, ref, dado, manter = false) {
  const [, col, row] = ref.match(/([A-Z]+)(\d+)/);
  const l = linhas.get(+row), atual = l?.cels.get(col);
  if (!l) return;
  const f = manter && atual?.f ? atual.f.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&') : dado.f;
  l.cels.set(col, { s: atual?.s ?? null, f: f ?? null, xml: celula(ref, atual?.s ?? null, { v: dado.v, f }) });
}

const COLUNAS = {
  da: { data: 'B', rota: 'C', placa: 'D', veic: 'E', curto: 'F', nome: 'G', poss: 'H', aj: 'I', cub: 'J', dif: 'L', metaCub: 'J2',
    topo: ['H5', 'I5', 'J5'], ontem: ['N3', 'O3', 'P3', 'R3'], total: ['O5', 'P5', 'R5'], dia: ['N', 'O', 'P', 'R'], mot: ['T', 'U', 'V', 'X'] },
  dl: { data: 'B', curto: 'C', nome: 'D', poss: 'E', aj: 'F', cub: 'G', dif: 'I', metaCub: 'G2',
    topo: ['E5', 'F5', 'G5'], ontem: ['K3', 'L3', 'M3', 'O3'], total: ['L5', 'M5', 'O5'], dia: ['K', 'L', 'M', 'O'], mot: ['Q', 'R', 'S', 'U'] },
};
const ABAS = [['NORTE', 2, 'da'], ['SUL', 3, 'da'], ['CBAR', 4, 'dl'], ['CCRT', 5, 'dl']];

function abaUnidade(xml, u, tipo, d, mes) {
  const C = COLUNAS[tipo], { linhas, antes, depois } = lerAba(xml), mod = linhas.get(8);
  if (!mod) throw new Error('Modelo da exportação incompleto.');
  linhas.delete(8);
  const metaCub = d?.metaCub || META_CUB_TX[u];
  const cargas = [...(d?.cargas || [])].filter((c) => c.conta);
  const nDias = new Date(+mes.slice(0, 4), +mes.slice(5, 7), 0).getDate();
  const dias = Array.from({ length: nDias }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
  const nomes = [...new Set(cargas.map((c) => c.motorista).filter(Boolean))];
  const porMot = nomes.map((nome) => { const l = cargas.filter((c) => c.motorista === nome); return { nome, poss: media(l.map((c) => c.poss)), aj: media(l.map((c) => c.aj)) }; })
    .sort((a, b) => (b.aj - b.poss) - (a.aj - a.poss) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const fim = { dados: 7 + Math.max(1, cargas.length), dias: 7 + nDias, mot: 7 + Math.max(1, porMot.length) };
  const ultimo = Math.max(fim.dados, fim.dias, fim.mot);
  const celMod = (col, r, dado) => { const s = mod.cels.get(col)?.s ?? null; return { s, xml: celula(`${col}${r}`, s, dado) }; };
  for (let r = 8; r <= ultimo; r++) linhas.set(r, { attrs: mod.attrs, cels: new Map() });

  const ref = `$${C.metaCub[0]}$2`;
  cargas.forEach((c, i) => {
    const r = 8 + i, cels = linhas.get(r).cels, regra = (c.cub <= metaCub ? 1 : 2) * TOLERANCIA_TX;
    const set = (col, dado) => col && cels.set(col, celMod(col, r, dado));
    set(C.data, { v: serie(c.data) });
    set(C.rota, { v: c.rota });
    set(C.placa, { v: c.placa });
    set(C.veic, { v: c.veiculo }); // texto, como na planilha (coluna oculta)
    set(C.curto, { v: c.motoristaArquivo || c.motorista });
    set(C.nome, { v: c.motorista });
    set(C.poss, Math.abs(c.poss - regra) < 1e-6 ? { v: c.poss, f: `IF(${C.cub}${r}<=${ref},1,IF(${C.cub}${r}>${ref},2))*1.05` } : { v: c.poss });
    set(C.aj, { v: c.aj });
    set(C.cub, { v: c.cub });
    set(C.dif, { v: c.aj - c.poss, f: `${C.aj}${r}-${C.poss}${r}` });
  });

  // Quadro por dia (todos os dias do mês).
  const [cd, cp, ca, cf] = C.dia;
  const porDia = dias.map((dia) => { const l = cargas.filter((c) => c.data === dia); return { dia, poss: media(l.map((c) => c.poss)), aj: media(l.map((c) => c.aj)) }; });
  porDia.forEach((x, i) => {
    const r = 8 + i, cels = linhas.get(r).cels;
    const mediaDe = (col, v) => ({ v: v ?? '-', f: `IFERROR(SUMIF($${C.data}:$${C.data},${cd}${r},${col}:${col})/COUNTIF($${C.data}:$${C.data},${cd}${r}),"-")` });
    cels.set(cd, celMod(cd, r, { v: serie(x.dia) }));
    cels.set(cp, celMod(cp, r, mediaDe(C.poss, x.poss)));
    cels.set(ca, celMod(ca, r, mediaDe(C.aj, x.aj)));
    cels.set(cf, celMod(cf, r, { v: x.aj == null ? '-' : x.aj - x.poss, f: `IFERROR(${ca}${r}-${cp}${r},"-")` }));
  });

  // Quadro por motorista.
  const [mn, mp, ma, md] = C.mot;
  porMot.forEach((m, i) => {
    const r = 8 + i, cels = linhas.get(r).cels;
    const mediaDe = (col, v) => ({ v, f: `SUMIF(${C.nome}:${C.nome},${mn}${r},${col}:${col})/COUNTIF(${C.nome}:${C.nome},${mn}${r})` });
    cels.set(mn, celMod(mn, r, { v: m.nome }));
    cels.set(mp, celMod(mp, r, mediaDe(C.poss, m.poss)));
    cels.set(ma, celMod(ma, r, mediaDe(C.aj, m.aj)));
    cels.set(md, celMod(md, r, { v: m.aj - m.poss, f: `${ma}${r}-${mp}${r}` }));
  });

  // Topo: metas, médias do mês, total do quadro por dia e o último dia lançado ("dia anterior").
  const meta = media(cargas.map((c) => c.poss)), real = media(cargas.map((c) => c.aj));
  const comDado = porDia.filter((x) => x.aj != null), ult = comDado.at(-1) || null;
  por(linhas, C.metaCub, { v: metaCub }, true);
  const [h, i, j] = C.topo;
  por(linhas, h, { v: meta ?? '-', f: `IFERROR(AVERAGE(${C.poss}8:${C.poss}1048576),"-")` });
  por(linhas, i, { v: real ?? '-', f: `IFERROR(AVERAGE(${C.aj}8:${C.aj}1048576),"-")` });
  por(linhas, j, { v: meta ? real / meta - 1 : '-', f: `IFERROR(${i}/${h}-1,"-")` });
  const tp = media(comDado.map((x) => x.poss)), ta = media(comDado.map((x) => x.aj)), [t1, t2, t3] = C.total;
  por(linhas, t1, { v: tp ?? '-', f: `IFERROR(AVERAGE(${cp}8:${cp}${fim.dias}),"-")` });
  por(linhas, t2, { v: ta ?? '-', f: `IFERROR(AVERAGE(${ca}8:${ca}${fim.dias}),"-")` });
  por(linhas, t3, { v: ta == null ? '-' : ta - tp, f: `IFERROR(${t2}-${t1},"-")` });
  const [o1, o2, o3, o4] = C.ontem;
  por(linhas, o1, { v: ult ? serie(ult.dia) : null });
  por(linhas, o2, { v: ult?.poss ?? null });
  por(linhas, o3, { v: ult?.aj ?? null });
  por(linhas, o4, ult ? { v: ult.aj - ult.poss, f: `${o3}-${o2}` } : { v: null });

  // Setas e destaques de repetidos acompanham o tamanho de cada quadro.
  const grupo = (col) => (C.dia.includes(col) ? fim.dias : C.mot.includes(col) ? fim.mot : fim.dados);
  const faixa = (t) => t.replace(/([A-Z]+)(\d+):\1(\d+)/g, (todo, col, a, b) => (+a >= 8 && +b < 1000000 ? `${col}${a}:${col}${grupo(col)}` : todo));
  const dp = depois.replace(/sqref="([^"]*)"/g, (m, s) => `sqref="${faixa(s)}"`).replace(/<xm:sqref>([^<]*)<\/xm:sqref>/g, (m, s) => `<xm:sqref>${faixa(s)}</xm:sqref>`);
  const a = antes.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:Y${ultimo}"/>`);
  return { xml: `${a}<sheetData>${montar(linhas)}</sheetData>${dp}`, meta, real, ontem: ult?.aj ?? null };
}

const urlModelo = () => new URL('../modelos/transportes.xlsx', import.meta.url).href;

// r = calcularTX(...) ou o publicado: {unidades: {U: {cargas, metaCub}}}.
export async function gerarTransportesXlsx(r, mes, { modelo = null } = {}) {
  if (!globalThis.JSZip) throw new Error('O componente de exportação não carregou. Atualize a página e tente novamente.');
  const un = r?.unidades || {};
  const todas = Object.keys(UNIDADES_TX).flatMap((u) => (un[u]?.cargas || []).filter((c) => c.conta));
  if (!todas.length) throw new Error('Não há cargas do 1x1 para exportar neste mês.');
  const zip = await JSZip.loadAsync(modelo || await (await fetch(urlModelo())).arrayBuffer());
  const ler = (n) => zip.file(n).async('string');
  const res = {};
  for (const [u, n, tipo] of ABAS) {
    const alvo = `xl/worksheets/sheet${n}.xml`;
    const x = abaUnidade(await ler(alvo), u, tipo, un[u], mes);
    zip.file(alvo, x.xml);
    res[u] = x;
  }
  // RESUMO: as fórmulas da planilha continuam; só os resultados são preenchidos.
  const { linhas, antes, depois } = lerAba(await ler('xl/worksheets/sheet1.xml'));
  const ult = todas.map((c) => c.data).sort().at(-1);
  por(linhas, 'A3', { v: `ATUALIZADO EM: ${ult.split('-').reverse().join('/')}` });
  const dif = (meta, real) => (meta ? real / meta - 1 : '-');
  ['NORTE', 'SUL', 'CBAR', 'CCRT'].forEach((u, i) => {
    const l = 7 + i, x = res[u];
    por(linhas, `C${l}`, { v: x.meta ?? '-' }, true);
    por(linhas, `D${l}`, { v: x.ontem ?? '-' }, x.ontem != null); // sem lançamento: traço, não zero
    por(linhas, `E${l}`, { v: x.real ?? '-' }, true);
    por(linhas, `F${l}`, { v: dif(x.meta, x.real), f: `IFERROR(E${l}/C${l}-1,"-")` });
  });
  const meta = media(todas.map((c) => c.poss)), real = media(todas.map((c) => c.aj));
  const g = resumoTX(Object.fromEntries(Object.keys(UNIDADES_TX).map((u) => [u, { cargas: (un[u]?.cargas || []), totais: { cargas: res[u].real == null ? 0 : 1, meta: res[u].meta, realizado: res[u].real, ultimoDia: res[u].ontem == null ? null : { realizado: res[u].ontem } } }]))).geral;
  por(linhas, 'C12', { v: meta }, true);
  por(linhas, 'D12', { v: g.diaAnterior ?? '-' }, true);
  por(linhas, 'E12', { v: real }, true);
  por(linhas, 'F12', { v: dif(meta, real), f: 'IFERROR(E12/C12-1,"-")' });
  por(linhas, 'H12', { v: g.metaCub }, true);
  zip.file('xl/worksheets/sheet1.xml', `${antes}<sheetData>${montar(linhas)}</sheetData>${depois}`);
  const wb = await ler('xl/workbook.xml');
  zip.file('xl/workbook.xml', /<calcPr/.test(wb) ? wb.replace(/<calcPr([^>]*?)\/>/, (t, x) => `<calcPr${x.replace(/\s*fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : wb.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>'));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const nomeArquivo1x1 = (mes) => `${mes.slice(5, 7)} - Acompanhamento de transportes - 1x1 - ${MESES[+mes.slice(5, 7) - 1]}.xlsx`;

export async function baixarTransportes(r, mes, opcoes = {}) {
  const bytes = await gerarTransportesXlsx(r, mes, opcoes);
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })), a = document.createElement('a');
  a.href = url; a.download = nomeArquivo1x1(mes); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
