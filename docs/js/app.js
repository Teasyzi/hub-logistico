// Hub Logístico — app. Cada acompanhamento é uma área com link próprio (#/montagem/...);
// o painel principal (#/) e as telas de importação/parâmetros/publicação são só do administrador.
import { auth } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import * as D from './dados.js';
import { lerArquivo, num } from './importar.js';
import * as V from './views.js';
import { diasDoMes } from './calc.js';
import { INDICADORES_PES, lerNumTela, pctParaTela } from './pes.js';
import { exportarPES } from './exportar_pes.js';
import { exportarMontagem } from './exportar_montagem.js';
import { exportarKM } from './exportar_km.js';

const $app = document.getElementById('app');
const estado = { user: null, admin: false, modo: 'rascunho' };
const mesAtual = () => new Date().toISOString().slice(0, 7);
const html = (h) => { $app.innerHTML = h; };
const erro = (e) => `<div class="erro">${V.E(e?.message || e)}</div>`;
const mesP = (s) => (/^\d{4}-\d{2}$/.test(s || '') ? s : null);

function cabecalhoSite(titulo) {
  document.getElementById('nav').innerHTML = titulo ? `<span>· ${V.E(titulo)}</span>` : '';
  document.getElementById('usuario').innerHTML = estado.user
    ? `${estado.admin ? '<a href="#/">Painel principal</a> · ' : ''}${V.E(estado.user.email)}${estado.admin ? ' <span class="tag" style="color:inherit;border-color:currentColor">admin</span>' : ''} · <a href="#" id="sair">sair</a>` : '';
  document.getElementById('sair')?.addEventListener('click', (e) => { e.preventDefault(); signOut(auth); });
}

// ---------------------------------------------------------------- topo do acompanhamento Montagem
async function topoMontagem(aba, mes, titulo, comMes = true) {
  let ctrl = '';
  if (comMes) {
    const meses = estado.admin ? await D.mesesComDados() : await D.mesesPublicados();
    if (!meses.includes(mes)) meses.unshift(mes);
    ctrl = V.seletorMes(meses, mes);
    if (estado.admin && ['resumo', 'CBAR', 'CCRT'].includes(aba)) {
      ctrl += ` · <select id="selModo"><option value="rascunho" ${estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho (dados atuais)</option>`
        + `<option value="publicado" ${estado.modo === 'publicado' ? 'selected' : ''}>Publicado (o que os leitores veem)</option></select> `
        + (estado.modo === 'rascunho' ? '<span class="badge">rascunho</span>' : '<span class="badge pub">publicado</span>');
    }
  }
  return `<h1>Montagem de Cargas — ${V.E(titulo)}</h1><p class="sub">${ctrl} <span id="pubinfo" class="small"></span></p>${V.abasMontagem(aba, mes, estado.admin)}`;
}

function ligarTopo(rotaMes) {
  document.getElementById('selMes')?.addEventListener('change', (e) => { location.hash = rotaMes(e.target.value); });
  document.getElementById('selModo')?.addEventListener('change', (e) => { estado.modo = e.target.value; rotear(); });
}

async function dadosDoMes(mes) {
  const ms = {}, mots = {};
  let pubEm = null;
  for (const c of Object.keys(D.UNIDADES)) {
    if (estado.admin && estado.modo === 'rascunho') {
      const x = await D.calcularAoVivo(c, mes);
      ms[c] = x.resultado.dias.some((d) => d.cx_unit || d.entregas) ? x.resultado : null;
      mots[c] = x.motivos;
    } else {
      const p = await D.lerPublicado(c, mes);
      ms[c] = p?.resultado || null; mots[c] = p?.motivos || [];
      if (p?.publicadoEm) pubEm = p.publicadoEm;
    }
  }
  return { ms, mots, pubEm };
}

async function telaResumo(mes) {
  html('<p class="small">Calculando…</p>');
  const topo = await topoMontagem('resumo', mes, `Resumo · ${V.nomeMes(mes)}`);
  const { ms, pubEm } = await dadosDoMes(mes);
  html(V.paginaResumo(ms, { mes, admin: estado.admin, topo }));
  if (pubEm) document.getElementById('pubinfo').textContent = `· publicado em ${pubEm.toLocaleString('pt-BR')}`;
  ligarTopo((m) => `#/montagem/resumo/${m}`);
}

async function telaDetalhe(c, mes) {
  html('<p class="small">Calculando…</p>');
  const topo = await topoMontagem(c, mes, `${D.UNIDADES[c].nome} · ${V.nomeMes(mes)}`);
  const { ms, mots, pubEm } = await dadosDoMes(mes);
  html(ms[c] ? V.paginaDetalhe(c, ms[c], mots[c], { admin: estado.admin, topo }) : `${topo}<p>Sem dados de ${V.E(D.UNIDADES[c].nome)} em ${V.nomeMes(mes)}.</p>`);
  if (pubEm) document.getElementById('pubinfo').textContent = `· publicado em ${pubEm.toLocaleString('pt-BR')}`;
  ligarTopo((m) => `#/montagem/${c}/${m}`);
}

async function telaMontagemExportar(mes) {
  const topo = await topoMontagem('exportar', mes, `Exportar planilha · ${V.nomeMes(mes)}`);
  html(`${topo}<p>Escolha uma cópia do modelo oficial XLSM da Montagem. O Hub atualiza o resumo e os valores diários das duas unidades e baixa uma nova planilha; o modelo selecionado permanece no seu computador.</p>
<p><label>Modelo oficial da Montagem (.xlsm)<br><input type="file" id="modeloMontagem" accept=".xlsm"></label></p>
<p><button class="btn" id="exportar" disabled>Exportar ${V.nomeMes(mes)}</button> <span id="msg"></span></p>
<p class="small">A exportação usa os dados atuais do rascunho e pede ao Excel para recalcular as fórmulas ao abrir.</p>`);
  const input = document.getElementById('modeloMontagem'), botao = document.getElementById('exportar');
  input.onchange = () => { botao.disabled = !input.files?.[0]; };
  botao.onclick = async () => {
    const modelo = input.files?.[0]; if (!modelo) return;
    botao.disabled = true;
    try {
      const resultados = Object.fromEntries(await Promise.all(Object.keys(D.UNIDADES).map(async (c) => [c, (await D.calcularAoVivo(c, mes)).resultado])));
      await exportarMontagem(modelo, mes, resultados);
      document.getElementById('msg').innerHTML = '<span class="st ok">Planilha baixada.</span>';
    } catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    botao.disabled = false;
  };
  ligarTopo((m) => `#/montagem/exportar/${m}`);
}

// ---------------------------------------------------------------- telas do administrador (dentro do acompanhamento)
async function telaImportar() {
  const topo = await topoMontagem('importar', mesAtual(), 'Importar planilhas', false);
  const ult = await D.ultimasImportacoes();
  const hist = ult.map((r) => `<tr><td class="t">${r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : ''}</td><td class="t">${V.E(r.arquivo)}</td>
<td class="t">${V.E(r.tipo)}</td><td class="t">${V.E(r.centro || '')}</td><td>${r.linhas ?? ''}</td><td class="t">${V.E(r.periodo || '')}</td><td class="t">${V.E(r.por || '')}</td></tr>`).join('');
  html(`${topo}
<p class="sub">Arquivos do dia: <b>VOLUMES DE VENDAS/RETORNOS</b> (Barreiras), <b>ZSD0092/ZSD0090</b> (Juazeiro) e os 2 <b>Resumos de Planejamento</b>.
Histórico: planilhas antigas "MM - Montagem de Cargas" e "Reprogramação DL's". Os arquivos são lidos neste navegador; só números e códigos vão para o banco.</p>
<div class="aviso">Resumo de Planejamento: salve sem habilitar a edição para não recalcular a data (C8). Confira a data detectada no resultado.</div>
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div>
<div id="res"></div>
<h2>Últimas importações</h2><div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Centro</th><th>Linhas</th><th class="t">Período / data</th><th class="t">Por</th></tr></thead><tbody>${hist}</tbody></table></div>`);
  const drop = document.getElementById('drop');
  const processar = async (files) => {
    const out = document.getElementById('res');
    const prio = (n) => (/montagem de cargas/i.test(n) ? 0 : /reprograma/i.test(n) ? 1 : 2);
    const ordem = [...files].sort((a, b) => prio(a.name) - prio(b.name));
    let linhasRes = '';
    for (const f of ordem) {
      out.innerHTML = `<p class="small">Lendo ${V.E(f.name)}…</p>`;
      let r;
      try {
        const x = await lerArquivo(f);
        r = { arquivo: f.name, tipo: x.tipo || 'não reconhecido', centro: '', linhas: 0, periodo: '' };
        if (x.tipo === 'venda' || x.tipo === 'retorno') {
          r.linhas = x.linhas.length;
          if (x.tipo === 'venda') await D.gravarVenda(x.linhas); else await D.gravarRetorno(x.linhas);
          const ds = x.linhas.map((l) => l.data).sort();
          r.centro = [...new Set(x.linhas.map((l) => l.centro))].join(',');
          r.periodo = ds.length ? `${V.fdata(ds[0])} a ${V.fdata(ds.at(-1))}` : '';
        } else if (x.tipo === 'resumo') {
          await D.gravarPlan([x.plan], 'resumo');
          r.centro = x.plan.centro; r.linhas = 1;
          r.periodo = `planejamento de ${V.fdata(x.plan.data)}/${x.plan.data.slice(0, 4)} — confira se é o dia certo`;
        } else if (x.tipo === 'montagem') {
          await D.gravarVenda(x.venda); await D.gravarRetorno(x.retorno); await D.gravarPlan(x.plan, 'legado');
          for (const c of Object.keys(x.par)) await D.gravarParametros(c, x.mes, x.par[c], 'planilha');
          r.centro = 'CBAR,CCRT'; r.linhas = x.venda.length + x.retorno.length + x.plan.length; r.periodo = V.nomeMes(x.mes);
        } else if (x.tipo === 'reprog') {
          r.linhas = await D.completarReprog(x.reprog); r.centro = 'CBAR,CCRT';
        }
        if (x.tipo) await D.registrarImportacao(r);
        linhasRes += `<tr><td class="t">${V.E(f.name)}</td><td class="t">${x.tipo ? '✓ ' + V.E(r.tipo) : '✕ não reconhecido'}</td><td class="t">${V.E(r.centro)}</td><td>${r.linhas}</td><td class="t">${V.E(r.periodo)}</td></tr>`;
      } catch (e) {
        linhasRes += `<tr><td class="t">${V.E(f.name)}</td><td class="t" colspan="4">✕ erro: ${V.E(e.message)}</td></tr>`;
      }
    }
    out.innerHTML = `<h2>Resultado</h2><div class="tw scroll"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Centro</th><th>Linhas</th><th class="t">Período / data</th></tr></thead><tbody>${linhasRes}</tbody></table></div>
<p><a class="btn" href="#/montagem/resumo/${mesAtual()}">Conferir rascunho</a> <a class="btn sec" href="#/montagem/publicar/${mesAtual()}">Publicar</a></p>`;
  };
  document.getElementById('arqs').addEventListener('change', (e) => processar(e.target.files));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); });
}

const valTxt = (v) => (v == null ? '' : String(+v.toPrecision(12)).replace('.', ','));
const lerCampo = (s) => (s.trim() === '' ? null : num(s));

async function telaParametros(mes) {
  const topo = await topoMontagem('parametros', mes, `Parâmetros · ${V.nomeMes(mes)}`);
  const cs = Object.keys(D.UNIDADES);
  const pars = Object.fromEntries(await Promise.all(cs.map(async (c) => [c, await D.lerParametros(c, mes)])));
  const linhas = Object.entries(D.PARAMETROS).map(([k, [rot, pad]]) => `<tr><td class="t">${V.E(rot)}</td>${cs.map((c) => {
    const o = pars[c].origem[k];
    return `<td><input type="text" inputmode="decimal" data-c="${c}" data-k="${k}" value="${valTxt(pars[c].valores[k])}"></td><td class="t small">${o || (pad != null ? `padrão ${pad}` : '')}</td>`;
  }).join('')}</tr>`).join('');
  html(`${topo}<p class="sub">Valores digitados à mão (antes no RESUMO da planilha). Vírgula ou ponto como decimal; vazio apaga.</p>
<div class="tw" style="max-width:900px"><table><thead><tr><th class="t">Parâmetro</th>${cs.map((c) => `<th>${V.E(D.UNIDADES[c].nome)}</th><th class="t">origem</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table></div>
<p><button class="btn" id="salvar">Salvar</button> <span id="msg"></span></p>`);
  ligarTopo((m) => `#/montagem/parametros/${m}`);
  document.getElementById('salvar').addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    try {
      for (const c of cs) {
        const vals = {};
        document.querySelectorAll(`input[data-c="${c}"]`).forEach((i) => {
          const novo = lerCampo(i.value), velho = pars[c].valores[i.dataset.k] ?? null;
          if (novo !== velho && !(novo != null && velho != null && Math.abs(novo - velho) < 1e-9)) vals[i.dataset.k] = novo;
        });
        if (Object.keys(vals).length) await D.gravarParametros(c, mes, vals, 'manual');
      }
      document.getElementById('msg').innerHTML = '<span class="st ok">✓ salvo</span>';
    } catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    ev.target.disabled = false;
  });
}

const CAMPOS_PLAN = [['entregas', 'Entregas plan'], ['cargas', 'Cargas'], ['ocupacao', 'Tx ocup. (0,xx)'], ['reprog_uc', 'Vol reprog'],
  ['reprog_cli', 'Cli reprog'], ['uc_total', 'UC total'], ['reprog_so_cubos', 'Cubos REPROG'], ['reprog_so_cli', 'Cli REPROG']];

async function telaPlanejamento(c, mes) {
  const topo = await topoMontagem(c, mes, `Editar planejamento · ${D.UNIDADES[c].nome}`);
  const plan = await D.lerPlanMes(c, mes);
  const linhas = diasDoMes(mes).map((d) => `<tr><td>${V.fdata(d)}</td>${CAMPOS_PLAN.map(([k]) =>
    `<td><input type="text" inputmode="decimal" data-d="${d}" data-k="${k}" value="${valTxt(plan[d]?.[k])}"></td>`).join('')}<td class="t small">${plan[d]?.origem || ''}</td></tr>`).join('');
  html(`${topo}<p><a href="#/montagem/${c}/${mes}">← Voltar ao detalhe</a></p>
<p class="sub">Normalmente vem do Resumo de Planejamento. Edite só para corrigir ou preencher um dia sem Resumo (o dia passa a ter origem "manual").</p>
<div class="tw"><table class="diario"><thead><tr><th class="t">Dia</th>${CAMPOS_PLAN.map(([, n]) => `<th>${n}</th>`).join('')}<th class="t">Origem</th></tr></thead><tbody>${linhas}</tbody></table></div>
<p><button class="btn" id="salvar">Salvar</button> <span id="msg"></span></p>`);
  ligarTopo((m) => `#/montagem/planejamento/${c}/${m}`);
  document.getElementById('salvar').addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    const porDia = {};
    document.querySelectorAll('input[data-d]').forEach((i) => {
      const novo = lerCampo(i.value), velho = plan[i.dataset.d]?.[i.dataset.k] ?? null;
      if (novo !== velho && !(novo != null && velho != null && Math.abs(novo - velho) <= 1e-9 * Math.max(1, Math.abs(novo)))) (porDia[i.dataset.d] ??= {})[i.dataset.k] = novo;
    });
    try {
      await D.salvarPlanManual(c, mes, porDia);
      document.getElementById('msg').innerHTML = `<span class="st ok">✓ ${Object.keys(porDia).length} dia(s) salvos</span>`;
    } catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    ev.target.disabled = false;
  });
}

async function telaPublicar(mes) {
  const topo = await topoMontagem('publicar', mes, `Publicar · ${V.nomeMes(mes)}`);
  const link = `${location.origin}${location.pathname}#/montagem/resumo/${mes}`;
  html(`${topo}<p>Publicar grava uma foto dos números calculados agora (rascunho). Os leitores só veem a última publicação.</p>
<p><a class="btn sec" href="#/montagem/resumo/${mes}">Conferir rascunho antes</a> <button class="btn" id="pub">Publicar ${V.nomeMes(mes)}</button> <span id="msg"></span></p>
<h2>Link para enviar por e-mail</h2><p><input type="text" readonly value="${V.E(link)}" style="width:100%;max-width:640px" id="lnk"> <button class="btn sec" id="copiar">Copiar</button></p>
<p class="small">Quem receber precisa estar na lista de <a href="#/acessos">Acessos</a> e entrar com o e-mail cadastrado.</p>`);
  ligarTopo((m) => `#/montagem/publicar/${m}`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    try { await D.publicar(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; }
    catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    ev.target.disabled = false;
  });
}

// ---------------------------------------------------------------- acompanhamento PES Logístico
async function topoPES(aba, mes, titulo, comModo = false) {
  const meses = estado.admin ? await D.mesesComDados() : await D.mesesPESPublicados();
  if (!meses.includes(mes)) meses.unshift(mes);
  let ctrl = V.seletorMes(meses, mes);
  if (estado.admin && comModo) {
    ctrl += ` · <select id="selModo"><option value="rascunho" ${estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho (dados atuais)</option>`
      + `<option value="publicado" ${estado.modo === 'publicado' ? 'selected' : ''}>Publicado (o que os leitores veem)</option></select> `
      + (estado.modo === 'rascunho' ? '<span class="badge">rascunho</span>' : '<span class="badge pub">publicado</span>');
  }
  return `<h1>PES Logístico — ${V.E(titulo)}</h1><p class="sub">${ctrl} <span id="pubinfo" class="small"></span></p>${V.abasPES(aba, mes, estado.admin)}`;
}

async function telaPESResumo(mes) {
  html('<p class="small">Calculando…</p>');
  const topo = await topoPES('resumo', mes, `Placar · ${V.nomeMes(mes)}`, true);
  const placares = {};
  let pubEm = null;
  for (const c of Object.keys(D.UNIDADES)) {
    if (estado.admin && estado.modo === 'rascunho') placares[c] = await D.placarAoVivo(c, mes);
    else {
      const p = await D.lerPESPublicado(c, mes);
      placares[c] = p?.placar || null;
      if (p?.publicadoEm) pubEm = p.publicadoEm;
    }
  }
  html(V.paginaPES(placares, { mes, admin: estado.admin, topo }));
  if (pubEm) document.getElementById('pubinfo').textContent = `· publicado em ${pubEm.toLocaleString('pt-BR')}`;
  ligarTopo((m) => `#/pes/resumo/${m}`);
}

async function telaPESDigitacao(mes) {
  const topo = await topoPES('digitacao', mes, `Digitação · ${V.nomeMes(mes)}`);
  const cs = Object.keys(D.UNIDADES);
  const digs = Object.fromEntries(await Promise.all(cs.map(async (c) => [c, await D.lerDigPES(c, mes)])));
  const paraTela = (ind, x) => (ind.pct ? pctParaTela(x) : valTxt(x));
  const campo = (c, grupo, ind) => `<td><input type="text" inputmode="decimal" data-c="${c}" data-g="${grupo}" data-k="${ind.k}" value="${V.E(paraTela(grupo === 'solar' ? { pct: false } : ind, digs[c][grupo][ind.k]))}" placeholder="${grupo === 'metas' ? V.E(paraTela(ind, ind.meta)) : ''}"></td>`;
  const un = (ind) => (ind.pct ? ' <span class="small">(%)</span>' : '');
  const cab = `<tr><th class="t">Indicador</th>${cs.map((c) => `<th>${V.E(D.UNIDADES[c].nome)}</th>`).join('')}</tr>`;
  const tab = (grupo, lista, titulo, nota) => `<h2>${titulo}</h2><p class="small">${nota}</p><div class="tw" style="max-width:720px"><table><thead>${cab}</thead><tbody>
${lista.map((ind) => `<tr><td class="t">${V.E(ind.nome)}${grupo === 'solar' ? '' : un(ind)}</td>${cs.map((c) => campo(c, grupo, ind)).join('')}</tr>`).join('')}</tbody></table></div>`;
  html(`${topo}<p class="sub">Vírgula ou ponto como decimal; vazio apaga. Percentuais em % (ex.: 96,5).</p>
${tab('valores', INDICADORES_PES.filter((i) => !i.auto), 'Indicadores digitados', 'Licenças: 1 = todas vigentes, 0 = alguma vencida. Acidentes: quantidade no mês (0 pontua).')}
${tab('metas', INDICADORES_PES, 'Metas do mês', 'Vazio = meta padrão de 2026 (aparece em cinza).')}
${tab('solar', INDICADORES_PES, 'Pontuação oficial SOLAR (opcional)', 'Pontos que a Solar deu em cada indicador, para comparar com o nosso cálculo.')}
<p><button class="btn" id="salvar">Salvar</button> <a class="btn sec" href="#/pes/resumo/${mes}">Ver placar</a> <span id="msg"></span></p>`);
  ligarTopo((m) => `#/pes/digitacao/${m}`);
  const porK = Object.fromEntries(INDICADORES_PES.map((i) => [i.k, i]));
  document.getElementById('salvar').addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    try {
      let n = 0;
      const novos = {}, invalidos = [];
      for (const c of cs) {
        const novo = { valores: {}, metas: {}, solar: {} };
        document.querySelectorAll(`input[data-c="${c}"]`).forEach((i) => {
          const ind = porK[i.dataset.k], g = i.dataset.g;
          const r = lerNumTela(i.value, g !== 'solar' && ind.pct);
          i.style.outline = r.ok ? '' : '2px solid var(--bad)';
          if (!r.ok) invalidos.push(`${ind.nome} (${D.UNIDADES[c].nome})`);
          else if (r.v != null) novo[g][i.dataset.k] = r.v;
        });
        novos[c] = novo;
      }
      if (invalidos.length) throw new Error(`Valor inválido, nada foi salvo: ${invalidos.join('; ')}`);
      for (const c of cs) {
        if (JSON.stringify(novos[c]) !== JSON.stringify(digs[c])) { await D.gravarDigPES(c, mes, novos[c]); digs[c] = novos[c]; n++; }
      }
      document.getElementById('msg').innerHTML = `<span class="st ok">✓ ${n ? 'salvo' : 'nada mudou'}</span>`;
    } catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    ev.target.disabled = false;
  });
}

async function telaPESPublicar(mes) {
  const topo = await topoPES('publicar', mes, `Publicar · ${V.nomeMes(mes)}`);
  const link = `${location.origin}${location.pathname}#/pes/resumo/${mes}`;
  html(`${topo}<p>Publicar grava uma foto do placar calculado agora (rascunho), com a Montagem do mês como está neste momento. Os leitores só veem a última publicação.</p>
<div class="aviso">Publique a Montagem de ${V.nomeMes(mes)} junto, para as duas áreas mostrarem os mesmos números.</div>
<p><a class="btn sec" href="#/pes/resumo/${mes}">Conferir rascunho antes</a> <button class="btn" id="pub">Publicar PES ${V.nomeMes(mes)}</button> <span id="msg"></span></p>
<h2>Link para enviar por e-mail</h2><p><input type="text" readonly value="${V.E(link)}" style="width:100%;max-width:640px"> <button class="btn sec" id="copiar">Copiar</button></p>
<p class="small">Quem receber precisa estar na lista de <a href="#/acessos">Acessos</a> e entrar com o e-mail cadastrado.</p>`);
  ligarTopo((m) => `#/pes/publicar/${m}`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    try { await D.publicarPES(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; }
    catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    ev.target.disabled = false;
  });
}

async function telaPESExportar(mes) {
  const topo = await topoPES('exportar', mes, `Exportar planilha · ${V.nomeMes(mes)}`);
  html(`${topo}<p>Escolha uma cópia do modelo oficial PES XLSM. O Hub preenche os dados de Barreiras e Juazeiro e baixa uma nova planilha; o arquivo escolhido fica no seu computador.</p>
<p><label>Modelo oficial PES (.xlsm)<br><input type="file" id="modeloPES" accept=".xlsm"></label></p>
<p><button class="btn" id="exportar" disabled>Exportar ${V.nomeMes(mes)}</button> <span id="msg"></span></p>
<p class="small">Use a planilha de outubro como modelo se o arquivo do mês atual ainda não estiver disponível. O Hub mantém as macros e fórmulas existentes e pede ao Excel para recalcular ao abrir.</p>`);
  const input = document.getElementById('modeloPES'), botao = document.getElementById('exportar');
  input.onchange = () => { botao.disabled = !input.files?.[0]; };
  botao.onclick = async () => {
    const modelo = input.files?.[0];
    if (!modelo) return;
    botao.disabled = true;
    try {
      const cs = ['CBAR', 'CCRT'];
      const placares = Object.fromEntries(await Promise.all(cs.map(async (c) => [c, await D.placarAoVivo(c, mes)])));
      await exportarPES(modelo, mes, placares);
      document.getElementById('msg').innerHTML = '<span class="st ok">Planilha baixada.</span>';
    } catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    botao.disabled = false;
  };
  ligarTopo((m) => `#/pes/exportar/${m}`);
}

async function mesPadraoPES() {
  if (estado.admin) return mesAtual();
  return (await D.mesesPESPublicados())[0] || mesAtual();
}

// ---------------------------------------------------------------- KM planejado × realizado
async function topoKM(aba, mes, titulo, comMes = true) {
  let ctrl = '';
  if (comMes) {
    const meses = new Set(estado.admin ? [mesAtual(), mes] : await D.mesesKMPublicados());
    meses.add(mes);
    ctrl = V.seletorMes([...meses].sort().reverse(), mes);
    if (estado.admin && ['resumo', 'NORTE', 'SUL', 'CBAR', 'CCRT'].includes(aba)) {
      ctrl += ` · <select id="selModo"><option value="rascunho" ${estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
    }
  }
  return `<h1>KM planejado × realizado — ${V.E(titulo)}</h1><p class="sub">${ctrl} <span id="pubinfo" class="small"></span></p>${V.abasKM(aba, mes, estado.admin)}`;
}

async function resultadoKM(mes) {
  if (estado.admin && estado.modo === 'rascunho') return D.calcularKMAoVivo(mes);
  const unidades = {};
  let publicadoEm = null;
  for (const c of ['NORTE', 'SUL', 'CBAR', 'CCRT']) {
    const x = await D.lerKMPublicado(c, mes);
    if (x) { unidades[c] = x.placar; publicadoEm ||= x.publicadoEm; }
  }
  return { mes, unidades, publicadoEm };
}

async function telaKMResumo(mes) {
  html('<p class="small">Calculando KM…</p>');
  const topo = await topoKM('resumo', mes, V.nomeMes(mes));
  const resultado = await resultadoKM(mes);
  const faltam = Object.values(resultado.unidades).some((u) => !u.temDados);
  html(`${V.paginaKMResumo(resultado, { mes, admin: estado.admin, topo })}${faltam ? `<div class="aviso">${estado.admin && estado.modo === 'rascunho' ? 'Ainda não há dados importados para todas as unidades neste mês.' : `O KM de ${V.nomeMes(mes)} ainda não foi publicado.`}</div>` : ''}`);
  if (resultado.publicadoEm) document.getElementById('pubinfo').textContent = `· publicado em ${resultado.publicadoEm.toLocaleString('pt-BR')}`;
  ligarTopo((m) => `#/km/resumo/${m}`);
}

async function telaKMExportar(mes) {
  const topo = await topoKM('exportar', mes, `Exportar planilha · ${V.nomeMes(mes)}`);
  html(`${topo}<p>Escolha uma cópia do modelo oficial XLSM do KM. O Hub atualiza a análise diária das quatro unidades e baixa uma nova planilha; o modelo selecionado permanece no seu computador.</p>
<p><label>Modelo oficial do KM (.xlsm)<br><input type="file" id="modeloKM" accept=".xlsm"></label></p>
<p><button class="btn" id="exportar" disabled>Exportar ${V.nomeMes(mes)}</button> <span id="msg"></span></p>
<p class="small">A exportação usa os dados atuais do rascunho e pede ao Excel para recalcular as fórmulas ao abrir.</p>`);
  const input = document.getElementById('modeloKM'), botao = document.getElementById('exportar');
  input.onchange = () => { botao.disabled = !input.files?.[0]; };
  botao.onclick = async () => {
    const modelo = input.files?.[0]; if (!modelo) return;
    botao.disabled = true;
    try {
      const resultado = await D.calcularKMAoVivo(mes);
      await exportarKM(modelo, mes, resultado);
      document.getElementById('msg').innerHTML = '<span class="st ok">Planilha baixada.</span>';
    } catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    botao.disabled = false;
  };
  ligarTopo((m) => `#/km/exportar/${m}`);
}

async function telaKMUnidade(unidade, mes) {
  const full = await resultadoKM(mes), u = full.unidades[unidade];
  if (!u) { const topo = await topoKM(unidade, mes, `${unidade} · ${V.nomeMes(mes)}`); html(`${topo}<div class="aviso">Não há dados de KM para esta unidade neste mês.</div>`); ligarTopo((m) => `#/km/${unidade}/${m}`); return; }
  const topo = await topoKM(unidade, mes, `${u.nome} · ${V.nomeMes(mes)}`);
  html(V.paginaKMResumo({ mes, unidades: { [unidade]: u } }, { mes, admin: estado.admin, topo }));
  ligarTopo((m) => `#/km/${unidade}/${m}`);
}

async function telaKMMotoristas(unidade, mes) {
  if (!['NORTE', 'SUL'].includes(unidade)) return html('<div class="aviso">O detalhe por motorista está disponível apenas para CB Norte e CB Sul.</div>');
  const full = await D.calcularKMAoVivo(mes), u = full.unidades[unidade];
  const topo = await topoKM('motoristas', mes, `Motoristas · ${V.nomeMes(mes)}`);
  if (!u?.temDados) { html(`${topo}<div class="aviso">Sem dados de KM para ${V.E(unidade)} neste mês.</div>`); ligarTopo((m) => `#/km/motoristas/${unidade}/${m}`); return; }
  html(V.paginaKMMotoristas(u, { mes, topo }));
  ligarTopo((m) => `#/km/motoristas/${unidade}/${m}`);
}

async function telaKMImportar() {
  const mes = mesP(location.hash.split('/')[3]) || mesAtual(), topo = await topoKM('importar', mes, 'Importar arquivos', false);
  html(`${topo}<p class="sub">TXT de abastecimentos e planilhas de rotas. Os dados são lidos neste navegador; nomes e placas ficam restritos à área administrativa.</p>
<label>Mês das abas de montagem sem mês/ano <input id="mesImport" type="month" value="${mes}"></label> <label>Unidade para Resumo: <select id="unidadeImport"><option value="AUTO">Detectar pelo arquivo</option><option value="CBAR">Barreiras</option><option value="CCRT">Juazeiro</option></select></label>
<div class="drop" id="drop"><p>Arraste KMs.txt e as planilhas de rotas aqui ou selecione os arquivos</p><input type="file" id="arqs" multiple accept=".txt,.xls,.xlsx,.xlsm"></div><div id="res"></div>`);
  const drop = document.getElementById('drop');
  const processar = async (files) => {
    let rows = '';
    for (const f of files) {
      try {
        const x = await lerArquivo(f, { mes: document.getElementById('mesImport').value, unidade: document.getElementById('unidadeImport').value });
        let n = 0, tipo = x.tipo;
        if (x.tipo === 'km_abastecimentos') n = await D.gravarAbastecimentosKM(x.linhas);
        else if (['km_rotas', 'km_resumo', 'km_historico'].includes(x.tipo)) n = await D.gravarRotasKM(x.rotas);
        else throw new Error('Formato não reconhecido como arquivo de KM.');
        await D.registrarImportacao({ arquivo: f.name, tipo, linhas: n, periodo: document.getElementById('mesImport').value });
        rows += `<tr><td class="t">${V.E(f.name)}</td><td>${V.E(tipo)}</td><td>${n}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${V.E(f.name)}</td><td colspan="3" class="st no">${V.E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado da importação</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th>Tipo</th><th>Linhas</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/km/resumo/${document.getElementById('mesImport').value}">Conferir rascunho</a></p>`;
  };
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

async function telaKMParametros(mes) {
  const topo = await topoKM('parametros', mes, `Parâmetros · ${V.nomeMes(mes)}`), cs = ['NORTE', 'SUL', 'CBAR', 'CCRT'];
  const pars = Object.fromEntries(await Promise.all(cs.map(async (c) => [c, await D.lerParametrosKM(c, mes)])));
  const padrao = mes === '2026-11' ? { NORTE: 2.46, SUL: 2.09, CBAR: 2.07, CCRT: 4.19 } : {};
  const numTxt = (v) => v == null ? '' : String(v).replace('.', ',');
  const linhas = cs.map((c) => `<tr><td class="t">${V.E(c)}</td><td><input type="text" data-c="${c}" data-k="cpk" value="${V.E(numTxt(pars[c].cpk ?? padrao[c]))}"></td><td><input type="text" data-c="${c}" data-k="meta" value="${V.E(numTxt((pars[c].meta ?? 0.05) * 100))}" placeholder="5"></td><td><textarea data-c="${c}" data-k="idaVolta" rows="3" placeholder="MOTORISTA=km, um por linha">${V.E(Object.entries(pars[c].idaVolta || {}).map(([k,v]) => `${k}=${numTxt(v)}`).join('\n'))}</textarea></td></tr>`).join('');
  html(`${topo}<p class="sub">CPK em R$/km, meta percentual em % (ex.: 5), e ida e volta como MOTORISTA=km, uma regra por linha. A ida e volta é aplicada uma vez por motorista/placa no dia.</p><div class="tw"><table><thead><tr><th class="t">Unidade</th><th>CPK</th><th>Meta ± %</th><th>Ida e volta por motorista</th></tr></thead><tbody>${linhas}</tbody></table></div><p><button class="btn" id="salvar">Salvar parâmetros</button> <span id="msg"></span></p>`);
  document.getElementById('salvar').onclick = async (e) => {
    e.target.disabled = true;
    try {
      for (const c of cs) {
        const v = { idaVolta: {} };
        document.querySelectorAll(`[data-c="${c}"]`).forEach((i) => {
          if (i.dataset.k === 'idaVolta') for (const line of i.value.split(/\r?\n/)) { const [k, x] = line.split('='); if (k?.trim() && x?.trim()) v.idaVolta[k.trim().toLocaleUpperCase('pt-BR')] = num(x); }
          else if (i.value.trim()) v[i.dataset.k] = num(i.value);
        });
        if (v.meta > 1) v.meta /= 100;
        await D.gravarParametrosKM(c, mes, v);
      }
      document.getElementById('msg').innerHTML = '<span class="st ok">Salvo</span>';
    } catch (err) { document.getElementById('msg').innerHTML = erro(err); }
    e.target.disabled = false;
  };
  ligarTopo((m) => `#/km/parametros/${m}`);
}

async function telaKMPublicar(mes) {
  const topo = await topoKM('publicar', mes, `Publicar · ${V.nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/km/resumo/${mes}`;
  html(`${topo}<p>Publica os totais diários por unidade. Nomes de motoristas e placas não são incluídos.</p><p><a class="btn sec" href="#/km/resumo/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar KM ${V.nomeMes(mes)}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input type="text" readonly value="${V.E(link)}" style="width:100%;max-width:640px"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await D.publicarKM(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = erro(err); } e.target.disabled = false; };
  ligarTopo((m) => `#/km/publicar/${m}`);
}

// ---------------------------------------------------------------- painel principal e acessos (admin)
function telaPainel() {
  html(V.painelPrincipal());
  document.querySelectorAll('[data-copiar]').forEach((b) => {
    b.onclick = () => { navigator.clipboard.writeText(`${location.origin}${location.pathname}${b.dataset.copiar}`); b.textContent = 'Copiado ✓'; };
  });
}

async function telaAcessos() {
  const lista = await D.lerLeitores();
  html(`<p><a href="#/">← Painel principal</a></p><h1>Acessos</h1><p class="sub">E-mails que podem ver o que foi publicado (um por linha). A pessoa cria a conta em "Criar conta" com esse e-mail.
Administradores são definidos só no console do Firebase (coleção <code>admins</code>).</p>
<textarea id="lst" rows="10" style="width:100%;max-width:520px;font:inherit">${V.E(lista.join('\n'))}</textarea>
<p><button class="btn" id="salvar">Salvar</button> <span id="msg"></span></p>`);
  document.getElementById('salvar').addEventListener('click', async () => {
    const l = document.getElementById('lst').value.split(/\s+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    try { await D.gravarLeitores([...new Set(l)]); document.getElementById('msg').innerHTML = '<span class="st ok">✓ salvo</span>'; }
    catch (e) { document.getElementById('msg').innerHTML = erro(e); }
  });
}

// ---------------------------------------------------------------- login
function telaLogin() {
  cabecalhoSite('');
  html(`<div class="login card"><h1>Entrar</h1>
<label>E-mail<input type="email" id="em" autocomplete="username"></label>
<label>Senha<input type="password" id="pw" autocomplete="current-password"></label>
<p><button class="btn" id="entrar">Entrar</button> <button class="btn sec" id="criar">Criar conta</button></p>
<p class="small"><a href="#" id="esqueci">Esqueci a senha</a></p><div id="msg"></div></div>`);
  const em = () => document.getElementById('em').value.trim(), pw = () => document.getElementById('pw').value;
  const falha = (e) => { document.getElementById('msg').innerHTML = erro(e.code ? e.code.replace('auth/', 'Erro: ') : e); };
  document.getElementById('entrar').onclick = () => signInWithEmailAndPassword(auth, em(), pw()).catch(falha);
  document.getElementById('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('entrar').click(); });
  document.getElementById('criar').onclick = () => createUserWithEmailAndPassword(auth, em(), pw()).catch(falha);
  document.getElementById('esqueci').onclick = (e) => {
    e.preventDefault();
    sendPasswordResetEmail(auth, em()).then(() => { document.getElementById('msg').innerHTML = '<div class="okmsg">E-mail de redefinição enviado.</div>'; }).catch(falha);
  };
}

// ---------------------------------------------------------------- rotas
async function mesPadrao() {
  if (estado.admin) return mesAtual();
  return (await D.mesesPublicados())[0] || mesAtual();
}

async function rotear() {
  if (!estado.user) return telaLogin();
  const p = (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);
  try {
    if (p[0] === 'montagem') {
      cabecalhoSite('Montagem de Cargas');
      const sub = p[1];
      if (sub === 'CBAR' || sub === 'CCRT') return await telaDetalhe(sub, mesP(p[2]) || await mesPadrao());
      if (!sub || sub === 'resumo') return await telaResumo(mesP(p[2]) || await mesPadrao());
      if (!estado.admin) return html('<p>Área restrita ao administrador.</p>');
      if (sub === 'importar') return await telaImportar();
      if (sub === 'parametros') return await telaParametros(mesP(p[2]) || mesAtual());
      if (sub === 'publicar') return await telaPublicar(mesP(p[2]) || mesAtual());
      if (sub === 'exportar') return await telaMontagemExportar(mesP(p[2]) || mesAtual());
      if (sub === 'planejamento' && D.UNIDADES[p[2]]) return await telaPlanejamento(p[2], mesP(p[3]) || mesAtual());
    }
    if (p[0] === 'pes') {
      cabecalhoSite('PES Logístico');
      const sub = p[1];
      if (!sub || sub === 'resumo') return await telaPESResumo(mesP(p[2]) || await mesPadraoPES());
      if (!estado.admin) return html('<p>Área restrita ao administrador.</p>');
      if (sub === 'digitacao') return await telaPESDigitacao(mesP(p[2]) || mesAtual());
      if (sub === 'publicar') return await telaPESPublicar(mesP(p[2]) || mesAtual());
      if (sub === 'exportar') return await telaPESExportar(mesP(p[2]) || mesAtual());
    }
    if (p[0] === 'km') {
      cabecalhoSite('KM planejado × realizado');
      const sub = p[1];
      if (!sub || sub === 'resumo') return await telaKMResumo(mesP(p[2]) || mesAtual());
      if (sub === 'exportar') return await telaKMExportar(mesP(p[2]) || mesAtual());
      if (['NORTE', 'SUL', 'CBAR', 'CCRT'].includes(sub)) return await telaKMUnidade(sub, mesP(p[2]) || mesAtual());
      if (!estado.admin) return html('<p>Área restrita ao administrador.</p>');
      if (sub === 'importar') return await telaKMImportar();
      if (sub === 'parametros') return await telaKMParametros(mesP(p[2]) || mesAtual());
      if (sub === 'publicar') return await telaKMPublicar(mesP(p[2]) || mesAtual());
      if (sub === 'motoristas') return await telaKMMotoristas(p[2], mesP(p[3]) || mesAtual());
    }
    cabecalhoSite('');
    if (!estado.admin) {
      return html('<div class="card"><h1>Hub Logístico</h1><p>Abra o acompanhamento pelo link que você recebeu por e-mail.</p></div>');
    }
    if (p[0] === 'acessos') return await telaAcessos();
    return telaPainel();
  } catch (e) {
    html(/permission/i.test(e?.message || '')
      ? `<div class="aviso">Sua conta (${V.E(estado.user.email)}) ainda não tem acesso. Peça ao administrador para liberar o seu e-mail.</div>`
      : erro(e));
  }
}

window.addEventListener('hashchange', rotear);
onAuthStateChanged(auth, async (u) => {
  estado.user = u;
  estado.admin = u ? await D.souAdmin(u.uid) : false;
  estado.modo = estado.admin ? 'rascunho' : 'publicado';
  rotear();
});
