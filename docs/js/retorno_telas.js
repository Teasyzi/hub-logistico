// Telas do acompanhamento Retorno por motivo (CB Norte, CB Sul, DL Barreiras, DL Juazeiro). As funções pagina* são
// puras (dados → HTML) e servem à prévia local; as tela* usam o Firestore e o contexto do app (ctx).
import { E, fi, fd, fp, fdata, nomeMes, seletorMes } from './views.js?v=20261124-4';
import { UNIDADES_RET, DAS_RET, DLS_RET, lerArquivoRetorno, calcularRetorno } from './retorno.js?v=20261124-4';
import * as R from './dados_retorno.js?v=20261124-4';
import * as D from './dados.js?v=20261124-4';

const nf = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
const fcx = (x) => (x == null ? '–' : nf(1).format(x));
const frs = (x) => (x == null ? '–' : `R$ ${nf(2).format(x)}`);
const fp2 = (x) => fp(x, 2);
const tagObs = '<span class="tag" title="Motivo que já foi desconsiderado em algum mês. Conta no retorno; confira se é mesmo retorno da operação.">em observação</span>';
const tagCanc = '<span class="tag" title="Sai do retorno e do volume no % sem cancelamento.">fora do % s/ cancelamento</span>';

export function abasRetorno(ativa, mes, admin) {
  const a = [['resumo', 'Resumo', `#/retorno/resumo/${mes}`], ...Object.entries(UNIDADES_RET).map(([u, n]) => [u, n.toUpperCase(), `#/retorno/${u}/${mes}`])];
  const adm = admin ? [['importar', 'Importar', `#/retorno/importar/${mes}`], ['parametros', 'Parâmetros', `#/retorno/parametros/${mes}`], ['publicar', 'Publicar', `#/retorno/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// Avisos só para o admin.
function avisos(u, d, mes, detalhe = true) {
  const t = d.totais, it = [];
  if (!d.temDados) it.push(DLS_RET.includes(u) ? `Sem retorno Externo de ${E(d.nome)} em ${nomeMes(mes)}. Importe o VOLUMES DE RETORNOS / ZSD0090 na <a href="#/montagem/importar">Montagem</a>.`
    : `Sem o retorno por motivo do BI em ${nomeMes(mes)}. <a href="#/retorno/importar/${mes}">Importar</a>`);
  if (t.volume == null) it.push(DLS_RET.includes(u) ? 'Sem a venda do mês na Montagem: o % não é calculado. Importe a venda ou informe o volume em ⚙ Parâmetros.'
    : `Sem o volume (Saída cx unit) de ${E(d.nome)}: o % não é calculado. <a href="#/retorno/parametros/${mes}">Informar em ⚙ Parâmetros</a>`);
  if (DAS_RET.includes(u) && d.temDados && !d.motoristas) it.push('Sem o retorno por motorista (R$) do BI neste mês.');
  if (d.observacao.length) it.push(`<b>${fi(d.observacao.length)} motivo(s) em observação</b> (${d.observacao.map((m) => `${E(m.motivo)}: ${fcx(m.cx)} cx`).join('; ')}): já foram desconsiderados em algum mês. Pela regra atual contam no retorno.`);
  if (detalhe && d.linhasInterno) it.push(`${fi(d.linhasInterno)} linha(s) Interno (${fcx(d.cxInterno)} cx: cancelamento de notas, SEFAZ, trocas) ficam fora, como na planilha.`);
  return it.map((x) => `<div class="aviso">${x}</div>`).join('');
}

function cardUnidade(u, d, { mes, admin }) {
  if (!d || !d.temDados) return `<section class="bloco"><div class="faixa">${E(UNIDADES_RET[u])}</div><div class="corpo"><div class="aviso">Sem retorno de ${E(UNIDADES_RET[u])} em ${nomeMes(mes)}.</div>${admin ? avisos(u, d, mes) : ''}</div></section>`;
  const t = d.totais, top = d.motivos.filter((m) => !m.cancelamento).slice(0, 3);
  return `<section class="bloco km-card"><div class="faixa">${E(d.nome)} <a class="btn sec" href="#/retorno/${u}/${mes}">Detalhe →</a></div><div class="corpo">
<div class="km-disp"><div class="l">% retorno sem cancelamento de NF</div><div class="v">${fp2(t.pctSemCanc)}</div><div class="d">${fcx(t.semCanc)} cx unit de ${fcx(t.volSemCanc)}</div></div>
<table class="kv km-kv"><tbody>
<tr><td>Retorno total</td><td>${fcx(t.retorno)} cx · ${fp2(t.pctTotal)}</td></tr>
<tr><td>Cancelamento de NF</td><td>${fcx(t.cancelamento)} cx</td></tr>
<tr><td>Volume do mês</td><td>${fcx(t.volume)} cx unit</td></tr>
${t.totalRS != null ? `<tr><td>Retorno por motorista</td><td>${frs(t.totalRS)}</td></tr>` : ''}
<tr><td>Principais motivos</td><td>${top.map((m) => `${E(m.motivo)} (${fp(m.pctRetorno, 0)})`).join(' · ') || '–'}</td></tr>
</tbody></table>${admin ? avisos(u, d, mes, false) : ''}</div></section>`;
}

function tabelaEvolucao(evol) {
  if (!evol?.length) return '';
  const us = Object.keys(UNIDADES_RET);
  return `<h2>Evolução (meses publicados)</h2><div class="tw scroll"><table><thead><tr><th class="t" rowspan="2">Mês</th>${us.map((u) => `<th colspan="2">${E(UNIDADES_RET[u])}</th>`).join('')}</tr>
<tr>${us.map(() => '<th>% s/ canc.</th><th>% total</th>').join('')}</tr></thead><tbody>
${evol.map((x) => `<tr><td class="t">${nomeMes(x.mes)}</td>${us.map((u) => `<td>${fp2(x.unidades[u]?.pctSemCanc)}</td><td>${fp2(x.unidades[u]?.pctTotal)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export function paginaResumoRetorno(resultado, { mes, admin, topo, evolucao }) {
  const us = resultado.unidades || {};
  return `${topo}<div class="g2 km-cards">${Object.keys(UNIDADES_RET).map((u) => cardUnidade(u, us[u], { mes, admin })).join('')}</div>
<p class="small">% oficial (KPI e PES) = retorno sem o motivo CANCELAMENTO DE NF ÷ volume do mês sem esse mesmo retorno, em caixa unitária. DLs: só o retorno Externo do SAP e a venda da Montagem. DAs: retorno do BI e volume (Saída) informado.</p>${tabelaEvolucao(evolucao)}`;
}

export function paginaUnidadeRetorno(u, d, { mes, admin, topo }) {
  if (!d || !d.temDados) return `${topo}${admin && d ? avisos(u, d, mes) : `<div class="aviso">Sem retorno de ${E(UNIDADES_RET[u])} em ${nomeMes(mes)}.</div>`}`;
  const t = d.totais;
  const tiles = `<div class="tiles">
<div class="tile"><div class="l">% sem cancelamento de NF</div><div class="v">${fp2(t.pctSemCanc)}</div><div class="d">${fcx(t.semCanc)} cx unit</div></div>
<div class="tile"><div class="l">% total</div><div class="v">${fp2(t.pctTotal)}</div><div class="d">${fcx(t.retorno)} cx unit</div></div>
<div class="tile"><div class="l">Cancelamento de NF</div><div class="v">${fcx(t.cancelamento)}</div><div class="d">cx unit, fora do % oficial</div></div>
<div class="tile"><div class="l">Volume do mês</div><div class="v">${fcx(t.volume)}</div><div class="d">${E(d.origemVolume || 'sem volume')}</div></div>
${t.totalRS != null ? `<div class="tile"><div class="l">Retorno por motorista</div><div class="v">${frs(t.totalRS)}</div><div class="d">${fi(t.motoristas)} motoristas</div></div>` : ''}</div>`;
  const lin = (m) => `<tr${m.cancelamento ? ' class="pv"' : ''}><td class="t">${E(m.motivo)} ${m.cancelamento ? tagCanc : ''}${m.observacao ? tagObs : ''}</td><td>${fcx(m.cx)}</td><td>${fp(m.pctRetorno, 1)}</td><td>${fp(m.pctAcumulado, 1)}</td><td>${fp(m.pctVolume, 3)}</td></tr>`;
  const motivos = `<section class="bloco"><div class="faixa">Por motivo (cx unit)</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Motivo</th><th>Retorno</th><th>% do retorno s/ canc.</th><th>% acumulado</th><th>% do volume</th></tr></thead><tbody>
${d.motivos.map(lin).join('')}
<tr class="tot"><td class="t">Total retorno</td><td>${fcx(t.retorno)}</td><td></td><td></td><td>${fp(t.pctTotal, 3)}</td></tr>
<tr class="dest"><td class="t">Total retorno s/ cancelamento NF</td><td>${fcx(t.semCanc)}</td><td>100%</td><td></td><td>${fp(t.pctSemCanc, 3)}</td></tr>
</tbody></table></div>
<p class="small">Ordenado do maior para o menor (Pareto). O % do retorno e o acumulado não contam o cancelamento de NF. No % sem cancelamento, o cancelamento sai também do volume: ${fcx(t.volume)} − ${fcx(t.cancelamento)} = ${fcx(t.volSemCanc)} cx unit.</p></div></section>`;
  const motoristas = admin && d.motoristas?.length ? `<section class="bloco"><div class="faixa">Retorno por motorista (R$)</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Motorista</th><th>Dev (R$)</th><th>% do total</th></tr></thead><tbody>
${d.motoristas.map((m) => `<tr><td class="t">${E(m.nome)}</td><td>${frs(m.rs)}</td><td>${fp(m.pct, 1)}</td></tr>`).join('')}
<tr class="tot"><td class="t">Total</td><td>${frs(t.totalRS)}</td><td>100%</td></tr></tbody></table></div>
<p class="small">Só no rascunho do admin: os nomes não vão para a publicação. Em R$, como no BI (não se compara com a tabela de motivos, que é em cx unit).</p></div></section>` : '';
  const fonte = admin ? `<p class="small">${DLS_RET.includes(u) ? `Fonte: retorno Externo e venda da Montagem de Cargas (${fi(d.linhasExterno)} linhas de retorno${d.ultimoDia ? `, até ${fdata(d.ultimoDia)}` : ''}).` : `Fonte: ${E(d.arquivos?.motivos || 'arquivo do BI')}${d.arquivos?.motoristas && d.arquivos.motoristas !== d.arquivos.motivos ? ` e ${E(d.arquivos.motoristas)}` : ''}.`}</p>` : '';
  return `${topo}${tiles}${admin ? avisos(u, d, mes) : ''}${motivos}${motoristas}${fonte}`;
}

// ---------------------------------------------------------------- telas (Firestore)
async function topoRetorno(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? [ctx.mesAtual(), mes, ...(await R.mesesRetornoPublicados())] : await R.mesesRetornoPublicados());
    meses.add(mes);
    sel = seletorMes([...meses].sort().reverse(), mes);
    if (ctx.adminNaTela() && (aba === 'resumo' || UNIDADES_RET[aba])) {
      sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
    }
  }
  return `<h1>Retorno por motivo — ${E(titulo)}</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasRetorno(aba, mes, ctx.adminNaTela())}`;
}
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
async function resultado(ctx, mes) {
  if (rascunho(ctx)) return R.calcularRetornoAoVivo(mes);
  const x = await R.lerRetornoPublicado(mes);
  return { ...x, atualizado: x.publicadoEm };
}
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };

async function telaResumo(ctx, mes) {
  ctx.html('<p class="small">Calculando o retorno…</p>');
  const [topo, r, evolucao] = await Promise.all([topoRetorno(ctx, 'resumo', mes, nomeMes(mes)), resultado(ctx, mes), R.evolucaoRetorno()]);
  const vazio = !Object.values(r.unidades || {}).some((d) => d?.temDados);
  ctx.html(paginaResumoRetorno(r, { mes, admin: rascunho(ctx), topo, evolucao }) + (vazio && !rascunho(ctx) ? `<div class="aviso">O retorno de ${nomeMes(mes)} ainda não foi publicado.</div>` : ''));
  status(r.atualizado); ctx.ligarTopo((m) => `#/retorno/resumo/${m}`);
}

async function telaUnidade(ctx, u, mes) {
  ctx.html('<p class="small">Calculando o retorno…</p>');
  const topo = await topoRetorno(ctx, u, mes, `${UNIDADES_RET[u]} · ${nomeMes(mes)}`), r = await resultado(ctx, mes);
  ctx.html(paginaUnidadeRetorno(u, r.unidades?.[u], { mes, admin: rascunho(ctx), topo }));
  status(r.atualizado); ctx.ligarTopo((m) => `#/retorno/${u}/${m}`);
}

function historico(imps) {
  const q = (r) => r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '';
  const l = imps.length ? imps.map((r) => `<tr><td class="t">${q(r)}</td><td class="t">${E(r.arquivo)}</td><td class="t">${E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${E(r.periodo || '')}</td><td class="t">${E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="t small">Ainda não há importações do Retorno.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Linhas</th><th class="t">Mês</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

async function telaImportar(ctx, mes) {
  const topo = await topoRetorno(ctx, 'importar', mes, 'Importar arquivos', false);
  ctx.html(`${topo}<p class="sub">CB Norte e CB Sul: as duas exportações do BI (Revenda · Dev Motivo · Dev (Caixa Unitária) e Revenda · Motorista · Dev (R$)). Também aceita a planilha antiga "MM. Retorno - &lt;Mês&gt;.xlsx", para trazer o histórico. Os DLs não precisam de arquivo aqui: usam o retorno e a venda importados na <a href="#/montagem/importar">Montagem</a>.</p>
<div class="modelo-box"><label>Mês dos arquivos <input id="mesArq" type="month" value="${mes}"></label> <span class="small">os arquivos do BI não trazem a data: confira o mês antes de importar</span></div>
<div class="drop" id="drop"><p>Arraste os arquivos do BI aqui ou selecione</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div><div id="res"></div>
<p class="small">Reimportar substitui, no mês escolhido, os motivos (ou os motoristas) que o arquivo traz. O volume (Saída) dos DAs é digitado em ⚙ Parâmetros.</p>
<h2>Últimas importações do Retorno</h2><div id="hist">${historico(await D.ultimasImportacoes('retorno'))}</div>`);
  const processar = async (files) => {
    const mesArq = document.getElementById('mesArq').value;
    let rows = '';
    for (const f of files) {
      try {
        if (!/^\d{4}-\d{2}$/.test(mesArq)) throw new Error('Escolha o mês dos arquivos.');
        const x = lerArquivoRetorno(XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false }));
        if (!x.tipo) throw new Error('Não reconheci o arquivo: esperava a exportação do BI (Revenda, Dev Motivo, Dev (Caixa Unitária) ou Motorista, Dev (R$)) ou a planilha antiga de Retorno (abas CB NORTE / CB SUL).');
        const n = await R.gravarRetornoDA(mesArq, x.unidades, f.name);
        const resumo = Object.entries(x.unidades).map(([u, d]) => `${UNIDADES_RET[u]}: ${[d.motivos && `${fi(d.motivos.length)} motivos`, d.motoristas && `${fi(d.motoristas.length)} motoristas`, d.volume != null && `volume ${fcx(d.volume)}`].filter(Boolean).join(', ')}`).join(' · ');
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: n, periodo: mesArq, acompanhamento: 'retorno' });
        rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo)}</td><td class="t">${E(resumo)}${x.ignoradas.length ? ` · revenda(s) ignorada(s): ${E(x.ignoradas.join(', '))}` : ''}</td><td class="t">${nomeMes(mesArq)}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${E(f.name)}</td><td colspan="4" class="st no">${E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Conteúdo</th><th class="t">Mês</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/retorno/resumo/${mesArq}">Conferir rascunho</a></p>`;
    document.getElementById('hist').innerHTML = historico(await D.ultimasImportacoes('retorno'));
  };
  const drop = document.getElementById('drop');
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

async function telaParametros(ctx, mes) {
  const topo = await topoRetorno(ctx, 'parametros', mes, `Parâmetros · ${nomeMes(mes)}`);
  const x = await R.lerDadosRetorno(mes), r = calcularRetorno({ mes, dados: x.dados, parametros: {} });
  const campo = (u) => {
    const auto = r.unidades[u].totais.volume, dl = DLS_RET.includes(u);
    return `<section class="bloco"><div class="faixa">${E(UNIDADES_RET[u])}</div><div class="corpo"><div class="modelo-box">
<label>Volume do mês, cx unit ${dl ? '(vazio = venda da Montagem)' : '(Saída do BI)'}<br><input type="text" data-u="${u}" value="${x.parametros[u]?.volume ?? ''}" placeholder="${auto == null ? '' : E(fd(auto, 3))}"></label>
</div></div></section>`;
  };
  ctx.html(`${topo}<p class="sub">Volume em caixa unitária de cada unidade no mês. Nos DAs ele é obrigatório (os arquivos do BI não trazem a Saída). Nos DLs, deixe vazio para usar a venda importada na Montagem (o número em cinza).</p>
<div class="g2">${Object.keys(UNIDADES_RET).map(campo).join('')}</div><p><button class="btn" id="salvarPar">Salvar volumes</button> <span id="msgPar"></span></p>`);
  document.getElementById('salvarPar').onclick = async (e) => {
    e.target.disabled = true;
    try {
      const v = {};
      for (const i of document.querySelectorAll('input[data-u]')) {
        const s = i.value.trim();
        v[i.dataset.u] = s ? { volume: Number(s.replace(/\./g, '').replace(',', '.')) } : {};
        if (s && !Number.isFinite(v[i.dataset.u].volume)) throw new Error(`Volume inválido em ${UNIDADES_RET[i.dataset.u]}: ${s}`);
      }
      await R.gravarParametrosRetorno(mes, v);
      document.getElementById('msgPar').innerHTML = '<span class="st ok">✓ salvo</span>';
    } catch (err) { document.getElementById('msgPar').innerHTML = ctx.erro(err); }
    e.target.disabled = false;
  };
  ctx.ligarTopo((m) => `#/retorno/parametros/${m}`);
}

async function telaPublicar(ctx, mes) {
  const topo = await topoRetorno(ctx, 'publicar', mes, `Publicar · ${nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/retorno/resumo/${mes}`;
  ctx.html(`${topo}<p>Publica os totais e a tabela por motivo das 4 unidades. O retorno por motorista (nomes) fica só no rascunho.</p><p><a class="btn sec" href="#/retorno/resumo/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar retorno ${nomeMes(mes)}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input class="campo-link" type="text" readonly value="${E(link)}"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await R.publicarRetorno(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((m) => `#/retorno/publicar/${m}`);
}

// p = partes da rota (#/retorno/<sub>/<mes>)
export async function rotearRetorno(p, ctx) {
  const sub = p[1], mes = ctx.mesP(p[2]) || (ctx.adminNaTela() ? ctx.mesAtual() : (await R.mesesRetornoPublicados())[0] || ctx.mesAtual());
  if (!sub || sub === 'resumo') return telaResumo(ctx, mes);
  if (UNIDADES_RET[sub]) return telaUnidade(ctx, sub, mes);
  if (!ctx.adminNaTela()) return ctx.html('<p>Área restrita ao administrador.</p>');
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'parametros') return telaParametros(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  return telaResumo(ctx, mes);
}
