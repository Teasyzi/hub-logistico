// Perdas de estoque DLs no Firestore.
//   perdas_dados/{DL}_{mes}         {dl, mes, movimentos:[MB59], inventario:[…], volumePlanilha, atualizado}   (admin)
//   perdas_parametro/produtos_{DL}  {dl, solar:{COD SOLAR: COD CB}, produtos:{COD CB:{d,c,q,f}}}                 (admin)
//   perdas_parametro/{DL}_{mes}     {ajustePreco, volume, faturamento, fatTendencia}                           (admin)
//   perdas_publicado/{DL}_{mes}     {dl, mes, placar (JSON), publicadoEm, por}                                 (admin e leitores)
//   meta/publicacoes_perdas         {meses:[...]}
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { calcularPerdas, agregadoPublicadoPerdas, DLS_PERDAS } from './perdas.js?v=20261124-2';
import { calcularAoVivo } from './dados.js?v=20261124-2';

const refDados = (dl, mes) => doc(db, 'perdas_dados', `${dl}_${mes}`);
const refPar = (id) => doc(db, 'perdas_parametro', id);

// Cadastro de produtos por DL: perdas_parametro/produtos_CBAR e produtos_CCRT.
const vazio = () => ({ solar: {}, produtos: {} });
export async function lerBasesProdutosPerdas() {
  const cs = Object.keys(DLS_PERDAS), xs = await Promise.all(cs.map((c) => getDoc(refPar(`produtos_${c}`))));
  return Object.fromEntries(cs.map((c, i) => { const d = xs[i].data(); return [c, d ? { solar: d.solar || {}, produtos: d.produtos || {} } : vazio()]; }));
}
// O cadastro novo completa o que já existe (o mesmo produto é atualizado; os outros ficam).
export async function gravarBaseProdutosPerdas(dl, base) {
  if (!DLS_PERDAS[dl]) throw new Error('Não sei de qual DL é o cadastro de produtos: o arquivo precisa ter o nome "Barreiras" ou "Juazeiro".');
  const atual = (await getDoc(refPar(`produtos_${dl}`))).data() || vazio();
  const novo = { solar: { ...(atual.solar || {}), ...(base.solar || {}) }, produtos: { ...(atual.produtos || {}), ...(base.produtos || {}) } };
  await setDoc(refPar(`produtos_${dl}`), { dl, ...novo, atualizado: serverTimestamp() });
  return Object.keys(novo.produtos).length;
}

// MB59: substitui do primeiro ao último dia que o arquivo cobre (por DL e mês). Inventário: substitui o do mês.
export async function gravarPerdas({ movimentos = [], inventario = [], volume = null, mesInventario = null }) {
  const grupos = new Map(), pega = (k) => { if (!grupos.has(k)) grupos.set(k, { mov: [], inv: [] }); return grupos.get(k); };
  for (const m of movimentos) pega(`${m.centro}|${m.data.slice(0, 7)}`).mov.push(m);
  if (inventario.length && !mesInventario) throw new Error('Informe o mês de referência do inventário.');
  for (const i of inventario) pega(`${i.centro}|${mesInventario}`).inv.push(i);
  let n = 0;
  for (const [k, g] of grupos) {
    const [dl, mes] = k.split('|'), ref = refDados(dl, mes), atual = (await getDoc(ref)).data() || {};
    const dados = { dl, mes, atualizado: serverTimestamp() };
    if (g.mov.length) {
      const ds = g.mov.map((m) => m.data).sort(), de = ds[0], ate = ds.at(-1);
      dados.movimentos = [...(atual.movimentos || []).filter((m) => m.data < de || m.data > ate), ...g.mov.map(({ centro, ...m }) => m)];
    }
    if (g.inv.length) dados.inventario = g.inv.map(({ centro, ...i }) => i);
    if (volume && g.mov.length) dados.volumePlanilha = volume;
    await setDoc(ref, dados, { merge: true });
    n += g.mov.length + g.inv.length;
  }
  return n;
}

export async function lerParametrosPerdas(dl, mes) { return (await getDoc(refPar(`${dl}_${mes}`))).data() || {}; }
export async function gravarParametrosPerdas(dl, mes, valores) {
  await setDoc(refPar(`${dl}_${mes}`), { dl, mes, ...valores, atualizado: serverTimestamp() });
}

// Volume e faturamento do DL vêm do resumo da Montagem de Cargas do mês (ACM e tendência).
export async function montagemDoMes(mes) {
  const out = {};
  for (const c of Object.keys(DLS_PERDAS)) {
    try { const r = (await calcularAoVivo(c, mes)).resultado.resumo; out[c] = { acm: r.acm, fat_acm: r.fat_acm, fat_tendencia: r.fat_tendencia }; }
    catch { out[c] = {}; }
  }
  return out;
}

export async function lerDadosPerdas(mes) {
  const cs = Object.keys(DLS_PERDAS);
  const [docs, pars, bases, montagem] = await Promise.all([
    Promise.all(cs.map((c) => getDoc(refDados(c, mes)))), Promise.all(cs.map((c) => lerParametrosPerdas(c, mes))), lerBasesProdutosPerdas(), montagemDoMes(mes),
  ]);
  const dados = {}, parametros = {}, atualizados = [];
  cs.forEach((c, i) => { const d = docs[i].data() || {}; dados[c] = d; parametros[c] = pars[i]; if (d.atualizado?.toDate) atualizados.push(d.atualizado.toDate()); });
  return { mes, dados, parametros, bases, montagem, atualizado: atualizados.sort((a, b) => b - a)[0] || null };
}

export async function calcularPerdasAoVivo(mes) {
  const x = await lerDadosPerdas(mes);
  return { ...calcularPerdas(x), atualizado: x.atualizado };
}

export async function publicarPerdas(mes) {
  const r = await calcularPerdasAoVivo(mes), ag = agregadoPublicadoPerdas(r);
  for (const [c, placar] of Object.entries(ag)) {
    await setDoc(doc(db, 'perdas_publicado', `${c}_${mes}`), { dl: c, mes, placar: JSON.stringify(placar), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  }
  const ref = doc(db, 'meta', 'publicacoes_perdas'), meses = new Set((await getDoc(ref)).data()?.meses || []);
  meses.add(mes);
  await setDoc(ref, { meses: [...meses].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerPerdasPublicado(mes) {
  const dls = {};
  let publicadoEm = null;
  for (const c of Object.keys(DLS_PERDAS)) {
    const d = (await getDoc(doc(db, 'perdas_publicado', `${c}_${mes}`))).data();
    if (d) { dls[c] = JSON.parse(d.placar); const em = d.publicadoEm?.toDate?.(); if (em && (!publicadoEm || em > publicadoEm)) publicadoEm = em; }
  }
  return { mes, dls, publicadoEm };
}
export async function mesesPerdasPublicados() { return (await getDoc(doc(db, 'meta', 'publicacoes_perdas'))).data()?.meses || []; }
