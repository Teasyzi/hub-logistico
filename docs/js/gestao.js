// Gestão à vista (DLs): indicadores da aba Dados da planilha "GESTÃO À VISTA - CB LOG CBAR / CB LOG II CCRT",
// cálculo das linhas derivadas e leitura dos arquivos que alimentam o mês (ficha AUDITORIA/Gestao_a_Vista.md §10).
//   - planilha antiga da Gestão à vista (todos os anos que ela traz: ano corrente e blocos dos anos anteriores);
//   - KPI Distribuição e Logística do mês (quase todos os números; faturamento e ocupação vêm da aba oculta
//     "Montagem das cargas", cópia do RESUMO da Montagem);
//   - planilha de Perdas de estoque do DL (PERDAS TOTAL, com inventário, depois do fechamento).
// O que não vem de arquivo (custos, empilhadeiras…) é digitado pelo admin.
// Cada linha tem o número da linha da planilha (4…46): é a chave dos valores e da exportação.

export const UNIDADES_GV = { CBAR: 'CB LOG CBAR', CCRT: 'CB LOG II CCRT' };
export const CIDADE_GV = { CBAR: 'Barreiras', CCRT: 'Juazeiro' };
export const FATOR_CUBOS = 1.68;
const MES_NOME = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

// tipo: 'in' = digitado/importado; 'div' = num ÷ den; 'cubos' = linha 6 ÷ 1,68.
// acum: 'media' (média dos meses com valor), 'traco' (média, ou "-"), 'razao' (= num do Acum ÷ den do Acum).
// fmt: 'i' inteiro, 'd1'/'d2' decimais, 'p' %, 'r' R$, 'r2' R$ com centavos.
// traco: célula vazia aparece como "-" (17 e 18 sempre; 14 nos meses que já têm dados), como na planilha.
export const LINHAS_GV = [
  { l: 4, rot: 'DIAS ÚTEIS', tipo: 'in', fmt: 'i' },
  { l: 5, rot: 'FATURAMENTO DL', tipo: 'in', fmt: 'r' },
  { l: 6, rot: 'VOLUME CX. UNITÁRIAS (MÊS)', tipo: 'in', fmt: 'i' },
  { l: 7, rot: 'VOLUME CX. UNITÁRIAS (POR DIA)', tipo: 'div', num: 6, den: 4, fmt: 'i' },
  { l: 8, rot: 'VOLUME CX. UNITÁRIAS (POR CARGA)', tipo: 'div', num: 6, den: 21, fmt: 'i' },
  { l: 9, rot: 'VOLUME CUBOS (MÊS)', tipo: 'cubos', fmt: 'i' },
  { l: 10, rot: 'VOLUME CUBOS (POR DIA)', tipo: 'div', num: 9, den: 4, fmt: 'i', acum: 'razao' },
  { l: 11, rot: 'VOLUME CUBOS (POR CARGA)', tipo: 'div', num: 9, den: 21, fmt: 'i', acum: 'razao' },
  { l: 12, rot: 'OCUPAÇÃO CUBAGEM', tipo: 'in', fmt: 'p' },
  { l: 13, rot: 'RETORNO (VOLUME)', tipo: 'in', fmt: 'p' },
  { l: 14, rot: 'RETORNO (CLIENTES)', tipo: 'in', fmt: 'p', acum: 'traco', traco: 'mes' },
  { l: 15, rot: 'AJUDANTES POR CARGA', tipo: 'in', fmt: 'd2' },
  { l: 16, rot: 'QUALIFICAÇÃO TEMPO DE ATENDIMENTO (GREENMILE)', tipo: 'in', fmt: 'p' },
  { l: 17, rot: 'PRODUTIVIDADE CX. MISTO/MONTADOR (EASY PALLET)', tipo: 'in', fmt: 'd1', acum: 'traco', traco: 'sempre' },
  { l: 18, rot: 'PRODUTIVIDADE PALLET/MONTADOR (EASY PALLET)', tipo: 'in', fmt: 'd1', acum: 'traco', traco: 'sempre' },
  { l: 19, rot: { CBAR: 'PRODUTIVIDADE CAIXAS/HORA/MONTADOR (EASY PALLET)', CCRT: 'PRODUTIVIDADE CAIXAS/MONTADOR/HORA (EASY PALLET)' }, tipo: 'in', fmt: 'd1' },
  { l: 20, rot: 'TEMPO MÉDIO DE MONTAGEM', tipo: 'div', num: 17, den: 19, fmt: 'd2', acum: 'traco', erro: '-' },
  { l: 21, rot: 'CARGAS (MÊS)', tipo: 'in', fmt: 'i' },
  { l: 22, rot: 'CARGAS (POR DIA)', tipo: 'div', num: 21, den: 4, fmt: 'd1' },
  { l: 23, rot: 'PEDIDOS', tipo: 'in', fmt: 'i' },
  { l: 24, rot: 'PEDIDOS (POR DIA)', tipo: 'div', num: 23, den: 4, fmt: 'd1' },
  { l: 25, rot: 'PEDIDOS (POR CARGA)', tipo: 'div', num: 23, den: 21, fmt: 'd1' },
  { l: 26, rot: 'PERDAS ESTOQUE DL R$', tipo: 'in', fmt: 'r' },
  { l: 27, rot: 'PERDAS ESTOQUE DL (R$)', tipo: 'div', num: 26, den: 5, fmt: 'p', acum: 'razao' },
  { l: 28, rot: 'CUSTO DISTRIBUIÇÃO DL', tipo: 'in', fmt: 'r' },
  { l: 29, rot: 'CUSTO DISTRIBUIÇÃO DL (% SOBRE FATURAMENTO)', tipo: 'div', num: 28, den: 5, fmt: 'p' },
  { l: 30, rot: 'CUSTO DISTRIBUIÇÃO DL (POR CX. UNITÁRIA)', tipo: 'div', num: 28, den: 6, fmt: 'r2' },
  { l: 31, rot: 'QUILOMETRAGEM FROTA (MÊS)', tipo: 'in', fmt: 'i' },
  { l: 32, rot: 'QUILOMETRAGEM FROTA (POR CARGA)', tipo: 'div', num: 31, den: 21, fmt: 'd1' },
  { l: 33, rot: 'CONSUMO FROTA', tipo: 'div', num: 31, den: 34, fmt: 'i' },
  { l: 34, rot: 'DESEMPENHO CONSUMO (KM/LITRO)', tipo: 'in', fmt: 'd2' },
  { l: 35, rot: 'DESEMPENHO TRIXLOG', tipo: 'in', fmt: 'd1' },
  { l: 36, rot: 'CUSTO MANUTENÇÃO FROTA', tipo: 'in', fmt: 'r' },
  { l: 37, rot: 'CUSTO MANUTENÇÃO FROTA (POR KM)', tipo: 'div', num: 36, den: 31, fmt: 'r2' },
  { l: 38, rot: 'CUSTO MANUTENÇÃO CORRETIVA', tipo: 'in', fmt: 'r' },
  { l: 39, rot: 'CUSTO MANUTENÇÃO CORRETIVA (POR KM)', tipo: 'div', num: 38, den: 31, fmt: 'r2' },
  { l: 40, rot: 'CUSTO PNEU', tipo: 'in', fmt: 'r' },
  { l: 41, rot: 'CUSTO PNEUS (POR KM)', tipo: 'div', num: 40, den: 31, fmt: 'r2' },
  { l: 42, rot: 'HORAS', tipo: 'in', fmt: 'i' },
  { l: 43, rot: 'CONSUMO', tipo: 'div', num: 42, den: 44, fmt: 'i' },
  { l: 44, rot: 'MÉDIA DE CONSUMO EMPILHADEIRAS (HORAS/TANQUE)', tipo: 'in', fmt: 'd1' },
  { l: 45, rot: { CBAR: 'CUSTO EMPILHADEIRAS (PEÇAS + SERVIÇOS + PNEUS + ALUGUEL)', CCRT: 'CUSTO EMPILHADEIRAS (PEÇAS + SERVIÇOS + PNEUS)' }, tipo: 'in', fmt: 'r' },
  { l: 46, rot: 'CUSTO EMPILHADEIRAS (PEÇAS + SERVIÇOS + PNEUS / HORA)', tipo: 'div', num: 45, den: 42, fmt: 'r2' },
];
export const LINHA_GV = Object.fromEntries(LINHAS_GV.map((x) => [x.l, x]));
export const ENTRADAS_GV = LINHAS_GV.filter((x) => x.tipo === 'in').map((x) => x.l);
export const rotuloGV = (x, u) => (typeof x.rot === 'string' ? x.rot : x.rot[u]);

// As abas de gráfico da planilha, na ordem, com as linhas de cada gráfico (o gráfico de retorno tem duas séries).
// tipo 'barra' ou 'linha', como no Excel.
export const GRAFICOS_GV = [
  { aba: 'Volume', g: [{ l: [6], t: 'barra' }, { l: [7], t: 'barra' }, { l: [8], t: 'barra' }] },
  { aba: 'Cubos', g: [{ l: [12], t: 'linha' }, { l: [10], t: 'barra' }, { l: [11], t: 'barra' }] },
  { aba: 'Retorno e QTA', g: [{ l: [13, 14], t: 'linha', titulo: 'ÍNDICE DE RETORNO R$ e CLIENTES' }, { l: [16], t: 'linha' }] },
  { aba: 'Cargas e Pedidos', g: [{ l: [22], t: 'barra' }, { l: [24], t: 'barra' }, { l: [25], t: 'barra' }] },
  { aba: 'Easy Pallet', g: [{ l: [17], t: 'barra' }, { l: [18], t: 'barra' }] },
  { aba: 'Easy Pallet (2)', g: [{ l: [19], t: 'barra' }, { l: [20], t: 'barra' }] },
  { aba: 'Perdas Estoque', g: [{ l: [26], t: 'barra' }, { l: [27], t: 'barra' }] },
  { aba: 'Custo Dist', g: [{ l: [29], t: 'linha' }, { l: [30], t: 'linha' }] },
  { aba: 'KM', g: [{ l: [31], t: 'barra' }, { l: [32], t: 'barra' }] },
  { aba: 'Des Motoristas', g: [{ l: [34], t: 'linha' }, { l: [35], t: 'linha' }] },
  { aba: 'Manut Frota', g: [{ l: [37], t: 'barra' }, { l: [39], t: 'barra' }, { l: [41], t: 'barra' }] },
  { aba: 'Empilhadeiras', g: [{ l: [44], t: 'barra' }, { l: [46], t: 'barra' }] },
];

// Origem de cada valor e a força dela: um valor só substitui outro de origem igual ou mais fraca.
// Editado à mão vale por cima de tudo; KPI e Perdas por cima da planilha antiga; o ano da própria planilha
// por cima dos blocos de anos anteriores dela.
export const ORIGENS_GV = { manual: 'digitado', kpi: 'KPI do mês', perdas: 'planilha de Perdas', planilha: 'planilha da Gestão à vista', historico: 'planilha da Gestão à vista (ano anterior)' };
const FORCA = { manual: 4, kpi: 3, perdas: 3, planilha: 2, historico: 1 };

const numero = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);

// ---------------------------------------------------------------- cálculo do ano
// valores: {mes(1..12): {linha: número}} → {linhas: {l: {m: [12 valores | null | '-'], acum}}, mesesComDados}
export function calcularAnoGV(valores = {}) {
  const v = (l, m) => numero(valores[m]?.[l]);
  const temDados = (m) => ENTRADAS_GV.some((l) => v(l, m) != null);
  const mesesComDados = [];
  for (let m = 1; m <= 12; m++) if (temDados(m)) mesesComDados.push(m);
  const out = {};
  const celula = (x, m) => {
    if (x.tipo === 'in') {
      const n = v(x.l, m);
      if (n != null) return n;
      if (x.traco === 'sempre' || (x.traco === 'mes' && temDados(m))) return '-';
      return null;
    }
    // Linha calculada com valor digitado à mão: vale o digitado.
    if (v(x.l, m) != null) return v(x.l, m);
    if (x.tipo === 'cubos') { const n = out[6].m[m - 1]; return ehNum(n) ? n / FATOR_CUBOS : null; }
    // Divisão como IF(num="";"";IFERROR(num/den;"")): sem numerador fica vazio; sem denominador, vazio (ou "-").
    const a = out[x.num].m[m - 1], b = out[x.den].m[m - 1];
    if (x.erro === '-') return ehNum(a) && ehNum(b) && b !== 0 ? a / b : '-';
    if (!ehNum(a)) return null;
    return ehNum(b) && b !== 0 ? a / b : null;
  };
  // Ordem: entradas → cubos → divisões (as divisões só usam entradas e os cubos).
  for (const tipo of ['in', 'cubos', 'div']) {
    for (const x of LINHAS_GV.filter((y) => y.tipo === tipo)) {
      const m = [];
      for (let i = 1; i <= 12; i++) m.push(celula(x, i));
      out[x.l] = { m };
    }
  }
  // Acum: primeiro as médias, depois as razões das médias (10 = 9/4, 11 = 9/21, 27 = 26/5).
  for (const x of LINHAS_GV.filter((y) => y.acum !== 'razao')) {
    const ns = out[x.l].m.filter(ehNum);
    out[x.l].acum = ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : (x.acum === 'traco' ? '-' : null);
  }
  for (const x of LINHAS_GV.filter((y) => y.acum === 'razao')) {
    const a = out[x.num].acum, b = out[x.den].acum;
    out[x.l].acum = ehNum(a) && ehNum(b) && b !== 0 ? a / b : null;
  }
  return { linhas: out, mesesComDados };
}

// ---------------------------------------------------------------- automático: os outros acompanhamentos do Hub
// Do resultado de cada acompanhamento no mês → {CBAR: {linha: v}, CCRT: {...}} e a origem de cada valor.
//   Montagem (calcular de calc.js): 4 dias úteis, 5 faturamento ACM, 6 CX UNIT ACM, 12 ocupação média,
//     13 retorno volume, 14 retorno clientes, 21 cargas, 23 pedidos (entregas).
//   Perdas (calcularPerdas): 26 = PERDAS TOTAL da planilha = inventário + rota + estoque + ajuste de preço (sem transporte).
//   KM (calcularKM): 31 = km realizado do mês.
//   1x1 (calcularTX): 15 = ajudantes por carga (realizado).
export const FONTES_AUTO_GV = { montagem: 'Montagem de Cargas', perdas: 'Perdas de estoque', km: 'KM planejado × realizado', '1x1': 'Transportes 1x1' };
export function autoDoMesGV({ montagem = {}, perdas = null, km = null, tx = null } = {}) {
  const out = { CBAR: {}, CCRT: {} }, origem = { CBAR: {}, CCRT: {} };
  const pon = (u, l, v, f) => { if (ehNum(v)) { out[u][l] = v; origem[u][l] = f; } };
  for (const u of ['CBAR', 'CCRT']) {
    const r = montagem[u];
    if (r?.total?.cx_unit > 0) {
      pon(u, 4, r.resumo?.dias_uteis, 'montagem'); pon(u, 5, r.resumo?.fat_acm, 'montagem'); pon(u, 6, r.resumo?.acm, 'montagem');
      pon(u, 12, r.media?.ocupacao, 'montagem'); pon(u, 13, r.total.ret_vol, 'montagem'); pon(u, 14, r.total.ret_cli, 'montagem');
      if (r.total.cargas > 0) pon(u, 21, r.total.cargas, 'montagem');
      if (r.total.entregas > 0) pon(u, 23, r.total.entregas, 'montagem');
    }
    const p = perdas?.dls?.[u];
    if (p?.temDados) pon(u, 26, p.motivos.INVENTARIO.rs + p.motivos.ROTA.rs + p.motivos.ESTOQUE.rs + (Number(p.totais?.ajustePreco) || 0), 'perdas');
    const k = km?.unidades?.[u];
    if (k?.temDados && k.totais?.realizado > 0) pon(u, 31, k.totais.realizado, 'km');
    const t = tx?.unidades?.[u];
    if (t?.totais?.cargas > 0) pon(u, 15, t.totais.realizado, '1x1');
  }
  return { valores: out, origem };
}

// Valor que vale em cada célula: digitado à mão > automático do Hub > importado (KPI, Perdas, planilha antiga).
// doc: {valores, origem, auto: {mes: {l: v}}, autoOrigem: {mes: {l: fonte}}} → {valores, origem}
export function efetivoGV(doc) {
  const valores = {}, origem = {};
  const meses = new Set([...Object.keys(doc?.valores || {}), ...Object.keys(doc?.auto || {})]);
  for (const m of meses) {
    const imp = doc?.valores?.[m] || {}, oi = doc?.origem?.[m] || {}, au = doc?.auto?.[m] || {}, oa = doc?.autoOrigem?.[m] || {};
    for (const l of new Set([...Object.keys(imp), ...Object.keys(au)])) {
      let v, o;
      if (oi[l] === 'manual' && ehNum(imp[l])) { v = imp[l]; o = 'manual'; }
      else if (ehNum(au[l])) { v = au[l]; o = `hub:${oa[l] || ''}`; }
      else if (ehNum(imp[l])) { v = imp[l]; o = oi[l]; }
      else continue;
      (valores[m] ??= {})[l] = v; (origem[m] ??= {})[l] = o;
    }
  }
  return { valores, origem };
}

// ---------------------------------------------------------------- juntar importações
// doc: {valores: {m: {l: v}}, origem: {m: {l: origem}}}. entradas: [{mes, l, v, origem}]. v null apaga (só se puder).
export function aplicarGV(doc, entradas) {
  const valores = structuredClone(doc?.valores || {}), origem = structuredClone(doc?.origem || {});
  let n = 0, mantidos = 0;
  for (const e of entradas) {
    const atual = origem[e.mes]?.[e.l];
    if (atual && FORCA[atual] > FORCA[e.origem]) { mantidos++; continue; }
    if (e.v == null) {
      if (valores[e.mes]) delete valores[e.mes][e.l];
      if (origem[e.mes]) delete origem[e.mes][e.l];
    } else {
      (valores[e.mes] ??= {})[e.l] = e.v;
      (origem[e.mes] ??= {})[e.l] = e.origem;
    }
    n++;
  }
  return { valores, origem, n, mantidos };
}

// Edição à mão: grava por cima (origem manual). Vazio ou zero tira o valor digitado e a célula volta ao automático
// (o que vier do Hub ou das importações; nas linhas calculadas, volta a fórmula).
export function editarGV(doc, edicoes) {
  const valores = structuredClone(doc?.valores || {}), origem = structuredClone(doc?.origem || {});
  for (const { mes, l, v } of edicoes) {
    if (v == null || v === 0) { if (valores[mes]) delete valores[mes][l]; if (origem[mes]) delete origem[mes][l]; continue; }
    (valores[mes] ??= {})[l] = v; (origem[mes] ??= {})[l] = 'manual';
  }
  return { valores, origem };
}

// ---------------------------------------------------------------- leitura dos arquivos (workbook do SheetJS)
const cel = (ws, a1) => ws?.[a1]?.v;
const txt = (v) => String(v ?? '').trim();
const norm = (s) => txt(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const serialParaMes = (n) => { const d = new Date(Math.round((n - 25569) * 86400000)); return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 }; };
const valorEntrada = (v) => (ehNum(v) ? v : null);   // "-", vazio e erros = sem valor
const colLetra = (c) => { let s = ''; c++; while (c) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); } return s; };

function unidadePorTexto(...ts) {
  const t = norm(ts.join(' '));
  if (/CCRT|JUAZEIRO|LOG(ISTICA)? II\b|LOGISTICA II/.test(t)) return 'CCRT';
  if (/CBAR|BARREIRAS|COSTA BRASIL LOGISTICA\b|LOG I\b/.test(t)) return 'CBAR';
  return null;
}
function mesDoNome(nome) {
  const t = norm(nome);
  const i = MES_NOME.findIndex((m) => t.includes(norm(m)));
  return i < 0 ? null : i + 1;
}

// Planilha antiga da Gestão à vista: aba Dados, linha 3 = meses (todos os blocos de anos), linhas de entrada.
function lerPlanilhaGV(wb, nomeArquivo) {
  const ws = wb.Sheets.Dados;
  const u = unidadePorTexto(nomeArquivo.match(/CBAR|CCRT/i)?.[0] || '') || (/\bII\b/.test(txt(cel(ws, 'A1'))) ? 'CCRT' : 'CBAR');
  const ref = XLSX.utils.decode_range(ws['!ref']);
  const colunas = [];
  for (let c = 1; c <= ref.e.c; c++) { const v = cel(ws, `${colLetra(c)}3`); if (ehNum(v) && v > 30000) colunas.push({ c, ...serialParaMes(v) }); }
  const anoPrincipal = colunas.find((x) => x.c === 1)?.ano;
  const entradas = [];
  for (const k of colunas) {
    for (const l of ENTRADAS_GV) {
      const v = valorEntrada(cel(ws, `${colLetra(k.c)}${l}`));
      if (v == null) continue;
      entradas.push({ ano: k.ano, mes: k.mes, l, v, origem: k.ano === anoPrincipal && k.c <= 12 ? 'planilha' : 'historico' });
    }
  }
  return { tipo: 'Planilha da Gestão à vista', unidades: { [u]: entradas }, anoPrincipal };
}

// KPI do mês: os mesmos números que a Gestão à vista copiava (conferido jan–jun/26, ficha §3).
const KPI_CELULAS = {
  4: ['Q33', 'Q34'], 6: ['D21', 'D22'], 13: ['I15', 'I16'], 14: ['I21', 'I22'], 15: ['I27', 'I28'], 16: ['I33', 'I34'],
  19: ['N9', 'N10'], 21: ['D27', 'D28'], 23: ['D33', 'D34'], 31: ['S15', 'S16'], 34: ['S21', 'S22'], 35: ['S9', 'S10'],
};
const KPI_MONTAGEM = { 5: ['D20', 'I20'], 12: ['D28', 'I28'] };   // aba oculta "Montagem das cargas" (RESUMO da Montagem)
function lerKPI(wb, nomeArquivo, anoPadrao) {
  const ws = wb.Sheets['LOGÍSTICA E DISTRIBUIÇÃO'], wm = wb.Sheets['Montagem das cargas'];
  if (norm(cel(ws, 'C9')) !== 'DL BARREIRAS' || norm(cel(ws, 'C10')) !== 'DL JUAZEIRO') throw new Error('O KPI mudou de layout: esperava "DL Barreiras" em C9 e "DL Juazeiro" em C10.');
  // Mês: o B4 da aba "Montagem das cargas" ("FECHAMENTO DE JANEIRO/2026", "… FEVEREIRO/26", "… MAIO'26");
  // quando está vazio, o mês do nome do arquivo ("KPI … - Março.xlsx") e o ano do "ATUALIZADO EM: dd/mm/aaaa" (B3).
  let ano = null, mes = null;
  const b4 = norm(cel(wm, 'B4')), m4 = b4.match(/(JANEIRO|FEVEREIRO|MARCO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\s*[/'´`\s-]*\s*(\d{4}|\d{2})?/);
  const at = txt(cel(wm, 'B3')).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m4) { mes = mesDoNome(m4[1]); ano = m4[2] ? (m4[2].length === 2 ? 2000 + +m4[2] : +m4[2]) : null; }
  if (!mes) mes = mesDoNome(nomeArquivo.replace(/\.[^.]+$/, ''));
  if (mes && !ano && at) ano = +at[3] - (mes === 12 && +at[2] === 1 ? 1 : 0);
  if (mes && !ano) ano = anoPadrao;
  if (!mes || !ano) throw new Error('Não achei o mês do KPI: a aba "Montagem das cargas" está sem o "FECHAMENTO DE <MÊS>" e o nome do arquivo não tem o mês (ex.: "KPI Distribuição e Logística - Março.xlsx").');
  const unidades = { CBAR: [], CCRT: [] };
  const pega = (folha, mapa) => {
    for (const [l, [ba, jn]] of Object.entries(mapa)) {
      for (const [u, a] of [['CBAR', ba], ['CCRT', jn]]) {
        const v = valorEntrada(cel(folha, a));
        if (v != null) unidades[u].push({ ano, mes, l: +l, v, origem: 'kpi' });
      }
    }
  };
  pega(ws, KPI_CELULAS);
  if (wm && norm(cel(wm, 'B20')).includes('ACM') && norm(cel(wm, 'B28')).includes('OCUP')) pega(wm, KPI_MONTAGEM);
  return { tipo: 'KPI Distribuição e Logística', unidades, ano, mes };
}

// Planilha de Perdas do DL: Resumo, coluna H "PERDAS TOTAL", linha TOTAL. Mês, ano e DL pelo nome do arquivo
// ("2026 - 06 Perdas de Estoque - Barreiras.xlsx").
function lerPerdas(wb, nomeArquivo) {
  const ws = wb.Sheets.Resumo;
  const m = nomeArquivo.match(/(\d{4})\s*-\s*(\d{2})/), u = unidadePorTexto(nomeArquivo);
  if (!m || !u) throw new Error('No nome do arquivo de Perdas faltam o ano, o mês ou o DL (ex.: "2026 - 06 Perdas de Estoque - Barreiras.xlsx").');
  let total = null;
  for (let r = 7; r <= 40; r++) if (norm(cel(ws, `C${r}`)) === 'TOTAL') { total = valorEntrada(cel(ws, `H${r}`)); break; }
  if (total == null) throw new Error('Não achei a linha TOTAL (coluna C) com o PERDAS TOTAL (coluna H) na aba Resumo.');
  return { tipo: 'Perdas de estoque (PERDAS TOTAL)', unidades: { [u]: [{ ano: +m[1], mes: +m[2], l: 26, v: total, origem: 'perdas' }] }, ano: +m[1], mes: +m[2] };
}

export function lerArquivoGV(wb, nomeArquivo, anoPadrao = new Date().getFullYear()) {
  if (wb.Sheets.Dados && wb.SheetNames.includes('Volume')) return lerPlanilhaGV(wb, nomeArquivo);
  if (wb.Sheets['LOGÍSTICA E DISTRIBUIÇÃO']) return lerKPI(wb, nomeArquivo, anoPadrao);
  if (wb.Sheets.Resumo && norm(cel(wb.Sheets.Resumo, 'H6')) === 'PERDAS TOTAL') return lerPerdas(wb, nomeArquivo);
  return { tipo: null };
}

// Agrupa as entradas lidas por unidade e ano: {u: {ano: [{mes, l, v, origem}]}}.
export function porAnoGV(lido) {
  const out = {};
  for (const [u, es] of Object.entries(lido.unidades || {})) for (const e of es) ((out[u] ??= {})[e.ano] ??= []).push(e);
  return out;
}
