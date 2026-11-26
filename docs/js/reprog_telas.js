// Telas do REPROG (DAs), como a aba Resumo da planilha "CB NORTE/SUL - REPROGRAMAÇÃO": uma aba por revenda com
// o quadro por supervisor (SUP · SUPERVISOR · CLI REPRO) e a lista de clientes reprogramados do dia (código, razão social,
// cidade, vendedor, supervisor, dia de rota e DIAS REPROGRAMADOS, com o farol da planilha: 1 amarelo, 2 ou mais vermelho).
// Admin (rascunho): também pedidos, itens e valor do dia, o detalhe de cada cliente e ✎ Editar dias, com o número do
// dia anterior que foi feito ao lado de cada cliente. Leitores: só códigos (sem nomes), cidade, dia de rota e dias.
// As funções pagina* são puras (dados → HTML) e servem à prévia local; as tela* usam o Firestore e o contexto do app.
import { E, fi, fd } from './views.js?v=20261126-11';
import { REVENDAS_RP, EMPRESA_RP, fdataRP, resumoRP, farolRP, lerDiasRP, lerTxtRP, ehTxtRP, lerPlanilhaRP, revendaPeloCadastroRP } from './reprog.js?v=20261126-11';
import { baixarReprogRP } from './exportar_reprog.js?v=20261126-11';
import * as P from './dados_reprog.js?v=20261126-11';
import * as D from './dados.js?v=20261126-11';

const fr2 = (v) => (v == null ? '' : `R$ ${fd(v, 2)}`);

export function abasRP(ativa, dia, admin) {
  const a = Object.keys(REVENDAS_RP).map((u) => [u, REVENDAS_RP[u], `#/reprog/${u}${dia ? `/${dia}` : ''}`]);
  const adm = admin ? [['importar', 'Importar', '#/reprog/importar'], ['publicar', 'Publicar', `#/reprog/publicar${dia ? `/${dia}` : ''}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${E(t)}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// ---------------------------------------------------------------- quadro por supervisor (E2:G9 da planilha)
function quadroSup(u, r, admin) {
  const linhas = r.quadro.map((s) => `<tr><td>${E(s.sup)}</td>${admin ? `<td class="t">${E(s.nome || (s.sup === '—' ? 'sem cadastro' : ''))}</td>` : ''}<td>${fi(s.n)}</td></tr>`).join('');
  return `<div class="tw"><table class="rp-sup"><thead><tr><th>SUP</th>${admin ? '<th class="t">SUPERVISOR</th>' : ''}<th>CLI REPRO</th></tr></thead>`
    + `<tbody>${linhas}</tbody><tfoot><tr><td></td>${admin ? `<td class="t"><b>${E(REVENDAS_RP[u])}</b></td>` : ''}<td><b>${fi(r.linhas.length)}</b></td></tr></tfoot></table></div>`;
}

function indicadores(r, anterior) {
  const t = r.tot;
  return `<div class="tw"><table class="rp-sup"><tbody>
<tr><td class="t">Clientes reprogramados</td><td>${fi(t.clientes)}</td></tr>
<tr><td class="t">Pedidos</td><td>${fi(t.pedidos)}</td></tr>
<tr><td class="t">Itens</td><td>${fi(t.itens)}</td></tr>
<tr><td class="t">Valor dos pedidos</td><td>${fr2(t.valor)}</td></tr>
<tr><td class="t">DIAS REPROGRAMADOS digitados</td><td>${fi(r.digitados)} de ${fi(t.clientes)}</td></tr>
<tr><td class="t">Dia anterior para conferir</td><td>${anterior ? fdataRP(anterior.dia) : '—'}</td></tr>
${r.semCadastro ? `<tr><td class="t">Clientes sem cadastro (importe a BASE ATUALIZADA)</td><td class="c-mid">${fi(r.semCadastro)}</td></tr>` : ''}
</tbody></table></div>`;
}

// ---------------------------------------------------------------- lista de clientes (B11:J da planilha)
function lista(r, { admin, editar, anterior }) {
  const cabAnt = anterior ? `DIA ANTERIOR (${fdataRP(anterior.dia).slice(0, 5)})` : 'DIA ANTERIOR';
  // Colunas: [cabeçalho, texto?, célula(l)]. Na ordem da planilha; editando, DIAS e DIA ANTERIOR vêm logo depois do código.
  const COL = {
    cod: ['CÓD CLIENTE', false, (l) => `<td>${admin ? `<button class="rp-cli" data-det="${E(l.cli)}" title="Ver os pedidos do dia">${E(l.cli)}</button>` : E(l.cli)}</td>`],
    razao: ['RAZÃO SOCIAL', true, (l) => `<td class="t">${l.semCadastro ? `<span class="tag">sem cadastro</span> ${E(l.nomeRel)}` : E(l.razao)}</td>`],
    cidade: ['CIDADE', true, (l) => `<td class="t">${E(l.cidade)}</td>`],
    vend: ['VEND', false, (l) => `<td>${E(l.vend)}</td>`],
    vendNome: ['VENDEDOR', true, (l) => `<td class="t">${E(l.vendNome)}</td>`],
    sup: ['SUP', false, (l) => `<td>${E(l.sup)}</td>`],
    supNome: ['SUPERVISOR', true, (l) => `<td class="t">${E(l.supNome)}</td>`],
    pasta: ['DIA DE ROTA', true, (l) => `<td class="t">${E(l.pasta)}</td>`],
    dias: ['DIAS REPROGRAMADOS', false, (l) => (editar
      ? `<td class="rp-ed"><input type="text" inputmode="numeric" value="${l.dias ?? ''}" data-ini="${l.dias ?? ''}" data-cli="${E(l.cli)}" aria-label="Dias reprogramados de ${E(l.cli)}"></td>`
      : `<td class="${farolRP(l.dias)}">${l.dias ?? ''}</td>`)],
    ant: [cabAnt, false, (l) => `<td class="rp-ant ${editar ? '' : farolRP(l.anterior)}">${l.anterior ?? '—'}</td>`],
    ped: ['PEDIDOS', false, (l) => `<td>${l.ped == null ? '' : fi(l.ped)}</td>`],
    itens: ['ITENS', false, (l) => `<td>${l.itens == null ? '' : fi(l.itens)}</td>`],
    valor: ['VALOR (R$)', false, (l) => `<td>${l.valor == null ? '' : fd(l.valor, 2)}</td>`],
  };
  const ordem = !admin ? ['cod', 'cidade', 'vend', 'sup', 'pasta', 'dias']
    : editar ? ['cod', 'dias', 'ant', 'razao', 'cidade', 'vend', 'vendNome', 'sup', 'supNome', 'pasta', 'ped', 'itens', 'valor']
      : ['cod', 'razao', 'cidade', 'vend', 'vendNome', 'sup', 'supNome', 'pasta', 'dias'];   // igual à planilha (B:J)
  const th = ordem.map((k) => `<th${COL[k][1] ? ' class="t"' : ''}>${E(COL[k][0])}</th>`).join('');
  const linhas = r.linhas.map((l) => {
    const busca = E([l.cli, l.razao, l.nomeRel, l.cidade, l.vend, l.vendNome, l.sup, l.supNome].join(' ').toUpperCase());
    return `<tr data-busca="${busca}" data-sup="${E(l.sup || '—')}">${ordem.map((k) => COL[k][2](l)).join('')}</tr>`;
  }).join('');
  const sups = [...new Set(r.linhas.map((l) => l.sup || '—'))].sort((a, b) => (+a || 1e9) - (+b || 1e9));
  const filtros = `<div class="filtros-tx"><label>Buscar <input type="text" id="rpBusca" placeholder="código, nome, cidade, vendedor"></label>`
    + `<label>Supervisor <select id="rpSup"><option value="">todos</option>${sups.map((s) => `<option value="${E(s)}">${E(s)}</option>`).join('')}</select></label><span id="rpConta" class="small"></span></div>`;
  return `${filtros}<div class="tw rp-lista"><table id="rpTabela"><thead><tr>${th}</tr></thead><tbody>${linhas}</tbody></table></div>`;
}

// Página de uma revenda num dia. x = dia (lerDiaRP) ou publicado (lerPublicadoRP, com publicado: true).
export function paginaRevendaRP(u, x, { dia, base, anterior, admin, editar = false, topo, publicado = false }) {
  const r = publicado ? { linhas: x.linhas, quadro: x.quadro, digitados: x.linhas.filter((l) => l.dias != null).length, semCadastro: 0, tot: { clientes: x.linhas.length } } : resumoRP(x, base, anterior);
  const vazio = !r.linhas.length;
  const botoes = admin
    ? `<p class="gv-botoes"><button class="btn" id="exportarRP" ${vazio ? 'disabled' : ''}>⬇ Exportar planilha (.xlsx)</button> ${editar
      ? '<button class="btn" id="gravarRP">Gravar dias</button> <button class="btn sec" id="cancelarRP">Cancelar</button>'
      : `<button class="btn sec" id="editarRP" ${vazio ? 'disabled' : ''}>✎ Editar dias</button>`} <span id="msgRP" class="small"></span></p>` : '';
  const avisos = [];
  if (admin && !base) avisos.push(`Sem o cadastro de clientes de ${E(REVENDAS_RP[u])}: importe a BASE ATUALIZADA em <a href="#/reprog/importar">⚙ Importar</a> para ter razão social, vendedor, supervisor e dia de rota.`);
  if (admin && editar) avisos.push(`Digite os DIAS REPROGRAMADOS de cada cliente. Ao lado está o número do dia anterior que foi feito${anterior ? ` (${fdataRP(anterior.dia)})` : ' (nenhum ainda)'}. Vazio = não digitado. Enter vai para o próximo cliente.`);
  const titulo = `<section class="bloco"><div class="faixa">${E(EMPRESA_RP)} - ${E(REVENDAS_RP[u])} · CLIENTES REPROGRAMADOS · ${E(fdataRP(dia))}</div><div class="corpo">`
    + `<div class="g2 rp-lado">${quadroSup(u, r, admin)}${admin && editar ? indicadores(r, anterior) : ''}</div></div></section>`;
  const nota = admin && editar
    ? '<p class="small">Para preencher vários de uma vez: digite o dia no primeiro cliente: os clientes vazios abaixo dele recebem o mesmo número (respeita a busca e o filtro de supervisor). A lista está na ordem do dia anterior; ela se reordena depois de gravar.</p>'
    : admin ? '<p class="small">Como a aba Resumo da planilha. Clique no código para ver os pedidos e os produtos do dia. Farol: 1 dia amarelo, 2 ou mais vermelho.</p>'
      : '<p class="small">Clientes com pedido reprogramado no dia. Farol: 1 dia amarelo, 2 ou mais vermelho.</p>';
  return `${topo}${botoes}${avisos.map((a) => `<div class="aviso">${a}</div>`).join('')}${vazio ? `<div class="aviso">Sem clientes reprogramados de ${E(REVENDAS_RP[u])} em ${E(fdataRP(dia))}.</div>` : ''}${titulo}${nota}${vazio ? '' : lista(r, { admin, editar, anterior })}`;
}

// Detalhe de um cliente: os pedidos do dia e os produtos.
export function detalheClienteRP(x, cli) {
  const peds = (x?.pedidos || []).filter((p) => p[1] === cli);
  if (!peds.length) return '<p class="small">Sem os pedidos deste dia (a planilha antiga não traz os pedidos).</p>';
  return peds.map(([ped, , total, itens]) => `<p class="small"><b>Pedido ${E(ped)}</b> · ${fi(itens.length)} item(ns) · ${fr2(total)}</p>`
    + `<div class="tw"><table class="rp-itens"><thead><tr><th>REDUZ.</th><th class="t">DESCRIÇÃO PRODUTO</th><th>QUANT</th><th>VLR TOTAL</th></tr></thead><tbody>`
    + itens.map(([cod, q, vt]) => `<tr><td>${E(cod)}</td><td class="t">${E(x.prod?.[cod] || '')}</td><td>${fi(q)}</td><td>${fd(vt, 2)}</td></tr>`).join('') + '</tbody></table></div>').join('');
}

// Filtros, detalhe e edição. salvar(edicoes {cli: n|null}) → Promise; depois(editar) redesenha.
export function ligarPaginaRP(raiz, x, { salvar, depois, editar }) {
  const tab = raiz.querySelector('#rpTabela');
  const busca = raiz.querySelector('#rpBusca'), selSup = raiz.querySelector('#rpSup'), conta = raiz.querySelector('#rpConta');
  const filtrar = () => {
    if (!tab) return;
    const t = (busca?.value || '').trim().toUpperCase(), s = selSup?.value || '';
    let n = 0;
    for (const tr of tab.tBodies[0].rows) {
      if (tr.classList.contains('rp-det')) { tr.hidden = tr.previousElementSibling?.hidden ?? false; continue; }
      const ok = (!t || tr.dataset.busca.includes(t)) && (!s || tr.dataset.sup === s);
      tr.hidden = !ok; if (ok) n++;
    }
    if (conta) conta.textContent = `${fi(n)} cliente(s)`;
  };
  busca?.addEventListener('input', filtrar); selSup?.addEventListener('change', filtrar); filtrar();
  tab?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-det]');
    if (!b) return;
    const tr = b.closest('tr'), prox = tr.nextElementSibling;
    if (prox?.classList.contains('rp-det')) { prox.remove(); return; }
    const det = document.createElement('tr'); det.className = 'rp-det';
    det.innerHTML = `<td colspan="${tr.cells.length}">${detalheClienteRP(x, b.dataset.det)}</td>`;
    tr.after(det);
  });
  const msg = raiz.querySelector('#msgRP');
  const be = raiz.querySelector('#editarRP');
  if (be) be.onclick = () => depois(true);
  const nao = raiz.querySelector('#cancelarRP');
  if (nao) nao.onclick = () => depois(false);
  if (!editar) return;
  const campos = [...raiz.querySelectorAll('.rp-ed input')];
  const marcar = (inp) => inp.classList.toggle('alt', inp.value.trim() !== inp.dataset.ini);
  campos.forEach((inp, i) => {
    inp.addEventListener('input', () => marcar(inp));
    // Ao confirmar um número: se o cliente preenchido mais próximo acima (ou abaixo) tem o MESMO número,
    // os vazios entre os dois recebem esse número (só os visíveis, respeitando busca e filtro).
    inp.addEventListener('change', () => {
      const v = inp.value.trim();
      if (!/^\d{1,4}$/.test(v)) return;
      const vis = campos.filter((c) => !c.closest('tr').hidden), k = vis.indexOf(inp);
      let n = 0;
      // Pedido do admin: o número digitado completa todos os clientes vazios abaixo (os já preenchidos não mudam).
      for (let t = k + 1; t < vis.length; t++) {
        if (vis[t].value.trim()) continue;
        vis[t].value = v; marcar(vis[t]); n++;
      }
      for (const passo of [-1, 1]) {
        let j = k + passo;
        while (j >= 0 && j < vis.length && !vis[j].value.trim()) j += passo;
        if (j < 0 || j >= vis.length || vis[j].value.trim() !== v || Math.abs(j - k) < 2) continue;
        for (let t = Math.min(j, k) + 1; t < Math.max(j, k); t++) { vis[t].value = v; marcar(vis[t]); n++; }
      }
      if (n) msg.textContent = `✓ ${fi(n)} cliente(s) vazio(s) completado(s) com ${v}. Confira e clique em Gravar dias.`;
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const prox = campos.slice(i + 1).find((c) => !c.closest('tr').hidden);
      if (prox) { prox.focus(); prox.select(); }
    });
  });
  campos.find((c) => !c.closest('tr').hidden)?.focus();
  const ok = raiz.querySelector('#gravarRP');
  ok.onclick = async () => {
    const ed = {};
    try {
      for (const inp of campos) if (inp.value.trim() !== inp.dataset.ini) ed[inp.dataset.cli] = lerDiasRP(inp.value);
    } catch (err) { msg.textContent = err.message; return; }
    if (!Object.keys(ed).length) { depois(false); return; }
    ok.disabled = true; msg.textContent = 'Gravando…';
    try { await salvar(ed); depois(false); } catch (err) { msg.textContent = err.message; ok.disabled = false; }
  };
}

// ---------------------------------------------------------------- telas (Firestore)
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
const diaP = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s : null);
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

async function diasDaTela(ctx, u) {
  if (ctx.adminNaTela()) return (await P.diasGravadosRP())[u] || [];
  return (await P.diasPublicadosRP())[u] || [];
}

async function topoRP(ctx, aba, dia, titulo, dias = null) {
  let sel = '';
  if (dias) {
    const lista = [...new Set([dia, ...dias])].filter(Boolean).sort().reverse();
    sel = `Dia: <select id="selMes">${lista.map((d) => `<option value="${d}" ${d === dia ? 'selected' : ''}>${fdataRP(d)}</option>`).join('')}</select>`;
    if (ctx.adminNaTela() && REVENDAS_RP[aba]) sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
  }
  return `<h1>REPROG (DAs)</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasRP(aba, dia, ctx.adminNaTela())}`;
}
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };

async function telaRevenda(ctx, u, dia, editar = false) {
  ctx.html('<p class="small">Lendo o REPROG…</p>');
  const adm = rascunho(ctx), dias = await diasDaTela(ctx, u);
  dia = dia || dias[0] || hoje();
  const topo = await topoRP(ctx, u, dia, `${REVENDAS_RP[u]} · ${fdataRP(dia)}`, dias);
  const rota = (d) => `#/reprog/${u}/${d}`;
  if (!adm) {
    const x = await P.lerPublicadoRP(u, dia);
    if (!x) { ctx.html(`${topo}<div class="aviso">O REPROG de ${E(REVENDAS_RP[u])} em ${E(fdataRP(dia))} ainda não foi publicado.</div>`); ctx.ligarTopo(rota); return; }
    ctx.html(paginaRevendaRP(u, x, { dia, admin: false, topo, publicado: true }));
    status(x.atualizado); ctx.ligarTopo(rota); ligarPaginaRP(document, x, {});
    return;
  }
  const [x, base, anterior] = await Promise.all([P.lerDiaRP(u, dia), P.lerBaseRP(u), P.diaAnteriorRP(u, dia)]);
  const d = x || { clientes: [], pedidos: [], prod: {}, dias: {} };
  ctx.html(paginaRevendaRP(u, d, { dia, base, anterior, admin: true, editar, topo }));
  status(x?.atualizado); ctx.ligarTopo(rota);
  ligarPaginaRP(document, d, { editar, salvar: (ed) => P.gravarDiasRP(u, dia, ed), depois: (e) => telaRevenda(ctx, u, dia, e) });
  const b = document.getElementById('exportarRP');
  if (b) b.onclick = async () => {
    const msg = document.getElementById('msgRP');
    b.disabled = true; msg.textContent = 'Montando a planilha…';
    try { await baixarReprogRP(u, dia, resumoRP(d, base, anterior)); msg.textContent = '✓ planilha gerada'; } catch (err) { msg.innerHTML = ctx.erro(err); }
    b.disabled = false;
  };
}

function historico(imps) {
  const q = (r) => (r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '');
  const l = imps.length ? imps.map((r) => `<tr><td class="t">${q(r)}</td><td class="t">${E(r.arquivo)}</td><td class="t">${E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${E(r.periodo || '')}</td><td class="t">${E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="t small">Ainda não há importações do REPROG.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Clientes</th><th class="t">Período</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

export const explicaImportarRP = `<p class="sub">Aceita (pode soltar vários de uma vez; a base é lida primeiro):</p><ul class="small">
<li><b>Relatório do ERP em TXT</b> (VDPDR007 "MOVIMENTO POR CLIENTE NO PERIODO"), um por revenda, todo dia. O dia vem do período do relatório. A revenda vem do cadastro (ou do nome do arquivo: "REPROG N.TXT" / "REPROG S.TXT"). Reimportar o mesmo dia substitui os pedidos e mantém os dias digitados.</li>
<li><b>BASE ATUALIZADA.xlsx</b> (abas NORTE e SUL): o cadastro de clientes (razão social, cidade, vendedor, supervisor, dia de rota). Importe sempre que mudar; vale a última.</li>
<li><b>Planilha antiga</b> "CB NORTE/SUL - REPROGRAMAÇÃO.xlsx": a lista e os DIAS REPROGRAMADOS do último dia (para o Hub mostrar o dia anterior), mais o cadastro da aba base.</li>
<li><b>"REPROGRAMAÇÃO DIA A DIA.xlsx"</b> (uma aba por dia): o histórico dos pedidos de cada dia (a revenda vem do cadastro). O dia vem da DT.EMI (a aba "10-10" tem 13/10).</li></ul>`;

async function telaImportar(ctx) {
  const topo = await topoRP(ctx, 'importar', null, 'Importar arquivos');
  ctx.html(`${topo}${explicaImportarRP}
<p><label>Dia do Resumo da planilha antiga: <input type="date" id="rpDiaResumo"></label> <span class="small">(vazio = a data em que o arquivo foi salvo)</span></p>
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou selecione</p><input type="file" id="arqs" multiple accept=".txt,.TXT,.xls,.xlsx,.xlsm"></div><div id="res"></div>
<h2>Últimas importações do REPROG</h2><div id="hist">${historico(await D.ultimasImportacoes('reprog'))}</div>`);
  const res = document.getElementById('res');
  const processar = async (files) => {
    let rows = '';
    const linha = (f, tipo, conteudo, ok = true) => { rows += `<tr><td class="t">${E(f)}</td><td class="t">${E(tipo)}</td><td class="t">${conteudo}</td><td class="st ${ok ? 'ok' : 'no'}">${ok ? 'Importado' : 'Erro'}</td></tr>`; };
    const lidos = [];
    for (const f of files) {
      res.innerHTML = `<p class="small">Lendo ${E(f.name)}…</p>`;
      try {
        const buf = await f.arrayBuffer();
        if (/\.txt$/i.test(f.name)) {
          const t = new TextDecoder('windows-1252').decode(buf);
          if (!ehTxtRP(t)) throw new Error('Não reconheci o TXT: esperava o relatório VDPDR007 (MOVIMENTO POR CLIENTE NO PERIODO).');
          lidos.push({ f, x: lerTxtRP(t, f.name) });
        } else {
          const x = lerPlanilhaRP(XLSX.read(buf, { type: 'array', cellDates: false }), f.name);
          if (!x.tipo) throw new Error('Não reconheci a planilha: esperava a BASE ATUALIZADA (abas NORTE/SUL), a planilha do Resumo ou a "dia a dia".');
          lidos.push({ f, x });
        }
      } catch (e) { linha(f.name, '', E(e.message), false); }
    }
    // Cadastros primeiro (a revenda dos TXT e da "dia a dia" sai deles).
    const ordem = (x) => (x.tipo === 'base' ? 0 : x.tipo === 'resumo' ? 1 : 2);
    lidos.sort((a, b) => ordem(a.x) - ordem(b.x));
    const bases = {};
    for (const u of Object.keys(REVENDAS_RP)) bases[u] = await P.lerBaseRP(u).catch(() => null);
    for (const { f, x } of lidos) {
      res.innerHTML = `<p class="small">Gravando ${E(f.name)}…</p>`;
      try {
        if (x.tipo === 'base' || (x.tipo === 'resumo' && Object.keys(x.bases).length)) {
          for (const [u, b] of Object.entries(x.bases)) {
            const g = await P.gravarBaseRP(u, b, { arquivo: f.name, dataBase: x.dataBase });
            bases[u] = b;
            if (x.tipo === 'base') linha(f.name, 'Cadastro de clientes', `${E(REVENDAS_RP[u])}: ${fi(g.n)} clientes${x.dataBase ? ` · atualizado em ${fdataRP(x.dataBase)}` : ''}`);
          }
          P.esquecerBaseRP();
          if (x.tipo === 'base') { await D.registrarImportacao({ arquivo: f.name, tipo: 'Cadastro de clientes', linhas: Object.values(x.bases).reduce((a, b) => a + b.n, 0), periodo: x.dataBase || '', acompanhamento: 'reprog' }); continue; }
        }
        if (x.tipo === 'resumo') {
          if (!x.revenda) throw new Error('Não identifiquei a revenda (título "… - CB NORTE/CB SUL" na aba Resumo).');
          const v = document.getElementById('rpDiaResumo').value;
          const m = new Date(f.lastModified), dia = v || `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
          await P.gravarDiaRP(x.revenda, dia, null, { fonte: 'planilha antiga', arquivo: f.name, dias: x.dias, clientes: x.ordem });
          linha(f.name, 'Resumo antigo', `${E(REVENDAS_RP[x.revenda])} · ${fdataRP(dia)}: ${fi(x.ordem.length)} clientes, ${fi(Object.keys(x.dias).length)} com dias${Object.keys(x.bases).length ? ' · cadastro da aba base gravado' : ''}`);
          await D.registrarImportacao({ arquivo: f.name, tipo: 'Resumo antigo', linhas: x.ordem.length, periodo: dia, acompanhamento: 'reprog' });
        } else if (x.tipo === 'TXT VDPDR007') {
          const clis = [...new Set(x.pedidos.map((p) => p.cli))];
          const pelo = revendaPeloCadastroRP(clis, bases), u = pelo || x.revendaArq;
          if (!u) throw new Error('Não identifiquei a revenda: importe antes a BASE ATUALIZADA ou ponha N ou S no nome do arquivo ("REPROG N.TXT").');
          if (!x.dia) throw new Error('O relatório não tem o período (PERIODO DE …).');
          const g = await P.gravarDiaRP(u, x.dia, x.pedidos, { fonte: 'TXT', arquivo: f.name });
          const obs = [...x.avisos, pelo && x.revendaArq && pelo !== x.revendaArq ? `o nome do arquivo indica ${REVENDAS_RP[x.revendaArq]}, mas os clientes são de ${REVENDAS_RP[pelo]} (gravado em ${REVENDAS_RP[pelo]})` : ''].filter(Boolean);
          linha(f.name, 'Relatório VDPDR007', `${E(REVENDAS_RP[u])} · ${fdataRP(x.dia)}: ${fi(g.clientes)} clientes, ${fi(g.pedidos)} pedidos${obs.length ? ` · <span class="c-mid">${E(obs.join('; '))}</span>` : ''} · <a href="#/reprog/${u}/${x.dia}">abrir</a>`);
          await D.registrarImportacao({ arquivo: f.name, tipo: 'Relatório VDPDR007', linhas: g.clientes, periodo: x.dia, acompanhamento: 'reprog' });
        } else if (x.tipo === 'diaadia') {
          const clis = [...new Set(x.dias.flatMap((d) => d.pedidos.map((p) => p.cli)))];
          const u = revendaPeloCadastroRP(clis, bases);
          if (!u) throw new Error('Não identifiquei a revenda pelo cadastro: importe antes a BASE ATUALIZADA.');
          let n = 0;
          for (const d of x.dias) { res.innerHTML = `<p class="small">Gravando ${E(f.name)}: ${fdataRP(d.dia)} (${++n} de ${x.dias.length})…</p>`; await P.gravarDiaRP(u, d.dia, d.pedidos, { fonte: 'planilha dia a dia', arquivo: `${f.name} · aba ${d.aba}` }); }
          const per = x.dias.length ? `${fdataRP(x.dias[0].dia)} a ${fdataRP(x.dias.at(-1).dia)}` : '';
          linha(f.name, 'Dia a dia', `${E(REVENDAS_RP[u])}: ${fi(x.dias.length)} dias (${per})`);
          await D.registrarImportacao({ arquivo: f.name, tipo: 'Dia a dia', linhas: x.dias.length, periodo: per, acompanhamento: 'reprog' });
        }
      } catch (e) { linha(f.name, x.tipo || '', E(e.message), false); }
    }
    res.innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Conteúdo</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/reprog/NORTE">Conferir CB NORTE</a> <a class="btn sec" href="#/reprog/SUL">Conferir CB SUL</a></p>`;
    document.getElementById('hist').innerHTML = historico(await D.ultimasImportacoes('reprog'));
  };
  const drop = document.getElementById('drop');
  document.getElementById('arqs').onchange = (e) => processar([...e.target.files]);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar([...e.dataTransfer.files]); };
}

async function telaPublicar(ctx, dia) {
  const ind = await P.diasGravadosRP(), todos = [...new Set(Object.values(ind).flat())].sort().reverse();
  dia = dia || todos[0] || hoje();
  const topo = await topoRP(ctx, 'publicar', dia, `Publicar · ${fdataRP(dia)}`, todos);
  const link = `${location.origin}${location.pathname}#/reprog/NORTE`;
  const linhas = await Promise.all(Object.keys(REVENDAS_RP).map(async (u) => {
    const x = ind[u].includes(dia) ? await P.lerDiaRP(u, dia) : null;
    if (!x) return `<tr><td class="t">${E(REVENDAS_RP[u])}</td><td colspan="2" class="t small">sem dados neste dia</td></tr>`;
    const falta = x.clientes.filter((c) => x.dias[c.cli] == null).length;
    return `<tr><td class="t">${E(REVENDAS_RP[u])}</td><td>${fi(x.clientes.length)}</td><td class="${falta ? 'c-mid' : ''}">${falta ? `${fi(falta)} sem dias digitados` : 'todos com dias'}</td></tr>`;
  }));
  ctx.html(`${topo}<p>Publica o REPROG do dia das revendas que têm dados. Os leitores veem códigos, cidade, dia de rota e dias (sem nomes).</p>
<div class="tw"><table><thead><tr><th class="t">Revenda</th><th>Clientes</th><th class="t">Dias</th></tr></thead><tbody>${linhas.join('')}</tbody></table></div>
<p><a class="btn sec" href="#/reprog/NORTE/${dia}">Conferir antes</a> <button class="btn" id="pub">Publicar REPROG ${fdataRP(dia)}</button> <span id="msg"></span></p>
<h2>Link para enviar por e-mail</h2><p><input class="campo-link" type="text" readonly value="${E(link)}"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => {
    e.target.disabled = true;
    try {
      const out = [];
      for (const u of Object.keys(REVENDAS_RP)) if (ind[u].includes(dia)) { const r = await P.publicarRP(u, dia); out.push(`${REVENDAS_RP[u]} ${fi(r.clientes)} clientes`); }
      document.getElementById('msg').innerHTML = `<span class="st ok">✓ publicado: ${E(out.join(' · ') || 'nada')}</span>`;
    } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); }
    e.target.disabled = false;
  };
  ctx.ligarTopo((d) => `#/reprog/publicar/${d}`);
}

// p = partes da rota (#/reprog/<NORTE|SUL|importar|publicar>/<AAAA-MM-DD>). A aba CB NORTE é a que abre no link.
export async function rotearRP(p, ctx) {
  const sub = p[1], dia = diaP(p[2]);
  if (!sub) { location.replace('#/reprog/NORTE'); return; }
  if (REVENDAS_RP[sub]) return telaRevenda(ctx, sub, dia);
  if (!ctx.adminNaTela()) { location.replace('#/reprog/NORTE'); return; }
  if (sub === 'importar') return telaImportar(ctx);
  if (sub === 'publicar') return telaPublicar(ctx, dia);
  location.replace('#/reprog/NORTE');
}
