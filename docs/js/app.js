// Hub Logístico — app (rotas por hash, login, área do administrador).
import { auth } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import * as D from './dados.js';
import { lerArquivo, num } from './importar.js';
import * as V from './views.js';
import { diasDoMes } from './calc.js';

const $app = document.getElementById('app');
const estado = { user: null, admin: false, modo: 'rascunho' };  // admin pode alternar rascunho/publicado

const mesAtual = () => new Date().toISOString().slice(0, 7);
const html = (h) => { $app.innerHTML = h; };
const erro = (e) => `<div class="erro">${V.E(e?.message || e)}</div>`;

function nav(rota) {
  const it = [['#/', 'Início'], ['#/montagem', 'Montagem de cargas']];
  if (estado.admin) it.push(['#/importar', 'Importar'], ['#/parametros', 'Parâmetros'], ['#/publicar', 'Publicar'], ['#/acessos', 'Acessos']);
  document.getElementById('nav').innerHTML = estado.user
    ? it.map(([h, t]) => `<a class="${rota.startsWith(h.slice(1)) && (h !== '#/' || rota === '/') ? 'on' : ''}" href="${h}">${t}</a>`).join('') : '';
  document.getElementById('usuario').innerHTML = estado.user
    ? `${V.E(estado.user.email)} ${estado.admin ? '<span class="tag">admin</span>' : ''} · <a href="#" id="sair">sair</a>` : '';
  document.getElementById('sair')?.addEventListener('click', (e) => { e.preventDefault(); signOut(auth); });
}

// ---------------------------------------------------------------- dados da visualização
async function dadosDoMes(mes) {
  const ms = {}, mots = {}, info = {};
  for (const c of Object.keys(D.UNIDADES)) {
    if (estado.admin && estado.modo === 'rascunho') {
      const x = await D.calcularAoVivo(c, mes);
      ms[c] = x.resultado.dias.some((d) => d.cx_unit || d.entregas) ? x.resultado : null;
      mots[c] = x.motivos;
    } else {
      const p = await D.lerPublicado(c, mes);
      ms[c] = p?.resultado || null; mots[c] = p?.motivos || [];
      info[c] = p;
    }
  }
  return { ms, mots, info };
}

async function cabecalho(mes, rotaBase) {
  const meses = estado.admin ? await D.mesesComDados() : await D.mesesPublicados();
  if (!meses.includes(mes)) meses.unshift(mes);
  let h = V.seletorMes(meses, mes);
  if (estado.admin) {
    h += ` · <select id="selModo"><option value="rascunho" ${estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho (dados atuais)</option>`
      + `<option value="publicado" ${estado.modo === 'publicado' ? 'selected' : ''}>Publicado (o que os leitores veem)</option></select>`
      + (estado.modo === 'rascunho' ? ' <span class="badge">rascunho</span>' : ' <span class="badge pub">publicado</span>');
  }
  return { h, ligar: () => {
    document.getElementById('selMes')?.addEventListener('change', (e) => { location.hash = `${rotaBase}/${e.target.value}`; });
    document.getElementById('selModo')?.addEventListener('change', (e) => { estado.modo = e.target.value; rotear(); });
  } };
}

async function telaVisual(tipo, mes, centro) {
  html('<p class="small">Calculando…</p>');
  const base = tipo === 'detalhe' ? `#/montagem/${centro}` : tipo === 'inicio' ? '#/inicio' : '#/montagem';
  const cab = await cabecalho(mes, base);
  const { ms, mots, info } = await dadosDoMes(mes);
  const pub = Object.values(info).find((x) => x?.publicadoEm);
  const ctx = { mes, admin: estado.admin, cabecalho: cab.h + (pub ? ` <span class="small">· publicado em ${pub.publicadoEm.toLocaleString('pt-BR')}</span>` : '') };
  if (tipo === 'inicio') html(V.paginaInicio(ms, ctx));
  else if (tipo === 'montagem') html(V.paginaMontagem(ms, ctx));
  else if (!ms[centro]) html(`<p><a href="#/montagem/${mes}">← Montagem</a></p><p>Sem dados de ${V.E(D.UNIDADES[centro].nome)} em ${V.nomeMes(mes)}.</p>${cab.h}`);
  else html(V.paginaDetalhe(centro, ms[centro], mots[centro], ctx));
  cab.ligar();
}

// ---------------------------------------------------------------- administrador
async function telaImportar() {
  const ult = await D.ultimasImportacoes();
  const hist = ult.map((r) => `<tr><td class="t">${r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : ''}</td><td class="t">${V.E(r.arquivo)}</td>
<td class="t">${V.E(r.tipo)}</td><td class="t">${V.E(r.centro || '')}</td><td>${r.linhas ?? ''}</td><td class="t">${V.E(r.periodo || '')}</td><td class="t">${V.E(r.por || '')}</td></tr>`).join('');
  html(`<h1>Importar planilhas</h1>
<p class="sub">Arraste os arquivos do dia: VOLUMES DE VENDAS/RETORNOS (Barreiras), ZSD0092/ZSD0090 (Juazeiro) e os 2 Resumos de Planejamento.
Para o histórico, as planilhas antigas "MM - Montagem de Cargas" e "Reprogramação DL's" (primeiro as de Montagem). Os arquivos são lidos neste navegador; só números e códigos vão para o banco.</p>
<div class="aviso">Resumo de Planejamento: salve sem habilitar a edição, para não recalcular a data (C8). Confira abaixo a data detectada.</div>
<div class="drop" id="drop"><p>Arraste aqui ou</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div>
<div id="res"></div>
<h2>Últimas importações</h2><div class="tw"><table><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Centro</th><th>Linhas</th><th class="t">Período / data</th><th class="t">Por</th></tr>${hist}</table></div>`);
  const drop = document.getElementById('drop');
  const processar = async (files) => {
    const out = document.getElementById('res');
    const ordem = [...files].sort((a, b) => (/montagem de cargas/i.test(b.name) - /montagem de cargas/i.test(a.name)) || (/reprograma/i.test(b.name) - /reprograma/i.test(a.name)));
    let linhasRes = '';
    for (const f of ordem) {
      out.innerHTML = `<p class="small">Lendo ${V.E(f.name)}…</p><div class="tw"><table>${linhasRes}</table></div>`;
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
          await D.gravarVenda(x.venda);
          await D.gravarRetorno(x.retorno);
          await D.gravarPlan(x.plan, 'legado');
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
    out.innerHTML = `<h2>Resultado</h2><div class="tw"><table><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Centro</th><th>Linhas</th><th class="t">Período / data</th></tr>${linhasRes}</table></div>
<p><a class="btn" href="#/montagem">Ver rascunho</a> <a class="btn sec" href="#/publicar">Publicar</a></p>`;
  };
  document.getElementById('arqs').addEventListener('change', (e) => processar(e.target.files));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); });
}

const valTxt = (v) => (v == null ? '' : String(+v.toPrecision(12)).replace('.', ','));
const lerCampo = (s) => (s.trim() === '' ? null : num(s));

async function telaParametros(mes) {
  const cs = Object.keys(D.UNIDADES);
  const pars = Object.fromEntries(await Promise.all(cs.map(async (c) => [c, await D.lerParametros(c, mes)])));
  const linhas = Object.entries(D.PARAMETROS).map(([k, [rot, pad]]) => `<tr><td class="t">${V.E(rot)}</td>${cs.map((c) => {
    const o = pars[c].origem[k];
    return `<td><input type="text" inputmode="decimal" data-c="${c}" data-k="${k}" value="${valTxt(pars[c].valores[k])}"> ${o ? `<span class="tag">${o}</span>` : pad != null ? `<span class="tag">padrão ${pad}</span>` : ''}</td>`;
  }).join('')}</tr>`).join('');
  const meses = await D.mesesComDados();
  html(`<h1>Parâmetros do mês — ${V.nomeMes(mes)}</h1><p class="sub">${V.seletorMes(meses.includes(mes) ? meses : [mes, ...meses], mes)} · valores digitados à mão (antes no RESUMO). Vírgula ou ponto como decimal; vazio apaga.</p>
<div class="tw"><table><tr><th class="t">Parâmetro</th>${cs.map((c) => `<th>${V.E(D.UNIDADES[c].nome)}</th>`).join('')}</tr>${linhas}</table></div>
<p><button class="btn" id="salvar">Salvar</button> <span id="msg"></span></p>`);
  document.getElementById('selMes').addEventListener('change', (e) => { location.hash = `#/parametros/${e.target.value}`; });
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

const CAMPOS_PLAN = [['entregas', 'Entregas plan'], ['cargas', 'Cargas'], ['ocupacao', 'Tx ocupação (0,xx)'], ['reprog_uc', 'Vol reprog (cx unit)'],
  ['reprog_cli', 'Qtd cli reprog'], ['uc_total', 'UC total (Reprog DL)'], ['reprog_so_cubos', 'Cubos REPROG'], ['reprog_so_cli', 'Cli REPROG']];

async function telaPlanejamento(centro, mes) {
  const plan = await D.lerPlanMes(centro, mes);
  const linhas = diasDoMes(mes).map((d) => `<tr><td>${V.fdata(d)}</td>${CAMPOS_PLAN.map(([k]) =>
    `<td><input type="text" inputmode="decimal" data-d="${d}" data-k="${k}" value="${valTxt(plan[d]?.[k])}"></td>`).join('')}<td class="t small">${plan[d]?.origem || ''}</td></tr>`).join('');
  html(`<p><a href="#/montagem/${centro}/${mes}">← Detalhe</a></p><h1>Planejamento — ${V.E(D.UNIDADES[centro].nome)} — ${V.nomeMes(mes)}</h1>
<p class="sub">Normalmente vem do Resumo de Planejamento. Edite só para corrigir ou preencher um dia sem Resumo (o dia passa a ter origem "manual").</p>
<div class="tw"><table><tr><th class="t">Dia</th>${CAMPOS_PLAN.map(([, n]) => `<th>${n}</th>`).join('')}<th class="t">Origem</th></tr>${linhas}</table></div>
<p><button class="btn" id="salvar">Salvar</button> <span id="msg"></span></p>`);
  document.getElementById('salvar').addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    const porDia = {};
    document.querySelectorAll('input[data-d]').forEach((i) => {
      const novo = lerCampo(i.value), velho = plan[i.dataset.d]?.[i.dataset.k] ?? null;
      if (novo !== velho && !(novo != null && velho != null && Math.abs(novo - velho) <= 1e-9 * Math.max(1, Math.abs(novo)))) {
        (porDia[i.dataset.d] ??= {})[i.dataset.k] = novo;
      }
    });
    try {
      await D.salvarPlanManual(centro, mes, porDia);
      document.getElementById('msg').innerHTML = `<span class="st ok">✓ ${Object.keys(porDia).length} dia(s) salvos</span>`;
    } catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    ev.target.disabled = false;
  });
}

async function telaPublicar(mes) {
  const meses = await D.mesesComDados();
  html(`<h1>Publicar</h1><p class="sub">${V.seletorMes(meses.includes(mes) ? meses : [mes, ...meses], mes)}</p>
<p>Publicar grava uma foto dos números calculados agora (rascunho). Os leitores só veem a última publicação.</p>
<p><a class="btn sec" href="#/montagem/${mes}">Conferir rascunho antes</a> <button class="btn" id="pub">Publicar ${V.nomeMes(mes)}</button> <span id="msg"></span></p>`);
  document.getElementById('selMes').addEventListener('change', (e) => { location.hash = `#/publicar/${e.target.value}`; });
  document.getElementById('pub').addEventListener('click', async (ev) => {
    ev.target.disabled = true;
    try { await D.publicar(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; }
    catch (e) { document.getElementById('msg').innerHTML = erro(e); }
    ev.target.disabled = false;
  });
}

async function telaAcessos() {
  const lista = await D.lerLeitores();
  html(`<h1>Acessos</h1><p class="sub">E-mails que podem ver o que foi publicado (um por linha). A pessoa cria a conta em "Criar conta" na tela de login com esse e-mail.
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
function telaLogin(msg = '') {
  nav('');
  html(`<div class="login card"><h1>Entrar</h1>${msg}
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
async function rotear() {
  if (!estado.user) return telaLogin();
  const rota = location.hash.replace(/^#/, '') || '/';
  nav(rota);
  const p = rota.split('/').filter(Boolean);
  const mesP = (s) => (/^\d{4}-\d{2}$/.test(s || '') ? s : null);
  try {
    if (p.length === 0 || p[0] === 'inicio') return await telaVisual('inicio', mesP(p[1]) || mesAtual());
    if (p[0] === 'montagem' && D.UNIDADES[p[1]]) return await telaVisual('detalhe', mesP(p[2]) || mesAtual(), p[1]);
    if (p[0] === 'montagem') return await telaVisual('montagem', mesP(p[1]) || mesAtual());
    if (!estado.admin) return html('<p>Área restrita ao administrador.</p>');
    if (p[0] === 'importar') return await telaImportar();
    if (p[0] === 'parametros') return await telaParametros(mesP(p[1]) || mesAtual());
    if (p[0] === 'planejamento' && D.UNIDADES[p[1]]) return await telaPlanejamento(p[1], mesP(p[2]) || mesAtual());
    if (p[0] === 'publicar') return await telaPublicar(mesP(p[1]) || mesAtual());
    if (p[0] === 'acessos') return await telaAcessos();
    html('<p>Página não encontrada. <a href="#/">Início</a></p>');
  } catch (e) {
    const semPermissao = /permission/i.test(e?.message || '');
    html(semPermissao
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
