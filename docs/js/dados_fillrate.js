// Fill rate / Insuficiência no Firestore.
//   fr_dados/{NORTE|SUL}_{mes}     {unidade, mes, produtos (JSON), linhas (JSON), nLinhas, arquivo, atualizado}  (admin)
//   fr_publicado/{NORTE|SUL}_{mes} {unidade, mes, placar (JSON), publicadoEm, por}                              (admin e leitores)
//   meta/publicacoes_fr            {meses:[...]}
//   fr_parametro/produtos          {mapa (JSON {DESCRIÇÃO: código}), n, arquivo, atualizado}                    (admin)
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { UNIDADES_FR, calcularFR, compactar, descompactar, agregadoPublicadoFR, lerAgregadoFR } from './fillrate.js?v=20261125-8';

const refDados = (u, mes) => doc(db, 'fr_dados', `${u}_${mes}`);
const refCadastro = () => doc(db, 'fr_parametro', 'produtos');

// Cadastro de produtos (descrição → código). Soma ao que já existe: um código novo substitui o antigo, e os
// produtos que saíram do cadastro continuam com código nos meses antigos.
export async function lerCadastroFR() {
  const d = (await getDoc(refCadastro())).data();
  return d ? { mapa: JSON.parse(d.mapa || '{}'), n: d.n, arquivo: d.arquivo, atualizado: d.atualizado?.toDate?.() || null } : { mapa: {}, n: 0 };
}
export async function gravarCadastroFR(mapa, arquivo) {
  const atual = (await lerCadastroFR()).mapa, novo = { ...atual, ...mapa }, n = Object.keys(novo).length;
  await setDoc(refCadastro(), { mapa: JSON.stringify(novo), n, arquivo, atualizado: serverTimestamp() });
  return n;
}

// O relatório é acumulado do mês: reimportar substitui o mês inteiro da revenda que o arquivo traz.
export async function gravarFR(meses, arquivo) {
  let n = 0;
  for (const [mes, us] of Object.entries(meses)) {
    for (const [u, x] of Object.entries(us)) {
      if (!UNIDADES_FR[u]) continue;
      const c = compactar(x.linhas);
      await setDoc(refDados(u, mes), { unidade: u, mes, produtos: JSON.stringify(c.produtos), linhas: JSON.stringify(c.linhas), nLinhas: x.linhas.length, arquivo, atualizado: serverTimestamp() });
      n += x.linhas.length;
    }
  }
  return n;
}

export async function lerDadosFR(mes) {
  const us = Object.keys(UNIDADES_FR), [xs, cad] = await Promise.all([Promise.all(us.map((u) => getDoc(refDados(u, mes)))), lerCadastroFR()]);
  const dados = {}, atualizados = [];
  us.forEach((u, i) => {
    const d = xs[i].data();
    if (!d) return;
    dados[u] = { arquivo: d.arquivo, linhas: descompactar({ produtos: JSON.parse(d.produtos || '[]'), linhas: JSON.parse(d.linhas || '[]') }, mes) };
    if (d.atualizado?.toDate) atualizados.push(d.atualizado.toDate());
  });
  return { mes, dados, codigos: cad.mapa, atualizado: atualizados.sort((a, b) => b - a)[0] || null };
}

export async function calcularFRAoVivo(mes) {
  const x = await lerDadosFR(mes);
  return { ...calcularFR(x), atualizado: x.atualizado };
}

export async function publicarFR(mes) {
  const r = await calcularFRAoVivo(mes), ag = agregadoPublicadoFR(r);
  for (const [u, placar] of Object.entries(ag)) {
    await setDoc(doc(db, 'fr_publicado', `${u}_${mes}`), { unidade: u, mes, placar: JSON.stringify(placar), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  }
  const ref = doc(db, 'meta', 'publicacoes_fr'), meses = new Set((await getDoc(ref)).data()?.meses || []);
  meses.add(mes);
  await setDoc(ref, { meses: [...meses].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerFRPublicado(mes) {
  const unidades = {};
  let publicadoEm = null;
  for (const u of Object.keys(UNIDADES_FR)) {
    const d = (await getDoc(doc(db, 'fr_publicado', `${u}_${mes}`))).data();
    if (d) { unidades[u] = lerAgregadoFR(u, JSON.parse(d.placar)); const em = d.publicadoEm?.toDate?.(); if (em && (!publicadoEm || em > publicadoEm)) publicadoEm = em; }
  }
  // A linha GERAL do resumo é refeita a partir dos totais publicados.
  const us = Object.values(unidades).filter((d) => d.temDados), ent = us.reduce((s, d) => s + d.totais.entregue, 0), falta = us.reduce((s, d) => s + d.totais.falta, 0);
  const meta = us[0]?.totais.meta ?? 0.02, ped = ent + falta, pct = ped ? falta / ped : null;
  const geral = { entregue: ent, falta, pedido: ped, insuf: pct, fillRate: pct == null ? null : 1 - pct, meta, metaCx: meta * ped, acimaMeta: falta - meta * ped, dentroMeta: pct == null ? null : pct <= meta };
  return { mes, unidades, geral, publicadoEm };
}
export async function mesesFRPublicados() { return (await getDoc(doc(db, 'meta', 'publicacoes_fr'))).data()?.meses || []; }
