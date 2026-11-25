// Fill rate / Insuficiência no Firestore.
//   fr_dados/{NORTE|SUL}_{mes}     {unidade, mes, produtos (JSON), linhas (JSON), nLinhas, arquivo, atualizado}  (admin)
//   fr_publicado/{NORTE|SUL}_{mes} {unidade, mes, placar (JSON), publicadoEm, por}                              (admin e leitores)
//   meta/publicacoes_fr            {meses:[...], resumos:{AAAA-MM:{NORTE|SUL:{totais, ultimoDia}}}} (comparativo dos leitores)
//   fr_resumo/{NORTE|SUL}_{mes}    {unidade, mes, ano, totais, ultimoDia}  (admin; gravado na importação, para o comparativo)
//   fr_parametro/produtos          {mapa (JSON {DESCRIÇÃO: código}), manual (JSON, editados à mão), n, arquivo, atualizado} (admin)
import { db, auth } from './firebase.js';
import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { UNIDADES_FR, calcularFR, calcularUnidadeFR, resumoMesFR, compactar, descompactar, agregadoPublicadoFR, lerAgregadoFR, chaveProduto } from './fillrate.js?v=20261125-16';

const refDados = (u, mes) => doc(db, 'fr_dados', `${u}_${mes}`);
const refCadastro = () => doc(db, 'fr_parametro', 'produtos');

// Cadastro de produtos (descrição → código). Soma ao que já existe: um código novo substitui o antigo, e os
// produtos que saíram do cadastro continuam com código nos meses antigos.
export async function lerCadastroFR() {
  const d = (await getDoc(refCadastro())).data();
  return d ? { mapa: JSON.parse(d.mapa || '{}'), manual: JSON.parse(d.manual || '{}'), n: d.n, arquivo: d.arquivo, atualizado: d.atualizado?.toDate?.() || null } : { mapa: {}, manual: {}, n: 0 };
}
export async function gravarCadastroFR(mapa, arquivo) {
  const atual = (await lerCadastroFR()).mapa, novo = { ...atual, ...mapa }, n = Object.keys(novo).length;
  await setDoc(refCadastro(), { mapa: JSON.stringify(novo), n, arquivo, atualizado: serverTimestamp() }, { merge: true });
  return n;
}
// Código editado à mão (lápis no detalhe): vale por cima do cadastro e não é apagado ao reimportar o cadastro.
// Código vazio = volta a valer o do cadastro. Devolve o código que passa a valer.
export async function gravarCodigoManualFR(prod, cod) {
  const c = await lerCadastroFR(), k = chaveProduto(prod), v = String(cod ?? '').trim();
  if (v) c.manual[k] = v; else delete c.manual[k];
  await setDoc(refCadastro(), { manual: JSON.stringify(c.manual), atualizado: serverTimestamp() }, { merge: true });
  return { cod: v || c.mapa[k] || null, manual: !!v };
}

// O relatório é acumulado do mês: reimportar substitui o mês inteiro da revenda que o arquivo traz.
export async function gravarFR(meses, arquivo) {
  let n = 0;
  for (const [mes, us] of Object.entries(meses)) {
    for (const [u, x] of Object.entries(us)) {
      if (!UNIDADES_FR[u]) continue;
      const c = compactar(x.linhas);
      await setDoc(refDados(u, mes), { unidade: u, mes, produtos: JSON.stringify(c.produtos), linhas: JSON.stringify(c.linhas), nLinhas: x.linhas.length, arquivo, atualizado: serverTimestamp() });
      const r = calcularUnidadeFR(x.linhas);
      await setDoc(doc(db, 'fr_resumo', `${u}_${mes}`), { unidade: u, mes, ano: +mes.slice(0, 4), totais: r.totais, ultimoDia: r.ultimoDia, atualizado: serverTimestamp() });
      n += x.linhas.length;
    }
  }
  return n;
}

export async function lerDadosFR(mes, cadastro = null) {
  const us = Object.keys(UNIDADES_FR), [xs, cad] = await Promise.all([Promise.all(us.map((u) => getDoc(refDados(u, mes)))), cadastro || lerCadastroFR()]);
  const dados = {}, atualizados = [];
  us.forEach((u, i) => {
    const d = xs[i].data();
    if (!d) return;
    dados[u] = { arquivo: d.arquivo, linhas: descompactar({ produtos: JSON.parse(d.produtos || '[]'), linhas: JSON.parse(d.linhas || '[]') }, mes) };
    if (d.atualizado?.toDate) atualizados.push(d.atualizado.toDate());
  });
  return { mes, dados, codigos: { ...cad.mapa, ...cad.manual }, manuais: new Set(Object.keys(cad.manual)), atualizado: atualizados.sort((a, b) => b - a)[0] || null };
}

export async function calcularFRAoVivo(mes) {
  const x = await lerDadosFR(mes);
  return { ...calcularFR(x), atualizado: x.atualizado };
}
// Vários meses (exportação do comparativo): o cadastro é lido uma vez só.
export async function calcularFRMeses(meses) {
  const cad = await lerCadastroFR(), out = {};
  for (const m of meses) out[m] = calcularFR(await lerDadosFR(m, cad));
  return out;
}

export async function publicarFR(mes) {
  const r = await calcularFRAoVivo(mes), ag = agregadoPublicadoFR(r);
  for (const [u, placar] of Object.entries(ag)) {
    await setDoc(doc(db, 'fr_publicado', `${u}_${mes}`), { unidade: u, mes, placar: JSON.stringify(placar), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  }
  const ref = doc(db, 'meta', 'publicacoes_fr'), meses = new Set((await getDoc(ref)).data()?.meses || []);
  meses.add(mes);
  // merge: o resumo deste mês entra em resumos sem apagar os outros meses.
  await setDoc(ref, { meses: [...meses].sort().reverse(), resumos: { [mes]: resumoMesFR(r) }, atualizado: serverTimestamp() }, { merge: true });
}

// Comparativo: no rascunho, os resumos gravados na importação; publicado, os gravados ao publicar cada mês.
export async function lerResumosFR(ano) {
  const s = await getDocs(query(collection(db, 'fr_resumo'), where('ano', '==', +ano))), out = {};
  for (const d of s.docs) { const x = d.data(); (out[x.mes] ??= {})[x.unidade] = { totais: x.totais, ultimoDia: x.ultimoDia || null }; }
  return out;
}
export async function lerResumosPublicadosFR() { return (await getDoc(doc(db, 'meta', 'publicacoes_fr'))).data()?.resumos || {}; }

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
