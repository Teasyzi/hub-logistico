// KPI Distribuição e Logística no Firestore.
//   kpi_dados/{AAAA-MM}      {mes, valores (JSON {célula: v}), origem (JSON {célula: origem})   ← importados e digitados
//                             auto (JSON), autoOrigem (JSON), autoEm                           ← dos outros acompanhamentos
//                             atualizado}                                                      (admin)
//   kpi_publicado/{AAAA-MM}  {mes, valores (JSON, os que valem nas células de entrada), publicadoEm, por}  (admin e leitores)
//   meta/publicacoes_kpi     {meses: [...], atualizado}                                       (admin e leitores)
// O que vale: digitado > metas de perdas > automático do Hub > KPI importado > (metas) mês anterior (efetivoKPI).
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { aplicarKPI, editarKPI, autoDoMesKPI, efetivoKPI } from './kpi.js?v=20261126-10';
import { calcularAoVivo, calcularKMAoVivo } from './dados.js?v=20261126-10';
import { calcularPerdasAoVivo } from './dados_perdas.js?v=20261126-10';
import { calcularTXAoVivo } from './dados_transportes.js?v=20261126-10';
import { calcularRetornoAoVivo } from './dados_retorno.js?v=20261126-10';
import { calcularFRAoVivo } from './dados_fillrate.js?v=20261126-10';

const refDados = (mes) => doc(db, 'kpi_dados', mes);
const refPub = (mes) => doc(db, 'kpi_publicado', mes);
const refMeta = () => doc(db, 'meta', 'publicacoes_kpi');
const J = (s) => JSON.parse(s || '{}');
export const mesAnteriorKPI = (mes) => { const [a, m] = mes.split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; };

export async function lerMesKPI(mes) {
  const d = (await getDoc(refDados(mes))).data();
  if (!d) return { valores: {}, origem: {}, auto: {}, autoOrigem: {}, autoEm: null, atualizado: null };
  return { valores: J(d.valores), origem: J(d.origem), auto: J(d.auto), autoOrigem: J(d.autoOrigem), autoEm: d.autoEm?.toDate?.() || null, atualizado: d.atualizado?.toDate?.() || null };
}
// O que vale no mês (as metas sem valor vêm do mês anterior).
export async function lerEfetivoKPI(mes) {
  const [x, ant] = await Promise.all([lerMesKPI(mes), lerMesKPI(mesAnteriorKPI(mes))]);
  const e = efetivoKPI(x, efetivoKPI(ant));
  return { ...e, atualizado: [x.atualizado, x.autoEm].filter(Boolean).sort((a, b) => b - a)[0] || null, autoEm: x.autoEm };
}
async function gravarMes(mes, x) {
  await setDoc(refDados(mes), { mes, valores: JSON.stringify(x.valores), origem: JSON.stringify(x.origem), atualizado: serverTimestamp() }, { merge: true });
}

// lido = lerArquivoKPI(...) → {mes: {n, mantidos}}.
export async function gravarImportacaoKPI(lido) {
  const out = {};
  for (const [mes, es] of Object.entries(lido.meses || {})) {
    if (!es.length) continue;
    const r = aplicarKPI(await lerMesKPI(mes), es);
    await gravarMes(mes, r);
    out[mes] = { n: r.n, mantidos: r.mantidos };
  }
  return out;
}
export async function gravarEdicoesKPI(mes, edicoes) {
  const r = editarKPI(await lerMesKPI(mes), edicoes);
  await gravarMes(mes, r);
  return r;
}

// Recalcula o que vem dos outros acompanhamentos no mês e grava em "auto". Um acompanhamento sem dados ou sem
// acesso não preenche nada (fica o importado ou o digitado). Devolve as fontes que falharam.
export async function atualizarAutomaticoKPI(mes) {
  const falhas = new Set();
  const tenta = async (nome, f) => { try { return await f(); } catch { falhas.add(nome); return null; } };
  const [ba, jn, retorno, perdas, km, tx, fillrate] = await Promise.all([
    tenta('Montagem', () => calcularAoVivo('CBAR', mes).then((r) => r.resultado)), tenta('Montagem', () => calcularAoVivo('CCRT', mes).then((r) => r.resultado)),
    tenta('Retorno', () => calcularRetornoAoVivo(mes)), tenta('Perdas', () => calcularPerdasAoVivo(mes)), tenta('KM', () => calcularKMAoVivo(mes)),
    tenta('1x1', () => calcularTXAoVivo(mes)), tenta('Fill rate', () => calcularFRAoVivo(mes)),
  ]);
  const a = autoDoMesKPI({ montagem: { CBAR: ba, CCRT: jn }, retorno, perdas, km, tx, fillrate });
  await setDoc(refDados(mes), { mes, auto: JSON.stringify(a.valores), autoOrigem: JSON.stringify(a.origem), autoEm: serverTimestamp() }, { merge: true });
  return { n: Object.keys(a.valores).length, falhas: [...falhas] };
}

export async function publicarKPI(mes) {
  const x = await lerEfetivoKPI(mes);
  await setDoc(refPub(mes), { mes, valores: JSON.stringify(x.valores), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  const meses = new Set((await getDoc(refMeta())).data()?.meses || []);
  meses.add(mes);
  await setDoc(refMeta(), { meses: [...meses].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}
export async function lerPublicadoKPI(mes) {
  const d = (await getDoc(refPub(mes))).data();
  return d ? { valores: J(d.valores), origem: {}, atualizado: d.publicadoEm?.toDate?.() || null } : null;
}
export async function mesesKPIPublicados() { return (await getDoc(refMeta())).data()?.meses || []; }
