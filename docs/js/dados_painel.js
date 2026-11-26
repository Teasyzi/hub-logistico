// Leitura dos números das prévias do painel principal (só o admin vê; usa os dados atuais do rascunho).
// Cada função devolve o formato esperado por painel.js, ou null quando não há dado.
import * as D from './dados.js?v=20261126-14';
import { calcularPerdasAoVivo } from './dados_perdas.js?v=20261126-14';
import { calcularRetornoAoVivo } from './dados_retorno.js?v=20261126-14';
import { calcularTXAoVivo } from './dados_transportes.js?v=20261126-14';
import { calcularFRAoVivo } from './dados_fillrate.js?v=20261126-14';
import { lerEfetivoGV } from './dados_gestao.js?v=20261126-14';
import { lerEfetivoKPI } from './dados_kpi.js?v=20261126-14';
import { diasGravadosRP, lerDiaRP } from './dados_reprog.js?v=20261126-14';
import { dadosMontadores, calcularMontadores } from './montadores.js?v=20261126-14';
import { CELULAS_KPI, calcularKPI, farolKPI, temDadosKPI } from './kpi.js?v=20261126-14';
import { calcularAnoGV } from './gestao.js?v=20261126-14';
import { resumoTX } from './transportes.js?v=20261126-14';

const DLS = ['CBAR', 'CCRT'], TODAS = ['NORTE', 'SUL', 'CBAR', 'CCRT'];
const porChave = async (chaves, f) => Object.fromEntries(await Promise.all(chaves.map(async (c) => [c, await f(c)])));
const algum = (o) => Object.values(o).some(Boolean);
const temMontagem = (r) => r.dias.some((d) => d.cx_unit || d.entregas);

// mes = 'AAAA-MM' → {id do card: async () => dados}.
export function leitoresPainel(mes) {
  // A Montagem serve a dois cards (Montagem e PES): lê uma vez por abertura do painel.
  const montagem = {};
  const lerMontagem = (c) => (montagem[c] ||= D.calcularAoVivo(c, mes).then((x) => (temMontagem(x.resultado) ? x.resultado : null)));
  return {
    montagem: async () => {
      const dls = await porChave(DLS, lerMontagem);
      return algum(dls) ? { mes, dls } : null;
    },
    kpi: async () => {
      const x = await lerEfetivoKPI(mes), valores = x?.valores || {};
      if (!temDadosKPI(valores)) return null;
      const cc = calcularKPI(valores), n = { ok: 0, no: 0, sem: 0 };
      for (const c of Object.values(CELULAS_KPI)) if (c.melhor && !c.oculta) n[farolKPI(c.r, cc) || 'sem']++;
      return { mes, ...n };
    },
    pes: async () => {
      const dls = await porChave(DLS, async (c) => {
        const p = await D.placarAoVivo(c, mes);
        return p.linhas.some((l) => l.real != null) ? p.total : null;
      });
      return algum(dls) ? { mes, dls } : null;
    },
    cargas: async () => {
      const data = (await D.datasCargas())[0], x = data ? await D.calcularCargasAoVivo(data) : null;
      return x ? { data, ...Object.fromEntries(['NORTE', 'SUL'].map((c) => [c, x.resultado.revendas[c]?.maisAntiga?.dias ?? null])) } : null;
    },
    montadores: async () => {
      const registros = await dadosMontadores(mes);
      if (!registros.length) return null;
      const por = calcularMontadores(registros, mes);
      return { mes, ...Object.fromEntries(TODAS.map((b) => {
        const ps = por[b] || [];
        return [b, ps.length ? ps.reduce((s, p) => s + p.mediaCxHora, 0) / ps.length : null];
      })) };
    },
    perdas: async () => {
      const r = await calcularPerdasAoVivo(mes);
      const dls = Object.fromEntries(DLS.map((c) => {
        const d = r.dls?.[c];
        return [c, d?.temDados ? { rs: d.totais.total, pctCx: d.totais.volume ? d.totais.totalCx / d.totais.volume : null } : null];
      }));
      return algum(dls) ? { mes, dls } : null;
    },
    km: async () => {
      const r = await D.calcularKMAoVivo(mes);
      const unidades = Object.fromEntries(TODAS.map((c) => [c, r.unidades[c]?.temDados ? r.unidades[c].totais : null]));
      return algum(unidades) ? { mes, unidades } : null;
    },
    retorno: async () => {
      const r = await calcularRetornoAoVivo(mes);
      const unidades = Object.fromEntries(TODAS.map((c) => {
        const d = r.unidades?.[c];
        return [c, d?.temDados ? { total: d.totais.pctTotal, semCanc: d.totais.pctSemCanc } : null];
      }));
      return algum(unidades) ? { mes, unidades } : null;
    },
    transportes: async () => {
      const r = await calcularTXAoVivo(mes);
      if (!Object.values(r.unidades || {}).some((d) => d.temDados)) return null;
      const g = r.geral || resumoTX(r.unidades).geral;
      return { mes, meta: g.meta, realizado: g.realizado, dif: g.dif };
    },
    fillrate: async () => {
      const r = await calcularFRAoVivo(mes);
      const unidades = Object.fromEntries(['NORTE', 'SUL'].map((c) => [c, r.unidades?.[c]?.temDados ? r.unidades[c].totais : null]));
      return algum(unidades) ? { mes, unidades } : null;
    },
    gestao: async () => {
      const ano = +mes.slice(0, 4);
      const dls = await porChave(DLS, async (c) => {
        const x = await lerEfetivoGV(c, ano), volume = calcularAnoGV(x?.valores || {}).linhas[6].m;
        for (let i = volume.length - 1; i >= 0; i--) if (volume[i] != null) return { mes: `${ano}-${String(i + 1).padStart(2, '0')}`, volume: volume[i] };
        return null;
      });
      return algum(dls) ? { dls } : null;
    },
    reprog: async () => {
      const indice = await diasGravadosRP();
      const r = await porChave(['NORTE', 'SUL'], async (u) => {
        const dia = indice[u]?.[0], x = dia ? await lerDiaRP(u, dia) : null;
        if (!x) return null;
        const digitado = Object.keys(x.dias).length > 0;
        return { dia, clientes: x.clientes.length, repetidos: digitado ? x.clientes.filter((c) => x.dias[c.cli] >= 2).length : null };
      });
      return algum(r) ? r : null;
    },
  };
}
