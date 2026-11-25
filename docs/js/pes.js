// PES Logístico 2026 (DLs, Solar): placar mensal por DL. Funções puras.
// Os 4 primeiros indicadores saem do resultado de calcular() da Montagem; os outros são digitados.
// Ponto cheio ou zero (sem proporcional). Catálogo: INDICATORS.md §2.

export const INDICADORES_PES = [
  { k: 'ret_vol', nome: '% retorno volume', meta: 0.01, pontos: 100, regra: '<=', auto: true, pct: true },
  { k: 'ret_cli', nome: '% retorno cliente', meta: 0.02, pontos: 100, regra: '<=', auto: true, pct: true },
  { k: 'reprog_vol', nome: '% reprogramação volume', meta: 0.03, pontos: 100, regra: '<=', auto: true, pct: true },
  { k: 'reprog_cli', nome: '% reprogramação cliente', meta: 0.03, pontos: 100, regra: '<=', auto: true, pct: true },
  { k: 'green_mile', nome: '% Green Mile', meta: 0.95, pontos: 50, regra: '>=', auto: false, pct: true },
  { k: 'csat', nome: 'CSAT entregas', meta: 90, pontos: 50, regra: '>=', auto: false, pct: false },
  { k: 'licencas', nome: 'Licenças e alvarás (1 = vigentes)', meta: 1, pontos: 200, regra: '>=', auto: false, pct: false },
  { k: 'acidentes', nome: 'Acidentes com afastamento', meta: 0, pontos: 200, regra: '=', auto: false, pct: false },
  { k: 'telemetria', nome: 'Telemetria segurança', meta: 0.95, pontos: 100, regra: '>=', auto: false, pct: true },
];

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

function bate(real, meta, regra) {
  if (real == null) return null;
  if (regra === '<=') return real <= meta + 1e-12;
  if (regra === '>=') return real >= meta - 1e-12;
  return Math.abs(real - meta) < 1e-12;
}

// Real e "quanto falta" (folga até a meta; negativo = estourou) dos automáticos
function automatico(k, m, meta) {
  if (!m) return { real: null, falta: null, faltaUn: null };
  const t = m.total, rp = m.reprog;
  const ent = t.entregas || 0;
  // Sem nenhum dia com Reprogramação, o % sairia 0 (soma vazia) e pontuaria: trata como sem dado
  const semRp = (c) => !m.dias || m.dias.every((d) => d[c] == null);
  if (k === 'reprog_vol' && semRp('rp_reprog')) return { real: null, falta: null, faltaUn: null };
  if (k === 'reprog_cli' && semRp('rp_cli')) return { real: null, falta: null, faltaUn: null };
  switch (k) {
    case 'ret_vol': return { real: t.ret_vol, falta: t.ret_vol == null ? null : meta * t.venda_cxu - t.ret_ext_cxu, faltaUn: 'CX UNIT' };
    case 'ret_cli': return { real: t.ret_cli, falta: t.ret_cli == null ? null : meta * ent - t.ret_cli * ent, faltaUn: 'clientes' };
    case 'reprog_vol': return { real: rp.pct, falta: rp.pct == null ? null : meta * rp.rp_uc_total - rp.rp_reprog, faltaUn: 'CX UNIT' };
    case 'reprog_cli': return { real: rp.pct_cli, falta: rp.pct_cli == null ? null : meta * ent - rp.rp_cli, faltaUn: 'clientes' };
    default: return { real: null, falta: null, faltaUn: null };
  }
}

export function placarPES(montagem, dig = {}) {
  const valores = dig.valores || {}, metas = dig.metas || {}, solar = dig.solar || {};
  const linhas = INDICADORES_PES.map((ind) => {
    const meta = num(metas[ind.k]) ?? ind.meta;
    const a = ind.auto ? automatico(ind.k, montagem, meta) : { real: num(valores[ind.k]), falta: null, faltaUn: null };
    const real = num(a.real);
    const bateu = bate(real, meta, ind.regra);
    return {
      k: ind.k, nome: ind.nome, meta, regra: ind.regra, pct: ind.pct, auto: ind.auto, real, bateu,
      possiveis: ind.pontos, feitos: bateu ? ind.pontos : 0, solar: num(solar[ind.k]), falta: a.falta, faltaUn: a.faltaUn,
    };
  });
  const sol = linhas.filter((l) => l.solar != null);
  return {
    linhas,
    total: {
      possiveis: linhas.reduce((s, l) => s + l.possiveis, 0),
      feitos: linhas.reduce((s, l) => s + l.feitos, 0),
      solar: sol.length ? sol.reduce((s, l) => s + l.solar, 0) : null,
    },
  };
}

// Percentual digitado na tela ("96,5") <-> fração guardada (0,965)
export const pctDeTela = (s) => {
  const t = String(s ?? '').trim().replace('%', '').replace(',', '.');
  if (t === '' || !Number.isFinite(+t)) return null;
  return +(+t / 100).toPrecision(12);
};
// Leitura estrita de campo da tela: vazio = {ok, v:null}; texto que não é número = {ok:false}
export function lerNumTela(s, pct) {
  const t = String(s ?? '').trim().replace(/%$/, '').trim();
  if (t === '') return { ok: true, v: null };
  if (!/^-?\d+([.,]\d+)?$/.test(t)) return { ok: false, v: null };
  const n = +t.replace(',', '.');
  return { ok: true, v: pct ? +(n / 100).toPrecision(12) : n };
}
export const pctParaTela = (x) => (x == null ? '' : String(+(x * 100).toPrecision(12)).replace('.', ','));
