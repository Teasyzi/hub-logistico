// Leitura das planilhas no navegador (SheetJS, global XLSX) — porte de code/hub/importar.py.
// Montagem descarta nomes; KM mantém motorista/placa apenas em dados administrativos protegidos.

export function num(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return +v;
  let s = String(v).trim().replace(/ /g, '');
  if (!s) return 0;
  const pct = s.endsWith('%');
  s = s.replace(/%$/, '').trim();
  const neg = s.endsWith('-') || s.startsWith('-');
  s = s.replace(/^-+|-+$/g, '').trim();
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  let x = s ? parseFloat(s) : 0;
  if (Number.isNaN(x)) return 0;
  if (neg) x = -x;
  return pct ? x / 100 : x;
}

export function texto(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isInteger(v)) return String(v);
  return String(v).trim();
}

// serial do Excel (sistema 1900) ou texto dd/mm/aaaa -> 'AAAA-MM-DD'
export function iso(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(v) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const m = String(v).trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (m) { const a = m[3].length === 2 ? '20' + m[3] : m[3]; return `${a}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).slice(0, 10);
  return null;
}

// linhas da aba sempre a partir de A1 (índice 0 = linha 1, coluna A), mesmo se o intervalo usado começar depois
function linhas(ws) {
  if (!ws || !ws['!ref']) return [];
  const r = XLSX.utils.decode_range(ws['!ref']);
  r.s.r = 0; r.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: r });
}

// devolve {cab: [...], dados: [{col: valor}]} a partir da linha que contém `coluna`
function tabela(ws, coluna) {
  const ls = linhas(ws);
  const i = ls.findIndex((l) => l && l.some((v) => v != null && String(v).trim() === coluna));
  if (i < 0) return { cab: [], dados: [] };
  const vistos = {};
  const cab = ls[i].map((v) => {
    const n = v == null ? '' : String(v).trim();
    vistos[n] = (vistos[n] || 0) + 1;
    return vistos[n] === 1 ? n : `${n} #${vistos[n]}`;
  });
  const dados = [];
  for (const l of ls.slice(i + 1)) {
    if (!l || l.every((v) => v == null)) continue;
    const o = {};
    cab.forEach((c, k) => { if (c) o[c] = l[k] ?? null; });
    dados.push(o);
  }
  return { cab, dados };
}

function abaCom(wb, coluna) {
  return wb.SheetNames.find((n) => linhas(wb.Sheets[n]).slice(0, 30)
    .some((l) => l && l.some((v) => v != null && String(v).trim() === coluna)));
}

// `contexto` = tela que está importando ('montagem' | 'km' | undefined). O Resumo de Planejamento
// (abas 'Resumo Geral' + 'Paradas') serve às duas telas: na Montagem é o planejamento do dia
// ('resumo'); no KM são as rotas ('km_resumo').
export function detectar(wb, contexto) {
  const abas = new Set(wb.SheetNames);
  if (contexto === 'montagem' && abas.has('Resumo Geral') && abas.has('Paradas')) return 'resumo';
  if (abas.has('Planejado Norte') || abas.has('Planejado Sul') || abas.has('Planejado Barreiras') || abas.has('Planejado Juazeiro')) return 'km_historico';
  if ([...abas].some((n) => /MONTAGEM.*CARGAS/i.test(n)) || [...abas].some((n) => /^(\d{1,2}|\d{1,2}-\d{1,2})$/.test(n))) return 'km_rotas';
  if (abas.has('Resumo Geral')) {
    const ws = wb.Sheets['Resumo Geral'], ls = linhas(ws);
    if (ls.slice(8).some((r) => normKM(r?.[1]) === 'carga') && valorCelula(ws, 'C8') != null) return 'km_resumo';
  }
  if (abas.has('Resumo Geral') && abas.has('Paradas')) {
    return 'resumo';
  }
  if (['RESUMO', 'BARREIRAS', 'JUAZEIRO', 'Venda Barreiras'].every((a) => abas.has(a))) return 'montagem';
  if (abas.has('BARREIRAS') && abas.has('JUAZEIRO') && !abas.has('Venda Barreiras')
      && linhas(wb.Sheets.BARREIRAS).some((l) => l && l.some((v) => String(v ?? '').trim() === 'VOLUME UC TOTAL'))) return 'reprog';
  const aba = abaCom(wb, 'Transporte');
  if (aba) {
    const { cab } = tabela(wb.Sheets[aba], 'Transporte');
    if (cab.includes('Motivo Nome')) return 'retorno';
    if (cab.includes('Taxa Ocupação') && cab.includes('Cxs Unitaria')) return 'venda';
  }
  return null;
}

const normKM = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();
const centroKM = (s) => ({ 'matriz': 'NORTE', 'filial ii': 'SUL', 'filial i': 'CBAR', 'filial iii': 'CCRT' })[normKM(s)] || null;
const custoKM = (s) => ({ 'cb norte': 'NORTE', 'cb sul': 'SUL', 'cb bahia': 'CBAR', 'cb juazeiro': 'CCRT' })[normKM(s)] || null;
const categoriaMotorista = (s) => /freteiro/i.test(String(s || '')) ? 'FRETEIRO'
  : /generico/i.test(normKM(s)) ? 'MOTORISTA GENERICO' : /extra/i.test(normKM(s)) ? 'EXTRA' : 'NORMAL';

// TXT de abastecimentos: tabulado e exportado em Windows-1252/latin-1.
export function lerKMsTXT(textoArquivo) {
  const ls = String(textoArquivo).replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (ls.length < 2) throw new Error('Arquivo de KM vazio ou sem linhas de dados.');
  return lerAbastecimentos(ls[0].split('\t'), ls.slice(1).map((l) => l.split('\t')), 'no TXT');
}

// Mesma leitura para o TXT e para a aba `Consulta` da planilha antiga (a listagem colada a partir da linha 3).
function lerAbastecimentos(cabecalho, registros, onde) {
  const cab = cabecalho.map(normKM);
  const idx = (f) => cab.findIndex((c) => f.test(c));
  const col = {
    placa: idx(/^placa$/), data: idx(/^data abastec/), km: idx(/^km s percorridos$|^kms percorridos$|^km percorridos$/),
    local: idx(/^n local atual$|^local atual$/), custo: idx(/^nome local custo/), motorista: idx(/^nome motorista$|^motorista$/),
  };
  if (col.data < 0 || col.km < 0 || col.local < 0) throw new Error(`Não reconheci as colunas Data Abastec, Km's Percorridos e N. local atual ${onde}.`);
  const saida = [];
  for (const a of registros) {
    if (!a) continue;
    // A planilha oficial soma pelo "Nome Local Custo" (CB NORTE…). Ele difere do "N. local atual" quando um
    // veículo de uma unidade abastece em outra (ex.: out/26, veículo da CB Norte com local FILIAL II).
    const unidade = (col.custo >= 0 && custoKM(a[col.custo])) || centroKM(a[col.local]);
    const data = iso(a[col.data]), placa = texto(a[col.placa]);
    if (!unidade || !data || !placa) continue; // ignora o total final, sem placa
    const km = num(a[col.km]);
    if (km < 0) continue;
    const abastecimento = { unidade, data, km };
    if (unidade === 'NORTE' || unidade === 'SUL') {
      abastecimento.placa = placa.toUpperCase();
      if (col.motorista >= 0 && texto(a[col.motorista])) abastecimento.motorista = texto(a[col.motorista]);
    }
    saida.push(abastecimento);
  }
  return saida;
}

export function lerConsultaHistoricoKM(wb) {
  const ls = linhas(wb.Sheets['Consulta']);
  const i = ls.findIndex((r) => r && r.some((v) => /^data abastec/.test(normKM(v))));
  if (i < 0) return [];
  return lerAbastecimentos(ls[i].map((v) => v ?? ''), ls.slice(i + 1), 'na aba Consulta');
}

const valorCelula = (ws, ref) => ws?.[ref]?.v ?? null;
function dataAbaKM(nome, mes) {
  const m = String(nome).match(/^(\d{1,2})(?:[-.](\d{1,2}))?$/);
  if (!m) return null;
  const mm = m[2] || mes?.slice(5, 7), aa = mes?.slice(0, 4);
  return mm && aa ? `${aa}-${String(mm).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}` : null;
}

// Montagens Norte/Sul: os campos são lidos por posição porque os rótulos da Sul estão deslocados.
export function lerRotasMontagemKM(wb, mes) {
  const saida = [];
  let unidadeArquivo = null;
  for (const nome of wb.SheetNames) {
    const ws = wb.Sheets[nome], data = dataAbaKM(nome, mes);
    if (!data) continue;
    const ls = linhas(ws);
    const cab = (ls[3] || []).map(normKM);
    const norte = /NORTE/i.test(nome) || (!/SUL/i.test(nome) && cab.some((x) => /^km$/.test(x)) && cab.indexOf('km') === 8);
    const sul = /SUL/i.test(nome) || (!norte && cab.indexOf('km') === 13);
    if (!norte && !sul) continue;
    const unidade = norte ? 'NORTE' : 'SUL';
    if (unidadeArquivo && unidadeArquivo !== unidade) throw new Error('O arquivo mistura abas Norte e Sul; importe cada arquivo separadamente.');
    unidadeArquivo = unidade;
    for (const r of ls.slice(4)) {
      const km = num(r[norte ? 8 : 13]);
      if (!km || !r[2]) continue;
      saida.push({ unidade: norte ? 'NORTE' : 'SUL', data, carga: texto(r[0]), area: texto(r[1]), placa: String(r[2]).trim().toUpperCase(), motorista: texto(r[4]), km, idaVolta: null });
    }
  }
  if (!saida.length) throw new Error('Não encontrei as rotas Norte/Sul. Confira as abas diárias e selecione o mês de referência.');
  return saida;
}

function lerResumoKM(wb, unidade) {
  const ws = wb.Sheets['Resumo Geral'];
  if (!ws) throw new Error('Resumo Geral não encontrado.');
  const ls = linhas(ws), data = iso(valorCelula(ws, 'C8'));
  if (!data) throw new Error('A data do Resumo não está em C8.');
  const saida = [];
  for (const r of ls.slice(10)) {
    const motorista = texto(r[4]), km = num(r[10]);
    const categoria = categoriaMotorista(motorista);
    if (!texto(r[1]) || !km) continue;
    // Não guardar crachá/veículo para BA/JN. O nome fica restrito ao admin para lookup de ida e volta;
    // ele não é usado para atribuir abastecimentos nem aparece no detalhe/público.
    saida.push({ unidade, data, carga: texto(r[1]), area: texto(r[5]), motorista, categoria, km, idaVolta: null });
  }
  return saida;
}

export function lerPlanejamentoHistoricoKM(wb) {
  const centroAba = { 'Planejado Norte': 'NORTE', 'Planejado Sul': 'SUL', 'Planejado Barreiras': 'CBAR', 'Planejado Juazeiro': 'CCRT' };
  const saida = [];
  for (const [aba, unidade] of Object.entries(centroAba)) {
    const ws = wb.Sheets[aba];
    if (!ws) continue;
    const ls = linhas(ws);
    const ix = ls.findIndex((r) => {
      if (!r) return false;
      const cells = r.map(normKM);
      return cells.includes('data') && cells.some((v) => /^(km|km rota|km planejado|distancia planejada|km total)$/.test(v));
    });
    if (ix < 0) continue;
    const cab = ls[ix].map(normKM), find = (...re) => cab.findIndex((v) => re.some((x) => x.test(v)));
    const idata = find(/^data$/), ikm = find(/^km$|km rota|distancia planejada|km planejado/), iTotal = find(/km total/);
    const iplaca = find(/^placa$/), imot = find(/motorista/), iarea = find(/area/), iveic = find(/veiculo/), icarga = find(/carga|rom/);
    if (idata < 0 || (ikm < 0 && iTotal < 0)) continue;
    // Vale a coluna de km mais à esquerda: à direita ficam as tabelas de referência (em Juazeiro há um "KM"
    // na col. V que não é da rota). Se for a "KM TOTAL", ela já inclui a ida e volta.
    const usaTotal = ikm < 0 || (iTotal >= 0 && iTotal < ikm), ikmUsado = usaTotal ? iTotal : ikm;
    const iidaAchado = find(/ida e volta|ida volta/), iida = !usaTotal && iidaAchado >= 0 && iidaAchado < ikmUsado + 4 ? iidaAchado : -1;
    for (const r of ls.slice(ix + 1)) {
      const data = iso(r[idata]), kmRota = num(r[ikmUsado]);
      if (!data || !kmRota) continue;
      const motorista = texto(imot >= 0 ? r[imot] : null);
      saida.push({ unidade, data, area: texto(iarea >= 0 ? r[iarea] : null), ...(unidade === 'NORTE' || unidade === 'SUL'
        ? { placa: texto(iplaca >= 0 ? r[iplaca] : null), motorista, veiculo: texto(iveic >= 0 ? r[iveic] : null), carga: texto(icarga >= 0 ? r[icarga] : null) }
        : { carga: texto(icarga >= 0 ? r[icarga] : null), motorista, categoria: categoriaMotorista(motorista) }), km: kmRota, idaVolta: usaTotal ? 0 : iida >= 0 ? num(r[iida]) : null });
    }
  }
  if (!saida.length) throw new Error('Não encontrei linhas de planejamento reconhecíveis na planilha histórica.');
  return saida;
}

export function lerPlanejamentoKM(wb, mes, unidadeSelecionada = null) {
  const nomes = wb.SheetNames.map(normKM);
  if (nomes.includes('resumo geral')) {
    const textoWB = wb.SheetNames.map((n) => linhas(wb.Sheets[n]).flat().filter(Boolean).join(' ')).join(' ').toLocaleUpperCase('pt-BR');
    const unidade = /JUAZEIRO|CCRT|FILIAL III/.test(textoWB) ? 'CCRT' : /BARREIRAS|CBAR|FILIAL I/.test(textoWB) ? 'CBAR' : unidadeSelecionada;
    if (!unidade) throw new Error('Não identifiquei Barreiras ou Juazeiro no conteúdo do Resumo.');
    return lerResumoKM(wb, unidade);
  }
  return lerRotasMontagemKM(wb, mes);
}

export function lerVenda(ws) {
  return tabela(ws, 'Transporte').dados.map((x) => ({
    centro: texto(x['Centro']), transporte: texto(x['Transporte']), data: iso(x['Dt Remessa']),
    cxf: num(x['Cxs Fisicas']), cxu: num(x['Cxs Unitaria']), cubos: num(x['Cubos']),
    ocup: num(x['Taxa Ocupação']), clientes: num(x['Total Cliente']),
  })).filter((v) => v.centro && v.transporte && v.data);
}

export function lerRetorno(ws) {
  return tabela(ws, 'Motivo Nome').dados.map((x) => ({
    centro: texto(x['Centro']), transporte: texto(x['Transporte']), tipo: texto(x['Tipo de transporte']),
    data: iso(x['Dt Remessa']), cli: texto(x['Cliente']), mot: texto(x['Motivo Nome']),
    ext: String(x['Retorno'] ?? '').trim().toUpperCase() === 'EXTERNO',
    cxf: num(x['Cxs Fisica)']), cxu: num(x['Cxs Unitarias)']),
  })).filter((r) => r.centro && r.data && r.transporte);
}

// Resumo de Planejamento: linha 7 (rótulos) e 8 (valores salvos — não recalcula a data C8)
export function lerResumo(wb) {
  const ls = linhas(wb.Sheets['Resumo Geral']);
  const i = ls.findIndex((l) => l && String(l[1] ?? '').trim() === 'Unidade');
  const cab = ls[i], val = ls[i + 1];
  const campo = (nome) => { const k = cab.findIndex((c) => String(c ?? '').trim() === nome); return k >= 0 ? val[k] : null; };
  const paradas = tabela(wb.Sheets['Paradas'], 'Carga').dados;
  const soReprog = paradas.filter((p) => String(p['Carga'] ?? '').trim().toUpperCase() === 'REPROG');
  return {
    centro: texto(cab[2]), data: iso(val[2]),
    entregas: num(campo('Entregas Plan')), cargas: num(campo('Cargas')), ocupacao: num(campo('Ocupação')),
    reprog_uc: num(campo('Reprog')), reprog_cli: num(campo('Reprog Cli')), uc_total: num(campo('UC Total')),
    reprog_so_cubos: soReprog.reduce((a, p) => a + num(p['Cubos']), 0), reprog_so_cli: soReprog.length,
  };
}

const ABA_CENTRO = { BARREIRAS: 'CBAR', JUAZEIRO: 'CCRT' };

// Planilha antiga da Montagem (histórico): bases coladas + planejamento digitado + parâmetros do RESUMO
export function lerMontagemLegada(wb) {
  const venda = [...lerVenda(wb.Sheets['Venda Barreiras']), ...lerVenda(wb.Sheets['Venda Juazeiro'])];
  const retorno = [...lerRetorno(wb.Sheets['Retorno Barreiras']), ...lerRetorno(wb.Sheets['Retorno Juazeiro'])];
  const plan = [], meses = new Set();
  for (const [aba, centro] of Object.entries(ABA_CENTRO)) {
    linhas(wb.Sheets[aba]).forEach((v, idx) => {
      const n = idx + 1;  // linha da planilha (a aba começa em A1)
      if (n < 10 || n > 40 || !v || typeof v[1] !== 'number') return;
      const data = iso(v[1]); meses.add(data.slice(0, 7));
      const g = (k) => (typeof v[k] === 'number' ? v[k] : null);
      if (g(3)) plan.push({ centro, data, entregas: g(3), cargas: g(4), ocupacao: g(6), reprog_uc: g(8), reprog_cli: g(9) });
    });
  }
  const mes = [...meses].sort().pop();
  const res = linhas(wb.Sheets.RESUMO);
  const par = { CBAR: {}, CCRT: {} };
  const mapa = { dias_uteis: 5, volume_aa: 10, meta_volume: 11, tarifa: 16, faturamento_aa: 17, meta_faturamento: 18 };
  for (const [centro, col] of [['CBAR', 3], ['CCRT', 8]]) {
    for (const [chave, lin] of Object.entries(mapa)) {
      const v = res[lin - 1]?.[col];
      if (typeof v === 'number') par[centro][chave] = v;
    }
  }
  return { venda, retorno, plan, par, mes };
}

// Reprogramação DL's antiga (histórico): cubos REPROG (C), UC total (D) e clientes REPROG (O) por dia
export function lerReprogLegada(wb) {
  const out = [];
  for (const [aba, centro] of Object.entries(ABA_CENTRO)) {
    linhas(wb.Sheets[aba]).forEach((v, idx) => {
      if (idx + 1 < 7 || !v || typeof v[1] !== 'number') return;
      const g = (k) => (typeof v[k] === 'number' ? v[k] : null);
      if (g(2) == null && g(14) == null) return;
      out.push({ centro, data: iso(v[1]), reprog_so_cubos: g(2) ?? 0, uc_total: g(3), reprog_so_cli: g(14) ?? 0 });
    });
  }
  return out;
}

export async function lerArquivo(file, opcoes = {}) {
  if (/\.txt$/i.test(file.name)) {
    const textoArquivo = new TextDecoder('windows-1252').decode(await file.arrayBuffer());
    return { tipo: 'km_abastecimentos', linhas: lerKMsTXT(textoArquivo) };
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false, cellFormula: false, cellStyles: false });
  const tipo = detectar(wb, opcoes.contexto);
  if (tipo === 'venda') return { tipo, linhas: lerVenda(wb.Sheets[abaCom(wb, 'Transporte')]) };
  if (tipo === 'retorno') return { tipo, linhas: lerRetorno(wb.Sheets[abaCom(wb, 'Transporte')]) };
  if (tipo === 'resumo') return { tipo, plan: lerResumo(wb) };
  if (tipo === 'montagem') return { tipo, ...lerMontagemLegada(wb) };
  if (tipo === 'reprog') return { tipo, reprog: lerReprogLegada(wb) };
  if (tipo === 'km_rotas' || tipo === 'km_resumo') return { tipo, rotas: lerPlanejamentoKM(wb, opcoes.mes, opcoes.unidade === 'AUTO' ? null : opcoes.unidade) };
  if (tipo === 'km_historico') return { tipo, rotas: lerPlanejamentoHistoricoKM(wb), linhas: lerConsultaHistoricoKM(wb) };
  return { tipo: null };
}
