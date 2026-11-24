// Telas do acompanhamento Perdas de estoque (DLs). As funções pagina* são puras (dados → HTML) e servem à prévia
// local; as tela* usam o Firestore e o contexto do app (ctx).
import { E, fi, fd, fp, fdata, nomeMes, seletorMes } from './views.js?v=20261124-4';
import { DLS_PERDAS, MOTIVOS_PERDAS, ROTULO_MOTIVO, lerPlanilhaPerdas, calcularPerdas, divergenciasProdutos, comparaReferencia } from './perdas.js?v=20261124-4';
import * as P from './dados_perdas.js?v=20261124-4';
import * as D from './dados.js?v=20261124-4';

const nf = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
const frc = (x) => (x == null ? '–' : `R$ ${nf(2).format(x)}`);
const fcx = (x) => (x == null ? '–' : nf(2).format(x));
const fp2 = (x) => fp(x, 2);

export function abasPerdas(ativa, mes, admin) {
  const a = [['resumo', 'Resumo', `#/perdas/resumo/${mes}`], ['CBAR', 'BARREIRAS', `#/perdas/CBAR/${mes}`], ['CCRT', 'JUAZEIRO', `#/perdas/CCRT/${mes}`]];
  const adm = admin ? [['importar', 'Importar', `#/perdas/importar/${mes}`], ['parametros', 'Parâmetros', `#/perdas/parametros/${mes}`], ['publicar', 'Publicar', `#/perdas/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// Avisos só para o admin: materiais sem cadastro, movimentos de outros tipos, bases do % que faltam.
function avisosPerdas(c, d, mes) {
  const t = d.totais, itens = [];
  const nSem = Array.isArray(d.semCadastro) ? d.semCadastro.length : d.semCadastro || 0;
  const nSug = Array.isArray(d.semCadastro) ? d.semCadastro.filter((s) => s.sugestao).length : 0;
  if (nSem) itens.push(`<b>${fi(nSem)} material(is) sem cadastro de produto</b>: entram no R$, mas não na cx unit nem na categoria.${nSug ? ` ${fi(nSug)} tem produto provável na base de referência, em observação até você confirmar.` : ''} <a href="#/perdas/${c}/${mes}">Ver na página do DL →</a>`);
  const v = d.motivos.VERIFICAR;
  if (v.linhas) itens.push(`${fi(v.linhas)} movimento(s) de outro tipo (ex.: 951 trocas comerciais), ${frc(v.rs)}, ficam fora dos totais.`);
  if (!t.volume) itens.push('Sem o volume do DL no mês: o % sobre o volume não é calculado. Importe a Montagem ou informe em ⚙ Parâmetros.');
  if (!t.faturamento) itens.push('Sem o faturamento acumulado do DL: o % do KPI não é calculado. Confira a tarifa na Montagem ou informe em ⚙ Parâmetros.');
  if (!d.motivos.INVENTARIO.linhas) itens.push('Inventário do mês ainda não importado.');
  return itens.map((x) => `<div class="aviso">${x}</div>`).join('');
}

function cardDL(c, d, { mes, admin }) {
  if (!d || !d.temDados) return `<section class="bloco"><div class="faixa">${E(DLS_PERDAS[c])}</div><div class="corpo"><div class="aviso">Sem dados de perdas em ${nomeMes(mes)}.</div>${admin ? `<a class="btn sec" href="#/perdas/importar/${mes}">Importar arquivos</a>` : ''}</div></section>`;
  const t = d.totais;
  return `<section class="bloco km-card"><div class="faixa">${E(d.nome)} <a class="btn sec" href="#/perdas/${c}/${mes}">Detalhe →</a></div><div class="corpo">
<div class="km-disp"><div class="l">Perdas rota + estoque (KPI)</div><div class="v">${frc(t.rotaEstoque)}</div><div class="d">${t.pctKPI == null ? 'sem faturamento do mês' : `${fp2(t.pctKPI)} do faturamento acumulado`}</div></div>
<table class="kv km-kv"><tbody>
<tr><td>Total do mês</td><td>${frc(t.total)}</td></tr>
<tr><td>Total em cx unit</td><td>${fcx(t.totalCx)}${t.pctVolume == null ? '' : ` · ${fp2(t.pctVolume)} do volume`}</td></tr>
<tr><td>Custo por cx unit</td><td>${frc(t.custoCx)}</td></tr>
${t.ajustePreco ? `<tr><td>Ajuste de preço</td><td>${frc(t.ajustePreco)}</td></tr><tr class="dest"><td>Perdas fech. op.</td><td>${frc(t.fechamentoOp)}</td></tr>` : ''}
</tbody></table>${admin ? avisosPerdas(c, d, mes) : ''}</div></section>`;
}

function tabelaMotivosComparada(dls) {
  const cs = Object.keys(DLS_PERDAS).filter((c) => dls[c]?.temDados);
  if (!cs.length) return '';
  const lin = (rot, f, cls = '') => `<tr class="${cls}"><td class="t">${rot}</td>${cs.map((c) => f(dls[c])).join('')}</tr>`;
  const cel = (m) => `<td>${frc(m.rs)}</td><td>${fcx(m.cx)}</td><td>${fp2(m.pctVolume)}</td>`;
  return `<h2>Por motivo</h2><div class="tw scroll"><table><thead><tr><th class="t" rowspan="2">Motivo</th>${cs.map((c) => `<th colspan="3"><a href="#/perdas/${c}/${dls[c].mes || ''}">${E(dls[c].nome)}</a></th>`).join('')}</tr>
<tr>${cs.map(() => '<th>R$</th><th>Cx unit</th><th>% volume</th>').join('')}</tr></thead><tbody>
${MOTIVOS_PERDAS.map((k) => lin(ROTULO_MOTIVO[k], (d) => cel(d.motivos[k]))).join('')}
${lin('Rota + estoque (KPI)', (d) => `<td>${frc(d.totais.rotaEstoque)}</td><td>${fcx(d.motivos.ROTA.cx + d.motivos.ESTOQUE.cx)}</td><td>${fp2(d.totais.volume ? (d.motivos.ROTA.cx + d.motivos.ESTOQUE.cx) / d.totais.volume : null)}</td>`, 'dest')}
${lin('Total', (d) => `<td>${frc(d.totais.total)}</td><td>${fcx(d.totais.totalCx)}</td><td>${fp2(d.totais.pctVolume)}</td>`, 'tot')}
</tbody></table></div>
<p class="small">Perda em R$ e em caixa unitária (positivo = perda; negativo = sobra no inventário). Rota = MB59 tipo 928; estoque = 551; transporte = 928 com referência de transferência; inventário = diferenças de inventário, em caixa física × Fat.Conv2. O total soma os quatro motivos. O % do KPI usa só rota + estoque, sobre o faturamento acumulado do mês.</p>`;
}

export function paginaResumoPerdas(resultado, { mes, admin, topo }) {
  const dls = Object.fromEntries(Object.entries(resultado.dls || {}).map(([c, d]) => [c, { ...d, mes }]));
  return `${topo}<div class="g2 km-cards">${Object.keys(DLS_PERDAS).map((c) => cardDL(c, dls[c], { mes, admin })).join('')}</div>${tabelaMotivosComparada(dls)}`;
}

// Materiais sem cadastro, com o produto provável da base de referência (PRODUTOS.xlsx) em observação: ele não entra
// na conta até o admin confirmar (o botão grava no cadastro do DL).
export function tabelaSemCadastro(lista, mes) {
  const sug = (x) => {
    const s = x.sugestao;
    if (!s) return '<span class="small">não está na base de referência: cadastre à mão em ⚙ Parâmetros</span>';
    const txt = `${E(s.d)} · ${E(s.c)} · Qtd/Un ${fd(s.q, 0)} · Fat.Conv2 ${String(s.f).replace('.', ',')}${s.ativo ? '' : ' · inativo na base'}`;
    const ok = s.f > 0;
    return `<span class="tag" title="Sugestão da base de referência. Não entra na conta até ser confirmada.">em observação</span> ${txt}${ok ? '' : ' <span class="st no">Fat.Conv2 zerado na base: cadastre à mão</span>'}`;
  };
  const botao = (x) => x.sugestao && x.sugestao.f > 0
    ? `<button type="button" class="btn sec conf-prod" data-dl="${x.c}" data-mat="${E(x.mat)}" data-d="${E(x.sugestao.d)}" data-c="${E(x.sugestao.c)}" data-q="${x.sugestao.q}" data-f="${x.sugestao.f}">Confirmar</button>` : '';
  return `<div class="tw scroll"><table><thead><tr><th class="t">DL</th><th class="t">Material</th><th class="t">Descrição no SAP</th><th>R$</th><th>Linhas</th><th class="t">Produto provável (base de referência)</th><th></th></tr></thead><tbody>
${lista.map((x) => `<tr><td class="t">${E(DLS_PERDAS[x.c] || '')}</td><td class="t">${E(x.mat)}</td><td class="t">${E(x.texto)}</td><td>${frc(x.rs)}</td><td>${fi(x.linhas)}</td><td class="t">${sug(x)}</td><td>${botao(x)}</td></tr>`).join('')}</tbody></table></div>
<p class="small">Sem cadastro, o material entra no R$, mas não na cx unit nem na categoria. A sugestão vem da base de referência de produtos e fica <b>em observação</b>: confira se é mesmo o mesmo produto e clique em <b>Confirmar</b> para gravar no cadastro do DL. Para corrigir os valores antes, use a caixa de produtos em <a href="#/perdas/parametros/${mes}">⚙ Parâmetros</a>.</p>`;
}

// Liga os botões "Confirmar" das sugestões: grava o produto no cadastro do DL (material = COD CB) e recarrega.
function ligarConfirmacoes(ctx, recarregar) {
  for (const b of document.querySelectorAll('button.conf-prod')) b.onclick = async () => {
    b.disabled = true;
    const { dl, mat, d, c, q, f } = b.dataset;
    try {
      await P.gravarBaseProdutosPerdas(dl, { solar: { [mat]: mat }, produtos: { [mat]: { d, c, q: Number(q), f: Number(f) } } });
      await recarregar();
    } catch (err) { b.insertAdjacentHTML('afterend', ctx.erro(err)); b.disabled = false; }
  };
}

export function paginaDLPerdas(c, d, { mes, admin, topo }) {
  if (!d || !d.temDados) return `${topo}<div class="aviso">Sem dados de perdas de ${E(DLS_PERDAS[c])} em ${nomeMes(mes)}.</div>`;
  const t = d.totais, m = d.motivos;
  const tiles = `<div class="tiles">
<div class="tile"><div class="l">Rota + estoque (KPI)</div><div class="v">${frc(t.rotaEstoque)}</div><div class="d">${t.pctKPI == null ? 'sem faturamento' : `${fp2(t.pctKPI)} do faturamento acumulado`}</div></div>
<div class="tile"><div class="l">Total do mês</div><div class="v">${frc(t.total)}</div><div class="d">com inventário e transporte</div></div>
<div class="tile"><div class="l">Total em cx unit</div><div class="v">${fcx(t.totalCx)}</div><div class="d">${t.pctVolume == null ? 'sem volume' : `${fp2(t.pctVolume)} do volume`}</div></div>
<div class="tile"><div class="l">Custo por cx unit</div><div class="v">${frc(t.custoCx)}</div></div>
${t.ajustePreco ? `<div class="tile"><div class="l">Perdas fech. op.</div><div class="v">${frc(t.fechamentoOp)}</div><div class="d">ajuste de preço ${frc(t.ajustePreco)}</div></div>` : ''}</div>`;
  const linMot = (k) => `<tr><td class="t">${ROTULO_MOTIVO[k]}</td><td>${frc(m[k].rs)}</td><td>${fp(m[k].pctTotal, 1)}</td><td>${fcx(m[k].cx)}</td><td>${fp2(m[k].pctVolume)}</td><td>${frc(m[k].custoCx)}</td><td>${fi(m[k].linhas)}</td></tr>`;
  const motivos = `<section class="bloco"><div class="faixa">Por motivo</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Motivo</th><th>R$</th><th>% do total</th><th>Cx unit</th><th>% do volume</th><th>Custo por cx unit</th><th>Linhas</th></tr></thead><tbody>
${MOTIVOS_PERDAS.map(linMot).join('')}
<tr class="dest"><td class="t">Rota + estoque (KPI)</td><td>${frc(t.rotaEstoque)}</td><td>${fp(t.total ? t.rotaEstoque / t.total : null, 1)}</td><td>${fcx(m.ROTA.cx + m.ESTOQUE.cx)}</td><td>${fp2(t.volume ? (m.ROTA.cx + m.ESTOQUE.cx) / t.volume : null)}</td><td>${frc(m.ROTA.cx + m.ESTOQUE.cx ? t.rotaEstoque / (m.ROTA.cx + m.ESTOQUE.cx) : null)}</td><td></td></tr>
<tr class="tot"><td class="t">Total</td><td>${frc(t.total)}</td><td>100%</td><td>${fcx(t.totalCx)}</td><td>${fp2(t.pctVolume)}</td><td>${frc(t.custoCx)}</td><td>${fi(MOTIVOS_PERDAS.reduce((s, k) => s + m[k].linhas, 0))}</td></tr>
${m.VERIFICAR.linhas ? `<tr class="pv"><td class="t">Outros tipos de movimento (fora do total)</td><td>${frc(m.VERIFICAR.rs)}</td><td></td><td>${fcx(m.VERIFICAR.cx)}</td><td></td><td></td><td>${fi(m.VERIFICAR.linhas)}</td></tr>` : ''}
</tbody></table></div>
<table class="kv" style="max-width:560px;margin-top:10px"><tbody>
<tr><td>Volume do DL (cx unit)</td><td>${fcx(t.volume)} <span class="small">${E(d.fontes?.volume || '')}</span></td></tr>
<tr><td>Faturamento acumulado</td><td>${frc(t.faturamento)} <span class="small">${E(d.fontes?.faturamento || '')}</span></td></tr>
<tr><td>% KPI sobre a tendência (como era)</td><td>${fp2(t.pctKPITendencia)} <span class="small">faturamento tendência ${frc(t.fatTendencia)}</span></td></tr>
</tbody></table></div></section>`;
  const cats = `<section class="bloco"><div class="faixa">Por categoria (R$)</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Categoria</th><th>Inventário</th><th>Rota</th><th>Estoque</th><th>Rota + estoque</th><th>Transporte</th><th>Total</th></tr></thead><tbody>
${d.categorias.map((x) => `<tr><td class="t">${E(x.categoria)}</td><td>${frc(x.INVENTARIO)}</td><td>${frc(x.ROTA)}</td><td>${frc(x.ESTOQUE)}</td><td>${frc(x.rotaEstoque)}</td><td>${frc(x.TRANSPORTE)}</td><td>${frc(x.total)}</td></tr>`).join('')}
<tr class="tot"><td class="t">Total</td><td>${frc(m.INVENTARIO.rs)}</td><td>${frc(m.ROTA.rs)}</td><td>${frc(m.ESTOQUE.rs)}</td><td>${frc(t.rotaEstoque)}</td><td>${frc(m.TRANSPORTE.rs)}</td><td>${frc(t.total)}</td></tr></tbody></table></div></div></section>`;
  const dias = d.porDia?.length ? `<section class="bloco"><div class="faixa">Por dia de lançamento (MB59, R$)</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Dia</th><th>Rota</th><th>Estoque</th><th>Transporte</th><th>Total</th></tr></thead><tbody>
${d.porDia.map((x) => `<tr><td class="t">${fdata(x.data)}</td><td>${frc(x.ROTA)}</td><td>${frc(x.ESTOQUE)}</td><td>${frc(x.TRANSPORTE)}</td><td>${frc(x.ROTA + x.ESTOQUE + x.TRANSPORTE)}</td></tr>`).join('')}</tbody></table></div>
<p class="small">O inventário não tem dia: entra só no mês.</p></div></section>` : '';
  const linProd = (x) => `<tr><td class="t">${E(x.produto)}</td><td class="t">${E(x.categoria)}</td><td>${frc(x.INVENTARIO)}</td><td>${frc(x.ROTA)}</td><td>${frc(x.ESTOQUE)}</td><td>${frc(x.TRANSPORTE)}</td><td>${frc(x.total)}</td><td>${fcx(x.cx)}</td></tr>`;
  const cabProd = '<thead><tr><th class="t">Produto</th><th class="t">Categoria</th><th>Inventário</th><th>Rota</th><th>Estoque</th><th>Transporte</th><th>Total R$</th><th>Cx unit</th></tr></thead>';
  const prods = `<section class="bloco"><div class="faixa">Por produto</div><div class="corpo"><div class="tw scroll"><table>${cabProd}<tbody>${d.produtos.slice(0, 30).map(linProd).join('')}</tbody></table></div>
${d.produtos.length > 30 ? `<details><summary class="small">Ver todos os ${fi(d.produtos.length)} produtos</summary><div class="tw scroll"><table>${cabProd}<tbody>${d.produtos.slice(30).map(linProd).join('')}</tbody></table></div></details>` : ''}
<p class="small">Ordenado pelo total. Negativo = sobra no inventário maior que a perda.</p></div></section>`;
  const semCad = admin && Array.isArray(d.semCadastro) && d.semCadastro.length ? `<section class="bloco"><div class="faixa">Materiais sem cadastro de produto</div><div class="corpo">${tabelaSemCadastro(d.semCadastro.map((s) => ({ ...s, c })), mes)}</div></section>` : '';
  return `${topo}${tiles}${admin ? avisosPerdas(c, d, mes) : ''}${motivos}${semCad}${cats}${dias}${prods}`;
}

// ---------------------------------------------------------------- telas (Firestore)
async function topoPerdas(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? [ctx.mesAtual(), mes] : await P.mesesPerdasPublicados());
    meses.add(mes);
    sel = seletorMes([...meses].sort().reverse(), mes);
    if (ctx.adminNaTela() && ['resumo', 'CBAR', 'CCRT'].includes(aba)) {
      sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
    }
  }
  return `<h1>Perdas de estoque DLs — ${E(titulo)}</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasPerdas(aba, mes, ctx.adminNaTela())}`;
}
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
async function resultadoPerdas(ctx, mes) {
  if (rascunho(ctx)) return P.calcularPerdasAoVivo(mes);
  const x = await P.lerPerdasPublicado(mes);
  return { ...x, atualizado: x.publicadoEm };
}
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };

async function telaResumo(ctx, mes) {
  ctx.html('<p class="small">Calculando perdas…</p>');
  const topo = await topoPerdas(ctx, 'resumo', mes, nomeMes(mes)), r = await resultadoPerdas(ctx, mes);
  const vazio = !Object.values(r.dls || {}).some((d) => d?.temDados);
  ctx.html(paginaResumoPerdas(r, { mes, admin: rascunho(ctx), topo }) + (vazio && !rascunho(ctx) ? `<div class="aviso">As perdas de ${nomeMes(mes)} ainda não foram publicadas.</div>` : ''));
  status(r.atualizado); ctx.ligarTopo((m) => `#/perdas/resumo/${m}`);
}

async function telaDL(ctx, c, mes) {
  ctx.html('<p class="small">Calculando perdas…</p>');
  const topo = await topoPerdas(ctx, c, mes, `${DLS_PERDAS[c]} · ${nomeMes(mes)}`), r = await resultadoPerdas(ctx, mes);
  ctx.html(paginaDLPerdas(c, r.dls?.[c], { mes, admin: rascunho(ctx), topo }));
  status(r.atualizado); ctx.ligarTopo((m) => `#/perdas/${c}/${m}`);
  ligarConfirmacoes(ctx, () => telaDL(ctx, c, mes));
}

function historico(imps) {
  const q = (r) => r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '';
  const l = imps.length ? imps.map((r) => `<tr><td class="t">${q(r)}</td><td class="t">${E(r.arquivo)}</td><td class="t">${E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${E(r.periodo || '')}</td><td class="t">${E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="t small">Ainda não há importações de Perdas.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Linhas</th><th class="t">Mês</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

async function telaImportar(ctx, mes) {
  const topo = await topoPerdas(ctx, 'importar', mes, 'Importar arquivos', false);
  ctx.html(`${topo}<p class="sub">MB59 de Barreiras (.XLSX) e de Juazeiro (.xls), diferenças de inventário do SAP, a planilha "Perdas de Estoque - &lt;DL&gt;.xlsx" (traz MB59, inventário, cadastro de produtos e volume) e a base de referência PRODUTOS.xlsx (só sugere o produto provável de material sem cadastro). Os arquivos são lidos neste navegador.</p>
<label>Mês do inventário <input id="mesInv" type="month" value="${mes}"></label> <span class="small">usado quando o arquivo não diz o mês (o MB59 usa a data de lançamento de cada linha)</span>
<div class="drop" id="drop"><p>Arraste os arquivos de perdas aqui ou selecione</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div><div id="res"></div>
<p class="small">Reimportar o MB59 substitui os dias que ele cobre. Reimportar o inventário substitui o inventário do mês. O cadastro de produtos novo completa o que já existe.</p>
<h2>Últimas importações de Perdas</h2><div id="hist">${historico(await D.ultimasImportacoes('perdas'))}</div>`);
  const processar = async (files) => {
    let rows = '';
    for (const f of files) {
      try {
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false });
        const x = lerPlanilhaPerdas(wb, f.name);
        if (!x.tipo) throw new Error('Não reconheci o arquivo: esperava MB59 (Tipo de movimento, Montante em MI), inventário (Qtd.diferença), a aba "base" de produtos ou a base de referência PRODUTOS (Reduzido, Qtd/Un, Fat.Conv2).');
        const mesInv = x.mes || document.getElementById('mesInv').value;
        let n = 0, extra = '';
        if (x.base) extra = ` · cadastro de ${DLS_PERDAS[x.dl] || '?'} com ${fi(await P.gravarBaseProdutosPerdas(x.dl, x.base))} produtos`;
        if (x.referencia) extra += ` · ${fi(await P.gravarReferenciaProdutosPerdas(x.referencia, f.name))} produtos (só para sugerir produto de material sem cadastro; não entra na conta)`;
        if (x.foraDoMes) extra += ` · ${fi(x.foraDoMes)} linha(s) do MB59 lançadas fora de ${nomeMes(x.mes)} ignoradas (entram no mês delas)`;
        if (x.movimentos.length || x.inventario.length) n = await P.gravarPerdas({ ...x, mesInventario: mesInv });
        const meses = [...new Set([...x.movimentos.map((m) => m.data.slice(0, 7)), ...(x.inventario.length ? [mesInv] : [])])].sort().join(', ');
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: n, periodo: meses, acompanhamento: 'perdas' });
        rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo + extra)}</td><td>${fi(x.movimentos.length)}</td><td>${fi(x.inventario.length)}</td><td class="t">${E(meses)}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${E(f.name)}</td><td colspan="5" class="st no">${E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Conteúdo</th><th>MB59</th><th>Inventário</th><th class="t">Mês</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/perdas/resumo/${mes}">Conferir rascunho</a></p>`;
    document.getElementById('hist').innerHTML = historico(await D.ultimasImportacoes('perdas'));
  };
  const drop = document.getElementById('drop');
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

// Linhas "COD SOLAR;COD CB;descrição;categoria;Qtd/Un;Fat.Conv2" → base de produtos.
export function linhasProdutos(texto) {
  const solar = {}, produtos = {}, erros = [];
  for (const l of String(texto || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) {
    const [sol, cb, d, c, q, f] = l.split(';').map((s) => s.trim());
    const fc = Number(String(f || '').replace(',', '.')), qu = Number(String(q || '').replace(',', '.'));
    if (!sol || !cb || !(fc > 0) || !(qu > 0)) { erros.push(l); continue; }
    solar[sol] = cb; produtos[cb] = { d: d || '', c: (c || '').toUpperCase(), q: qu, f: fc };
  }
  return { solar, produtos, erros };
}

async function telaParametros(ctx, mes) {
  const topo = await topoPerdas(ctx, 'parametros', mes, `Parâmetros · ${nomeMes(mes)}`);
  const x = await P.lerDadosPerdas(mes);
  const r = calcularPerdas(x), div = divergenciasProdutos(x.bases);
  const nProd = Object.keys(DLS_PERDAS).map((c) => `${E(DLS_PERDAS[c])}: ${fi(Object.keys(x.bases[c]?.produtos || {}).length)}`).join(' · ');
  const campo = (c, k, rot, auto, dica) => `<label>${rot}<br><input type="text" data-dl="${c}" data-k="${k}" value="${x.parametros[c]?.[k] ?? ''}" placeholder="${auto == null ? '' : E(fd(auto, 2))}" title="${E(dica)}"></label>`;
  const blocos = Object.keys(DLS_PERDAS).map((c) => { const mo = x.montagem[c] || {};
    return `<section class="bloco"><div class="faixa">${E(DLS_PERDAS[c])}</div><div class="corpo"><div class="modelo-box">
${campo(c, 'ajustePreco', 'Ajuste de preço (R$)', null, 'Como no quadro anual: negativo reduz as perdas do fechamento operacional.')}
${campo(c, 'volume', 'Volume cx unit (vazio = Montagem)', mo.acm ?? x.dados[c]?.volumePlanilha, 'ACM do mês na Montagem de Cargas')}
${campo(c, 'faturamento', 'Faturamento acumulado R$ (vazio = Montagem)', mo.fat_acm, 'ACM do mês na Montagem de Cargas')}
${campo(c, 'fatTendencia', 'Faturamento tendência R$ (vazio = Montagem)', mo.fat_tendencia, 'Só para comparar com o % antigo')}</div></div></section>`; }).join('');
  const sem = Object.keys(DLS_PERDAS).flatMap((c) => (r.dls[c].semCadastro || []).map((s) => ({ ...s, c })));
  const refDiv = x.referencia ? Object.keys(DLS_PERDAS).flatMap((c) => comparaReferencia(x.bases[c], x.referencia).map((d) => ({ ...d, c }))) : [];
  // Caixa de produtos já preenchida com a sugestão (o admin confere e corrige antes de salvar).
  const linhaSem = (s) => s.sugestao && s.sugestao.f > 0 ? `${s.mat};${s.mat};${s.sugestao.d};${s.sugestao.c};${s.sugestao.q};${String(s.sugestao.f).replace('.', ',')}` : `${s.mat};;${s.texto};;;`;
  ctx.html(`${topo}<p class="sub">Valores do mês por DL. Deixe vazio para usar o que vem da Montagem de Cargas (o número em cinza).</p>
<div class="g2">${blocos}</div><p><button class="btn" id="salvarPar">Salvar parâmetros</button> <span id="msgPar"></span></p>
<h2>Cadastro de produtos</h2><p class="sub">Produtos cadastrados · ${nProd}. Cada DL tem o seu cadastro, que vem da aba "base" da planilha de Perdas daquele DL (importe em ⚙ Importar) e vale para todos os meses. Se faltar um produto no cadastro do DL, o Hub usa o do outro DL.</p>
${sem.length ? `<div class="aviso"><b>${fi(sem.length)} material(is) sem cadastro em ${nomeMes(mes)}</b></div>${tabelaSemCadastro(sem, mes)}` : '<p class="small">Todos os materiais do mês têm cadastro.</p>'}
<p class="small">Base de referência de produtos: ${x.referencia ? `${fi(Object.keys(x.referencia).length)} produtos · ${E(x.referenciaInfo?.arquivo || '')}${x.referenciaInfo?.atualizado ? ` · ${x.referenciaInfo.atualizado.toLocaleString('pt-BR')}` : ''}. Não entra na conta: só sugere o produto provável de material sem cadastro.` : 'ainda não importada (PRODUTOS.xlsx em ⚙ Importar).'}</p>
${refDiv.length ? `<details><summary><b>${fi(refDiv.length)} produto(s) do cadastro com Qtd/Un ou Fat.Conv2 diferente da base de referência</b> <span class="small">(a conta usa o cadastro; confira qual está certo)</span></summary><div class="tw scroll"><table><thead><tr><th class="t">DL</th><th class="t">Material</th><th class="t">Produto</th><th class="t">Cadastro do DL</th><th class="t">Base de referência</th></tr></thead><tbody>
${refDiv.map((d) => `<tr><td class="t">${E(DLS_PERDAS[d.c])}</td><td class="t">${E(d.mat)}</td><td class="t">${E(d.descricao)}</td><td class="t">${E(d.cadastro)}</td><td class="t">${E(d.referencia)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
${div.length ? `<details><summary><b>${fi(div.length)} divergência(s) entre o cadastro de Barreiras e o de Juazeiro</b> <span class="small">(cada DL usa o seu; confira qual está certo)</span></summary><div class="tw scroll"><table><thead><tr><th class="t">Tipo</th><th class="t">Código</th><th class="t">Descrição</th><th class="t">Barreiras</th><th class="t">Juazeiro</th></tr></thead><tbody>
${div.map((d) => `<tr><td class="t">${E(d.tipo)}</td><td class="t">${E(d.codigo)}</td><td class="t">${E(d.descricao)}</td><td class="t">${E(d.CBAR)}</td><td class="t">${E(d.CCRT)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
<label>Cadastro de <select id="dlProd">${Object.entries(DLS_PERDAS).map(([c, n]) => `<option value="${c}">${E(n)}</option>`).join('')}<option value="ambos">Os dois DLs</option></select></label>
<label>Incluir ou corrigir produtos, um por linha: <code>COD SOLAR;COD CB;descrição;categoria;Qtd/Un;Fat.Conv2</code><br>
<textarea id="prods" rows="6" style="width:100%;max-width:820px;font:inherit" placeholder="1000003;3;COCA-COLA KS C24;SSD;24;1,23">${sem.map(linhaSem).join('\n')}</textarea></label>
<p><button class="btn sec" id="salvarProd">Salvar produtos</button> <span id="msgProd"></span></p>`);
  document.getElementById('salvarPar').onclick = async (e) => {
    e.target.disabled = true;
    try {
      for (const c of Object.keys(DLS_PERDAS)) {
        const v = {};
        for (const i of document.querySelectorAll(`input[data-dl="${c}"]`)) { const s = i.value.trim(); if (s) v[i.dataset.k] = Number(s.replace(/\./g, '').replace(',', '.')); }
        await P.gravarParametrosPerdas(c, mes, v);
      }
      document.getElementById('msgPar').innerHTML = '<span class="st ok">✓ salvo</span>';
    } catch (err) { document.getElementById('msgPar').innerHTML = ctx.erro(err); }
    e.target.disabled = false;
  };
  document.getElementById('salvarProd').onclick = async () => {
    const b = linhasProdutos(document.getElementById('prods').value);
    if (b.erros.length) { document.getElementById('msgProd').innerHTML = `<span class="st no">Linha(s) incompleta(s): ${E(b.erros.join(' | '))}</span>`; return; }
    const sel = document.getElementById('dlProd').value, dls = sel === 'ambos' ? Object.keys(DLS_PERDAS) : [sel];
    try { for (const c of dls) await P.gravarBaseProdutosPerdas(c, b); document.getElementById('msgProd').innerHTML = `<span class="st ok">✓ ${fi(Object.keys(b.produtos).length)} produto(s) salvos em ${dls.map((c) => DLS_PERDAS[c]).join(' e ')}</span>`; }
    catch (err) { document.getElementById('msgProd').innerHTML = ctx.erro(err); }
  };
  ctx.ligarTopo((m) => `#/perdas/parametros/${m}`);
  ligarConfirmacoes(ctx, () => telaParametros(ctx, mes));
}

async function telaPublicar(ctx, mes) {
  const topo = await topoPerdas(ctx, 'publicar', mes, `Publicar · ${nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/perdas/resumo/${mes}`;
  ctx.html(`${topo}<p>Publica os totais por motivo, categoria, produto e dia. A lista de materiais sem cadastro não vai para os leitores.</p><p><a class="btn sec" href="#/perdas/resumo/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar perdas ${nomeMes(mes)}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input type="text" readonly value="${E(link)}" style="width:100%;max-width:640px"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await P.publicarPerdas(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((m) => `#/perdas/publicar/${m}`);
}

// p = partes da rota (#/perdas/<sub>/<mes>)
export async function rotearPerdas(p, ctx) {
  const sub = p[1], mes = ctx.mesP(p[2]) || (ctx.adminNaTela() ? ctx.mesAtual() : (await P.mesesPerdasPublicados())[0] || ctx.mesAtual());
  if (!sub || sub === 'resumo') return telaResumo(ctx, mes);
  if (DLS_PERDAS[sub]) return telaDL(ctx, sub, mes);
  if (!ctx.adminNaTela()) return ctx.html('<p>Área restrita ao administrador.</p>');
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'parametros') return telaParametros(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  return telaResumo(ctx, mes);
}
