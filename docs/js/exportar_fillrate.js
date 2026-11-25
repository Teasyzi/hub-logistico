// Exportação do Fill rate: planilha .xlsx do comparativo mês a mês (SheetJS, global XLSX).
//   COMPARATIVO          o quadro do RESUMO de cada mês (CB NORTE, CB SUL, GERAL) com o link "Detalhes" de cada revenda,
//                        e o acumulado do ano.
//   "JAN NORTE", …       uma aba por revenda e mês, no layout da planilha de Insuficiência: cabeçalho, "por data e
//                        produto", "por dia" e "por produto". O A1 volta para o COMPARATIVO.
// porMes: {AAAA-MM: {unidades: {NORTE|SUL: unidade calculada (totais, dias, produtos, detalhe)}, geral}}
import { UNIDADES_FR, META_FR, comparativoFR, resumoMesFR } from './fillrate.js?v=20261125-10';

const NOMES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const nomeMes = (mes) => `${NOMES[+mes.slice(5, 7) - 1]}/${mes.slice(0, 4)}`;
export const abaDetalheFR = (mes, u) => `${NOMES[+mes.slice(5, 7) - 1].slice(0, 3).replace('Ç', 'C')} ${u}`;
const link = (aba) => `#'${aba}'!A1`;
const Z = { cx: '#,##0.00', pct: '0.00%', meta: '0%', data: 'dd/mm/yyyy' };
const serial = (iso) => (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000;
const codigo = (c) => (c == null ? '' : /^\d+$/.test(String(c)) ? Number(c) : String(c));

// Folha montada célula a célula (para ter formato de número e link).
function folha() {
  const ws = {};
  let maxR = 0, maxC = 0;
  const set = (r, c, v, z, alvo) => {
    if (v == null || v === '') return;
    const cel = typeof v === 'number' ? { t: 'n', v } : { t: 's', v: String(v) };
    if (z && cel.t === 'n') cel.z = z;
    if (alvo) cel.l = { Target: alvo, Tooltip: 'Abrir' };
    ws[XLSX.utils.encode_cell({ r, c })] = cel;
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  };
  const fim = (larguras) => { ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } }); ws['!cols'] = larguras.map((w) => ({ wch: w })); return ws; };
  return { set, fim };
}

const CAB = ['REVENDA', 'META %', 'META (CX UNIT)', 'PEDIDO ENTREGUE (CX UNIT)', 'FALTA DE ESTOQUE (CX UNIT)', 'INSUFICIÊNCIA %', 'FILL RATE %', 'ACIMA DA META (CX UNIT)', 'ATÉ', 'DETALHES'];
function linhaResumo(f, r, rot, x, alvo) {
  f.set(r, 0, rot);
  if (!x) { f.set(r, 1, 'sem dados no mês'); return; }
  const t = x.totais;
  [[1, t.meta, Z.meta], [2, t.metaCx, Z.cx], [3, t.entregue, Z.cx], [4, t.falta, Z.cx], [5, t.insuf, Z.pct], [6, t.fillRate, Z.pct], [7, t.acimaMeta, Z.cx]]
    .forEach(([c, v, z]) => f.set(r, c, v, z));
  if (x.ultimoDia?.data) f.set(r, 8, serial(x.ultimoDia.data), Z.data);
  if (alvo) f.set(r, 9, 'Detalhes →', null, link(alvo));
}

function abaComparativo(ano, porMes, mesAtual) {
  const resumos = Object.fromEntries(Object.entries(porMes).map(([m, r]) => [m, resumoMesFR(r)]));
  const c = comparativoFR(resumos, ano), f = folha();
  f.set(0, 0, `FILL RATE · INSUFICIÊNCIA DE ESTOQUE — COMPARATIVO MÊS A MÊS ${ano}`);
  f.set(1, 0, `Insuficiência % = falta ÷ (pedido entregue + falta), em CX UNIT. Fill rate = 100% − insuficiência. Meta: insuficiência até ${META_FR * 100}%; meta em CX UNIT = ${META_FR * 100}% do pedido.`);
  let r = 3;
  const cab = () => { CAB.forEach((t, i) => f.set(r, i, t)); r++; };
  for (const mes of c.meses) {
    const pega = (s) => s.linhas.find((l) => l.mes === mes);
    f.set(r++, 0, `${nomeMes(mes)}${mes === mesAtual ? ' (parcial)' : ''}`);
    cab();
    for (const u of Object.keys(UNIDADES_FR)) { const x = pega(c.unidades[u]); linhaResumo(f, r++, UNIDADES_FR[u].toUpperCase(), x, x ? abaDetalheFR(mes, u) : null); }
    linhaResumo(f, r++, 'GERAL', pega(c.geral), null);
    r++;
  }
  f.set(r++, 0, `ACUMULADO ${ano}`);
  cab();
  const acm = (s) => (s.acumulado ? { totais: s.acumulado, ultimoDia: s.linhas.at(-1)?.ultimoDia } : null);
  for (const u of Object.keys(UNIDADES_FR)) linhaResumo(f, r++, UNIDADES_FR[u].toUpperCase(), acm(c.unidades[u]), null);
  linhaResumo(f, r++, 'GERAL', acm(c.geral), null);
  f.set(r + 1, 0, 'Acumulado = falta ÷ pedido somados dos meses (não é a média dos %).');
  return { ws: f.fim([22, 9, 16, 24, 24, 15, 13, 22, 12, 12]), meses: c.meses };
}

function abaDetalhe(u, mes, d) {
  const f = folha(), t = d.totais;
  f.set(0, 0, '← COMPARATIVO', null, link('COMPARATIVO'));
  f.set(0, 1, `${UNIDADES_FR[u].toUpperCase()} - INSUFICIÊNCIA DE ESTOQUE · ${nomeMes(mes)}`);
  ['META %', 'META (CX UNIT)', 'PEDIDO ENTREGUE', 'FALTA DE ESTOQUE', 'INSUFICIÊNCIA %', 'FILL RATE %', 'ACIMA DA META'].forEach((x, i) => f.set(2, 1 + i, x));
  [[t.meta, Z.meta], [t.metaCx, Z.cx], [t.entregue, Z.cx], [t.falta, Z.cx], [t.insuf, Z.pct], [t.fillRate, Z.pct], [t.acimaMeta, Z.cx]].forEach(([v, z], i) => f.set(3, 1 + i, v, z));
  f.set(5, 1, 'INFORMAÇÃO POR DATA E PRODUTO'); f.set(5, 10, 'INFORMAÇÃO POR DIA'); f.set(5, 15, 'INFORMAÇÃO POR PRODUTO');
  ['DA', 'CATEGORIA', 'CÓD', 'PROD DESCR', 'DATA', 'PEDIDO ENTREGUE', 'FALTA DE ESTOQUE', 'INSUF. %'].forEach((x, i) => f.set(6, 1 + i, x));
  ['DATA', 'PEDIDO ENTREGUE', 'FALTA DE ESTOQUE', 'INSUF. %'].forEach((x, i) => f.set(6, 10 + i, x));
  ['PROD DESCR', 'CATEGORIA', 'CÓD', 'FALTA DE ESTOQUE', '% DA FALTA', 'INSUF. %'].forEach((x, i) => f.set(6, 15 + i, x));
  d.detalhe.forEach((x, i) => {
    const r = 7 + i;
    f.set(r, 1, UNIDADES_FR[u]); f.set(r, 2, x.cat); f.set(r, 3, codigo(x.cod)); f.set(r, 4, x.prod); f.set(r, 5, serial(x.data), Z.data);
    f.set(r, 6, x.ent, Z.cx); f.set(r, 7, x.falta, Z.cx); f.set(r, 8, x.pct, Z.pct);
  });
  f.set(7, 10, 'Totais'); f.set(7, 11, t.entregue, Z.cx); f.set(7, 12, t.falta, Z.cx); f.set(7, 13, t.insuf, Z.pct);
  d.dias.forEach((x, i) => { const r = 8 + i; f.set(r, 10, serial(x.data), Z.data); f.set(r, 11, x.ent, Z.cx); f.set(r, 12, x.falta, Z.cx); f.set(r, 13, x.pct, Z.pct); });
  // O código do "por produto" sai do detalhe (o mesmo produto tem o mesmo código em todas as linhas).
  const cods = new Map(d.detalhe.map((x) => [x.prod, x.cod]));
  f.set(7, 15, 'Totais'); f.set(7, 18, t.falta, Z.cx); f.set(7, 19, 1, Z.pct); f.set(7, 20, t.insuf, Z.pct);
  d.produtos.forEach((x, i) => {
    const r = 8 + i;
    f.set(r, 15, x.prod); f.set(r, 16, x.cat); f.set(r, 17, codigo(x.cod ?? cods.get(x.prod))); f.set(r, 18, x.falta, Z.cx); f.set(r, 19, x.partFalta, Z.pct); f.set(r, 20, x.pct, Z.pct);
  });
  return f.fim([15, 12, 12, 10, 38, 11, 16, 16, 9, 2, 11, 16, 16, 9, 2, 38, 12, 10, 16, 11, 9]);
}

export function planilhaComparativoFR(ano, porMes, { mesAtual = null } = {}) {
  const wb = XLSX.utils.book_new(), comp = abaComparativo(ano, porMes, mesAtual);
  XLSX.utils.book_append_sheet(wb, comp.ws, 'COMPARATIVO');
  for (const mes of comp.meses) for (const u of Object.keys(UNIDADES_FR)) {
    const d = porMes[mes]?.unidades?.[u];
    if (d?.temDados) XLSX.utils.book_append_sheet(wb, abaDetalhe(u, mes, d), abaDetalheFR(mes, u));
  }
  return wb;
}
