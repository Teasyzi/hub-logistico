// Camada de dados no Firestore.
// Coleções (só números e códigos, sem nomes):
//   venda/{centro}_{transporte}      {centro, mes, data, cxf, cxu}
//   retorno/{centro}_{transporte}    {centro, mes, data, itens:[{tipo,data,cli,mot,ext,cxf,cxu}]}  (ordem do arquivo)
//   planejamento/{centro}_{data}     {centro, mes, data, entregas, cargas, ocupacao, reprog_uc, reprog_cli, uc_total, reprog_so_cubos, reprog_so_cli, origem}
//   parametro/{centro}_{mes}         {centro, mes, valores:{...}, origem:{...}}
//   estado/{centro}                  {ultimoPlan}
//   importacao/{auto}                {arquivo, tipo, centro, linhas, periodo, aviso, por, em}
//   publicado/{centro}_{mes}         {centro, mes, resultado, motivos, publicadoEm, por}
//   meta/publicacoes                 {meses:[...]}   meta/acesso {leitores:[emails]}
import { db, auth } from './firebase.js';
import {
  collection, doc, getDoc, getDocs, query, where, writeBatch, setDoc, addDoc, serverTimestamp, orderBy, limit,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { calcular, motivos } from './calc.js?v=20261117-5';
import { placarPES } from './pes.js';
import { calcularKM, agregadoPublicado, UNIDADES_KM } from './km.js';

export const UNIDADES = {
  CBAR: { nome: 'DL Barreiras', cor: 1 },
  CCRT: { nome: 'DL Juazeiro', cor: 2 },
};
export const PARAMETROS = {
  dias_uteis: ['Dias úteis', null],
  ajuste_dias_trabalhados: ['Ajuste manual de dias trabalhados (vazio = 0; ex.: -1)', null],
  volume_aa: ['Volume cx unit ano anterior (AA)', null],
  meta_volume: ['Meta de volume (cx unit)', null],
  tarifa: ['Tarifa R$ por cx unit', null],
  faturamento_aa: ['Faturamento ano anterior (R$)', null],
  meta_faturamento: ['Meta de faturamento (R$)', null],
  meta_reprog: ['Meta % reprogramação', 0.03],
};
const PESO = { legado: 1, resumo: 2, manual: 3 };

async function gravarEmLotes(ops) {  // ops: [[ref, dados, {merge}]]
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db);
    for (const [ref, d, o] of ops.slice(i, i + 400)) b.set(ref, d, o || {});
    await b.commit();
  }
}

export async function gravarVenda(linhas) {
  await gravarEmLotes(linhas.map((v) => [doc(db, 'venda', `${v.centro}_${v.transporte}`),
    { centro: v.centro, mes: v.data.slice(0, 7), data: v.data, cxf: v.cxf, cxu: v.cxu }]));
}

export async function gravarRetorno(linhas) {
  const porT = new Map();
  for (const r of linhas) {
    const k = `${r.centro}_${r.transporte}`;
    if (!porT.has(k)) porT.set(k, { centro: r.centro, mes: r.data.slice(0, 7), data: r.data, itens: [] });
    porT.get(k).itens.push({ tipo: r.tipo, data: r.data, cli: r.cli, mot: r.mot, ext: r.ext, cxf: r.cxf, cxu: r.cxu });
  }
  await gravarEmLotes([...porT].map(([k, d]) => [doc(db, 'retorno', k), d]));
  return porT.size;
}

// Grava planejamento respeitando a prioridade: manual > Resumo do dia > planilha antiga
export async function gravarPlan(lista, origem) {
  const ops = [];
  for (const p of lista) {
    const ref = doc(db, 'planejamento', `${p.centro}_${p.data}`);
    const atual = (await getDoc(ref)).data();
    if (atual && (PESO[atual.origem] || 0) > PESO[origem]) continue;
    ops.push([ref, { ...p, mes: p.data.slice(0, 7), origem, atualizado: serverTimestamp() }, { merge: true }]);
  }
  await gravarEmLotes(ops);
  if (origem === 'resumo') {
    for (const p of lista) {
      const ref = doc(db, 'estado', p.centro);
      const e = (await getDoc(ref)).data();
      if (!e || !e.ultimoPlan || p.data >= e.ultimoPlan) await setDoc(ref, { ultimoPlan: p.data }, { merge: true });
    }
  }
  return ops.length;
}

// Reprogramação antiga só completa campos vazios do planejamento já existente
export async function completarReprog(lista) {
  const ops = [];
  for (const r of lista) {
    const ref = doc(db, 'planejamento', `${r.centro}_${r.data}`);
    const atual = (await getDoc(ref)).data();
    if (!atual) continue;
    const upd = {};
    if (atual.reprog_so_cubos == null) upd.reprog_so_cubos = r.reprog_so_cubos;
    if (atual.reprog_so_cli == null) upd.reprog_so_cli = r.reprog_so_cli;
    if (atual.uc_total == null && r.uc_total != null) upd.uc_total = r.uc_total;
    if (Object.keys(upd).length) ops.push([ref, upd, { merge: true }]);
  }
  await gravarEmLotes(ops);
  return ops.length;
}

export async function lerParametros(centro, mes) {
  const d = (await getDoc(doc(db, 'parametro', `${centro}_${mes}`))).data();
  return { valores: d?.valores || {}, origem: d?.origem || {} };
}

export async function gravarParametros(centro, mes, valores, origem) {
  const atual = await lerParametros(centro, mes);
  const v = { ...atual.valores }, o = { ...atual.origem };
  for (const [k, x] of Object.entries(valores)) {
    if (origem === 'planilha' && o[k] === 'manual') continue;  // edição manual vence o histórico
    if (x == null) { delete v[k]; delete o[k]; } else { v[k] = x; o[k] = origem; }
  }
  await setDoc(doc(db, 'parametro', `${centro}_${mes}`), { centro, mes, valores: v, origem: o, atualizado: serverTimestamp() });
}

export async function ultimaAtualizacaoMontagem(mes) {
  const [planejamento, parametros] = await Promise.all([
    getDocs(query(collection(db, 'planejamento'), where('mes', '==', mes))),
    Promise.all(Object.keys(UNIDADES).map((c) => getDoc(doc(db, 'parametro', `${c}_${mes}`)))),
  ]);
  const datas = [...planejamento.docs.map((s) => s.data()?.atualizado?.toDate?.()),
    ...parametros.map((s) => s.data()?.atualizado?.toDate?.())];
  return datas.filter(Boolean).sort((a, b) => b - a)[0] || null;
}

export async function registrarImportacao(info) {
  const acompanhamento = info.acompanhamento || (String(info.tipo || '').startsWith('km_') ? 'km' : 'montagem');
  await addDoc(collection(db, 'importacao'), { ...info, acompanhamento, por: auth.currentUser?.email || null, em: serverTimestamp() });
}

export async function ultimasImportacoes(acompanhamento = 'montagem', n = 30) {
  const s = await getDocs(query(collection(db, 'importacao'), orderBy('em', 'desc'), limit(300)));
  return s.docs.map((d) => d.data()).filter((r) => {
    const modulo = r.acompanhamento || (String(r.tipo || '').startsWith('km_') ? 'km' : 'montagem');
    return modulo === acompanhamento;
  }).slice(0, n);
}

async function doMes(col, centro, mes) {
  const s = await getDocs(query(collection(db, col), where('centro', '==', centro), where('mes', '==', mes)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function lerPlanMes(centro, mes) {
  return Object.fromEntries((await doMes('planejamento', centro, mes)).map((p) => [p.data, p]));
}

export async function salvarPlanManual(centro, mes, porDia) {
  const ops = [];
  for (const [data, vals] of Object.entries(porDia)) {
    ops.push([doc(db, 'planejamento', `${centro}_${data}`), { ...vals, centro, data, mes, origem: 'manual', atualizado: serverTimestamp() }, { merge: true }]);
  }
  await gravarEmLotes(ops);
}

// Cálculo ao vivo (rascunho do administrador)
export async function calcularAoVivo(centro, mes) {
  const [vd, rt, plan, par, est] = await Promise.all([
    doMes('venda', centro, mes), doMes('retorno', centro, mes), lerPlanMes(centro, mes),
    lerParametros(centro, mes), getDoc(doc(db, 'estado', centro)),
  ]);
  const venda = vd.map((v) => ({ transporte: v.id.split('_').slice(1).join('_'), data: v.data, cxf: v.cxf, cxu: v.cxu }));
  const retorno = [];
  for (const r of rt) {
    const t = r.id.split('_').slice(1).join('_');
    for (const i of r.itens) retorno.push({ transporte: t, ...i });
  }
  const parVals = { meta_reprog: 0.03, ...par.valores };
  const resultado = calcular({ mes, venda, retorno, plan, par: parVals, prevendaData: est.data()?.ultimoPlan });
  return { resultado, motivos: motivos(retorno, mes) };
}

export async function mesesComDados() {
  const s = await getDocs(collection(db, 'parametro'));
  const ms = new Set(s.docs.map((d) => d.data().mes));
  const p = (await getDoc(doc(db, 'meta', 'publicacoes'))).data();
  (p?.meses || []).forEach((m) => ms.add(m));
  ms.add(new Date().toISOString().slice(0, 7));
  return [...ms].sort().reverse();
}

export async function publicar(mes) {
  for (const c of Object.keys(UNIDADES)) {
    const { resultado, motivos: mot } = await calcularAoVivo(c, mes);
    await setDoc(doc(db, 'publicado', `${c}_${mes}`), {
      centro: c, mes, resultado: JSON.stringify(resultado), motivos: mot,
      publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null,
    });
  }
  const ref = doc(db, 'meta', 'publicacoes');
  const m = new Set((await getDoc(ref)).data()?.meses || []);
  m.add(mes);
  await setDoc(ref, { meses: [...m].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerPublicado(centro, mes) {
  const d = (await getDoc(doc(db, 'publicado', `${centro}_${mes}`))).data();
  if (!d) return null;
  return { resultado: JSON.parse(d.resultado), motivos: d.motivos, publicadoEm: d.publicadoEm?.toDate?.(), por: d.por };
}

export async function mesesPublicados() {
  return (await getDoc(doc(db, 'meta', 'publicacoes'))).data()?.meses || [];
}

// ---------------------------------------------------------------- PES Logístico
//   pes/{centro}_{mes}            {centro, mes, valores:{k:num}, metas:{k:num}, solar:{k:num}}   (admin)
//   pes_publicado/{centro}_{mes}  {centro, mes, placar (JSON), publicadoEm, por}                  (admin e leitores)
//   meta/publicacoes_pes          {meses:[...]}
export async function lerDigPES(centro, mes) {
  const d = (await getDoc(doc(db, 'pes', `${centro}_${mes}`))).data();
  return { valores: d?.valores || {}, metas: d?.metas || {}, solar: d?.solar || {} };
}

export async function gravarDigPES(centro, mes, dig) {
  await setDoc(doc(db, 'pes', `${centro}_${mes}`), {
    centro, mes, valores: dig.valores || {}, metas: dig.metas || {}, solar: dig.solar || {}, atualizado: serverTimestamp(),
  });
}

export async function ultimaAtualizacaoPES(mes) {
  const docs = await Promise.all(Object.keys(UNIDADES).map((c) => getDoc(doc(db, 'pes', `${c}_${mes}`))));
  return docs.map((s) => s.data()?.atualizado?.toDate?.()).filter(Boolean).sort((a, b) => b - a)[0] || null;
}

// Rascunho do admin: Montagem ao vivo (a mesma da área Montagem) + digitação
export async function placarAoVivo(centro, mes) {
  const [{ resultado }, dig] = await Promise.all([calcularAoVivo(centro, mes), lerDigPES(centro, mes)]);
  const tem = resultado.dias.some((d) => d.cx_unit || d.entregas);
  return placarPES(tem ? resultado : null, dig);
}

export async function publicarPES(mes) {
  for (const c of Object.keys(UNIDADES)) {
    const placar = await placarAoVivo(c, mes);
    await setDoc(doc(db, 'pes_publicado', `${c}_${mes}`), {
      centro: c, mes, placar: JSON.stringify(placar), publicadoEm: serverTimestamp(), por: auth.currentUser?.email || null,
    });
  }
  const ref = doc(db, 'meta', 'publicacoes_pes');
  const m = new Set((await getDoc(ref)).data()?.meses || []);
  m.add(mes);
  await setDoc(ref, { meses: [...m].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerPESPublicado(centro, mes) {
  const d = (await getDoc(doc(db, 'pes_publicado', `${centro}_${mes}`))).data();
  if (!d) return null;
  return { placar: JSON.parse(d.placar), publicadoEm: d.publicadoEm?.toDate?.(), por: d.por };
}

export async function mesesPESPublicados() {
  return (await getDoc(doc(db, 'meta', 'publicacoes_pes'))).data()?.meses || [];
}

// ---------------------------------------------------------------- KM planejado × realizado
const refKM = (unidade, mes) => doc(db, 'km_dados', `${unidade}_${mes}`);
export async function lerDadosKM(mes) {
  const unidades = Object.keys(UNIDADES_KM);
  const docs = await Promise.all(unidades.map((c) => getDoc(refKM(c, mes))));
  const rotas = [], abastecimentos = [];
  docs.forEach((snap, i) => {
    const d = snap.data() || {}, c = unidades[i];
    rotas.push(...(d.rotas || []).map((r) => ({ ...r, unidade: c })));
    abastecimentos.push(...(d.abastecimentos || []).map((a) => ({ ...a, unidade: c })));
  });
  const parametros = Object.fromEntries(await Promise.all(unidades.map(async (c) => [c, await lerParametrosKM(c, mes)])));
  return { rotas, abastecimentos, parametros };
}

async function gravarParcialKM(unidade, mes, tipo, linhas) {
  const ref = refKM(unidade, mes), atual = (await getDoc(ref)).data() || {};
  const base = atual[tipo] || [];
  const sig = (x) => tipo === 'rotas' ? `${x.data}|${x.placa || x.veiculo || ''}|${x.motorista || ''}|${x.carga || ''}|${x.categoria || ''}`
    : `${x.data}|${x.placa || ''}|${x.km}|${x.local || ''}`;
  const incoming = new Set(linhas.map(sig));
  const datas = new Set(linhas.map((x) => x.data));
  const keep = tipo === 'rotas' ? base.filter((x) => !datas.has(x.data))
    : base.filter((x) => !incoming.has(sig(x)));
  await setDoc(ref, { unidade, mes, [tipo]: [...keep, ...linhas], atualizado: serverTimestamp() }, { merge: true });
}

export async function gravarRotasKM(linhas) {
  const grupos = new Map();
  for (const r of linhas) { const k = `${r.unidade}|${r.data.slice(0, 7)}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r); }
  for (const [k, rs] of grupos) { const [c, m] = k.split('|'); await gravarParcialKM(c, m, 'rotas', rs); }
  return linhas.length;
}

export async function gravarAbastecimentosKM(linhas) {
  const grupos = new Map();
  for (const a of linhas) { const k = `${a.unidade}|${a.data.slice(0, 7)}`; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(a); }
  for (const [k, as] of grupos) { const [c, m] = k.split('|'); await gravarParcialKM(c, m, 'abastecimentos', as); }
  return linhas.length;
}

export async function lerParametrosKM(unidade, mes) {
  return (await getDoc(doc(db, 'km_parametro', `${unidade}_${mes}`))).data()?.valores || {};
}
export async function gravarParametrosKM(unidade, mes, valores) {
  await setDoc(doc(db, 'km_parametro', `${unidade}_${mes}`), { unidade, mes, valores, atualizado: serverTimestamp() });
}

export async function ultimaAtualizacaoKM(mes) {
  const unidades = Object.keys(UNIDADES_KM);
  const docs = await Promise.all(unidades.flatMap((c) => [
    getDoc(doc(db, 'km_dados', `${c}_${mes}`)),
    getDoc(doc(db, 'km_parametro', `${c}_${mes}`)),
  ]));
  return docs.map((s) => s.data()?.atualizado?.toDate?.()).filter(Boolean).sort((a, b) => b - a)[0] || null;
}

export async function calcularKMAoVivo(mes) {
  const dados = await lerDadosKM(mes);
  return calcularKM({ mes, ...dados });
}

export async function publicarKM(mes) {
  const resultado = await calcularKMAoVivo(mes), agregado = agregadoPublicado(resultado);
  if (!Object.values(resultado.unidades).some((u) => u.temDados)) throw new Error('Não há dados de KM importados para publicar neste mês.');
  for (const [c, placar] of Object.entries(agregado)) {
    await setDoc(doc(db, 'km_publicado', `${c}_${mes}`), { unidade: c, mes, placar: JSON.stringify(placar), publicadoEm: serverTimestamp() });
  }
  const ref = doc(db, 'meta', 'publicacoes_km'), meses = new Set((await getDoc(ref)).data()?.meses || []);
  meses.add(mes);
  await setDoc(ref, { meses: [...meses].sort().reverse(), atualizado: serverTimestamp() }, { merge: true });
}

export async function lerKMPublicado(unidade, mes) {
  const d = (await getDoc(doc(db, 'km_publicado', `${unidade}_${mes}`))).data();
  if (!d) return null;
  return { placar: JSON.parse(d.placar), publicadoEm: d.publicadoEm?.toDate?.(), por: d.por };
}
export async function mesesKMPublicados() {
  return (await getDoc(doc(db, 'meta', 'publicacoes_km'))).data()?.meses || [];
}

export async function souAdmin(uid) {
  try { return (await getDoc(doc(db, 'admins', uid))).exists(); } catch { return false; }
}

export async function lerLeitores() {
  return (await getDoc(doc(db, 'meta', 'acesso'))).data()?.leitores || [];
}

export async function gravarLeitores(lista) {
  await setDoc(doc(db, 'meta', 'acesso'), { leitores: lista });
}
