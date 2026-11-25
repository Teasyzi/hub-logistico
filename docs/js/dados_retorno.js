// Retorno por motivo no Firestore.
//   retorno_dados/{NORTE|SUL}_{mes}      {unidade, mes, motivos:[{motivo,cx}], motoristas:[{nome,rs}], volume, arquivos, atualizado}  (admin)
//   retorno_parametro/{unidade}_{mes}    {volume}                                                                 (admin)
//   retorno_publicado/{unidade}_{mes}    {unidade, mes, placar (JSON, sem nomes de motoristas), publicadoEm, por}  (admin e leitores)
//   meta/publicacoes_retorno             {meses:[...]}
// Os DLs não têm coleção própria: usam venda/ e retorno/ da Montagem de Cargas.
import { db, auth } from './firebase.js';
import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { UNIDADES_RET, DAS_RET, DLS_RET, calcularRetorno, agregadoPublicadoRetorno } from './retorno.js?v=20261125-22';

const refDados = (u, mes) => doc(db, 'retorno_dados', `${u}_${mes}`);
const refPar = (u, mes) => doc(db, 'retorno_parametro', `${u}_${mes}`);

async function doMes(col, centro, mes) {
  const s = await getDocs(query(collection(db, col), where('centro', '==', centro), where('mes', '==', mes)));
  return s.docs.map((d) => d.data());
}

// Grava o que o arquivo trouxe: motivos e motoristas substituem os do mês; o que o arquivo não tem fica como estava.
export async function gravarRetornoDA(mes, unidades, arquivo) {
  let n = 0;
  for (const [u, x] of Object.entries(unidades)) {
    if (!DAS_RET.includes(u)) continue;
    const ref = refDados(u, mes), atual = (await getDoc(ref)).data() || {};
    const novo = { unidade: u, mes, atualizado: serverTimestamp(), arquivos: { ...(atual.arquivos || {}) } };
    if (x.motivos) { novo.motivos = x.motivos; novo.arquivos.motivos = arquivo; n += x.motivos.length; }
    if (x.motoristas) { novo.motoristas = x.motoristas; novo.arquivos.motoristas = arquivo; n += x.motoristas.length; }
    if (x.volume != null) novo.volume = x.volume;
    await setDoc(ref, novo, { merge: true });
  }
  return n;
}

export async function lerParametrosRetorno(mes) {
  const us = Object.keys(UNIDADES_RET), xs = await Promise.all(us.map((u) => getDoc(refPar(u, mes))));
  return Object.fromEntries(us.map((u, i) => [u, xs[i].data() || {}]));
}
export async function gravarParametrosRetorno(mes, valores) {
  for (const [u, v] of Object.entries(valores)) await setDoc(refPar(u, mes), { unidade: u, mes, ...v, atualizado: serverTimestamp() });
}

export async function lerDadosRetorno(mes) {
  const [das, dls, parametros] = await Promise.all([
    Promise.all(DAS_RET.map((u) => getDoc(refDados(u, mes)))),
    Promise.all(DLS_RET.map(async (c) => ({ venda: await doMes('venda', c, mes), retorno: (await doMes('retorno', c, mes)).flatMap((r) => r.itens || []) }))),
    lerParametrosRetorno(mes),
  ]);
  const dados = {}, atualizados = [];
  DAS_RET.forEach((u, i) => { const d = das[i].data() || {}; dados[u] = d; if (d.atualizado?.toDate) atualizados.push(d.atualizado.toDate()); });
  DLS_RET.forEach((c, i) => { dados[c] = dls[i]; });
  return { mes, dados, parametros, atualizado: atualizados.sort((a, b) => b - a)[0] || null };
}

export async function calcularRetornoAoVivo(mes) {
  const x = await lerDadosRetorno(mes);
  return { ...calcularRetorno(x), parametros: x.parametros, atualizado: x.atualizado };
}

export async function publicarRetorno(mes) {
  const r = await calcularRetornoAoVivo(mes), ag = agregadoPublicadoRetorno(r);
  for (const [u, placar] of Object.entries(ag)) {
    await setDoc(doc(db, 'retorno_publicado', `${u}_${mes}`), { unidade: u, mes, placar: JSON.stringify(placar), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  }
  const ref = doc(db, 'meta', 'publicacoes_retorno'), meses = new Set((await getDoc(ref)).data()?.meses || []);
  meses.add(mes);
  await setDoc(ref, { meses: [...meses].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerRetornoPublicado(mes) {
  const unidades = {};
  let publicadoEm = null;
  for (const u of Object.keys(UNIDADES_RET)) {
    const d = (await getDoc(doc(db, 'retorno_publicado', `${u}_${mes}`))).data();
    if (d) { unidades[u] = JSON.parse(d.placar); const em = d.publicadoEm?.toDate?.(); if (em && (!publicadoEm || em > publicadoEm)) publicadoEm = em; }
  }
  return { mes, unidades, publicadoEm };
}
export async function mesesRetornoPublicados() { return (await getDoc(doc(db, 'meta', 'publicacoes_retorno'))).data()?.meses || []; }
