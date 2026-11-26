// Gestão à vista no Firestore.
//   gav_dados/{CBAR|CCRT}_{AAAA}      {unidade, ano,
//                                      valores (JSON {mes: {linha: v}}), origem (JSON {mes: {linha: origem}})  ← importados e digitados
//                                      auto (JSON {mes: {linha: v}}), autoOrigem (JSON), autoEm               ← dos outros acompanhamentos
//                                      atualizado}                                                            (admin)
//   gav_publicado/{CBAR|CCRT}_{AAAA}  {unidade, ano, valores (JSON, os que valem), publicadoEm, por}          (admin e leitores)
//   meta/publicacoes_gav              {anos: [...], atualizado}                                               (admin e leitores)
// O que vale em cada célula: digitado à mão > automático do Hub > importado (efetivoGV em gestao.js).
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { UNIDADES_GV, aplicarGV, editarGV, porAnoGV, autoDoMesGV, efetivoGV, KPI_CELULAS_GV } from './gestao.js?v=20261126-02';
import { lerEfetivoKPI } from './dados_kpi.js?v=20261126-02';
import { calcularAoVivo } from './dados.js?v=20261126-02';
import { calcularKMAoVivo } from './dados.js?v=20261126-02';
import { calcularPerdasAoVivo } from './dados_perdas.js?v=20261126-02';
import { calcularTXAoVivo } from './dados_transportes.js?v=20261126-02';

const refDados = (u, ano) => doc(db, 'gav_dados', `${u}_${ano}`);
const refPub = (u, ano) => doc(db, 'gav_publicado', `${u}_${ano}`);
const refMeta = () => doc(db, 'meta', 'publicacoes_gav');
const J = (s) => JSON.parse(s || '{}');

// Documento cru (importados/digitados + automático).
export async function lerAnoGV(u, ano) {
  const d = (await getDoc(refDados(u, ano))).data();
  if (!d) return { valores: {}, origem: {}, auto: {}, autoOrigem: {}, autoEm: null, atualizado: null };
  return { valores: J(d.valores), origem: J(d.origem), auto: J(d.auto), autoOrigem: J(d.autoOrigem), autoEm: d.autoEm?.toDate?.() || null, atualizado: d.atualizado?.toDate?.() || null };
}
// O que vale em cada célula (para a tela, a publicação e a exportação).
export async function lerEfetivoGV(u, ano) {
  const x = await lerAnoGV(u, ano);
  return { ...efetivoGV(x), atualizado: [x.atualizado, x.autoEm].filter(Boolean).sort((a, b) => b - a)[0] || null, autoEm: x.autoEm };
}
// merge: gravar os importados/digitados não apaga o automático (e vice-versa).
async function gravarAno(u, ano, x) {
  await setDoc(refDados(u, ano), { unidade: u, ano: +ano, valores: JSON.stringify(x.valores), origem: JSON.stringify(x.origem), atualizado: serverTimestamp() }, { merge: true });
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

// ---------------------------------------------------------------- automático
// Recalcula, mês a mês, o que vem da Montagem, das Perdas, do KM e do 1x1 e grava em "auto" dos dois DLs.
// meses: lista de números (1–12); sem lista, todos os meses do ano até o mês atual. Um acompanhamento sem dados
// (ou sem acesso) no mês simplesmente não preenche nada. aviso(texto) mostra o andamento.
export async function atualizarAutomaticoGV(ano, meses = null, aviso = () => {}) {
  const agora = new Date().toISOString().slice(0, 7);
  const lista = (meses || [...Array(12)].map((_, i) => i + 1)).filter((m) => `${ano}-${String(m).padStart(2, '0')}` <= agora);
  const docs = Object.fromEntries(await Promise.all(Object.keys(UNIDADES_GV).map(async (u) => [u, await lerAnoGV(u, ano)])));
  const falhas = new Set();
  for (const m of lista) {
    const mes = `${ano}-${String(m).padStart(2, '0')}`;
    aviso(`Lendo ${mes} dos outros acompanhamentos…`);
    const tenta = async (nome, f) => { try { return await f(); } catch { falhas.add(nome); return null; } };
    const [ba, jn, perdas, km, tx] = await Promise.all([
      tenta('Montagem', () => calcularAoVivo('CBAR', mes).then((r) => r.resultado)), tenta('Montagem', () => calcularAoVivo('CCRT', mes).then((r) => r.resultado)),
      tenta('Perdas', () => calcularPerdasAoVivo(mes)), tenta('KM', () => calcularKMAoVivo(mes)), tenta('1x1', () => calcularTXAoVivo(mes)),
    ]);
    const a = autoDoMesGV({ montagem: { CBAR: ba, CCRT: jn }, perdas, km, tx });
    // O KPI do Hub completa o que os outros acompanhamentos não trazem (Greenmile, Easy Pallet, km/litro, TRIXLOG…).
    const kpi = await tenta('KPI', () => lerEfetivoKPI(mes));
    if (kpi) {
      for (const u of Object.keys(UNIDADES_GV)) {
        for (const [l, refs] of Object.entries(KPI_CELULAS_GV)) {
          const v = kpi.valores[refs[u === 'CBAR' ? 0 : 1]];
          if (a.valores[u][l] == null && typeof v === 'number' && Number.isFinite(v)) { a.valores[u][l] = v; a.origem[u][l] = 'kpi'; }
        }
      }
    }
    for (const u of Object.keys(UNIDADES_GV)) {
      const d = docs[u];
      if (Object.keys(a.valores[u]).length) { d.auto[m] = a.valores[u]; d.autoOrigem[m] = a.origem[u]; } else { delete d.auto[m]; delete d.autoOrigem[m]; }
    }
  }
  for (const u of Object.keys(UNIDADES_GV)) {
    await setDoc(refDados(u, ano), { unidade: u, ano: +ano, auto: JSON.stringify(docs[u].auto), autoOrigem: JSON.stringify(docs[u].autoOrigem), autoEm: serverTimestamp() }, { merge: true });
  }
  return { meses: lista, falhas: [...falhas] };
}

// Para a exportação: o ano e os quatro anteriores (os blocos agrupados à direita da aba Dados).
export async function lerAnosGV(u, ano, publicado = false) {
  const out = {};
  for (let a = +ano; a >= +ano - 4; a--) {
    const x = publicado ? await lerPublicadoGV(u, a) : await lerEfetivoGV(u, a);
    if (x && Object.keys(x.valores).length) out[a] = x.valores;
  }
  return out;
}

export async function publicarGV(ano) {
  for (const u of Object.keys(UNIDADES_GV)) {
    const x = await lerEfetivoGV(u, ano);
    await setDoc(refPub(u, ano), { unidade: u, ano: +ano, valores: JSON.stringify(x.valores), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null });
  }
  const anos = new Set((await getDoc(refMeta())).data()?.anos || []);
  anos.add(+ano);
  await setDoc(refMeta(), { anos: [...anos].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerPublicadoGV(u, ano) {
  const d = (await getDoc(refPub(u, ano))).data();
  return d ? { valores: J(d.valores), origem: {}, atualizado: d.publicadoEm?.toDate?.() || null } : null;
}
export async function anosPublicadosGV() { return (await getDoc(refMeta())).data()?.anos || []; }
