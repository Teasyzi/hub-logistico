// Montadores no Firestore (só admin). Coleções (nomes ficam aqui, nunca no repositório):
//   mont_cadastro/{pessoa}  {pessoa, login, nome, base, diarista, aliases:[chaves], origem, atualizado}
//       cadastro DA/DL: a unidade de cada montador vem daqui (é o "banco de dados").
//   mont_dia/{AAAA-MM-DD}   {data, mes, registros:[{login, nome, base, posicao, caixas, cxHora, erros, ...}], atualizado, origem}
//       produção do dia nas 4 unidades. Importar um dia troca só as unidades que vieram naquele arquivo.
//   mont_meta/meses         {meses:[AAAA-MM], atualizado, origem}
import { db } from './firebase.js';
import {
  collection, doc, getDoc, getDocs, query, where, writeBatch, setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const LOTE = 400;
// O Firestore recusa "undefined": tira os campos vazios antes de gravar.
const limpo = (x) => JSON.parse(JSON.stringify(x));

export async function lerCadastroMontadores() {
  const s = await getDocs(collection(db, 'mont_cadastro'));
  return s.docs.map((d) => d.data());
}

// Substitui o cadastro inteiro (planilha oficial) ou acrescenta pessoas (novatos confirmados).
export async function gravarCadastroMontadores(pessoas, substituir, origem) {
  const atuais = substituir ? (await getDocs(collection(db, 'mont_cadastro'))).docs.map((d) => d.id) : [];
  const novos = new Set(pessoas.map((p) => p.pessoa));
  const apagar = atuais.filter((id) => !novos.has(id));
  const agora = Date.now();
  const ops = [...apagar.map((id) => ({ ref: doc(db, 'mont_cadastro', id), dados: null })),
    ...pessoas.map((p) => ({ ref: doc(db, 'mont_cadastro', p.pessoa), dados: limpo({ ...p, origem, atualizado: agora }) }))];
  for (let i = 0; i < ops.length; i += LOTE) {
    const b = writeBatch(db);
    for (const op of ops.slice(i, i + LOTE)) { if (op.dados) b.set(op.ref, op.dados); else b.delete(op.ref); }
    await b.commit();
  }
}

export async function lerDiasMontadores(mes) {
  const s = await getDocs(query(collection(db, 'mont_dia'), where('mes', '==', mes)));
  return s.docs.flatMap((d) => d.data().registros || []);
}

export async function lerMesesMontadores() {
  const d = await getDoc(doc(db, 'mont_meta', 'meses'));
  return d.exists() ? d.data() : { meses: [], atualizado: null, origem: '' };
}

// porDia: Map data -> registros novos do dia. Em cada dia, troca só as unidades presentes no lote.
export async function gravarDiasMontadores(porDia, origem) {
  const agora = Date.now();
  for (const [data, novos] of porDia) {
    const novosLimpos = novos.map(limpo), basesNovas = new Set(novosLimpos.map((r) => r.base));
    const atual = await getDoc(doc(db, 'mont_dia', data));
    const mantidos = (atual.exists() ? atual.data().registros || [] : []).filter((r) => !basesNovas.has(r.base));
    await setDoc(doc(db, 'mont_dia', data), { data, mes: data.slice(0, 7), registros: [...mantidos, ...novosLimpos], atualizado: agora, origem });
  }
  const meta = await lerMesesMontadores();
  const meses = [...new Set([...(meta.meses || []), ...[...porDia.keys()].map((d) => d.slice(0, 7))])].sort();
  await setDoc(doc(db, 'mont_meta', 'meses'), { meses, atualizado: agora, origem });
}
