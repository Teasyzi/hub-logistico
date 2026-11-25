// Hub Logístico — app. Cada acompanhamento é uma área com link próprio (#/montagem/...);
// o painel principal (#/) e as telas de importação/parâmetros/publicação são só do administrador.
import { auth } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import * as D from './dados.js?v=20261125-11';
import { lerArquivo, num } from './importar.js?v=20261125-11';
import * as V from './views.js?v=20261125-11';
import { hojeKM } from './km.js?v=20261125-11';
import { rotearPerdas } from './perdas_telas.js?v=20261125-11';
import { rotearRetorno } from './retorno_telas.js?v=20261125-11';
import { rotearFR } from './fillrate_telas.js?v=20261125-11';
import { rotearTX } from './transportes_telas.js?v=20261125-11';
import { diasDoMes } from './calc.js?v=20261117-5';
import { INDICADORES_PES, lerNumTela, pctParaTela } from './pes.js?v=20261125-11';
import { exportarPES } from './exportar_pes.js?v=20261117-3';
import { exportarMontagem } from './exportar_montagem.js?v=20261117-3';
import { exportarKM } from './exportar_km.js?v=20261117-3';
import { conectarModeloExportacao } from './modelos.js?v=20261117-3';
import { importarMontadoresArquivos, dadosMontadores, atualizacaoMontadores, calcularMontadores, temCadastroMontadores } from './montadores.js?v=20261117-10';
import { exportarMontadores } from './exportar_montadores.js?v=20261117-4';
import { ehConsultaCargas, lerConsultaCargas, montarFoto } from './cargas.js?v=20261123-2';

const $app = document.getElementById('app');
const estado = { user: null, admin: false, modo: 'rascunho', visualizarComoVisitante: false, rotaAdminAntesDaVisita: null };
const adminNaTela = () => estado.admin && !estado.visualizarComoVisitante;
const mesAtual = () => new Date().toISOString().slice(0, 7);
const html = (h) => { $app.innerHTML = h; };
const erro = (e) => `<div class="erro">${V.E(e?.message || e)}</div>`;
const mesP = (s) => (/^\d{4}-\d{2}$/.test(s || '') ? s : null);
const quandoImportou = (r) => r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '';
const textoAtualizacao = (data) => data instanceof Date && Number.isFinite(data.getTime())
  ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada';
const statusAtualizacao = (data = null, id = '') => `<p${id ? ` id="${id}"` : ''} class="status-atualizacao" role="status">${V.E(textoAtualizacao(data))}</p>`;

async function atualizarStatus(data) {
  const el = document.getElementById('statusAtualizacao');
  if (el) el.textContent = textoAtualizacao(data);
}

function historicoMontagem(importacoes) {
  const linhas = importacoes.length ? importacoes.map((r) => `<tr><td class="t">${quandoImportou(r)}</td><td class="t">${V.E(r.arquivo)}</td>
<td class="t">${V.E(r.tipo)}</td><td class="t">${V.E(r.centro || '')}</td><td>${r.linhas ?? ''}</td><td class="t">${V.E(r.periodo || '')}</td><td class="t">${V.E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="7" class="t small">Ainda não há importações da Montagem.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Centro</th><th>Linhas</th><th class="t">Período / data</th><th class="t">Por</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function historicoKM(importacoes, nome = 'KM') {
  const linhas = importacoes.length ? importacoes.map((r) => `<tr><td class="t">${quandoImportou(r)}</td><td class="t">${V.E(r.arquivo)}</td>
<td class="t">${V.E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${V.E(r.periodo || '')}</td><td class="t">${V.E(r.por || '')}</td></tr>`).join('')
    : `<tr><td colspan="6" class="t small">Ainda não há importações de ${V.E(nome)}.</td></tr>`;
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Linhas</th><th class="t">Período</th><th class="t">Por</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function cabecalhoSite(titulo) {
  document.getElementById('nav').innerHTML = titulo ? `<span>· ${V.E(titulo)}</span>` : '';
  const adminVisivel = adminNaTela();
  document.getElementById('usuario').innerHTML = estado.user
    ? `${adminVisivel ? '<a href="#/">Painel principal</a> · ' : ''}${V.E(estado.user.email)}${adminVisivel ? ' <span class="tag" style="color:inherit;border-color:currentColor">admin</span>' : estado.visualizarComoVisitante ? ' <span class="badge pub">VISITANTE</span>' : ''} · <a href="#" id="sair">sair</a>` : '';
  document.getElementById('sair')?.addEventListener('click', (e) => { e.preventDefault(); signOut(auth); });
  document.getElementById('modoVisitante')?.remove();
  if (estado.admin) {
    const b = document.createElement('button'); b.id = 'modoVisitante'; b.className = 'btn sec';
    b.style.cssText = 'margin-left:auto;padding:4px 9px;font-size:11px';
    b.textContent = estado.visualizarComoVisitante ? 'VOLTAR AO ADMIN' : 'VER COMO VISITANTE';
    b.title = estado.visualizarComoVisitante ? 'Sair da visualização pública' : 'Ocultar controles de administrador e ver a última publicação';
    document.querySelector('header').insertBefore(b, document.querySelector('.tema'));
    b.onclick = () => {
      if (!estado.visualizarComoVisitante) {
        estado.rotaAdminAntesDaVisita = location.hash;
        estado.modoAntesDaVisita = estado.modo;
        estado.visualizarComoVisitante = true; estado.modo = 'publicado';
        const p = (location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean), mes = p.map(mesP).find(Boolean) || mesAtual();
        const destino = p[0] === 'pes' ? `#/pes/resumo/${mes}` : p[0] === 'km' ? `#/km/resumo/${mes}` : p[0] === 'cargas' ? '#/cargas/resumo' : p[0] === 'perdas' ? `#/perdas/resumo/${mes}` : p[0] === 'retorno' ? `#/retorno/NORTE/${mes}` : p[0] === 'transportes' ? `#/transportes/resumo/${mes}` : p[0] === 'fillrate' ? `#/fillrate/resumo/${mes}` : `#/montagem/resumo/${mes}`;
        if (location.hash === destino) rotear(); else location.hash = destino;
      } else {
        estado.visualizarComoVisitante = false; estado.modo = estado.modoAntesDaVisita || 'rascunho';
        const destino = estado.rotaAdminAntesDaVisita || '#/';
        estado.rotaAdminAntesDaVisita = null;
        if (location.hash === destino) rotear(); else location.hash = destino;
      }
    };
  }
}

// ---------------------------------------------------------------- topo do acompanhamento Montagem
async function topoMontagem(aba, mes, titulo, comMes = true) {
  let ctrl = '';
  if (comMes) {
    const meses = adminNaTela() ? await D.mesesComDados() : await D.mesesPublicados();
    if (!meses.includes(mes)) meses.unshift(mes);
    ctrl = V.seletorMes(meses, mes);
    if (adminNaTela() && ['resumo', 'CBAR', 'CCRT'].includes(aba)) {
      ctrl += ` · <select id="selModo"><option value="rascunho" ${estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho (dados atuais)</option>`
        + `<option value="publicado" ${estado.modo === 'publicado' ? 'selected' : ''}>Publicado (o que os leitores veem)</option></select> `
        + (estado.modo === 'rascunho' ? '<span class="badge">rascunho</span>' : '<span class="badge pub">publicado</span>');
    }
  }
  const atualizado = adminNaTela() && estado.modo === 'rascunho' ? await ultimaMontagem(mes) : await ultimaPublicacaoMontagem(mes);
  return `<h1>Montagem de Cargas — ${V.E(titulo)}</h1><p class="sub">${ctrl} <span id="pubinfo" class="small"></span></p>${statusAtualizacao(atualizado, 'statusAtualizacao')}${V.abasMontagem(aba, mes, adminNaTela())}`;
}

async function ultimaMontagem(mes = mesAtual()) {
  const [ultimaImportacao, ultimaEdicao] = await Promise.all([
    D.ultimasImportacoes('montagem', 1), D.ultimaAtualizacaoMontagem(mes),
  ]);
  return [ultimaImportacao[0]?.em?.toDate?.(), ultimaEdicao].filter(Boolean).sort((a, b) => b - a)[0] || null;
}

async function ultimaPublicacaoMontagem(mes) {
  const publicacoes = await Promise.all(Object.keys(D.UNIDADES).map((c) => D.lerPublicado(c, mes)));
  return publicacoes.map((p) => p?.publicadoEm).filter(Boolean).sort((a, b) => b - a)[0] || null;
}

async function ultimaPES(mes) {
  const fontes = await Promise.all([ultimaMontagem(mes), D.ultimaAtualizacaoPES(mes)]);
  return fontes.filter(Boolean).sort((a, b) => b - a)[0] || null;
}

function ligarTopo(rotaMes) {
  document.getElementById('selMes')?.addEventListener('change', (e) => { location.hash = rotaMes(e.target.value); });
  document.getElementById('selModo')?.addEventListener('change', (e) => { estado.modo = e.target.value; rotear(); });
}

async function dadosDoMes(mes) {
  const ms = {}, mots = {};
  let pubEm = null;
  for (const c of Object.keys(D.UNIDADES)) {
    if (adminNaTela() && estado.modo === 'rascunho') {
      const x = await D.calcularAoVivo(c, mes);
      ms[c] = x.resultado.dias.some((d) => {
        const campos = [d.volume_vendido_cxu, d.retorno_cxu, d.vol_cxf, d.cx_unit, d.entregas, d.cargas,
          d.cubos, d.ocupacao, d.reprog_uc, d.reprog_cli, d.rp_cubos, d.rp_uc_total, d.rp_reprog, d.rp_cli];
        return d.origem_plan != null || campos.some((v) => v != null && Number(v) !== 0);
      }) ? x.resultado : null;
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
  html(V.paginaResumo(ms, { mes, admin: adminNaTela(), topo }));
  await atualizarStatus(adminNaTela() && estado.modo === 'rascunho' ? await ultimaMontagem(mes) : pubEm);
  ligarTopo((m) => `#/montagem/resumo/${m}`);
}

async function telaDetalhe(c, mes) {
  html('<p class="small">Calculando…</p>');
  const topo = await topoMontagem(c, mes, `${D.UNIDADES[c].nome} · ${V.nomeMes(mes)}`);
  const { ms, mots, pubEm } = await dadosDoMes(mes);
  html(ms[c] ? V.paginaDetalhe(c, ms[c], mots[c], { admin: adminNaTela(), topo }) : `${topo}<p>Sem dados de ${V.E(D.UNIDADES[c].nome)} em ${V.nomeMes(mes)}.</p>`);
  await atualizarStatus(adminNaTela() && estado.modo === 'rascunho' ? await ultimaMontagem(mes) : pubEm);
  ligarTopo((m) => `#/montagem/${c}/${m}`);
}

async function telaMontagemExportar(mes) {
  const topo = await topoMontagem('exportar', mes, `Exportar planilha · ${V.nomeMes(mes)}`);
  html(`${topo}<p>O modelo oficial fica salvo neste navegador. A exportação baixa uma cópia atualizada e preserva o arquivo original.</p>
<div class="modelo-box"><label>MODELO OFICIAL (.XLSM)<br><input type="file" id="modeloMontagem" accept=".xlsm"></label><span id="modeloStatus" class="small"></span></div>
<p><button class="btn" id="exportar" disabled>EXPORTAR ${V.nomeMes(mes)}</button></p><p class="small">Usa os dados atuais do rascunho e solicita recálculo das fórmulas ao abrir no Excel.</p>`);
  conectarModeloExportacao({ id:'montagem', inputId:'modeloMontagem', statusId:'modeloStatus', botaoId:'exportar', executar: async (modelo) => {
      const resultados = Object.fromEntries(await Promise.all(Object.keys(D.UNIDADES).map(async (c) => [c, (await D.calcularAoVivo(c, mes)).resultado])));
      await exportarMontagem(modelo, mes, resultados);
  }});
  ligarTopo((m) => `#/montagem/exportar/${m}`);
}

// ---------------------------------------------------------------- telas do administrador (dentro do acompanhamento)
async function telaImportar() {
  const topo = await topoMontagem('importar', mesAtual(), 'Importar planilhas', false);
  const hist = historicoMontagem(await D.ultimasImportacoes('montagem'));
  html(`${topo}
<p class="sub">Arquivos do dia: <b>VOLUMES DE VENDAS/RETORNOS</b> (Barreiras), <b>ZSD0092/ZSD0090</b> (Juazeiro) e os 2 <b>Resumos de Planejamento</b>.
Histórico: planilhas antigas "MM - Montagem de Cargas" e "Reprogramação DL's". Os arquivos são lidos neste navegador; só números e códigos vão para o banco.</p>
<div class="aviso">Resumo de Planejamento: salve sem habilitar a edição para não recalcular a data (C8). Confira a data detectada no resultado.</div>
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div>
<div id="res"></div>
<h2>Últimas importações da Montagem</h2><div id="histMontagem">${hist}</div>`);
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
        const x = await lerArquivo(f, { contexto: 'montagem' });
        // Arquivo de outro acompanhamento (ex.: rotas do KM) não é registrado como importado aqui.
        if (!['venda', 'retorno', 'resumo', 'montagem', 'reprog'].includes(x.tipo)) x.tipo = null;
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
        if (x.tipo) await D.registrarImportacao({ ...r, acompanhamento: 'montagem' });
        linhasRes += `<tr><td class="t">${V.E(f.name)}</td><td class="t">${x.tipo ? '✓ ' + V.E(r.tipo) : '✕ não reconhecido'}</td><td class="t">${V.E(r.centro)}</td><td>${r.linhas}</td><td class="t">${V.E(r.periodo)}</td></tr>`;
      } catch (e) {
        linhasRes += `<tr><td class="t">${V.E(f.name)}</td><td class="t" colspan="4">✕ erro: ${V.E(e.message)}</td></tr>`;
      }
    }
    out.innerHTML = `<h2>Resultado</h2><div class="tw scroll"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Centro</th><th>Linhas</th><th class="t">Período / data</th></tr></thead><tbody>${linhasRes}</tbody></table></div>
<p><a class="btn" href="#/montagem/resumo/${mesAtual()}">Conferir rascunho</a> <a class="btn sec" href="#/montagem/publicar/${mesAtual()}">Publicar</a></p>`;
    document.getElementById('histMontagem').innerHTML = historicoMontagem(await D.ultimasImportacoes('montagem'));
    await atualizarStatus(await ultimaMontagem());
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
  html(`${topo}<p class="sub">Valores digitados à mão. Vírgula ou ponto como decimal; ajuste de dias vazio mantém a contagem normal.</p>
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
      await atualizarStatus(await ultimaMontagem(mes));
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
      await atualizarStatus(await ultimaMontagem(mes));
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
  const meses = adminNaTela() ? await D.mesesComDados() : await D.mesesPESPublicados();
  if (!meses.includes(mes)) meses.unshift(mes);
  let ctrl = V.seletorMes(meses, mes);
  if (adminNaTela() && comModo) {
    ctrl += ` · <select id="selModo"><option value="rascunho" ${estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho (dados atuais)</option>`
      + `<option value="publicado" ${estado.modo === 'publicado' ? 'selected' : ''}>Publicado (o que os leitores veem)</option></select> `
      + (estado.modo === 'rascunho' ? '<span class="badge">rascunho</span>' : '<span class="badge pub">publicado</span>');
  }
  const fontes = adminNaTela() && estado.modo === 'rascunho'
    ? [await ultimaPES(mes)]
    : await Promise.all(Object.keys(D.UNIDADES).map(async (c) => (await D.lerPESPublicado(c, mes))?.publicadoEm));
  const atualizado = fontes.filter(Boolean).sort((a, b) => b - a)[0] || null;
  return `<h1>PES Logístico — ${V.E(titulo)}</h1><p class="sub">${ctrl} <span id="pubinfo" class="small"></span></p>${statusAtualizacao(atualizado, 'statusAtualizacao')}${V.abasPES(aba, mes, adminNaTela())}`;
}

async function telaPESResumo(mes) {
  html('<p class="small">Calculando…</p>');
  const topo = await topoPES('resumo', mes, `Placar · ${V.nomeMes(mes)}`, true);
  const placares = {};
  let pubEm = null;
  for (const c of Object.keys(D.UNIDADES)) {
    if (adminNaTela() && estado.modo === 'rascunho') placares[c] = await D.placarAoVivo(c, mes);
    else {
      const p = await D.lerPESPublicado(c, mes);
      placares[c] = p?.placar || null;
      if (p?.publicadoEm) pubEm = p.publicadoEm;
    }
  }
  html(V.paginaPES(placares, { mes, admin: adminNaTela(), topo }));
  const fontes = adminNaTela() && estado.modo === 'rascunho' ? [await ultimaPES(mes)] : [pubEm];
  await atualizarStatus(fontes.filter(Boolean).sort((a, b) => b - a)[0] || null);
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
      if (n) await atualizarStatus(await ultimaPES(mes));
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
  html(`${topo}<p>O modelo oficial fica salvo neste navegador. A exportação baixa uma cópia atualizada e preserva o arquivo original.</p>
<div class="modelo-box"><label>MODELO OFICIAL (.XLSM)<br><input type="file" id="modeloPES" accept=".xlsm"></label><span id="modeloStatus" class="small"></span></div>
<p><button class="btn" id="exportar" disabled>EXPORTAR ${V.nomeMes(mes)}</button></p><p class="small">Você pode substituir o modelo quando receber uma versão nova.</p>`);
  conectarModeloExportacao({ id:'pes', inputId:'modeloPES', statusId:'modeloStatus', botaoId:'exportar', executar: async (modelo) => {
      const cs = ['CBAR', 'CCRT'];
      const placares = Object.fromEntries(await Promise.all(cs.map(async (c) => [c, await D.placarAoVivo(c, mes)])));
      await exportarPES(modelo, mes, placares);
  }});
  ligarTopo((m) => `#/pes/exportar/${m}`);
}

async function mesPadraoPES() {
  if (adminNaTela()) return mesAtual();
  return (await D.mesesPESPublicados())[0] || mesAtual();
}

// ---------------------------------------------------------------- KM planejado × realizado
async function topoKM(aba, mes, titulo, comMes = true) {
  let ctrl = '';
  if (comMes) {
    const meses = new Set(adminNaTela() ? [mesAtual(), mes] : await D.mesesKMPublicados());
    meses.add(mes);
    ctrl = V.seletorMes([...meses].sort().reverse(), mes);
    if (adminNaTela() && ['resumo', 'NORTE', 'SUL', 'CBAR', 'CCRT'].includes(aba)) {
      ctrl += ` · <select id="selModo"><option value="rascunho" ${estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
    }
  }
  const atualizado = adminNaTela() && estado.modo === 'rascunho' ? await ultimaKM(mes) : await ultimaPublicacaoKM(mes);
  return `<h1>KM planejado × realizado — ${V.E(titulo)}</h1><p class="sub">${ctrl} <span id="pubinfo" class="small"></span></p>${statusAtualizacao(atualizado, 'statusAtualizacao')}${V.abasKM(aba, mes, adminNaTela())}`;
}

async function ultimaKM(mes = mesAtual()) {
  const [ultimaImportacao, ultimaEdicao] = await Promise.all([
    D.ultimasImportacoes('km', 1), D.ultimaAtualizacaoKM(mes),
  ]);
  return [ultimaImportacao[0]?.em?.toDate?.(), ultimaEdicao].filter(Boolean).sort((a, b) => b - a)[0] || null;
}

async function ultimaPublicacaoKM(mes) {
  const publicacoes = await Promise.all(['NORTE', 'SUL', 'CBAR', 'CCRT'].map((c) => D.lerKMPublicado(c, mes)));
  return publicacoes.map((p) => p?.publicadoEm).filter(Boolean).sort((a, b) => b - a)[0] || null;
}

async function resultadoKM(mes) {
  if (adminNaTela() && estado.modo === 'rascunho') return D.calcularKMAoVivo(mes);
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
  html(`${V.paginaKMResumo(resultado, { mes, admin: adminNaTela(), topo })}${faltam ? `<div class="aviso">${adminNaTela() && estado.modo === 'rascunho' ? 'Ainda não há dados importados para todas as unidades neste mês.' : `O KM de ${V.nomeMes(mes)} ainda não foi publicado.`}</div>` : ''}`);
  await atualizarStatus(adminNaTela() && estado.modo === 'rascunho' ? await ultimaKM(mes) : resultado.publicadoEm);
  ligarTopo((m) => `#/km/resumo/${m}`);
}

async function telaKMExportar(mes) {
  const topo = await topoKM('exportar', mes, `Exportar planilha · ${V.nomeMes(mes)}`);
  html(`${topo}<p>O modelo oficial fica salvo neste navegador. A exportação baixa uma cópia atualizada e preserva o arquivo original.</p>
<div class="modelo-box"><label>MODELO OFICIAL (.XLSM)<br><input type="file" id="modeloKM" accept=".xlsm"></label><span id="modeloStatus" class="small"></span></div>
<p><button class="btn" id="exportar" disabled>EXPORTAR ${V.nomeMes(mes)}</button></p><p class="small">Usa os dados atuais do rascunho e solicita recálculo das fórmulas ao abrir no Excel.</p>`);
  conectarModeloExportacao({ id:'km', inputId:'modeloKM', statusId:'modeloStatus', botaoId:'exportar', executar: async (modelo) => {
      const resultado = await D.calcularKMAoVivo(mes);
      await exportarKM(modelo, mes, resultado);
  }});
  ligarTopo((m) => `#/km/exportar/${m}`);
}

async function telaKMUnidade(unidade, mes, diaInicial = null) {
  const admin = adminNaTela() && estado.modo === 'rascunho';
  const [full, dados, lancamentos] = await Promise.all([resultadoKM(mes), admin ? D.lerRotasRevisaoKM(unidade, mes) : null, admin ? D.lerLancamentosKM(unidade, mes) : []]);
  const u = full.unidades[unidade];
  if (!u) { const topo = await topoKM(unidade, mes, `${unidade} · ${V.nomeMes(mes)}`); html(`${topo}<div class="aviso">Não há dados de KM para esta unidade neste mês.</div>`); ligarTopo((m) => `#/km/${unidade}/${m}`); return; }
  const topo = await topoKM(unidade, mes, `${u.nome} · ${V.nomeMes(mes)}`);
  // Abre no último dia com rotas, para a tabela não começar com o mês inteiro.
  const dia = diaInicial || (admin && dados.rotas.length ? dados.rotas.map((r) => r.data).sort().at(-1) : 'todos');
  const extras = admin ? `${V.tabelaRotasKM(unidade, dados, { duplicadas: u.duplicadas || [], espelhos: u.espelhos || {}, equipamentos: u.equipamentos || {}, diaInicial: dia })}${V.blocoLancamentosKM(lancamentos, { mes })}${['NORTE', 'SUL'].includes(unidade) ? V.blocoMotoristasKM(u) : ''}` : '';
  html(V.paginaKMUnidade(unidade, u, { mes, topo, admin, extras }));
  ligarTopo((m) => `#/km/${unidade}/${m}`);
  if (admin) ligarEdicaoKM(unidade, mes, lancamentos);
}

// Edição na página da unidade (admin): filtros e ajustes das rotas, lançamentos manuais.
function ligarEdicaoKM(unidade, mes, lancamentos) {
  const linhas = () => [...document.querySelectorAll('table.km-rotas tbody tr[data-chave]')];
  const caixasSecao = () => [...document.querySelectorAll('input.secao')];
  const secoesMarcadas = () => caixasSecao().filter((i) => i.checked).map((i) => i.value);
  const pintar = () => { const s = secoesMarcadas();
    for (const tr of linhas()) {
      const dup = tr.querySelector('.man') && !tr.querySelector('.man').checked && tr.dataset.grupos.split(' ').includes('duplicada');
      tr.classList.toggle('exc', tr.querySelector('.exc').checked || dup || (!!tr.dataset.secao && caixasSecao().length > 0 && !s.includes(tr.dataset.secao)));
    } };
  const filtrar = () => {
    const dia = document.getElementById('diaRotas').value, f = document.getElementById('filtroRotas').value, mot = document.getElementById('motRotas').value;
    for (const tr of linhas()) tr.hidden = (dia !== 'todos' && tr.dataset.dia !== dia) || (mot && tr.dataset.mot !== mot) || (f !== 'todas' && !tr.dataset.grupos.split(' ').includes(f));
  };
  document.getElementById('diaRotas').onchange = filtrar;
  document.getElementById('filtroRotas').onchange = filtrar;
  document.getElementById('motRotas').onchange = filtrar;
  // No resumo por motorista, o nome abre as rotas do motorista no mês inteiro.
  for (const b of document.querySelectorAll('button.ver-mot')) b.onclick = () => {
    const sel = document.getElementById('motRotas');
    if (![...sel.options].some((o) => o.value === b.dataset.mot)) return;
    sel.value = b.dataset.mot; document.getElementById('diaRotas').value = 'todos'; filtrar();
    document.getElementById('rotas').scrollIntoView({ behavior: 'smooth' });
  };
  for (const b of document.querySelectorAll('button.ver-dia')) b.onclick = () => {
    document.getElementById('diaRotas').value = b.dataset.dia; filtrar();
    document.getElementById('rotas').scrollIntoView({ behavior: 'smooth' });
  };
  document.getElementById('marcarFret').onclick = () => {
    for (const tr of linhas()) if (!tr.hidden && /FRETEIRO/i.test(tr.querySelector('.mot').value)) tr.querySelector('.exc').checked = true;
    pintar();
  };
  for (const tr of linhas()) { tr.querySelector('.exc').onchange = pintar; if (tr.querySelector('.man')) tr.querySelector('.man').onchange = pintar; }
  for (const i of caixasSecao()) i.onchange = pintar;
  const recarregar = () => telaKMUnidade(unidade, mes, document.getElementById('diaRotas')?.value || 'todos');
  document.getElementById('salvarRotas').onclick = async (e) => {
    e.target.disabled = true;
    try {
      const ajustes = [];
      for (const tr of linhas()) {
        // O campo mostra o nome completo. Sem mudança, fica a troca que já existia; voltar ao nome completo do arquivo desfaz a troca.
        const campo = tr.querySelector('.mot'), valor = campo.value.trim();
        const motorista = valor === campo.defaultValue.trim() ? tr.dataset.troca : valor.toLocaleUpperCase('pt-BR') === tr.dataset.padrao.toLocaleUpperCase('pt-BR') ? '' : valor;
        const excluir = tr.querySelector('.exc').checked, manter = !!tr.querySelector('.man')?.checked;
        const idaTxt = tr.querySelector('.ida')?.value.trim() ?? '';
        const trocou = !!motorista, temIda = idaTxt !== '';
        if (trocou || excluir || temIda || manter) ajustes.push({ chave: tr.dataset.chave, ...(trocou ? { motorista } : {}), ...(excluir ? { excluir: true } : {}), ...(temIda ? { idaVolta: num(idaTxt) } : {}), ...(manter ? { manter: true } : {}) });
      }
      await D.gravarAjustesKM(unidade, mes, ajustes, caixasSecao().length ? secoesMarcadas() : null);
      await recarregar();
      document.getElementById('msg').innerHTML = `<span class="st ok">✓ ${ajustes.length} ajuste(s) salvos</span>`;
    } catch (err) { document.getElementById('msg').innerHTML = erro(err); e.target.disabled = false; }
  };
  const proprios = lancamentos.filter((l) => !l.doMesAnterior);
  const salvarLanc = async (lista, msg) => {
    try { await D.gravarLancamentosKM(unidade, mes, lista); await recarregar(); document.getElementById('msgLanc').innerHTML = `<span class="st ok">✓ ${msg}</span>`; document.getElementById('lancamentos').scrollIntoView(); }
    catch (err) { document.getElementById('msgLanc').innerHTML = erro(err); }
  };
  document.getElementById('addLanc').onclick = async () => {
    const tipo = document.getElementById('lTipo').value, de = document.getElementById('lDe').value, para = document.getElementById('lPara').value;
    const km = num(document.getElementById('lKm').value), texto = document.getElementById('lTexto').value.trim();
    const falta = !de ? 'Informe o dia de origem.' : tipo !== 'obs' && !para ? 'Informe o dia de destino.' : tipo !== 'obs' && !(km > 0) ? 'Informe os km (maior que zero).' : tipo === 'obs' && !texto ? 'Escreva a observação.' : '';
    if (falta) { document.getElementById('msgLanc').innerHTML = `<span class="st no">${V.E(falta)}</span>`; return; }
    await salvarLanc([...proprios, { id: `${Date.now()}`, tipo, de, para: tipo === 'obs' ? null : para, km: tipo === 'obs' ? 0 : km, texto }], 'lançamento salvo');
  };
  for (const b of document.querySelectorAll('button.rem-lanc')) b.onclick = async () => {
    const alvo = lancamentos[Number(b.dataset.i)];
    await salvarLanc(proprios.filter((l) => l !== alvo), 'lançamento removido');
  };
}

async function telaKMImportar() {
  const mes = mesP(location.hash.split('/')[3]) || mesAtual(), topo = await topoKM('importar', mes, 'Importar arquivos', false);
  const hist = historicoKM(await D.ultimasImportacoes('km'));
  html(`${topo}<p class="sub">Listagem de abastecimentos (KMS.xls ou o TXT) e planilhas de rotas. Reimportar a listagem substitui os dias que ela cobre. Os dados são lidos neste navegador; nomes e placas ficam restritos à área administrativa.</p>
<label>Mês das abas de montagem sem mês/ano <input id="mesImport" type="month" value="${mes}"></label> <label>Unidade para Resumo: <select id="unidadeImport"><option value="AUTO">Detectar pelo arquivo</option><option value="CBAR">Barreiras</option><option value="CCRT">Juazeiro</option></select></label>
<div class="drop" id="drop"><p>Arraste a listagem de abastecimentos (KMS.xls ou .txt) e as planilhas de rotas aqui ou selecione os arquivos</p><input type="file" id="arqs" multiple accept=".txt,.xls,.xlsx,.xlsm"></div><div id="res"></div>
<h2>Últimas importações de KM</h2><div id="histKM">${hist}</div>`);
  const drop = document.getElementById('drop');
  const processar = async (files) => {
    let rows = '';
    for (const f of files) {
      try {
        const x = await lerArquivo(f, { mes: document.getElementById('mesImport').value, unidade: document.getElementById('unidadeImport').value });
        let n = 0, tipo = x.tipo;
        // Dia da extração: o menor entre a data do arquivo e hoje. O realizado desse dia fica fora do acumulado.
        const hoje = hojeKM(), doArquivo = f.lastModified ? new Date(f.lastModified - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : hoje;
        const extraidoEm = doArquivo < hoje ? doArquivo : hoje;
        if (x.tipo === 'km_abastecimentos') n = await D.gravarAbastecimentosKM(x.linhas, extraidoEm);
        else if (['km_rotas', 'km_resumo', 'km_historico'].includes(x.tipo)) {
          n = await D.gravarRotasKM(x.rotas);
          // A planilha antiga também traz a listagem de abastecimentos na aba Consulta.
          if (x.tipo === 'km_historico' && x.linhas?.length) n += await D.gravarAbastecimentosKM(x.linhas, extraidoEm);
          // …e a tabela de ida e volta e os apelidos, que passam a valer para todos os meses.
          if (x.tipo === 'km_historico' && x.tabelas) tipo += ` · ida e volta de ${await D.gravarTabelasKM(x.tabelas)} motoristas`;
        }
        else throw new Error('Formato não reconhecido como arquivo de KM.');
        await D.registrarImportacao({ arquivo: f.name, tipo, linhas: n, periodo: document.getElementById('mesImport').value, acompanhamento: 'km' });
        rows += `<tr><td class="t">${V.E(f.name)}</td><td>${V.E(tipo)}</td><td>${n}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${V.E(f.name)}</td><td colspan="3" class="st no">${V.E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado da importação</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th>Tipo</th><th>Linhas</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/km/resumo/${document.getElementById('mesImport').value}">Conferir rascunho</a></p>`;
    document.getElementById('histKM').innerHTML = historicoKM(await D.ultimasImportacoes('km'));
    await atualizarStatus(await ultimaKM());
  };
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

async function telaKMParametros(mes) {
  const topo = await topoKM('parametros', mes, `Parâmetros · ${V.nomeMes(mes)}`), cs = ['NORTE', 'SUL', 'CBAR', 'CCRT'];
  const [pars, bases] = await Promise.all([
    Promise.all(cs.map((c) => D.lerParametrosMesKM(c, mes))).then((xs) => Object.fromEntries(cs.map((c, i) => [c, xs[i]]))),
    Promise.all(cs.map((c) => D.lerBaseKM(c))).then((xs) => Object.fromEntries(cs.map((c, i) => [c, xs[i]]))),
  ]);
  const padrao = mes === '2026-11' ? { NORTE: 2.46, SUL: 2.09, CBAR: 2.07, CCRT: 4.19 } : {};
  const numTxt = (v) => v == null ? '' : String(v).replace('.', ',');
  const ordena = (xs) => [...xs].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const linhas = cs.map((c) => `<tr><td class="t">${V.E(c)}</td><td><input type="text" data-c="${c}" data-k="cpk" value="${V.E(numTxt(pars[c].cpk ?? padrao[c]))}"></td><td><input type="text" data-c="${c}" data-k="meta" value="${V.E(numTxt((pars[c].meta ?? 0.05) * 100))}" placeholder="5"></td></tr>`).join('');
  // Cadastro de motoristas (todos os meses), como as tabelas das abas Planejado. Juazeiro não tem ida e volta.
  const cadastro = (c) => {
    const b = bases[c], ida = b.idaVolta || {}, areas = b.areas || {};
    const nomes = ordena(new Set([...(b.cadastro || []), ...Object.keys(areas), ...Object.keys(ida)]));
    const txtBases = ordena(Object.keys(b.bases || {})).map((k) => `${k}=${numTxt(b.bases[k])}`).join('\n');
    const txtMot = nomes.map((n) => `${n}=${areas[n] || ''}${n in ida ? `=${numTxt(ida[n])}` : ''}`).join('\n');
    const txtAp = ordena(Object.keys(b.apelidos || {})).map((k) => `${k}=${b.apelidos[k]}`).join('\n');
    return `<section class="bloco"><div class="faixa">Cadastro de motoristas · ${V.E(c)}</div><div class="corpo"><div class="grid">
<label>Ida e volta por base <span class="small">(BASE=km)</span><br><textarea data-cad="${c}" data-k="bases" rows="8" placeholder="QUIXADÁ=332">${V.E(txtBases)}</textarea></label>
<label>Motoristas · ${V.fi(nomes.length)} <span class="small">(NOME COMPLETO=BASE${c === 'CBAR' ? '=km' : ''})</span><br><textarea data-cad="${c}" data-k="motoristas" rows="8" placeholder="NOME COMPLETO=BASE">${V.E(txtMot)}</textarea></label>
<label>Apelidos · ${V.fi(Object.keys(b.apelidos || {}).length)} <span class="small">(NOME NA MONTAGEM=NOME COMPLETO)</span><br><textarea data-cad="${c}" data-k="apelidos" rows="8" placeholder="APELIDO=NOME COMPLETO">${V.E(txtAp)}</textarea></label>
</div></div></section>`;
  };
  html(`${topo}<p class="sub">CPK em R$/km e meta em % (ex.: 5) valem para este mês.</p><div class="tw"><table><thead><tr><th class="t">Unidade</th><th>CPK</th><th>Meta ± %</th></tr></thead><tbody>${linhas}</tbody></table></div>
<h2>Ida e volta (todos os meses)</h2>
<p class="small">Funciona como na planilha: o nome que vem na montagem vira o <b>nome completo</b> pelos apelidos (Planilha1), o nome completo dá a <b>base</b> do motorista e a base dá a <b>ida e volta</b>. Ela entra uma vez por motorista no dia. Em Barreiras, o terceiro valor da linha do motorista é a ida e volta dele (a soma da planilha) e vence a da base. Motorista novo: inclua o nome completo com a base e, se a montagem usar outro nome, o apelido. Para zerar uma rota específica, use a página da unidade.</p>
${['NORTE', 'SUL', 'CBAR'].map(cadastro).join('')}
<p><button class="btn" id="salvar">Salvar parâmetros</button> <span id="msg"></span></p>
<section class="bloco"><div class="faixa">Importar cadastro de motoristas</div><div class="corpo"><p class="small">Escolha uma planilha "KM Planejado x Realizado - &lt;Mês&gt;.xlsm" de um mês fechado. O site lê só os apelidos da aba Planilha1 e as tabelas NOME MOTORISTA / ÁREA / IDA E VOLTA das abas Planejado, e substitui o cadastro acima de todas as unidades. As rotas e os abastecimentos dessa planilha não são importados aqui.</p><p><input type="file" id="arqTabela" accept=".xlsm,.xlsx"> <span id="msgTabela"></span></p></div></section>`);
  document.getElementById('arqTabela').onchange = async (e) => {
    const msg = document.getElementById('msgTabela'), f = e.target.files[0];
    if (!f) return;
    msg.textContent = 'Lendo…';
    try {
      const x = await lerArquivo(f, { mes, contexto: 'km' });
      if (x.tipo !== 'km_historico' || !x.tabelas) throw new Error('Este arquivo não é uma planilha KM Planejado x Realizado.');
      const n = await D.gravarTabelasKM(x.tabelas);
      if (!n) throw new Error('Não encontrei a tabela NOME MOTORISTA / ÁREA / IDA E VOLTA nas abas Planejado.');
      await telaKMParametros(mes);
      document.getElementById('msgTabela').innerHTML = `<span class="st ok">✓ cadastro de ${n} motoristas importado</span>`;
    } catch (err) { msg.innerHTML = erro(err); }
  };
  // Linhas "A=B" ou "A=B=C" dos campos do cadastro, em maiúsculas.
  const linhasCad = (c, k) => (document.querySelector(`[data-cad="${c}"][data-k="${k}"]`)?.value || '').split(/\r?\n/)
    .map((l) => l.split('=').map((x) => x.trim().toLocaleUpperCase('pt-BR'))).filter(([a]) => a);
  document.getElementById('salvar').onclick = async (e) => {
    e.target.disabled = true;
    try {
      for (const c of cs) {
        const v = {};
        document.querySelectorAll(`[data-c="${c}"]`).forEach((i) => { if (i.value.trim()) v[i.dataset.k] = num(i.value); });
        if (v.meta > 1) v.meta /= 100;
        await D.gravarParametrosKM(c, mes, v);
        if (!document.querySelector(`[data-cad="${c}"]`)) continue;
        const basesKm = {}, areas = {}, idaVolta = {}, apelidos = {}, cad = new Set();
        for (const [b, km] of linhasCad(c, 'bases')) if (km) basesKm[b] = num(km);
        for (const [n, b, km] of linhasCad(c, 'motoristas')) { cad.add(n); if (b) areas[n] = b; if (km) idaVolta[n] = num(km); }
        for (const [a, n] of linhasCad(c, 'apelidos')) if (n) { apelidos[a] = n; cad.add(n); }
        await D.gravarBaseKM(c, { ...bases[c], bases: basesKm, areas, idaVolta, apelidos, cadastro: [...cad].sort((a, b) => a.localeCompare(b, 'pt-BR')) });
      }
      document.getElementById('msg').innerHTML = '<span class="st ok">Salvo</span>';
      await atualizarStatus(await ultimaKM(mes));
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

// ---------------------------------------------------------------- Montadores (em validação, dados locais do navegador)
async function topoMontadores(aba, mes, titulo) {
  const registros = await dadosMontadores(), meses = [...new Set(registros.map((r) => r.data?.slice(0, 7)).filter(Boolean))].sort().reverse();
  if (!meses.includes(mes)) meses.unshift(mes);
  const atualizado = await atualizacaoMontadores();
  const topo = `<h1>Montadores — ${V.E(titulo)}</h1><p class="sub">${V.seletorMes(meses, mes)} <span class="badge">DADOS LOCAIS · EM VALIDAÇÃO</span></p>${statusAtualizacao(atualizado ? new Date(atualizado) : null, 'statusAtualizacao')}${V.abasMontadores(aba, mes)}`;
  return { topo, registros };
}

async function telaMontadoresUnidade(base, mes) {
  const {topo, registros} = await topoMontadores(base, mes, `${base} · ${V.nomeMes(mes)}`);
  html(V.paginaMontadoresUnidade(base, calcularMontadores(registros, mes, await temCadastroMontadores())[base] || [], {mes, topo}));
  ligarTopo((m) => `#/montadores/${base}/${m}`);
}

async function telaMontadoresImportar() {
  const mes = mesAtual(), {topo} = await topoMontadores('importar', mes, 'Importar acompanhamento oficial');
  const antes = await dadosMontadores();
  html(`${topo}<p>Importe um ou vários relatórios diários <b>listas-trabalhadas</b> (.XLSX), ou uma planilha mensal oficial com as abas <b>DA</b> e <b>DL</b>. Os relatórios diários precisam ter a data no nome (AAAA-MM-DD-listas-trabalhadas.xlsx).</p>
<div class="modelo-box"><label>ARQUIVOS DE MONTADORES<br><input type="file" id="arqsMontadores" accept=".xlsx,.xlsm" multiple></label><label>UNIDADE DOS RELATÓRIOS DIÁRIOS<br><select id="baseMontadores"><option value="NORTE" selected>CB Norte</option><option value="SUL">CB Sul</option><option value="CBAR">Barreiras</option><option value="CCRT">Juazeiro</option></select></label><button class="btn" id="importarMontadores">IMPORTAR SELECIONADOS</button></div>
<p class="small">Os relatórios diários não trazem a unidade; ela será aplicada a todas as planilhas do lote. Um lote diário substitui os registros daquela base e das datas selecionadas e preserva os demais dias. Reimporte a planilha oficial DA/DL para atualizar o cadastro de login, nome e unidade; listas diárias já salvas serão preservadas. Logins que ainda não forem encontrados pedem confirmação e ficam sinalizados em observação para conferência.</p>
<p id="statusMontadores" class="small">${antes.length ? `${V.fi(antes.length)} registros salvos neste navegador.` : 'Nenhum arquivo importado neste navegador.'}</p>`);
  document.getElementById('importarMontadores').onclick = async (e) => {
    const files = document.getElementById('arqsMontadores').files;
    if (!files?.length) { document.getElementById('statusMontadores').textContent = 'Escolha pelo menos um arquivo.'; return; }
    e.target.disabled = true; const out = document.getElementById('statusMontadores'); out.textContent = `Lendo e validando ${files.length} arquivo(s)…`;
    let resultado;
    try {
      resultado = await importarMontadoresArquivos(files, document.getElementById('baseMontadores').value);
      if (resultado.necessitaConfirmacao) {
        const lista = resultado.novos.slice(0, 20).map((p) => `${p.login} · ${p.nome}`).join('\n');
        const extra = resultado.novos.length > 20 ? `\n… e mais ${resultado.novos.length - 20} login(s).` : '';
        if (!window.confirm(`Estes logins não constam no cadastro DA/DL. Confirmar a importação e deixá-los em observação para conferência?\n\n${lista}${extra}`)) {
          out.textContent = 'Importação cancelada. Nenhum dado foi alterado.'; e.target.disabled = false; return;
        }
        resultado = await importarMontadoresArquivos(files, document.getElementById('baseMontadores').value, true);
      }
    }
    catch (err) { out.innerHTML = `${erro(err)}<p class="small">Nenhum dado foi alterado neste lote.</p>`; e.target.disabled = false; return; }
    const detalhes = resultado.arquivos.map((x) => `<tr><td class="t">${V.E(x.arquivo)}</td><td>${x.data ? V.fdata(x.data) : 'Planilha mensal'}</td><td>${V.fi(x.linhas)}</td><td class="st ok">Validado</td></tr>`).join('');
    const unidade = { NORTE: 'CB Norte', SUL: 'CB Sul', CBAR: 'Barreiras', CCRT: 'Juazeiro' }[resultado.base];
    const tipo = resultado.tipo === 'diaria' ? `lote diário de ${V.E(unidade)} · ${V.fi(resultado.total)} registros` : `planilha oficial · ${V.fi(resultado.total)} registros`;
    const observacao = resultado.novos?.length ? ` ${V.fi(resultado.novos.length)} login(s) novo(s) ficaram em observação para conferência.` : '';
    out.innerHTML = `<p class="st ok">✓ ${resultado.arquivos.length} arquivo(s) validados; ${tipo}. Agora há ${V.fi(resultado.registros)} registros salvos neste navegador.${observacao}</p><div class="tw scroll"><table><thead><tr><th class="t">Arquivo</th><th>Data</th><th>Linhas</th><th>Status</th></tr></thead><tbody>${detalhes}</tbody></table></div>`;
    try { await atualizarStatus(await atualizacaoMontadores()); } catch { /* A importação já foi salva; a barra poderá atualizar na próxima abertura. */ }
    e.target.disabled = false;
  };
}

async function telaMontadoresExportar(mes) {
  const {topo} = await topoMontadores('exportar', mes, `Exportar · ${V.nomeMes(mes)}`);
  html(`${topo}<p>Use o modelo oficial de Montadores. Ele fica guardado neste navegador e pode ser substituído quando houver uma nova versão. A exportação gera uma cópia com os dados atualizados.</p>
<div class="modelo-box"><label>MODELO OFICIAL (.XLSX OU .XLSM)<br><input type="file" id="modeloMontadores" accept=".xlsx,.xlsm"></label><span id="modeloStatus" class="small"></span></div>
<p><button class="btn" id="exportar" disabled>EXPORTAR ${V.nomeMes(mes)}</button></p><p class="small">O acompanhamento precisa ter abas DA e DL. Dados e modelo permanecem locais neste navegador.</p>`);
  conectarModeloExportacao({ id:'montadores', inputId:'modeloMontadores', statusId:'modeloStatus', botaoId:'exportar', executar: async (modelo) => {
    await exportarMontadores(modelo, mes, await dadosMontadores());
  }});
  ligarTopo((m) => `#/montadores/exportar/${m}`);
}

// ---------------------------------------------------------------- Cargas em aberto (DAs, foto diária da Consulta BI)
const dataP = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null);
const hojeLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const rascunhoCargas = () => adminNaTela() && estado.modo === 'rascunho';

async function datasDisponiveisCargas() {
  return rascunhoCargas() ? D.datasCargas() : D.datasCargasPublicadas();
}

async function topoCargas(aba, data, titulo, comData = true) {
  let ctrl = '';
  if (comData) {
    const datas = await datasDisponiveisCargas();
    if (data && !datas.includes(data)) datas.unshift(data);
    if (datas.length) ctrl = V.seletorData(datas, data);
    if (adminNaTela() && ['resumo', 'NORTE', 'SUL'].includes(aba)) {
      ctrl += ` · <select id="selModo"><option value="rascunho" ${estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho (dados importados)</option>`
        + `<option value="publicado" ${estado.modo === 'publicado' ? 'selected' : ''}>Publicado (o que os leitores veem)</option></select> `
        + (estado.modo === 'rascunho' ? '<span class="badge">rascunho</span>' : '<span class="badge pub">publicado</span>');
    }
  }
  return `<h1>Cargas em aberto — ${V.E(titulo)}</h1><p class="sub">${ctrl}</p>${statusAtualizacao(null, 'statusAtualizacao')}${V.abasCargas(aba, data, adminNaTela())}`;
}

async function resultadoCargas(data) {
  if (rascunhoCargas()) {
    const x = await D.calcularCargasAoVivo(data);
    return x ? { resultado: x.resultado, em: x.atualizado } : null;
  }
  const p = await D.lerCargasPublicado(data);
  return p ? { resultado: p.resultado, em: p.publicadoEm } : null;
}

async function telaCargas(aba, dataPedida) {
  html('<p class="small">Carregando cargas em aberto…</p>');
  const data = dataPedida || (await datasDisponiveisCargas())[0] || null;
  const rota = (d) => (aba === 'resumo' ? `#/cargas/resumo/${d}` : `#/cargas/${aba}/${d}`);
  const topo = await topoCargas(aba, data, aba === 'resumo' ? 'Resumo' : V.E({ NORTE: 'CB Norte', SUL: 'CB Sul' }[aba]));
  const x = data ? await resultadoCargas(data) : null;
  if (!x) {
    const msg = rascunhoCargas() ? 'Ainda não há Consulta BI importada para esta data.' : 'As cargas em aberto ainda não foram publicadas.';
    html(`${topo}<div class="aviso">${msg}</div>${rascunhoCargas() ? '<p><a class="btn" href="#/cargas/importar">Importar Consulta BI</a></p>' : ''}`);
  } else if (aba === 'resumo') {
    html(V.paginaCargasResumo(x.resultado, { data, topo, admin: adminNaTela() }));
  } else {
    html(V.paginaCargasRevenda(x.resultado.revendas[aba], { data, topo, admin: rascunhoCargas() }));
  }
  await atualizarStatus(x?.em || null);
  ligarTopo(rota);
}

async function telaCargasImportar() {
  const topo = await topoCargas('importar', null, 'Importar Consulta BI', false);
  const hist = historicoKM(await D.ultimasImportacoes('cargas'), 'Cargas em aberto');
  html(`${topo}<p class="sub">Export da <b>Consulta BI</b> de vendas sem acerto (colunas Revenda, Cli (Cód), Cli Razão Social, Data_Acerto, Data Emissão, Venda Caixa Unitária). O nome do arquivo pode ser o código que o BI gera.
O arquivo é lido neste navegador. A razão social fica só na área administrativa; os leitores veem o código do cliente.</p>
<div class="modelo-box"><label>ARQUIVO DA CONSULTA BI (.XLSX)<br><input type="file" id="arqCargas" accept=".xlsx,.xls"></label>
<label>DATA DA EXTRAÇÃO<br><input type="date" id="dataCargas" value="${hojeLocal()}"></label>
<button class="btn" id="importarCargas">IMPORTAR</button></div>
<p class="small">Os dias em aberto são contados até a data da extração. Ao escolher o arquivo, ela é preenchida com a data em que o arquivo foi salvo; confira antes de importar. Importar de novo a mesma data substitui a foto daquele dia.</p>
<div id="res"></div><h2>Últimas importações</h2><div id="hist">${hist}</div>`);
  const arq = document.getElementById('arqCargas'), dt = document.getElementById('dataCargas');
  arq.onchange = () => { const f = arq.files?.[0]; if (f?.lastModified) dt.value = new Date(f.lastModified - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  document.getElementById('importarCargas').onclick = async (e) => {
    const f = arq.files?.[0], out = document.getElementById('res'), data = dataP(dt.value);
    if (!f) { out.innerHTML = erro('Escolha o arquivo da Consulta BI.'); return; }
    if (!data) { out.innerHTML = erro('Informe a data da extração.'); return; }
    e.target.disabled = true; out.innerHTML = '<p class="small">Lendo o arquivo…</p>';
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false, cellFormula: false, cellStyles: false });
      if (!ehConsultaCargas(wb)) throw new Error('Este arquivo não parece ser a Consulta BI de cargas em aberto (faltam as colunas Data_Acerto e Venda Caixa Unitária).');
      const { linhas, ignoradas } = lerConsultaCargas(wb);
      const foto = montarFoto(linhas, data);
      if (foto.emissaoAte && foto.emissaoAte > data) throw new Error(`Há emissões depois da data da extração (${V.fdata(foto.emissaoAte)}). Confira a data.`);
      await D.gravarCargas(foto);
      const porRev = ['NORTE', 'SUL'].map((c) => {
        const ab = foto.abertas.filter((l) => l.rev === c);
        return `<tr><td class="t">${{ NORTE: 'CB Norte', SUL: 'CB Sul' }[c]}</td><td>${V.fi(ab.length)}</td><td>${V.fi(ab.reduce((s, l) => s + l.cxu, 0))}</td><td>${V.fi(foto.acertadas[c]?.qtd || 0)}</td></tr>`;
      }).join('');
      await D.registrarImportacao({ arquivo: f.name, tipo: 'consulta BI', linhas: linhas.length, periodo: `extração ${V.fdata(data)}/${data.slice(0, 4)}`, acompanhamento: 'cargas' });
      out.innerHTML = `<p class="st ok">✓ Foto de ${V.fdata(data)}/${data.slice(0, 4)} gravada: ${V.fi(linhas.length)} linhas lidas${ignoradas ? `, ${V.fi(ignoradas)} ignoradas (revenda ou emissão vazia)` : ''}.</p>
<div class="tw scroll"><table><thead><tr><th class="t">Revenda</th><th>Vendas em aberto</th><th>CX UNIT em aberto</th><th>Já acertadas</th></tr></thead><tbody>${porRev}</tbody></table></div>
<p><a class="btn sec" href="#/cargas/resumo/${data}">Conferir o resumo</a> <a class="btn" href="#/cargas/publicar/${data}">Publicar</a></p>`;
      document.getElementById('hist').innerHTML = historicoKM(await D.ultimasImportacoes('cargas'), 'Cargas em aberto');
    } catch (err) { out.innerHTML = erro(err); }
    e.target.disabled = false;
  };
}

async function telaCargasPublicar(dataPedida) {
  const data = dataPedida || (await D.datasCargas())[0] || null;
  const topo = await topoCargas('publicar', data, 'Publicar');
  const link = `${location.origin}${location.pathname}#/cargas/resumo`;
  if (!data) { html(`${topo}<div class="aviso">Importe uma Consulta BI antes de publicar.</div>`); return; }
  html(`${topo}<p>Publica a foto de ${V.fdata(data)}/${data.slice(0, 4)}: totais, faixas de dias e a lista por código de cliente. A razão social não é publicada.</p>
<p><a class="btn sec" href="#/cargas/resumo/${data}">Conferir antes</a> <button class="btn" id="pub">Publicar cargas em aberto de ${V.fdata(data)}</button> <span id="msg"></span></p>
<h2>Link para enviar por e-mail</h2><p class="small">Abre sempre a última foto publicada.</p><p><input type="text" readonly value="${V.E(link)}" class="campo-link"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => {
    e.target.disabled = true;
    try { await D.publicarCargas(data); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; }
    catch (err) { document.getElementById('msg').innerHTML = erro(err); }
    e.target.disabled = false;
  };
  ligarTopo((d) => `#/cargas/publicar/${d}`);
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
  if (adminNaTela()) return mesAtual();
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
      if (!adminNaTela()) return html('<p>Área restrita ao administrador.</p>');
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
      if (!adminNaTela()) return html('<p>Área restrita ao administrador.</p>');
      if (sub === 'digitacao') return await telaPESDigitacao(mesP(p[2]) || mesAtual());
      if (sub === 'publicar') return await telaPESPublicar(mesP(p[2]) || mesAtual());
      if (sub === 'exportar') return await telaPESExportar(mesP(p[2]) || mesAtual());
    }
    if (p[0] === 'km') {
      cabecalhoSite('KM planejado × realizado');
      const sub = p[1];
      if (!sub || sub === 'resumo') return await telaKMResumo(mesP(p[2]) || mesAtual());
      if (sub === 'exportar') {
        if (!adminNaTela()) return html('<p>Área restrita ao administrador.</p>');
        return await telaKMExportar(mesP(p[2]) || mesAtual());
      }
      if (['NORTE', 'SUL', 'CBAR', 'CCRT'].includes(sub)) return await telaKMUnidade(sub, mesP(p[2]) || mesAtual());
      if (!adminNaTela()) return html('<p>Área restrita ao administrador.</p>');
      if (sub === 'importar') return await telaKMImportar();
      if (sub === 'parametros') return await telaKMParametros(mesP(p[2]) || mesAtual());
      if (sub === 'publicar') return await telaKMPublicar(mesP(p[2]) || mesAtual());
      // Motoristas e revisão de rotas agora ficam na página de cada unidade.
      if (sub === 'motoristas' || sub === 'rotas') { location.replace(`#/km/${['NORTE', 'SUL', 'CBAR', 'CCRT'].includes(p[2]) ? p[2] : 'NORTE'}/${mesP(p[3]) || mesAtual()}`); return; }
    }
    if (p[0] === 'perdas') {
      cabecalhoSite('Perdas de estoque DLs');
      return await rotearPerdas(p, { html, erro, estado, adminNaTela, mesAtual, mesP, ligarTopo });
    }
    if (p[0] === 'retorno') {
      cabecalhoSite('Retorno por motivo');
      return await rotearRetorno(p, { html, erro, estado, adminNaTela, mesAtual, mesP, ligarTopo });
    }
    if (p[0] === 'transportes') {
      cabecalhoSite('Transportes 1x1');
      return await rotearTX(p, { html, erro, estado, adminNaTela, mesAtual, mesP, ligarTopo });
    }
    if (p[0] === 'fillrate') {
      cabecalhoSite('Fill rate');
      return await rotearFR(p, { html, erro, estado, adminNaTela, mesAtual, mesP, ligarTopo });
    }
    if (p[0] === 'cargas') {
      cabecalhoSite('Cargas em aberto');
      const sub = p[1] || 'resumo';
      if (sub === 'resumo' || sub === 'NORTE' || sub === 'SUL') return await telaCargas(sub, dataP(p[2]));
      if (!adminNaTela()) return html('<p>Área restrita ao administrador.</p>');
      if (sub === 'importar') return await telaCargasImportar();
      if (sub === 'publicar') return await telaCargasPublicar(dataP(p[2]));
    }
    if (p[0] === 'montadores') {
      cabecalhoSite('Montadores');
      if (!adminNaTela()) return html('<p>Área restrita ao administrador.</p>');
      const sub = p[1], mes = mesP(p[2]) || mesAtual();
      if (!sub || sub === 'resumo') { location.hash = `#/montadores/NORTE/${mes}`; return; }
      if (['NORTE','SUL','CBAR','CCRT'].includes(sub)) return await telaMontadoresUnidade(sub, mes);
      if (sub === 'importar') return await telaMontadoresImportar();
      if (sub === 'exportar') return await telaMontadoresExportar(mes);
    }
    cabecalhoSite('');
    if (!adminNaTela()) {
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
  estado.visualizarComoVisitante = false; estado.rotaAdminAntesDaVisita = null;
  estado.modo = estado.admin ? 'rascunho' : 'publicado';
  rotear();
});
