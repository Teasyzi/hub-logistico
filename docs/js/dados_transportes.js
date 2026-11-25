// Transportes 1x1 no Firestore.
//   transp_dados/{unidade}_{data}     {unidade, data, mes, cargas:[...], arquivo, atualizado}   (admin; tem nomes de motoristas)
//   transp_ajuste/{unidade}_{mes}     {unidade, mes, itens: {chave: {aj, cub, poss, obs, excluir, incluir}}}   (admin)
//   transp_publicado/{unidade}_{mes}  {unidade, mes, placar (JSON: totais, por dia, por motorista e cargas que contam; sem marcas e observações do admin), publicadoEm, por}   (admin e leitores)
//   transp_parametro/cadastro          {apelidos: {U: {NOME NO ARQUIVO: NOME COMPLETO}}}   (admin; Planilha1 do 1x1 + digitados)
//   meta/publicacoes_transp           {meses:[...]}
import { db, auth } from './firebase.js';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteField, FieldPath, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { UNIDADES_TX, calcularTX, agregadoPublicadoTX } from './transportes.js?v=20261125-15';
import { buscaIdaVoltaKM } from './km.js?v=20261125-15';
import { lerParametrosKM } from './dados.js?v=20261125-15';

const refAjuste = (u, mes) => doc(db, 'transp_ajuste', `${u}_${mes}`);

// Cada dia do arquivo substitui o dia guardado daquela unidade (reimportar corrige o dia).
export async function gravarCargasTX(unidade, cargas, arquivo) {
  const porDia = new Map();
  for (const c of cargas) { if (!porDia.has(c.data)) porDia.set(c.data, []); porDia.get(c.data).push(c); }
  for (const [data, lista] of porDia) {
    await setDoc(doc(db, 'transp_dados', `${unidade}_${data}`), { unidade, data, mes: data.slice(0, 7), cargas: lista, arquivo, atualizado: serverTimestamp() });
  }
  return porDia.size;
}

export async function lerDadosTX(mes) {
  const [s, ajs] = await Promise.all([
    getDocs(query(collection(db, 'transp_dados'), where('mes', '==', mes))),
    Promise.all(Object.keys(UNIDADES_TX).map((u) => getDoc(refAjuste(u, mes)))),
  ]);
  const cargas = [], arquivos = {};
  let atualizado = null;
  for (const d of s.docs) {
    const x = d.data();
    cargas.push(...(x.cargas || []));
    (arquivos[x.unidade] ??= new Set()).add(x.arquivo);
    const em = x.atualizado?.toDate?.();
    if (em && (!atualizado || em > atualizado)) atualizado = em;
  }
  const ajustes = Object.fromEntries(Object.keys(UNIDADES_TX).map((u, i) => [u, ajs[i].data()?.itens || {}]));
  return { mes, cargas, ajustes, atualizado, arquivos: Object.fromEntries(Object.entries(arquivos).map(([u, a]) => [u, [...a]])) };
}

// Nomes completos: o cadastro do 1x1 (Planilha1 importada e nomes digitados) e o cadastro de motoristas do KM.
const refCadastro = () => doc(db, 'transp_parametro', 'cadastro');
export async function lerCadastroTX() { return (await getDoc(refCadastro())).data()?.apelidos || {}; }
export async function gravarCadastroTX(novos) {
  const atual = await lerCadastroTX(), apelidos = { ...atual };
  for (const [u, m] of Object.entries(novos)) apelidos[u] = { ...(atual[u] || {}), ...m };
  await setDoc(refCadastro(), { apelidos, atualizado: serverTimestamp() });
  return Object.values(novos).reduce((a, m) => a + Object.keys(m).length, 0);
}
export const buscaNomesTX = (kmPar, apelidos) => buscaIdaVoltaKM({ ...kmPar, apelidos: { ...(kmPar?.apelidos || {}), ...(apelidos || {}) },
  cadastro: [...(kmPar?.cadastro || []), ...Object.values(apelidos || {})] }).resolver;
export async function lerNomesTX(mes) {
  const [cad, km] = await Promise.all([lerCadastroTX(), Promise.all(Object.keys(UNIDADES_TX).map((u) => lerParametrosKM(u, mes).catch(() => ({}))))]);
  return Object.fromEntries(Object.keys(UNIDADES_TX).map((u, i) => [u, buscaNomesTX(km[i], cad[u])]));
}

export async function calcularTXAoVivo(mes) {
  const [x, nomes] = await Promise.all([lerDadosTX(mes), lerNomesTX(mes)]);
  return { ...calcularTX({ ...x, nomes }), ajustes: x.ajustes, atualizado: x.atualizado, arquivos: x.arquivos };
}

// Ajuste de uma carga. Campo vazio (null) apaga o ajuste daquele campo.
export async function gravarAjusteTX(unidade, mes, chaveCarga, valores) {
  const ref = refAjuste(unidade, mes);
  await setDoc(ref, { unidade, mes, atualizado: serverTimestamp() }, { merge: true });
  const campos = [];
  for (const [k, v] of Object.entries(valores)) campos.push(new FieldPath('itens', chaveCarga, k), v == null || v === '' || v === false ? deleteField() : v);
  if (campos.length) await updateDoc(ref, ...campos);
}

export async function publicarTX(mes) {
  const r = await calcularTXAoVivo(mes), ag = agregadoPublicadoTX(r);
  for (const [u, placar] of Object.entries(ag)) {
    await setDoc(doc(db, 'transp_publicado', `${u}_${mes}`), { unidade: u, mes, placar: JSON.stringify(placar), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  }
  const ref = doc(db, 'meta', 'publicacoes_transp'), meses = new Set((await getDoc(ref)).data()?.meses || []);
  meses.add(mes);
  await setDoc(ref, { meses: [...meses].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerTXPublicado(mes) {
  const unidades = {};
  let publicadoEm = null;
  for (const u of Object.keys(UNIDADES_TX)) {
    const d = (await getDoc(doc(db, 'transp_publicado', `${u}_${mes}`))).data();
    if (d) { unidades[u] = JSON.parse(d.placar); const em = d.publicadoEm?.toDate?.(); if (em && (!publicadoEm || em > publicadoEm)) publicadoEm = em; }
  }
  return { mes, unidades, publicadoEm };
}
export async function mesesTXPublicados() { return (await getDoc(doc(db, 'meta', 'publicacoes_transp'))).data()?.meses || []; }
