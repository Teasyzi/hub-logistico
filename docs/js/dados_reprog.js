// REPROG (DAs) no Firestore.
//   rp_dia/{NORTE|SUL}_{AAAA-MM-DD}   {u, dia, clientes (JSON [[cli, nome, valor, ped, itens]]), pedidos (JSON [[ped, cli, total, [[cod, q, vt]]]]),
//                                      prod (JSON {cod: desc}), dias (JSON {cli: n}, digitado), fonte, arquivo, atualizado, diasEm}   (admin)
//   rp_base/{NORTE|SUL}_meta           {partes, n, vends (JSON), sups (JSON), dataBase, arquivo, atualizado}                            (admin)
//   rp_base/{NORTE|SUL}_{k}            {clientes (JSON {cli: [razao, cidade, vendCod, supCod, pasta]})} — o cadastro em partes (<1 MB)  (admin)
//   rp_parametro/indice                {NORTE: [dias], SUL: [dias]} — os dias gravados, para achar o dia anterior                       (admin)
//   rp_publicado/{NORTE|SUL}_{dia}     {u, dia, linhas (JSON), quadro (JSON), publicadoEm, por}                                          (admin e leitores)
//   meta/publicacoes_rp                {NORTE: [dias], SUL: [dias], atualizado}                                                         (admin e leitores)
// O publicado leva só códigos, cidade, dia de rota e dias (os leitores não veem nomes; ver ficha §11).
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { REVENDAS_RP, compactarDiaRP, expandirClientesRP, resumoRP } from './reprog.js?v=20261126-12';

const J = (s, d = {}) => (s ? JSON.parse(s) : d);
const refDia = (u, dia) => doc(db, 'rp_dia', `${u}_${dia}`);
const refBase = (u, k) => doc(db, 'rp_base', `${u}_${k}`);
const refIndice = () => doc(db, 'rp_parametro', 'indice');
const refPub = (u, dia) => doc(db, 'rp_publicado', `${u}_${dia}`);
const refMeta = () => doc(db, 'meta', 'publicacoes_rp');
const POR_PARTE = 7000;

// ---------------------------------------------------------------- índice de dias
export async function diasGravadosRP() {
  const d = (await getDoc(refIndice())).data() || {};
  return Object.fromEntries(Object.keys(REVENDAS_RP).map((u) => [u, [...(d[u] || [])].sort().reverse()]));
}
async function marcarDia(u, dia) {
  const d = (await getDoc(refIndice())).data() || {};
  const s = new Set(d[u] || []); s.add(dia);
  await setDoc(refIndice(), { [u]: [...s].sort() }, { merge: true });
}

// ---------------------------------------------------------------- dia
export async function lerDiaRP(u, dia) {
  const d = (await getDoc(refDia(u, dia))).data();
  if (!d) return null;
  return { u, dia, clientes: expandirClientesRP(J(d.clientes, [])), pedidos: J(d.pedidos, []), prod: J(d.prod), dias: J(d.dias), fonte: d.fonte || '', arquivo: d.arquivo || '',
    atualizado: [d.atualizado?.toDate?.(), d.diasEm?.toDate?.()].filter(Boolean).sort((a, b) => b - a)[0] || null };
}

// Grava o relatório do dia (substitui pedidos e clientes; os dias digitados ficam). dias: {cli: n} para semear (planilha antiga).
export async function gravarDiaRP(u, dia, pedidos, { fonte, arquivo, dias = null, clientes = null } = {}) {
  const c = pedidos ? compactarDiaRP(pedidos) : { clientes: clientes.map((cli) => [cli, '', null, null, null]), pedidos: [], prod: {} };
  const atual = (await getDoc(refDia(u, dia))).data();
  // A planilha antiga do Resumo (sem pedidos) não apaga o relatório já gravado do mesmo dia.
  if (!pedidos && atual?.pedidos && J(atual.pedidos, []).length) {
    const x = { u, dia, dias: JSON.stringify({ ...J(atual.dias), ...(dias || {}) }), diasEm: serverTimestamp() };
    await setDoc(refDia(u, dia), x, { merge: true });
  } else {
    const x = { u, dia, clientes: JSON.stringify(c.clientes), pedidos: JSON.stringify(c.pedidos), prod: JSON.stringify(c.prod), fonte, arquivo, atualizado: serverTimestamp() };
    if (dias) { x.dias = JSON.stringify({ ...J(atual?.dias), ...dias }); x.diasEm = serverTimestamp(); }
    await setDoc(refDia(u, dia), x, { merge: true });
  }
  await marcarDia(u, dia);
  return { clientes: c.clientes.length, pedidos: c.pedidos.length };
}

// Dias digitados: {cli: n | null}. null apaga.
export async function gravarDiasRP(u, dia, edicoes) {
  const atual = J((await getDoc(refDia(u, dia))).data()?.dias);
  for (const [cli, n] of Object.entries(edicoes)) { if (n == null) delete atual[cli]; else atual[cli] = n; }
  await setDoc(refDia(u, dia), { dias: JSON.stringify(atual), diasEm: serverTimestamp() }, { merge: true });
  return atual;
}

// Último dia gravado antes de "dia" (o "dia anterior que foi feito"), com os dias digitados.
export async function diaAnteriorRP(u, dia, indice = null) {
  const lista = ((indice || await diasGravadosRP())[u] || []).filter((d) => d < dia).slice(0, 15);
  for (const d of lista) {
    const x = await lerDiaRP(u, d);
    if (x && Object.keys(x.dias).length) return { dia: d, dias: x.dias };
  }
  return null;
}

// ---------------------------------------------------------------- cadastro (base)
export async function gravarBaseRP(u, base, { arquivo, dataBase }) {
  const clis = Object.keys(base.clientes), partes = Math.max(1, Math.ceil(clis.length / POR_PARTE));
  for (let k = 0; k < partes; k++) {
    const pedaco = Object.fromEntries(clis.slice(k * POR_PARTE, (k + 1) * POR_PARTE).map((c) => [c, base.clientes[c]]));
    await setDoc(refBase(u, k), { clientes: JSON.stringify(pedaco) });
  }
  await setDoc(refBase(u, 'meta'), { partes, n: clis.length, vends: JSON.stringify(base.vends), sups: JSON.stringify(base.sups), dataBase: dataBase || null, arquivo: arquivo || '', atualizado: serverTimestamp() });
  return { n: clis.length, partes };
}

const cacheBase = new Map();
export async function lerBaseRP(u, { recarregar = false } = {}) {
  if (!recarregar && cacheBase.has(u)) return cacheBase.get(u);
  const m = (await getDoc(refBase(u, 'meta'))).data();
  if (!m) return null;
  const clientes = {};
  const partes = await Promise.all([...Array(m.partes)].map((_, k) => getDoc(refBase(u, k))));
  for (const p of partes) Object.assign(clientes, J(p.data()?.clientes));
  const b = { clientes, vends: J(m.vends), sups: J(m.sups), n: m.n, dataBase: m.dataBase, arquivo: m.arquivo, atualizado: m.atualizado?.toDate?.() || null };
  cacheBase.set(u, b);
  return b;
}
export function esquecerBaseRP() { cacheBase.clear(); }

// ---------------------------------------------------------------- publicação
export async function publicarRP(u, dia) {
  const x = await lerDiaRP(u, dia);
  if (!x) throw new Error(`Sem dados de ${REVENDAS_RP[u]} em ${dia}.`);
  const r = resumoRP(x, await lerBaseRP(u), await diaAnteriorRP(u, dia));
  const linhas = r.linhas.map((l) => [l.cli, l.cidade, l.vend, l.sup, l.pasta, l.dias]);
  const quadro = r.quadro.map((s) => [s.sup, s.n]);
  await setDoc(refPub(u, dia), { u, dia, linhas: JSON.stringify(linhas), quadro: JSON.stringify(quadro), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  const meta = (await getDoc(refMeta())).data() || {};
  const s = new Set(meta[u] || []); s.add(dia);
  await setDoc(refMeta(), { [u]: [...s].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
  return { clientes: linhas.length, semDias: r.linhas.length - r.digitados };
}

export async function lerPublicadoRP(u, dia) {
  const d = (await getDoc(refPub(u, dia))).data();
  if (!d) return null;
  const linhas = J(d.linhas, []).map(([cli, cidade, vend, sup, pasta, dias]) => ({ cli, cidade, vend, sup, pasta, dias, razao: '', vendNome: '', supNome: '' }));
  return { linhas, quadro: J(d.quadro, []).map(([sup, n]) => ({ sup, nome: '', n })), atualizado: d.publicadoEm?.toDate?.() || null };
}
export async function diasPublicadosRP() {
  const d = (await getDoc(refMeta())).data() || {};
  return Object.fromEntries(Object.keys(REVENDAS_RP).map((u) => [u, d[u] || []]));
}
