// Transportes 1x1 (ajudantes por carga), 4 unidades: leitura dos arquivos e cálculo puro.
// Regras (AUDITORIA/Transportes_1x1.md §12, decididas em 25/11/2026):
//   - Possível por carga = 1 ajudante até a meta de cubagem e 2 acima, × 1,05 → 1,05 ou 2,10. Meta: 450 (DAs), 400 (DLs).
//   - Abono automático: carga até 20 abaixo da meta (430+ nos DAs, 380+ nos DLs) com 2 ajudantes ou mais → possível 2,10.
//   - Abono por particularidade: o admin edita o possível (a lista vem das cargas com ajudantes acima do possível).
//   - Meta da unidade = média dos possíveis; realizado = média dos ajudantes; dif = realizado ÷ meta − 1.
//   - DAs: montagens Norte/Sul, só "ROTAS DO DIA". DLs: escalas (Barreiras: ENTREGAS 1X1 / 1X2 / CARRETAS; Juazeiro: ESCALA).
//   - Fora da conta (o admin vê): carreta, equipamento, carga repetida; e, até o admin lançar, carga sem ajudantes ou sem cubagem.
export const UNIDADES_TX = { NORTE: 'CB Norte', SUL: 'CB Sul', CBAR: 'DL Barreiras', CCRT: 'DL Juazeiro' };
export const DAS_TX = ['NORTE', 'SUL'];
export const DLS_TX = ['CBAR', 'CCRT'];
export const META_CUB_TX = { NORTE: 450, SUL: 450, CBAR: 400, CCRT: 400 };
export const TOLERANCIA_TX = 1.05;
export const FAIXA_ABONO_TX = 20;
const EPS = 1e-9;

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const chave = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const texto = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
// Número como vem nas planilhas: 446.11, "    3651,640000", "1.234,5". Vazio → null.
export function numeroTX(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const x = Number(s.replace(/[^\d.-]/g, ''));
  return s.replace(/[^\d]/g, '') && Number.isFinite(x) ? x : null;
}
function linhas(ws) {
  if (!ws || !ws['!ref']) return [];
  const r = XLSX.utils.decode_range(ws['!ref']);
  r.s.r = 0; r.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: r });
}
// Nº de auxiliares numa célula: vazio = 0; "A / B" = 2.
const nAux = (v) => texto(v).split('/').map((x) => x.trim()).filter(Boolean).length;
const dataISO = (ano, mes, dia) => `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
// Aba diária: "16-11", "16" (mês de referência) ou "16.11.2026".
function dataAba(nome, mesRef) {
  const m = String(nome).trim().match(/^(\d{1,2})(?:[-.](\d{1,2}))?(?:[-.](\d{2,4}))?$/);
  if (!m) return null;
  const dia = +m[1], mes = m[2] ? +m[2] : +String(mesRef || '').slice(5, 7);
  let ano = m[3] ? +m[3] : +String(mesRef || '').slice(0, 4);
  if (ano && ano < 100) ano += 2000;
  if (!dia || dia > 31 || !mes || mes > 12 || !ano) return null;
  return dataISO(ano, mes, dia);
}

// ---------------------------------------------------------------- leitura
// Montagem Norte/Sul (a mesma do KM): abas diárias, cabeçalho na linha 4 (Rom, Descrição da Rota, Placa, Código do
// Veículo, Motorista, … Ajudantes, … Cubagem, Km). A Norte divide a aba em seções com um título na col. Motorista;
// só vale a primeira ("ROTAS DO DIA"): recargas, cross, "finalizando rotas" e "saída para" ficam de fora.
function lerMontagemDA(wb, mesRef, nomeArquivo) {
  const cargas = [];
  let unidade = /\bsul\b/i.test(chave(nomeArquivo)) ? 'SUL' : /\bnorte\b/i.test(chave(nomeArquivo)) ? 'NORTE' : null;
  for (const nome of wb.SheetNames) {
    const data = dataAba(nome, mesRef);
    if (!data) continue;
    const ls = linhas(wb.Sheets[nome]);
    const ih = ls.slice(0, 12).findIndex((l) => l && l.some((v) => chave(v) === 'placa') && l.some((v) => chave(v) === 'cubagem'));
    if (ih < 0) continue;
    const cab = ls[ih].map(chave), col = (re) => cab.findIndex((c) => re.test(c));
    const c = { rom: col(/^rom$/), rota: col(/^descricao da rota$/), placa: col(/^placa$/), veic: col(/^codigo do veiculo$/), mot: col(/^motorista$/),
      aj: col(/^ajudantes?$/), cub: col(/^cubagem$/), km: col(/^km$/) };
    if (c.placa < 0 || c.aj < 0 || c.cub < 0) continue;
    unidade ??= cab.includes('capacidade kg') ? 'SUL' : 'NORTE';
    let doDia = true;
    for (let r = ih + 1; r < ls.length; r++) {
      const l = ls[r] || [], placa = texto(l[c.placa]), rota = texto(l[c.rota]), mot = texto(l[c.mot]);
      if (!placa && !rota && mot && numeroTX(l[c.km]) == null) { doDia = !/(recarga|cross|finalizando|saida para)/.test(chave(mot)); continue; }
      if (!placa || chave(placa) === 'placa') continue;
      if (!doDia) continue;
      const aj = numeroTX(l[c.aj]), cub = numeroTX(l[c.cub]);
      cargas.push({ unidade, data, aba: nome, linha: r + 1, rom: texto(l[c.rom]), rota, placa: placa.toUpperCase(), veiculo: texto(l[c.veic]),
        motorista: mot, cub, aj: aj ? aj : null, fora: /equipamento/.test(chave(rota)) ? 'equipamento' : null });
    }
  }
  return cargas.length ? { tipo: `montagem ${unidade === 'SUL' ? 'CB Sul' : 'CB Norte'} (ROTAS DO DIA)`, unidade, cargas } : null;
}

// Barreiras, "TRANSPORTE 1X1 E 1X2": por aba diária, bloco ENTREGAS 1X1 (B:F, um auxiliar), ENTREGAS 1X2 (H:M, dois)
// e, abaixo do 1X2, ENTREGAS CARRETAS (fora da conta, como na planilha).
function lerEscalaBarreiras(wb, mesRef) {
  const cargas = [];
  for (const nome of wb.SheetNames) {
    const data = dataAba(nome, mesRef);
    if (!data) continue;
    const ls = linhas(wb.Sheets[nome]);
    if (!ls.slice(0, 3).some((l) => l && l.some((v) => /entregas 1x1/.test(chave(v))))) continue;
    let bloco = '1X2';
    for (let r = 0; r < ls.length; r++) {
      const l = ls[r] || [];
      if (/entregas carretas/.test(chave(l[7]))) { bloco = 'CARRETA'; continue; }
      if (/transporte|entregas/.test(chave(l[1])) || /transporte|entregas/.test(chave(l[7]))) continue;
      if (texto(l[1]) && numeroTX(l[2]) != null) {
        const aj = nAux(l[5]);
        cargas.push({ unidade: 'CBAR', data, aba: nome, linha: r + 1, bloco: '1X1', transporte: texto(l[1]), rota: '', placa: '', motorista: texto(l[4]),
          cub: numeroTX(l[2]), entregas: numeroTX(l[3]), aj: aj || null, fora: null });
      }
      if (texto(l[7]) && numeroTX(l[8]) != null) {
        const aj = nAux(l[11]) + nAux(l[12]);
        cargas.push({ unidade: 'CBAR', data, aba: nome, linha: r + 1, bloco, transporte: texto(l[7]), rota: '', placa: '', motorista: texto(l[10]),
          cub: numeroTX(l[8]), entregas: numeroTX(l[9]), aj: aj || null, fora: bloco === 'CARRETA' ? 'carreta' : null });
      }
    }
  }
  return cargas.length ? { tipo: 'escala DL Barreiras (1X1 / 1X2)', unidade: 'CBAR', cargas } : null;
}

// Juazeiro, "ESCALA MOTORISTAS E AUXILIARES": abas dd.mm.aaaa; cabeçalho TRANSPORTE · ID · PLACA · MOTORISTA ·
// AUXILIAR - 1 · AUXILIAR - 2 · PERCURSO · ENTREGAS · CUBOS. Termina em "CARRETA" / "MOTORISTAS INTERNO".
function lerEscalaJuazeiro(wb, mesRef) {
  const cargas = [];
  for (const nome of wb.SheetNames) {
    const data = dataAba(nome, mesRef);
    if (!data) continue;
    const ls = linhas(wb.Sheets[nome]);
    const ih = ls.slice(0, 8).findIndex((l) => l && l.some((v) => chave(v) === 'cubos') && l.some((v) => /^auxiliar 1$/.test(chave(v))));
    if (ih < 0) continue;
    const cab = ls[ih].map(chave), col = (re) => cab.findIndex((c) => re.test(c));
    const c = { transp: col(/^transporte$/), id: col(/^id$/), placa: col(/^placa$/), mot: col(/^motorista$/), a1: col(/^auxiliar 1$/), a2: col(/^auxiliar 2$/),
      rota: col(/^percurso$/), ent: col(/^entregas$/), cub: col(/^cubos$/) };
    for (let r = ih + 1; r < ls.length; r++) {
      const l = ls[r] || [];
      if (/^(carreta|motoristas interno)/.test(chave(l[0]))) break;
      const mot = texto(l[c.mot]), cub = numeroTX(l[c.cub]);
      if (!mot || cub == null) continue;
      const aj = nAux(l[c.a1]) + (c.a2 >= 0 ? nAux(l[c.a2]) : 0);
      cargas.push({ unidade: 'CCRT', data, aba: nome, linha: r + 1, transporte: texto(l[c.transp]), veiculo: texto(l[c.id]), placa: texto(l[c.placa]).replace(/\s+/g, '').toUpperCase(),
        rota: texto(l[c.rota]), motorista: mot, cub, entregas: numeroTX(l[c.ent]), aj: aj || null, fora: null });
    }
  }
  return cargas.length ? { tipo: 'escala DL Juazeiro', unidade: 'CCRT', cargas } : null;
}

// Devolve {tipo, unidade, cargas (já organizadas), dias} ou {tipo:null}.
export function lerArquivoTX(wb, mesRef, nomeArquivo = '') {
  const x = lerEscalaBarreiras(wb, mesRef) || lerEscalaJuazeiro(wb, mesRef) || lerMontagemDA(wb, mesRef, nomeArquivo);
  if (!x) return { tipo: null, unidade: null, cargas: [], dias: [] };
  const cargas = organizarCargasTX(x.cargas);
  return { ...x, cargas, dias: [...new Set(cargas.map((c) => c.data))].sort() };
}

// ---------------------------------------------------------------- organização das cargas do dia
// Identificador do veículo/carga na unidade: placa nos DAs; nº do transporte nos DLs.
const idCarga = (c) => (DAS_TX.includes(c.unidade) ? c.placa : c.transporte || c.placa || c.motorista);
const ehFrete = (c) => c.unidade === 'CBAR' && /^frete/.test(chave(c.motorista));
// Junta "parte" em "base": cubagem somada, rotas lado a lado. A parte fica listada como juntada (fora da conta).
function juntar(base, parte, motivo) {
  base.partes ??= [{ linha: base.linha, rota: base.rota || base.transporte, cub: base.cub }];
  base.partes.push({ linha: parte.linha, rota: parte.rota || parte.transporte, cub: parte.cub });
  base.cub = (base.cub || 0) + (parte.cub || 0);
  if (DAS_TX.includes(base.unidade)) base.rota = [base.rota, parte.rota].filter(Boolean).join(' | ');
  else base.transporte = [base.transporte, parte.transporte].filter(Boolean).join(' / ');
  if (parte.aj && (!base.aj || parte.aj > base.aj)) base.aj = parte.aj;
  parte.fora = 'juntada'; parte.juntadaEm = base.linha; parte.motivoJuntada = motivo;
}
export function organizarCargasTX(lista) {
  const cargas = lista.map((c) => ({ ...c }));
  const porDia = new Map();
  for (const c of cargas) { const k = `${c.unidade}|${c.data}`; if (!porDia.has(k)) porDia.set(k, []); porDia.get(k).push(c); }
  for (const dia of porDia.values()) {
    // 1) Repetida: mesmo veículo/transporte, mesma rota e mesma cubagem no dia. Vale a primeira.
    const vistas = new Map();
    for (const c of dia) {
      if (c.fora) continue;
      const k = [chave(idCarga(c)), chave(c.rota), c.cub == null ? '' : c.cub.toFixed(2)].join('|');
      if (vistas.has(k)) { c.fora = 'repetida'; c.repeteLinha = vistas.get(k).linha; } else vistas.set(k, c);
    }
    const validas = dia.filter((c) => !c.fora);
    // 2) DAs: mesmo veículo no dia, linha sem ajudantes → parte da mesma viagem (o 1x1 Sul junta "A|B").
    if (DAS_TX.includes(dia[0].unidade)) {
      const porPlaca = new Map();
      for (const c of validas) { const k = chave(c.placa); if (!porPlaca.has(k)) porPlaca.set(k, []); porPlaca.get(k).push(c); }
      for (const g of porPlaca.values()) {
        const base = g.find((c) => c.aj);
        if (!base || g.length < 2) continue;
        for (const p of g) if (p !== base && !p.aj) juntar(base, p, 'mesmo veículo no dia, sem ajudantes na linha');
      }
    }
    // 3) Barreiras: várias linhas FRETE no dia. O 1x1 às vezes junta (05/11: 98 + 177 + 195) e às vezes não (04/11),
    //    então só marca para o admin conferir; para juntar, ele digita a cubagem somada numa linha e exclui as outras.
    const fretes = validas.filter(ehFrete);
    if (fretes.length > 1) for (const c of fretes) c.fretesNoDia = fretes.length;
  }
  // Chave estável para os ajustes do admin: dia + veículo + rota (+ nº de ordem quando se repete).
  const usadas = new Map();
  for (const c of cargas) {
    const base = [c.data, chave(idCarga(c)), chave(c.partes ? c.partes[0].rota : c.rota)].join('|');
    const n = (usadas.get(base) || 0) + 1; usadas.set(base, n);
    c.chave = n > 1 ? `${base}#${n}` : base;
  }
  return cargas;
}

// ---------------------------------------------------------------- cálculo
const FORA_TXT = { carreta: 'carreta', equipamento: 'equipamento', repetida: 'carga repetida', juntada: 'juntada a outra linha', excluida: 'excluída pelo admin' };
export const textoForaTX = (f) => FORA_TXT[f] || f;
export const possivelRegraTX = (cub, meta) => (cub <= meta + EPS ? 1 : 2) * TOLERANCIA_TX;

// Uma carga com o ajuste do admin ({aj, cub, poss, obs, excluir, incluir}).
export function calcularCargaTX(c, ajuste = {}, meta = META_CUB_TX[c.unidade]) {
  const aj = ajuste.aj ?? c.aj ?? null, cub = ajuste.cub ?? c.cub ?? null;
  let fora = c.fora || null;
  if (ajuste.incluir && fora === 'repetida') fora = null;
  if (ajuste.excluir) fora = 'excluida';
  const pendente = fora ? null : !aj ? 'sem ajudantes' : cub == null ? 'sem cubagem' : null;
  const conta = !fora && !pendente;
  const regra = cub == null ? null : possivelRegraTX(cub, meta);
  const auto = regra != null && regra < 2 && cub >= meta - FAIXA_ABONO_TX - EPS && aj >= 2;
  const possAuto = regra == null ? null : auto ? 2 * TOLERANCIA_TX : regra;
  const manual = ajuste.poss != null;
  const poss = manual ? ajuste.poss : possAuto;
  const abono = manual && Math.abs(ajuste.poss - (possAuto ?? -1)) > EPS ? 'particularidade' : auto ? 'automatico' : null;
  return {
    ...c, aj, cub, foraFonte: c.fora || null, ajOrigem: c.aj ?? null, cubOrigem: c.cub ?? null, ajManual: ajuste.aj != null, cubManual: ajuste.cub != null,
    fora, pendente, conta, regra, possAuto, poss, abono, possManual: manual, obs: ajuste.obs || '',
    // Particularidade: ajudantes acima do possível (regra + abono automático), antes da edição do admin.
    excesso: conta && aj > possAuto + EPS,
    dif: conta ? aj - poss : null,
  };
}

function agregar(lista) {
  const n = lista.length;
  if (!n) return { cargas: 0, meta: null, realizado: null, dif: null, metaRegra: null, difRegra: null };
  const s = (f) => lista.reduce((a, c) => a + f(c), 0);
  const meta = s((c) => c.poss) / n, realizado = s((c) => c.aj) / n, metaRegra = s((c) => c.regra) / n;
  return { cargas: n, meta, realizado, dif: realizado / meta - 1, metaRegra, difRegra: realizado / metaRegra - 1, ajudantes: s((c) => c.aj) };
}

// cargas: [{…, unidade}] (todas as do mês); ajustes: {U: {chave: {...}}}
export function calcularTX({ mes, cargas = [], ajustes = {} }) {
  const unidades = {};
  for (const u of Object.keys(UNIDADES_TX)) {
    const meta = META_CUB_TX[u], aj = ajustes[u] || {};
    const lista = cargas.filter((c) => c.unidade === u && String(c.data).startsWith(mes))
      .sort((a, b) => a.data.localeCompare(b.data) || (a.bloco || '').localeCompare(b.bloco || '') || a.linha - b.linha)
      .map((c) => calcularCargaTX(c, aj[c.chave], meta));
    const validas = lista.filter((c) => c.conta);
    const dias = [...new Set(lista.map((c) => c.data))].sort().map((data) => ({ data, ...agregar(validas.filter((c) => c.data === data)) }));
    const porMot = new Map();
    for (const c of validas) { const k = chave(c.motorista) || '-'; if (!porMot.has(k)) porMot.set(k, { nome: c.motorista || '-', lista: [] }); porMot.get(k).lista.push(c); }
    const motoristas = [...porMot.values()].map((m) => ({ nome: m.nome, ...agregar(m.lista) })).sort((a, b) => (b.dif ?? -9) - (a.dif ?? -9));
    const comDado = dias.filter((d) => d.cargas);
    unidades[u] = {
      unidade: u, nome: UNIDADES_TX[u], mes, metaCub: meta, temDados: lista.length > 0,
      totais: { ...agregar(validas), ultimoDia: comDado.at(-1) || null,
        automatico: validas.filter((c) => c.abono === 'automatico').length, particularidade: validas.filter((c) => c.abono === 'particularidade').length,
        excesso: lista.filter((c) => c.excesso).length, pendentes: lista.filter((c) => c.pendente).length, fora: lista.filter((c) => c.fora).length },
      dias, motoristas, cargas: lista,
    };
  }
  const todas = Object.values(unidades).flatMap((d) => d.cargas.filter((c) => c.conta));
  return { mes, unidades, geral: agregar(todas) };
}

// O que os leitores veem: totais e o quadro por dia. Sem nomes, placas ou cargas.
export function agregadoPublicadoTX(r) {
  const tira = (t) => ({ cargas: t.cargas, meta: t.meta, realizado: t.realizado, dif: t.dif });
  return Object.fromEntries(Object.entries(r.unidades).map(([u, d]) => [u, {
    unidade: u, nome: d.nome, metaCub: d.metaCub, temDados: d.temDados,
    totais: { ...tira(d.totais), ultimoDia: d.totais.ultimoDia ? { data: d.totais.ultimoDia.data, ...tira(d.totais.ultimoDia) } : null },
    dias: d.dias.map((x) => ({ data: x.data, ...tira(x) })),
  }]));
}
