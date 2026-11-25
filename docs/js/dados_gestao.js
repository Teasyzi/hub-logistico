// Gestão à vista no Firestore.
//   gav_dados/{CBAR|CCRT}_{AAAA}      {unidade, ano, valores (JSON {mes: {linha: v}}), origem (JSON {mes: {linha: origem}}), atualizado}  (admin)
//   gav_publicado/{CBAR|CCRT}_{AAAA}  {unidade, ano, valores (JSON), publicadoEm, por}                                                (admin e leitores)
//   meta/publicacoes_gav              {anos: [...], atualizado}                                                                        (admin e leitores)
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { UNIDADES_GV, aplicarGV, editarGV, porAnoGV } from './gestao.js?v=20261125-18';

const refDados = (u, ano) => doc(db, 'gav_dados', `${u}_${ano}`);
const refPub = (u, ano) => doc(db, 'gav_publicado', `${u}_${ano}`);
const refMeta = () => doc(db, 'meta', 'publicacoes_gav');

export async function lerAnoGV(u, ano) {
  const d = (await getDoc(refDados(u, ano))).data();
  return d ? { valores: JSON.parse(d.valores || '{}'), origem: JSON.parse(d.origem || '{}'), atualizado: d.atualizado?.toDate?.() || null } : { valores: {}, origem: {}, atualizado: null };
}
async function gravarAno(u, ano, x) {
  await setDoc(refDados(u, ano), { unidade: u, ano: +ano, valores: JSON.stringify(x.valores), origem: JSON.stringify(x.origem), atualizado: serverTimestamp() });
}

// Junta o que o arquivo trouxe (lerArquivoGV) aos valores de cada DL e ano. Devolve {u: {ano: {n, mantidos}}}.
export async function gravarImportacaoGV(lido) {
  const out = {};
  for (const [u, anos] of Object.entries(porAnoGV(lido))) {
    if (!UNIDADES_GV[u]) continue;
    for (const [ano, es] of Object.entries(anos)) {
      const r = aplicarGV(await lerAnoGV(u, ano), es);
      await gravarAno(u, ano, r);
      (out[u] ??= {})[ano] = { n: r.n, mantidos: r.mantidos };
    }
  }
  return out;
}

export async function gravarEdicoesGV(u, ano, edicoes) {
  const r = editarGV(await lerAnoGV(u, ano), edicoes);
  await gravarAno(u, ano, r);
  return r;
}

// Para a exportação: o ano e os quatro anteriores (os blocos agrupados à direita da aba Dados).
export async function lerAnosGV(u, ano, publicado = false) {
  const out = {};
  for (let a = +ano; a >= +ano - 4; a--) {
    const x = publicado ? await lerPublicadoGV(u, a) : await lerAnoGV(u, a);
    if (x && Object.keys(x.valores).length) out[a] = x.valores;
  }
  return out;
}

export async function publicarGV(ano) {
  for (const u of Object.keys(UNIDADES_GV)) {
    const x = await lerAnoGV(u, ano);
    await setDoc(refPub(u, ano), { unidade: u, ano: +ano, valores: JSON.stringify(x.valores), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  }
  const anos = new Set((await getDoc(refMeta())).data()?.anos || []);
  anos.add(+ano);
  await setDoc(refMeta(), { anos: [...anos].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerPublicadoGV(u, ano) {
  const d = (await getDoc(refPub(u, ano))).data();
  return d ? { valores: JSON.parse(d.valores || '{}'), origem: {}, atualizado: d.publicadoEm?.toDate?.() || null } : null;
}
export async function anosPublicadosGV() { return (await getDoc(refMeta())).data()?.anos || []; }
