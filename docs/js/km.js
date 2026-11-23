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
export const chaveRotaKM = (r) => [r.data, r.carga, r.placa, r.motoristaOriginal ?? r.motorista, Number(r.km) || 0]
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
      categoria: trocou ? categoriaKM(a.motorista) : base.categoria, excluida: !!a.excluir, ajustada: trocou || idaManual != null, idaManual };
  });
}

// Seções da Montagem Norte que entram no planejado (as rotas sem seção, como Sul e DLs, sempre entram).
export const SECOES_PADRAO_KM = ['ROTAS DO DIA'];
export const rotaNaSecao = (r, secoes) => !r.secao || (secoes || SECOES_PADRAO_KM).includes(r.secao);

// Nome do motorista → ida e volta, como o PROCV da planilha: tabela fixa (motorista → km da área) e apelidos
// (nome da montagem → nome completo). Nomes cortados (a montagem Sul corta em 30 letras) casam pelo começo.
const normNome = (s) => semAcento(s).toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
export function buscaIdaVoltaKM(par = {}) {
  const idx = new Map(), apelidos = new Map();
  for (const [k, v] of Object.entries(par.idaVolta || {})) if (!k.includes('|')) idx.set(normNome(k), Number(v) || 0);
  for (const [k, v] of Object.entries(par.apelidos || {})) apelidos.set(normNome(k), normNome(v));
  return Object.assign((nome) => {
    const n = normNome(nome);
    if (!n) return null;
    for (const x of [apelidos.get(n), n]) if (x && idx.has(x)) return idx.get(x);
    const alvo = apelidos.get(n) || n;
    const cand = [...idx.keys()].filter((k) => k.startsWith(alvo) || (alvo.length >= 20 && alvo.startsWith(k)));
    return cand.length === 1 ? idx.get(cand[0]) : null;
  }, { vazia: idx.size === 0 });
}

// Ida e volta de cada rota: o valor digitado na revisão vence; depois o que veio no arquivo; depois a tabela.
export function idaDaRota(r, busca) {
  if (r.idaManual != null) return { valor: r.idaManual, origem: 'manual' };
  if (r.idaVolta != null) return { valor: Number(r.idaVolta) || 0, origem: 'arquivo' };
  if (/FRETEIRO|GENERICO|EXTRA/i.test(semAcento(r.motorista))) return { valor: 0, origem: 'sem atribuição' };
  if (busca.vazia) return { valor: 0, origem: 'unidade sem tabela' };
  const v = busca(r.motorista);
  return v == null ? { valor: 0, origem: 'fora da tabela' } : { valor: v, origem: 'tabela' };
}

// Uma ida e volta por motorista/caminhão no dia. Se alguma rota do dia foi ajustada à mão, vale o ajuste.
function idaPorDia(rs, busca) {
  const grupos = new Map();
  for (const r of rs) {
    const k = `${r.data}|${chavePessoa(r) || `sem-pessoa-${r.placa || ''}`}`;
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

export function calcularKM({ mes, rotas: rotasBrutas = [], abastecimentos = [], parametros = {}, ajustes = {}, secoes = {} }) {
  const rotas = aplicarAjustesKM(rotasBrutas, ajustes);
  const dias = diasDoMes(mes);
  const unidades = {};
  for (const [c, u] of Object.entries(UNIDADES_KM)) {
    const par = { meta: 0.05, cpk: mes === '2026-11' ? CPK_NOV_2026[c] : null, ...(parametros[c] || {}) };
    const porDia = Object.fromEntries(dias.map((data) => [data, { data, planejado: 0, realizado: 0, rotas: 0, abastecimentos: 0 }]));
    const doMes = rotas.filter((r) => r.unidade === c && r.data?.startsWith(mes));
    const rs = doMes.filter((r) => !r.excluida && rotaNaSecao(r, secoes[c]));
    const busca = buscaIdaVoltaKM(par);
    const fretPend = rs.filter(eFreteiro);
    const revisao = { freteirosPendentes: fretPend.length, kmFreteirosPendentes: fretPend.reduce((s, r) => s + (Number(r.km) || 0), 0),
      excluidas: doMes.length - rs.length, ajustadas: doMes.filter((r) => r.ajustada).length };
    for (const r of rs) {
      if (!porDia[r.data]) continue;
      porDia[r.data].planejado += Number(r.km) || 0;
      porDia[r.data].rotas++;
    }
    // Ida e volta é uma vez por motorista/caminhão no dia, nunca uma vez por rota.
    for (const { r, valor } of idaPorDia(rs, busca)) if (porDia[r.data]) porDia[r.data].planejado += valor;
    const as = abastecimentos.filter((a) => a.unidade === c && a.data?.startsWith(mes));
    for (const a of as) {
      if (!porDia[a.data]) continue;
      porDia[a.data].realizado += Number(a.km) || 0;
      porDia[a.data].abastecimentos++;
    }
    const diasComRealizado = dias.filter((d) => porDia[d].abastecimentos > 0);
    const ultimoDia = diasComRealizado.at(-1) || null;
    const exibidos = dias.map((data) => {
      const d = porDia[data];
      return { ...d, diferenca: d.realizado - d.planejado, dispersao: d.planejado ? d.realizado / d.planejado - 1 : null,
        acumulado: !ultimoDia || data > ultimoDia };
    });
    const incluidos = exibidos.filter((d) => ultimoDia && d.data <= ultimoDia);
    const planejado = incluidos.reduce((s, d) => s + d.planejado, 0);
    const realizado = incluidos.reduce((s, d) => s + d.realizado, 0);
    const diferenca = realizado - planejado;
    const dispersao = planejado ? realizado / planejado - 1 : null;
    const motoristas = ['NORTE', 'SUL'].includes(c) ? detalheMotoristas(c, mes, rs, as, busca) : [];
    revisao.foraDaTabela = rs.filter((r) => idaDaRota(r, busca).origem === 'fora da tabela').length;
    revisao.foraDaSecao = doMes.filter((r) => !r.excluida && !rotaNaSecao(r, secoes[c])).length;
    unidades[c] = { unidade: c, nome: u.nome, temDados: doMes.length > 0 || as.length > 0, revisao, dias: exibidos, ultimoDia, totais: { planejado, realizado, diferenca, dispersao,
      custo: par.cpk == null ? null : diferenca * Number(par.cpk), dentroMeta: dispersao == null ? null : Math.abs(dispersao) <= (Number(par.meta) || 0), cpk: par.cpk == null ? null : Number(par.cpk), meta: Number(par.meta) || 0.05 }, motoristas };
  }
  return { mes, unidades };
}

function detalheMotoristas(unidade, mes, rotas, abastecimentos, busca) {
  const mapa = new Map();
  const chave = (motorista, placa) => `${String(motorista || 'SEM IDENTIFICAÇÃO').trim()}|${String(placa || '').trim().toUpperCase()}`;
  for (const r of rotas) {
    if (!r.data?.startsWith(mes)) continue;
    const k = chave(r.motorista, r.placa), x = mapa.get(k) || { motorista: r.motorista || 'Sem identificação', placa: r.placa || '', planejado: 0, realizado: 0, rotas: 0, semRota: 0 };
    x.planejado += Number(r.km) || 0; x.rotas++;
    mapa.set(k, x);
  }
  for (const { r, valor } of idaPorDia(rotas.filter((r) => r.data?.startsWith(mes)), busca)) mapa.get(chave(r.motorista, r.placa)).planejado += valor;
  const porPlacaDia = new Map();
  for (const r of rotas) if (r.placa && r.data?.startsWith(mes)) {
    const k = `${r.data}|${String(r.placa).toUpperCase()}`;
    if (!porPlacaDia.has(k)) porPlacaDia.set(k, []);
    porPlacaDia.get(k).push(r);
  }
  for (const a of abastecimentos) {
    if (!a.data?.startsWith(mes)) continue;
    const candidatas = porPlacaDia.get(`${a.data}|${String(a.placa || '').toUpperCase()}`) || [];
    const motoristas = [...new Set(candidatas.map((r) => r.motorista || 'Sem identificação'))];
    const r = candidatas.length && motoristas.length === 1 ? candidatas[0] : null;
    if (r) {
      const x = mapa.get(chave(r.motorista, r.placa));
      if (x) x.realizado += Number(a.km) || 0;
    } else {
      const label = candidatas.length ? 'Atribuição ambígua' : 'Sem rota';
      const k = chave(label, a.placa), x = mapa.get(k) || { motorista: label, placa: a.placa || '', planejado: 0, realizado: 0, rotas: 0, semRota: 0 };
      x.realizado += Number(a.km) || 0; x.semRota++; mapa.set(k, x);
    }
  }
  return [...mapa.values()].sort((a, b) => b.realizado - b.planejado - (a.realizado - a.planejado));
}

export function agregadoPublicado(resultado) {
  return Object.fromEntries(Object.entries(resultado.unidades).map(([c, u]) => [c, {
    unidade: c, nome: u.nome, temDados: u.temDados, ultimoDia: u.ultimoDia, totais: u.totais,
    dias: u.dias.map(({ data, planejado, realizado, diferenca, dispersao, acumulado }) => ({ data, planejado, realizado, diferenca, dispersao, acumulado })),
  }]));
}

export function unidadePorLocal(local) { return localUnidade(local) || null; }
