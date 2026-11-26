// Telas do acompanhamento Retorno por motivo (CB Norte, CB Sul, DL Barreiras, DL Juazeiro): uma aba por unidade,
// como na planilha (tabela de valores com o gráfico de barras ao lado). As funções pagina* são puras (dados → HTML)
// e servem à prévia local; as tela* usam o Firestore e o contexto do app (ctx).
import { E, fi, fd, fp, fdata, nomeMes, seletorMes, mesesAdmin } from './views.js?v=20261126-05';
import { UNIDADES_RET, DAS_RET, DLS_RET, lerArquivoRetorno, calcularRetorno } from './retorno.js?v=20261126-05';
import * as R from './dados_retorno.js?v=20261126-05';
import * as D from './dados.js?v=20261126-05';

const nf = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
const fcx = (x) => (x == null ? '–' : nf(1).format(x));
const frs = (x) => (x == null ? '–' : `R$ ${nf(2).format(x)}`);
const fp2 = (x) => fp(x, 2);
const UNIDADE_PADRAO = 'NORTE';
const tagObs = '<span class="tag" title="Motivo que já foi desconsiderado em algum mês. Conta no retorno; confira se é mesmo retorno da operação.">em observação</span>';
const tagCanc = '<span class="tag" title="Sai do retorno e do volume no % sem cancelamento.">fora do % s/ cancelamento</span>';

export function abasRetorno(ativa, mes, admin) {
  const a = Object.entries(UNIDADES_RET).map(([u, n]) => [u, n.toUpperCase(), `#/retorno/${u}/${mes}`]);
  const adm = admin ? [['importar', 'Importar', `#/retorno/importar/${mes}`], ['parametros', 'Parâmetros', `#/retorno/parametros/${mes}`], ['publicar', 'Publicar', `#/retorno/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// Barras horizontais, como os gráficos da planilha: rótulo à esquerda, valor no fim da barra.
// itens: [{rot, v, txt, canc}] na ordem da tabela.
export function graficoBarras(itens) {
  if (!itens.length) return '';
  const lin = 22, topo = 4, rotW = 200, barW = 280, w = rotW + barW + 80, h = topo * 2 + itens.length * lin;
  const max = Math.max(...itens.map((x) => x.v), 0) || 1;
  const corta = (s) => (s.length > 30 ? `${s.slice(0, 29)}…` : s);
  const barras = itens.map((x, i) => {
    const y = topo + i * lin, bw = Math.max(1, (Math.max(x.v, 0) / max) * barW);
    return `<text x="${rotW - 6}" y="${y + 15}" text-anchor="end">${E(corta(x.rot))}</text>`
      + `<rect class="ret-barra${x.canc ? ' canc' : ''}" x="${rotW}" y="${y + 4}" width="${bw.toFixed(1)}" height="${lin - 8}" rx="2"><title>${E(x.rot)}: ${E(x.txt)}</title></rect>`
      + `<text class="val" x="${(rotW + bw + 5).toFixed(1)}" y="${y + 15}">${E(x.txt)}</text>`;
  }).join('');
  return `<svg class="ret-grafico" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Gráfico de barras">${barras}<line x1="${rotW}" x2="${rotW}" y1="${topo}" y2="${h - topo}" stroke="var(--axis)"/></svg>`;
}

// Avisos só para o admin.
function avisos(u, d, mes) {
  const t = d.totais, it = [];
  if (!d.temDados) it.push(DLS_RET.includes(u) ? `Sem retorno Externo de ${E(d.nome)} em ${nomeMes(mes)}. Importe o VOLUMES DE RETORNOS / ZSD0090 na <a href="#/montagem/importar">Montagem</a>.`
    : `Sem o retorno por motivo do BI em ${nomeMes(mes)}. <a href="#/retorno/importar/${mes}">Importar</a>`);
  if (t.volume == null) it.push(DLS_RET.includes(u) ? 'Sem a venda do mês na Montagem: o % não é calculado. Importe a venda ou informe o volume em ⚙ Parâmetros.'
    : `Sem o volume (Saída em CX UNIT) de ${E(d.nome)}: o % não é calculado. <a href="#/retorno/parametros/${mes}">Informar em ⚙ Parâmetros</a>`);
  if (DAS_RET.includes(u) && d.temDados && !d.motoristas) it.push('Sem o retorno por motorista (R$) do BI neste mês.');
  if (d.observacao.length) it.push(`<b>${fi(d.observacao.length)} motivo(s) em observação</b> (${d.observacao.map((m) => `${E(m.motivo)}: ${fp(m.pctVolume, 3)}`).join('; ')}): já foram desconsiderados em algum mês. Pela regra atual contam no retorno.`);
  if (d.linhasInterno) it.push(`${fi(d.linhasInterno)} linha(s) Interno (${fcx(d.cxInterno)} CX UNIT: cancelamento de notas, SEFAZ, trocas) ficam fora, como na planilha.`);
  return it.map((x) => `<div class="aviso">${x}</div>`).join('');
}

export function paginaUnidadeRetorno(u, d, { mes, admin, topo }) {
  if (!d || !d.temDados) return `${topo}${admin && d ? avisos(u, d, mes) : `<div class="aviso">Sem retorno de ${E(UNIDADES_RET[u])} em ${nomeMes(mes)}.</div>`}`;
  const t = d.totais;
  const tiles = `<div class="tiles">
<div class="tile"><div class="l">% retorno total</div><div class="v">${fp2(t.pctTotal)}</div><div class="d">${fcx(t.retorno)} CX UNIT</div></div>
<div class="tile"><div class="l">% retorno sem cancelamento de NF</div><div class="v">${fp2(t.pctSemCanc)}</div><div class="d">${fcx(t.semCanc)} CX UNIT · % oficial</div></div>
<div class="tile"><div class="l">Volume do mês</div><div class="v">${fcx(t.volume)}</div><div class="d">CX UNIT · ${E(d.origemVolume || 'sem volume')}</div></div>
${t.totalRS != null ? `<div class="tile"><div class="l">Retorno por motorista</div><div class="v">${frs(t.totalRS)}</div><div class="d">${fi(t.motoristas)} motoristas</div></div>` : ''}</div>`;
  const lin = (m) => `<tr${m.cancelamento ? ' class="pv"' : ''}><td class="t">${E(m.motivo)} ${m.cancelamento ? tagCanc : ''}${m.observacao ? tagObs : ''}</td><td>${fcx(m.cx)}</td><td>${fp(m.pctVolume, 3)}</td></tr>`;
  const tabela = `<div class="tw scroll"><table><thead><tr><th class="t">Motivo</th><th>Retorno (CX UNIT)</th><th>% retorno</th></tr></thead><tbody>
${d.motivos.map(lin).join('')}
<tr class="tot"><td class="t">Total retorno</td><td>${fcx(t.retorno)}</td><td>${fp(t.pctTotal, 3)}</td></tr>
<tr class="dest"><td class="t">Total retorno s/ cancelamento NF</td><td>${fcx(t.semCanc)}</td><td>${fp(t.pctSemCanc, 3)}</td></tr>
</tbody></table></div>`;
  // O cancelamento fica fora do gráfico: é desconsiderado e, sozinho, achataria as outras barras (está no quadro de cima).
  const grafico = graficoBarras(d.motivos.filter((m) => !m.cancelamento).map((m) => ({ rot: m.motivo, v: m.pctVolume ?? m.cx, txt: m.pctVolume == null ? fcx(m.cx) : fp(m.pctVolume, 3) })));
  const motivos = `<section class="bloco"><div class="faixa">Por motivo</div><div class="corpo"><div class="ret-lado">${tabela}<div>${grafico}</div></div>
<p class="small">% retorno = retorno do motivo ÷ volume total do mês (Saída), em CX UNIT. No total sem cancelamento, o CANCELAMENTO DE NF sai do retorno e do volume. O gráfico mostra os motivos sem o cancelamento.</p></div></section>`;
  const motoristas = admin && d.motoristas?.length ? `<section class="bloco"><div class="faixa">Retorno por motorista (R$)</div><div class="corpo"><div class="ret-lado"><div class="tw scroll"><table><thead><tr><th class="t">Motorista</th><th>Dev (R$)</th><th>% do total</th></tr></thead><tbody>
${d.motoristas.map((m) => `<tr><td class="t">${E(m.nome)}</td><td>${frs(m.rs)}</td><td>${fp(m.pct, 1)}</td></tr>`).join('')}
<tr class="tot"><td class="t">Total</td><td>${frs(t.totalRS)}</td><td>100%</td></tr></tbody></table></div>
<div>${graficoBarras(d.motoristas.map((m) => ({ rot: m.nome, v: m.rs, txt: `R$ ${nf(0).format(m.rs)}` })))}</div></div>
<p class="small">Só no rascunho do admin: os nomes não vão para a publicação. Em R$, como no BI.</p></div></section>` : '';
  const fonte = admin ? `<p class="small">${DLS_RET.includes(u) ? `Fonte: retorno Externo e venda da Montagem de Cargas (${fi(d.linhasExterno)} linhas de retorno${d.ultimoDia ? `, até ${fdata(d.ultimoDia)}` : ''}).` : `Fonte: ${E(d.arquivos?.motivos || 'arquivo do BI')}${d.arquivos?.motoristas && d.arquivos.motoristas !== d.arquivos.motivos ? ` e ${E(d.arquivos.motoristas)}` : ''}.`}</p>` : '';
  return `${topo}${tiles}${admin ? avisos(u, d, mes) : ''}${motivos}${motoristas}${fonte}`;
}

// ---------------------------------------------------------------- telas (Firestore)
async function topoRetorno(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? mesesAdmin(mes, await R.mesesRetornoPublicados()) : await R.mesesRetornoPublicados());
    meses.add(mes);
    sel = seletorMes([...meses].sort().reverse(), mes);
    if (ctx.adminNaTela() && UNIDADES_RET[aba]) {
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

async function telaUnidade(ctx, u, mes) {
  ctx.html('<p class="small">Calculando o retorno…</p>');
  const topo = await topoRetorno(ctx, u, mes, `${UNIDADES_RET[u]} · ${nomeMes(mes)}`), r = await resultado(ctx, mes);
  const vazio = !r.unidades?.[u]?.temDados && !rascunho(ctx);
  ctx.html(vazio ? `${topo}<div class="aviso">O retorno de ${E(UNIDADES_RET[u])} em ${nomeMes(mes)} ainda não foi publicado.</div>` : paginaUnidadeRetorno(u, r.unidades?.[u], { mes, admin: rascunho(ctx), topo }));
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
        const resumo = Object.entries(x.unidades).map(([u, d]) => `${UNIDADES_RET[u]}: ${[d.motivos && `${fi(d.motivos.length)} motivos`, d.motoristas && `${fi(d.motoristas.length)} motoristas`, d.volume != null && `volume ${fcx(d.volume)} CX UNIT`].filter(Boolean).join(', ')}`).join(' · ');
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: n, periodo: mesArq, acompanhamento: 'retorno' });
        rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo)}</td><td class="t">${E(resumo)}${x.ignoradas.length ? ` · revenda(s) ignorada(s): ${E(x.ignoradas.join(', '))}` : ''}</td><td class="t">${nomeMes(mesArq)}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${E(f.name)}</td><td colspan="4" class="st no">${E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Conteúdo</th><th class="t">Mês</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/retorno/${UNIDADE_PADRAO}/${mesArq}">Conferir rascunho</a></p>`;
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
<label>Volume do mês em CX UNIT ${dl ? '(vazio = venda da Montagem)' : '(Saída do BI)'}<br><input type="text" data-u="${u}" value="${x.parametros[u]?.volume ?? ''}" placeholder="${auto == null ? '' : E(fd(auto, 3))}"></label>
</div></div></section>`;
  };
  ctx.html(`${topo}<p class="sub">Volume em CX UNIT de cada unidade no mês. Nos DAs ele é obrigatório (os arquivos do BI não trazem a Saída). Nos DLs, deixe vazio para usar a venda importada na Montagem (o número em cinza).</p>
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
  const topo = await topoRetorno(ctx, 'publicar', mes, `Publicar · ${nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/retorno/${UNIDADE_PADRAO}/${mes}`;
  ctx.html(`${topo}<p>Publica os totais e a tabela por motivo das 4 unidades. O retorno por motorista (nomes) fica só no rascunho.</p><p><a class="btn sec" href="#/retorno/${UNIDADE_PADRAO}/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar retorno ${nomeMes(mes)}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input class="campo-link" type="text" readonly value="${E(link)}"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await R.publicarRetorno(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((m) => `#/retorno/publicar/${m}`);
}

// p = partes da rota (#/retorno/<sub>/<mes>). Sem aba de resumo: o padrão é a primeira unidade.
export async function rotearRetorno(p, ctx) {
  const sub = p[1], mes = ctx.mesP(p[2]) || (ctx.adminNaTela() ? ctx.mesAtual() : (await R.mesesRetornoPublicados())[0] || ctx.mesAtual());
  if (UNIDADES_RET[sub]) return telaUnidade(ctx, sub, mes);
  if (!sub || sub === 'resumo' || !ctx.adminNaTela()) { location.replace(`#/retorno/${UNIDADE_PADRAO}/${mes}`); return; }
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'parametros') return telaParametros(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  location.replace(`#/retorno/${UNIDADE_PADRAO}/${mes}`);
}
