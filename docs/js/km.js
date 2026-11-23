// Cálculo puro do acompanhamento KM planejado × realizado.
import { diasDoMes } from './calc.js';

export const UNIDADES_KM = {
  NORTE: { nome: 'CB Norte', local: 'MATRIZ', cor: 1 },
  SUL: { nome: 'CB Sul', local: 'FILIAL II', cor: 2 },
  CBAR: { nome: 'DL Barreiras', local: 'FILIAL I', cor: 1 },
  CCRT: { nome: 'DL Juazeiro', local: 'FILIAL III', cor: 2 },
};
const CPK_NOV_2026 = { NORTE: 2.46, SUL: 2.09, CBAR: 2.07, CCRT: 4.19 };

const chavePessoa = (r) => String(r.motorista || r.placa || '').trim().toLocaleUpperCase('pt-BR');
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
export const categoriaKM = (motorista) => /FRETEIRO/i.test(semAcento(motorista)) ? 'FRETEIRO'
  : /GENERICO/i.test(semAcento(motorista)) ? 'MOTORISTA GENERICO' : /EXTRA/i.test(semAcento(motorista)) ? 'EXTRA' : 'NORMAL';
export const eFreteiro = (r) => r.categoria === 'FRETEIRO' || /FRETEIRO/i.test(`${r.motorista || ''} ${r.veiculoTipo || ''}`);

// Identifica a rota entre reimportações (os ajustes ficam guardados à parte e não se perdem ao reimportar o dia).
// A seção entra só quando não é "ROTAS DO DIA": a mesma linha pode estar copiada em "SAÍDA PARA" no mesmo dia.
export const chaveRotaKM = (r) => [r.data, r.carga, r.placa, r.motoristaOriginal ?? r.motorista, Number(r.km) || 0, ...(r.secao && r.secao !== 'ROTAS DO DIA' ? [r.secao] : [])]
  .map((x) => String(x ?? '').trim().toLocaleUpperCase('pt-BR')).join('|');

// Ajustes do admin: trocar o motorista (ex.: rota lançada como FRETEIRO que foi feita por motorista da casa)
// e excluir a rota do planejado. FRETEIRO não é mais excluído sozinho: o admin confere e exclui.
export function aplicarAjustesKM(rotas, ajustes = {}) {
  return rotas.map((r) => {
    const lista = ajustes[r.unidade] || [], k = chaveRotaKM(r), a = lista.find((x) => x.chave === k);
    const base = { ...r, motoristaOriginal: r.motoristaOriginal ?? r.motorista ?? null, chave: k };
    if (!a) return { ...base, excluida: false, ajustada: false, idaManual: null };
    const trocou = !!a.motorista && a.motorista !== base.motoristaOriginal;
    const idaManual = a.idaVolta == null || a.idaVolta === '' ? null : Number(a.idaVolta);
    return { ...base, motorista: trocou ? a.motorista : base.motorista,
      categoria: trocou ? categoriaKM(a.motorista) : base.categoria, excluida: !!a.excluir, ajustada: trocou || idaManual != null, idaManual, manter: !!a.manter };
  });
}

// Rota repetida na montagem: mesmo dia, mesma placa (ou motorista, nos DLs) e mesma descrição, com km igual
// ou quase (até 2%). A primeira fica; as outras saem do cálculo, a não ser que o admin marque "manter".
export function duplicadasKM(rotas) {
  const grupos = new Map(), dup = new Set();
  for (const r of rotas) {
    // Nos DLs (sem placa) a carga separa as rotas: várias do MOTORISTA GENERICO no mesmo dia não são repetição.
    const k = [r.unidade, r.data, r.placa ? '' : r.carga || '', r.placa || normNome(r.motoristaOriginal ?? r.motorista), normNome(r.area)].join('|');
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(r);
  }
  for (const g of grupos.values()) {
    const mantidas = [];
    for (const r of g) {
      const km = Number(r.km) || 0;
      const igual = mantidas.some((m) => Math.abs((Number(m.km) || 0) - km) <= Math.max(1, 0.02 * (Number(m.km) || 0)));
      if (igual && !r.manter) dup.add(r.chave); else mantidas.push(r);
    }
  }
  return dup;
}

// Na Montagem Norte a mesma rota aparece duas vezes em dias vizinhos: em "CARGAS COM SAÍDA PARA <dia>" na véspera
// e em "ROTAS DO DIA" no dia; ou em "ROTAS DO DIA" e depois em "FINALIZANDO ROTAS <dia>". Mesma placa, mesma
// descrição e km igual (até 2%), em até 4 dias. A cópia nunca conta; devolve chave → dia da rota que vale.
export function espelhosKM(rotas) {
  const doDia = rotas.filter((r) => r.secao === 'ROTAS DO DIA' && r.placa);
  const igual = (a, b) => a.unidade === b.unidade && a.placa === b.placa && normNome(a.area) === normNome(b.area)
    && Math.abs((Number(a.km) || 0) - (Number(b.km) || 0)) <= Math.max(1, 0.02 * (Number(b.km) || 0));
  const dias = (a, b) => Math.round((Date.parse(a) - Date.parse(b)) / 864e5);
  const saida = new Map();
  for (const r of rotas) {
    const depois = r.secao === 'SAÍDA PARA OUTRO DIA', antes = r.secao === 'FINALIZANDO ROTAS';
    if (!r.placa || (!depois && !antes)) continue;
    const alvo = doDia.filter((o) => igual(r, o) && (depois ? dias(o.data, r.data) : dias(r.data, o.data)) > 0 && Math.abs(dias(o.data, r.data)) <= 4)
      .sort((a, b) => Math.abs(dias(a.data, r.data)) - Math.abs(dias(b.data, r.data)))[0];
    if (alvo) saida.set(r.chave, alvo.data);
  }
  return saida;
}

// Lançamentos manuais da unidade no mês: mover km de um dia para outro (ex.: realizado de um dia sem
// planejado vai para o dia seguinte; no fechamento, o planejado de rota que virou o mês vai para o
// mês seguinte) e observações. {id, tipo: 'realizado'|'planejado'|'obs', de, para, km, texto}.
export function aplicarLancamentosKM(porDia, lancamentos = []) {
  for (const l of lancamentos) {
    const km = Number(l.km) || 0;
    if ((l.tipo === 'realizado' || l.tipo === 'planejado') && km) {
      const campo = l.tipo === 'realizado' ? 'ajusteRealizado' : 'ajustePlanejado';
      if (porDia[l.de]) { porDia[l.de][l.tipo] -= km; porDia[l.de][campo] -= km; }
      if (porDia[l.para]) { porDia[l.para][l.tipo] += km; porDia[l.para][campo] += km; }
    }
    for (const d of new Set([l.de, l.para].filter(Boolean))) if (porDia[d] && (l.texto || l.tipo !== 'obs')) porDia[d].notas.push(l);
  }
}

// Seções da Montagem Norte que entram no planejado (as rotas sem seção, como Sul e DLs, sempre entram).
export const SECOES_PADRAO_KM = ['ROTAS DO DIA'];
export const rotaNaSecao = (r, secoes) => !r.secao || (secoes || SECOES_PADRAO_KM).includes(r.secao);

// Cadastro de motoristas, como nas abas Planejado da planilha:
//   nome na montagem → nome completo (Planilha1, PROCV exato) → base do motorista (NOME MOTORISTA / ÁREA)
//   → ida e volta da base (ÁREA / IDA E VOLTA, primeira linha da área, como o PROCV).
// Barreiras soma a ida e volta das linhas do motorista (SOMASE): esse valor fica como valor próprio do
// motorista e vence o da base. Nomes cortados (a montagem Sul corta em 30 letras) casam pelo começo quando
// só existe um nome completo possível. O que não casar fica "sem cadastro" e vira aviso para o admin.
// par = { apelidos: {APELIDO: NOME}, areas: {NOME: BASE}, bases: {BASE: km}, idaVolta: {NOME: km}, cadastro: [NOME] }
export const normNome = (s) => semAcento(s).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
export const semAtribuicaoKM = (nome) => /FRETEIRO|GENERICO|EXTRA/i.test(semAcento(nome));
export function buscaIdaVoltaKM(par = {}) {
  const nomes = new Map(), apelidos = new Map(), areas = new Map(), bases = new Map(), proprio = new Map();
  const add = (n) => { const k = normNome(n); if (k && !nomes.has(k)) nomes.set(k, String(n).trim().toLocaleUpperCase('pt-BR')); };
  for (const [k, v] of Object.entries(par.areas || {})) { add(k); if (String(v || '').trim()) areas.set(normNome(k), String(v).trim().toLocaleUpperCase('pt-BR')); }
  for (const n of par.cadastro || []) add(n);
  for (const [k, v] of Object.entries(par.idaVolta || {})) if (!k.includes('|')) { add(k); proprio.set(normNome(k), Number(v) || 0); }
  for (const [k, v] of Object.entries(par.apelidos || {})) { add(v); apelidos.set(normNome(k), normNome(v)); }
  for (const [k, v] of Object.entries(par.bases || {})) bases.set(normNome(k), Number(v) || 0);
  const cache = new Map();
  // nome como veio no arquivo → { nome: nome completo (ou o do arquivo), cadastrado, base, ida: km ou null }
  const resolver = (nome) => {
    const n = normNome(nome);
    if (cache.has(n)) return cache.get(n);
    let k = apelidos.get(n) || n;
    if (n && !nomes.has(k)) {
      const cand = [...nomes.keys()].filter((x) => (k.includes(' ') && x.startsWith(k)) || (k.length >= 20 && k.startsWith(x)));
      if (cand.length === 1) k = cand[0];
    }
    const cadastrado = !!n && nomes.has(k), base = cadastrado ? areas.get(k) || null : null;
    const ida = !cadastrado ? null : proprio.has(k) ? proprio.get(k) : base && bases.has(normNome(base)) ? bases.get(normNome(base)) : null;
    const x = { nome: cadastrado ? nomes.get(k) : String(nome || '').trim(), cadastrado, base, ida };
    cache.set(n, x);
    return x;
  };
  return Object.assign((nome) => resolver(nome).ida, { resolver, vazia: nomes.size === 0, nomes: [...new Set(nomes.values())].sort((a, b) => a.localeCompare(b, 'pt-BR')) });
}

// Ida e volta de cada rota: o valor digitado na revisão vence; depois o que veio no arquivo; depois o cadastro
// (base do motorista). FRETEIRO, genérico e extra ficam sem ida e volta.
export function idaDaRota(r, busca) {
  if (r.idaManual != null) return { valor: r.idaManual, origem: 'manual' };
  if (r.idaVolta != null) return { valor: Number(r.idaVolta) || 0, origem: 'arquivo' };
  if (semAtribuicaoKM(r.motorista)) return { valor: 0, origem: 'sem atribuição' };
  if (busca.vazia) return { valor: 0, origem: 'unidade sem tabela' };
  const m = busca.resolver(r.motorista);
  if (!m.cadastrado) return { valor: 0, origem: 'sem cadastro' };
  if (m.ida == null) return { valor: 0, origem: 'sem base' };
  return { valor: m.ida, origem: m.base ? `base ${m.base}` : 'valor do motorista' };
}

// Rota cujo km já parece incluir a ida e volta da base: o km da rota chega a 85% (ou mais) da ida e volta
// automática do motorista. Na planilha essas rotas tinham a ida e volta zerada à mão; aqui ficam marcadas
// para o admin revisar. Some quando o admin digita a ida e volta da rota (0 para zerar, ou o próprio valor).
export const LIMITE_IDA_NA_ROTA_KM = 0.85;
export function idaNaRotaKM(r, busca) {
  if (r.idaManual != null || r.idaVolta != null) return false;
  const i = idaDaRota(r, busca);
  return i.valor > 0 && (Number(r.km) || 0) >= LIMITE_IDA_NA_ROTA_KM * i.valor;
}

// Dia de hoje (fuso do navegador), AAAA-MM-DD.
export const hojeKM = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Nome completo do motorista da rota (ou o nome do arquivo, quando não tem cadastro).
export const nomeMotoristaKM = (r, busca) => !r.motorista ? '' : !busca || busca.vazia || semAtribuicaoKM(r.motorista) ? String(r.motorista).trim() : busca.resolver(r.motorista).nome;

// Motoristas da unidade que não estão no cadastro (Planilha1 / tabela de ida e volta), com o nº de rotas.
export function semCadastroKM(rs, busca) {
  if (busca.vazia) return [];
  const m = new Map();
  for (const r of rs) {
    if (!r.motorista || semAtribuicaoKM(r.motorista) || busca.resolver(r.motorista).cadastrado) continue;
    const n = String(r.motorista).trim().toLocaleUpperCase('pt-BR');
    m.set(n, (m.get(n) || 0) + 1);
  }
  return [...m].map(([nome, rotas]) => ({ nome, rotas })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Uma ida e volta por motorista/caminhão no dia (pelo nome completo). Se alguma rota do dia foi ajustada à mão, vale o ajuste.
function idaPorDia(rs, busca) {
  const grupos = new Map();
  for (const r of rs) {
    const k = `${r.data}|${normNome(nomeMotoristaKM(r, busca)) || chavePessoa(r) || `sem-pessoa-${r.placa || ''}`}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push({ r, ida: idaDaRota(r, busca) });
  }
  const saida = [];
  for (const g of grupos.values()) {
    const manuais = g.filter((x) => x.ida.origem === 'manual'), base = manuais.length ? manuais : g;
    saida.push({ r: g[0].r, valor: Math.max(...base.map((x) => x.ida.valor)) });
  }
  return saida;
}
const localUnidade = (s) => ({ 'MATRIZ': 'NORTE', 'FILIAL II': 'SUL', 'FILIAL I': 'CBAR', 'FILIAL III': 'CCRT' })[String(s || '').trim().toLocaleUpperCase('pt-BR')];

// O realizado do dia da extração da listagem de abastecimentos (e do dia de hoje) ainda está incompleto: o dia
// aparece, mas fica fora do acumulado, como os dias depois do último abastecimento. extracao = {UNIDADE: 'AAAA-MM-DD'}.
export function calcularKM({ mes, rotas: rotasBrutas = [], abastecimentos = [], parametros = {}, ajustes = {}, secoes = {}, lancamentos = {}, extracao = {}, hoje = hojeKM() }) {
  const rotas = aplicarAjustesKM(rotasBrutas, ajustes);
  const dias = diasDoMes(mes);
  const unidades = {};
  for (const [c, u] of Object.entries(UNIDADES_KM)) {
    const par = { meta: 0.05, cpk: mes === '2026-11' ? CPK_NOV_2026[c] : null, ...(parametros[c] || {}) };
    const porDia = Object.fromEntries(dias.map((data) => [data, { data, planejado: 0, realizado: 0, kmRotas: 0, idaVolta: 0, rotas: 0, abastecimentos: 0, ajusteRealizado: 0, ajustePlanejado: 0, notas: [] }]));
    const doMes = rotas.filter((r) => r.unidade === c && r.data?.startsWith(mes));
    const espelhos = espelhosKM(doMes);
    const ativas = doMes.filter((r) => !r.excluida && rotaNaSecao(r, secoes[c]) && !espelhos.has(r.chave));
    const dups = duplicadasKM(ativas);
    const rs = ativas.filter((r) => !dups.has(r.chave));
    const busca = buscaIdaVoltaKM(par);
    const fretPend = rs.filter(eFreteiro);
    const revisao = { freteirosPendentes: fretPend.length, kmFreteirosPendentes: fretPend.reduce((s, r) => s + (Number(r.km) || 0), 0),
      excluidas: doMes.length - rs.length, ajustadas: doMes.filter((r) => r.ajustada).length };
    for (const r of rs) {
      if (!porDia[r.data]) continue;
      porDia[r.data].planejado += Number(r.km) || 0;
      porDia[r.data].kmRotas += Number(r.km) || 0;
      porDia[r.data].rotas++;
    }
    // Ida e volta é uma vez por motorista/caminhão no dia, nunca uma vez por rota.
    for (const { r, valor } of idaPorDia(rs, busca)) if (porDia[r.data]) { porDia[r.data].planejado += valor; porDia[r.data].idaVolta += valor; }
    const as = abastecimentos.filter((a) => a.unidade === c && a.data?.startsWith(mes));
    for (const a of as) {
      if (!porDia[a.data]) continue;
      porDia[a.data].realizado += Number(a.km) || 0;
      porDia[a.data].abastecimentos++;
    }
    aplicarLancamentosKM(porDia, lancamentos[c]);
    revisao.duplicadas = dups.size;
    revisao.espelhos = espelhos.size;
    revisao.semTabela = c !== 'CCRT' && busca.vazia && rs.length > 0;
    const limite = [hoje, extracao[c]].filter(Boolean).sort()[0];
    const diasComRealizado = dias.filter((d) => porDia[d].abastecimentos > 0 && d < limite);
    const ultimoDia = diasComRealizado.at(-1) || null;
    const exibidos = dias.map((data) => {
      const d = porDia[data];
      return { ...d, diferenca: d.realizado - d.planejado, dispersao: d.planejado ? d.realizado / d.planejado - 1 : null,
        acumulado: !ultimoDia || data > ultimoDia, parcial: data >= limite && (d.abastecimentos > 0 || data === limite) };
    });
    const incluidos = exibidos.filter((d) => ultimoDia && d.data <= ultimoDia);
    const planejado = incluidos.reduce((s, d) => s + d.planejado, 0);
    const realizado = incluidos.reduce((s, d) => s + d.realizado, 0);
    const diferenca = realizado - planejado;
    const dispersao = planejado ? realizado / planejado - 1 : null;
    const motoristas = ['NORTE', 'SUL'].includes(c) ? detalheMotoristas(c, mes, rs, as, busca, ultimoDia) : [];
    // Só para o admin: os nomes ficam no resultado do rascunho, nunca no agregado publicado.
    revisao.semCadastro = c === 'CCRT' ? [] : semCadastroKM(rs, busca);
    revisao.semBase = c === 'CCRT' ? 0 : rs.filter((r) => idaDaRota(r, busca).origem === 'sem base').length;
    revisao.foraDaTabela = revisao.semCadastro.reduce((s, x) => s + x.rotas, 0) + revisao.semBase;
    revisao.idaNaRota = c === 'CCRT' ? 0 : rs.filter((r) => idaNaRotaKM(r, busca)).length;
    revisao.extracao = extracao[c] || null;
    revisao.foraDaSecao = doMes.filter((r) => !r.excluida && !rotaNaSecao(r, secoes[c])).length;
    unidades[c] = { unidade: c, nome: u.nome, temDados: doMes.length > 0 || as.length > 0, revisao, dias: exibidos, ultimoDia, duplicadas: [...dups], espelhos: Object.fromEntries(espelhos), totais: { planejado, realizado, diferenca, dispersao,
      custo: par.cpk == null ? null : diferenca * Number(par.cpk), dentroMeta: dispersao == null ? null : dispersao <= (Number(par.meta) || 0), cpk: par.cpk == null ? null : Number(par.cpk), meta: Number(par.meta) || 0.05 }, motoristas };
  }
  return { mes, unidades };
}

// Resumo do mês por motorista (Norte/Sul). O abastecimento cobre os km desde o abastecimento anterior, então
// casar pelo dia não funciona. Aqui o realizado do mês de cada placa é dividido entre os motoristas que rodaram
// com ela, na proporção do km planejado de cada um. Só entram dias até o último abastecimento lançado.
function detalheMotoristas(unidade, mes, rotas, abastecimentos, busca, ultimoDia) {
  const ate = (d) => d?.startsWith(mes) && (!ultimoDia || d <= ultimoDia);
  const rs = rotas.filter((r) => ate(r.data));
  // Agrupa pelo nome completo do cadastro: o apelido e o nome completo da mesma pessoa viram uma linha só.
  const nome = (r) => nomeMotoristaKM(r, busca) || 'Sem identificação';
  const semCad = new Set();
  for (const r of rs) if (r.motorista && !semAtribuicaoKM(r.motorista) && !busca.vazia && !busca.resolver(r.motorista).cadastrado) semCad.add(nome(r));
  const mot = new Map(), placaKm = new Map(), motPlaca = new Map();
  const pega = (n) => { if (!mot.has(n)) mot.set(n, { motorista: n, placas: new Set(), dias: new Set(), rotas: 0, kmRotas: 0, idaVolta: 0, planejado: 0, realizado: 0 }); return mot.get(n); };
  for (const r of rs) {
    const x = pega(nome(r)), km = Number(r.km) || 0, p = String(r.placa || '').toUpperCase();
    x.rotas++; x.kmRotas += km; x.planejado += km; x.dias.add(r.data);
    if (p) { x.placas.add(p); placaKm.set(p, (placaKm.get(p) || 0) + km); motPlaca.set(`${nome(r)}|${p}`, (motPlaca.get(`${nome(r)}|${p}`) || 0) + km); }
  }
  for (const { r, valor } of idaPorDia(rs, busca)) { const x = pega(nome(r)); x.idaVolta += valor; x.planejado += valor; }
  const realPlaca = new Map();
  for (const a of abastecimentos) if (ate(a.data)) { const p = String(a.placa || '').toUpperCase(); realPlaca.set(p, (realPlaca.get(p) || 0) + (Number(a.km) || 0)); }
  for (const [k, km] of motPlaca) {
    const [n, p] = k.split('|'), tot = placaKm.get(p) || 0;
    if (tot && realPlaca.has(p)) mot.get(n).realizado += realPlaca.get(p) * km / tot;
  }
  const semRota = [...realPlaca].filter(([p]) => !placaKm.has(p));
  const lista = [...mot.values()].map((x) => ({ ...x, placas: [...x.placas].sort().join(', '), dias: x.dias.size,
    semCadastro: semCad.has(x.motorista),
    dispersao: x.planejado ? x.realizado / x.planejado - 1 : null }));
  lista.sort((a, b) => (b.dispersao ?? -9) - (a.dispersao ?? -9));
  if (semRota.length) lista.push({ motorista: 'Placas sem rota no mês', semRota: true, placas: semRota.map(([p]) => p).sort().join(', '), dias: 0, rotas: 0, kmRotas: 0, idaVolta: 0, planejado: 0,
    realizado: semRota.reduce((s, [, v]) => s + v, 0), dispersao: null });
  return lista;
}

export function agregadoPublicado(resultado) {
  return Object.fromEntries(Object.entries(resultado.unidades).map(([c, u]) => [c, {
    unidade: c, nome: u.nome, temDados: u.temDados, ultimoDia: u.ultimoDia, totais: u.totais,
    // Só números: o texto das observações fica na área do admin; o público vê apenas que o dia foi ajustado.
    dias: u.dias.map(({ data, planejado, realizado, diferenca, dispersao, acumulado, parcial, kmRotas, idaVolta, ajusteRealizado, ajustePlanejado }) => ({
      data, planejado, realizado, diferenca, dispersao, acumulado, parcial: !!parcial, kmRotas, idaVolta, ajustado: !!(ajusteRealizado || ajustePlanejado) })),
  }]));
}

export function unidadePorLocal(local) { return localUnidade(local) || null; }
