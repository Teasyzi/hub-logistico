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

// A mesma listagem salva como .xls (KMS.xls): na verdade é uma tabela HTML em Windows-1252. As quebras de linha
// do cabeçalho (<br>) viram espaço; o rodapé "Parâmetros" não tem placa e fica de fora.
export const ehListagemHTML = (inicio) => /^\s*<(table|html|!doctype)/i.test(inicio);
export function lerKMsHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const br of doc.querySelectorAll('br')) br.replaceWith(' ');
  const ls = [...doc.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()));
  const i = ls.findIndex((r) => r.some((v) => /^data abastec/.test(normKM(v))));
  if (i < 0) throw new Error('Não achei o cabeçalho da listagem de abastecimentos (Data Abastec) no .xls.');
  return lerAbastecimentos(ls[i], ls.slice(i + 1), 'no .xls');
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

// "MONTAGEM DAS CARGAS - CB SUL - NOVEMBRO.xlsx": as abas trazem só o dia, então o mês sai do nome do arquivo.
// O ano vem do nome (se tiver) ou do mês escolhido na tela; sem mês no nome, vale o mês escolhido.
const MESES_KM = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function mesDoNomeKM(nomeArquivo, mesTela) {
  const n = normKM(nomeArquivo), i = MESES_KM.findIndex((m) => new RegExp(`\\b${m}\\b`).test(n));
  if (i < 0) return mesTela;
  const ano = n.match(/\b(20\d{2})\b/)?.[1] || String(mesTela || '').slice(0, 4) || String(new Date().getFullYear());
  return `${ano}-${String(i + 1).padStart(2, '0')}`;
}

export const SECOES_KM =['ROTAS DO DIA', 'RECARGAS NA BASE', 'CARGAS CROSS', 'FINALIZANDO ROTAS', 'SAÍDA PARA OUTRO DIA'];
function secaoKM(titulo) {
  const t = normKM(titulo);
  if (/recarga/.test(t)) return 'RECARGAS NA BASE';
  if (/cross/.test(t)) return 'CARGAS CROSS';
  if (/finalizando/.test(t)) return 'FINALIZANDO ROTAS';
  if (/saida para/.test(t)) return 'SAÍDA PARA OUTRO DIA';
  return 'ROTAS DO DIA';
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
    // A Norte divide a aba em seções com um título na col. E ("ROTAS DO DIA", "RECARGAS NA BASE…",
    // "CARGAS CROSS…", "FINALIZANDO ROTAS <dia>", "CARGAS COM SAÍDA PARA <dia>"). Cada rota guarda a sua.
    let secao = 'ROTAS DO DIA';
    for (const r of ls.slice(4)) {
      if (r && texto(r[4]) && !texto(r[1]) && !texto(r[2]) && !num(r[norte ? 8 : 13])) { secao = secaoKM(r[4]); continue; }
      const km = num(r[norte ? 8 : 13]);
      if (!km || !r[2]) continue;
      saida.push({ unidade: norte ? 'NORTE' : 'SUL', data, secao, carga: texto(r[0]), area: texto(r[1]), placa: String(r[2]).trim().toUpperCase(), motorista: texto(r[4]), km, idaVolta: null });
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
    // Rota = descrição da rota quando existir (Norte/Sul); a "área motorista" é a base do motorista, não a rota.
    const idesc = find(/^descricao da rota$/), iplaca = find(/^placa$/), imot = find(/motorista/), iarea = idesc >= 0 ? idesc : find(/area/), iveic = find(/veiculo/), icarga = find(/carga|rom/);
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

// Cadastro fixo de motoristas da planilha antiga, para não redigitar todo mês. Igual às fórmulas das abas Planejado:
// - apelidos (aba Planilha1): MOTORISTA como vem na montagem → NOME COMPLETO (col. Q = PROCV na Planilha1).
// - areas: NOME MOTORISTA → ÁREA, a base do motorista (col. R = PROCV na tabela T:U; vale a 1ª linha do nome).
// - bases: ÁREA → IDA E VOLTA da 1ª linha daquela área (col. I = PROCV de R em U:V).
// - idaVolta: só Barreiras, que soma a IDA E VOLTA das linhas do motorista (col. O = SOMASE). Vence a base.
// - cadastro: todos os nomes completos da Planilha1 e da tabela. Juazeiro não tem ida e volta.
export function lerIdaVoltaHistoricoKM(wb) {
  const abas = { NORTE: 'Planejado Norte', SUL: 'Planejado Sul', CBAR: 'Planejado Barreiras', CCRT: 'Planejado Juazeiro' };
  const maiusc = (v) => (texto(v) || '').toLocaleUpperCase('pt-BR');
  const saida = {};
  for (const [u, aba] of Object.entries(abas)) {
    const ls = linhas(wb.Sheets[aba]);
    const cab = (ls[0] || []).map(normKM), n = cab.lastIndexOf('nome motorista');
    const idaVolta = {}, areas = {}, bases = {};
    if (n >= 0 && cab[n + 1] === 'area' && cab[n + 2] === 'ida e volta') {
      const tab = ls.slice(1).filter((l) => l && texto(l[n]));
      for (const l of tab) { const a = maiusc(l[n + 1]); if (a && !(a in bases)) bases[a] = num(l[n + 2]); }
      for (const l of tab) {
        const nome = maiusc(l[n]);
        if (!(nome in areas)) areas[nome] = maiusc(l[n + 1]);
        if (u === 'CBAR') idaVolta[nome] = (idaVolta[nome] || 0) + num(l[n + 2]);
      }
    }
    saida[u] = { idaVolta, areas, bases, apelidos: {}, cadastro: [] };
  }
  const p1 = linhas(wb.Sheets['Planilha1']);
  for (const [u, c] of [['NORTE', 0], ['SUL', 3], ['CBAR', 6], ['CCRT', 9]]) {
    const cad = new Set(Object.keys(saida[u].areas));
    for (const l of p1.slice(2)) {
      const ap = maiusc(l?.[c]), nome = maiusc(l?.[c + 1]);
      if (!nome) continue;
      cad.add(nome);
      if (ap && ap !== nome) saida[u].apelidos[ap] = nome;
    }
    saida[u].cadastro = [...cad].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  return saida;
}

export function lerPlanejamentoKM(wb, mes, unidadeSelecionada = null) {
  const nomes = wb.SheetNames.map(normKM);
  if (nomes.includes('resumo geral')) {
    // A unidade fica ao lado do rótulo "Unidade" (C7). Não procurar no arquivo todo: o Resumo de Barreiras
    // cita CCRT nas abas de cross e era lido como Juazeiro.
    const lsRG = linhas(wb.Sheets['Resumo Geral']).slice(0, 12);
    const linhaU = lsRG.find((l) => l && normKM(l[1]) === 'unidade');
    const cod = normKM(linhaU?.[2]);
    const unidade = cod === 'ccrt' ? 'CCRT' : cod === 'cbar' ? 'CBAR' : unidadeSelecionada;
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
  if (ehListagemHTML(new TextDecoder('windows-1252').decode(buf.slice(0, 512)))) {
    const html = new TextDecoder('windows-1252').decode(buf);
    if (/data\s*(<br\s*\/?>)?\s*abastec/i.test(html)) return { tipo: 'km_abastecimentos', linhas: lerKMsHTML(html) };
  }
  const wb = XLSX.read(buf, { type: 'array', cellDates: false, cellFormula: false, cellStyles: false });
  const tipo = detectar(wb, opcoes.contexto);
  if (tipo === 'venda') return { tipo, linhas: lerVenda(wb.Sheets[abaCom(wb, 'Transporte')]) };
  if (tipo === 'retorno') return { tipo, linhas: lerRetorno(wb.Sheets[abaCom(wb, 'Transporte')]) };
  if (tipo === 'resumo') return { tipo, plan: lerResumo(wb) };
  if (tipo === 'montagem') return { tipo, ...lerMontagemLegada(wb) };
  if (tipo === 'reprog') return { tipo, reprog: lerReprogLegada(wb) };
  if (tipo === 'km_rotas' || tipo === 'km_resumo') return { tipo, rotas: lerPlanejamentoKM(wb, mesDoNomeKM(file.name, opcoes.mes), opcoes.unidade === 'AUTO' ? null : opcoes.unidade) };
  if (tipo === 'km_historico') return { tipo, rotas: lerPlanejamentoHistoricoKM(wb), linhas: lerConsultaHistoricoKM(wb), tabelas: lerIdaVoltaHistoricoKM(wb) };
  return { tipo: null };
}
