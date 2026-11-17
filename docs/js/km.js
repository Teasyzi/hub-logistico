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
const eFreteiro = (r) => r.categoria === 'FRETEIRO' || /FRETEIRO/i.test(`${r.motorista || ''} ${r.veiculoTipo || ''}`);
const localUnidade = (s) => ({ 'MATRIZ': 'NORTE', 'FILIAL II': 'SUL', 'FILIAL I': 'CBAR', 'FILIAL III': 'CCRT' })[String(s || '').trim().toLocaleUpperCase('pt-BR')];

export function calcularKM({ mes, rotas = [], abastecimentos = [], parametros = {} }) {
  const dias = diasDoMes(mes);
  const unidades = {};
  for (const [c, u] of Object.entries(UNIDADES_KM)) {
    const par = { meta: 0.05, cpk: mes === '2026-11' ? CPK_NOV_2026[c] : null, ...(parametros[c] || {}) };
    const porDia = Object.fromEntries(dias.map((data) => [data, { data, planejado: 0, realizado: 0, rotas: 0, abastecimentos: 0 }]));
    const rs = rotas.filter((r) => r.unidade === c && r.data?.startsWith(mes) && !eFreteiro(r));
    for (const r of rs) {
      if (!porDia[r.data]) continue;
      porDia[r.data].planejado += Number(r.km) || 0;
      porDia[r.data].rotas++;
    }
    // Ida e volta é uma vez por motorista/caminhão no dia, nunca uma vez por rota.
    const idaDia = new Set();
    for (const r of rs) {
      const pessoa = chavePessoa(r), area = String(r.area || '').trim().toLocaleUpperCase('pt-BR');
      const idaVolta = r.idaVolta ?? par.idaVolta?.[`${pessoa}|${area}`] ?? par.idaVolta?.[pessoa] ?? par.idaVolta?.[String(r.motorista || '').trim()];
      if (!porDia[r.data] || idaVolta == null) continue;
      const k = `${r.data}|${pessoa || `sem-pessoa-${r.placa || ''}`}`;
      if (!idaDia.has(k)) { porDia[r.data].planejado += Number(idaVolta) || 0; idaDia.add(k); }
    }
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
    const motoristas = ['NORTE', 'SUL'].includes(c) ? detalheMotoristas(c, mes, rs, as, par) : [];
    unidades[c] = { unidade: c, nome: u.nome, temDados: rs.length > 0 || as.length > 0, dias: exibidos, ultimoDia, totais: { planejado, realizado, diferenca, dispersao,
      custo: par.cpk == null ? null : diferenca * Number(par.cpk), dentroMeta: dispersao == null ? null : Math.abs(dispersao) <= (Number(par.meta) || 0), cpk: par.cpk == null ? null : Number(par.cpk), meta: Number(par.meta) || 0.05 }, motoristas };
  }
  return { mes, unidades };
}

function detalheMotoristas(unidade, mes, rotas, abastecimentos, parametros) {
  const mapa = new Map();
  const chave = (motorista, placa) => `${String(motorista || 'SEM IDENTIFICAÇÃO').trim()}|${String(placa || '').trim().toUpperCase()}`;
  const idaSomada = new Set();
  for (const r of rotas) {
    if (!r.data?.startsWith(mes) || eFreteiro(r)) continue;
    const k = chave(r.motorista, r.placa), x = mapa.get(k) || { motorista: r.motorista || 'Sem identificação', placa: r.placa || '', planejado: 0, realizado: 0, rotas: 0, semRota: 0 };
    x.planejado += Number(r.km) || 0; x.rotas++;
    const pessoa = chavePessoa(r), diaPessoa = `${r.data}|${pessoa || r.placa || ''}`;
    const area = String(r.area || '').trim().toLocaleUpperCase('pt-BR');
    const ida = r.idaVolta ?? parametros.idaVolta?.[`${pessoa}|${area}`] ?? parametros.idaVolta?.[pessoa] ?? parametros.idaVolta?.[String(r.motorista || '').trim()];
    if (ida != null && !idaSomada.has(diaPessoa)) { x.planejado += Number(ida) || 0; idaSomada.add(diaPessoa); }
    mapa.set(k, x);
  }
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
