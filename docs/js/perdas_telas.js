// Telas do acompanhamento Perdas de estoque (DLs). As funções pagina* são puras (dados → HTML) e servem à prévia
// local; as tela* usam o Firestore e o contexto do app (ctx).
import { E, fi, fd, fp, fdata, nomeMes, seletorMes, mesesAdmin } from './views.js?v=20261126-08';
import { DLS_PERDAS, MOTIVOS_PERDAS, ROTULO_MOTIVO, lerPlanilhaPerdas, calcularPerdas, divergenciasProdutos, comparaReferencia } from './perdas.js?v=20261126-08';
import * as P from './dados_perdas.js?v=20261126-08';
import { baixarPerdas } from './exportar_perdas.js?v=20261126-08';
import * as D from './dados.js?v=20261126-08';

const nf = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
const frc = (x) => (x == null ? '–' : `R$ ${nf(2).format(x)}`);
const fcx = (x) => (x == null ? '–' : nf(2).format(x));
const fp2 = (x) => fp(x, 2);

export function abasPerdas(ativa, mes, admin) {
  const a = [['CBAR', 'BARREIRAS', `#/perdas/CBAR/${mes}`], ['CCRT', 'JUAZEIRO', `#/perdas/CCRT/${mes}`]];
  const adm = admin ? [['importar', 'Importar', `#/perdas/importar/${mes}`], ['parametros', 'Parâmetros', `#/perdas/parametros/${mes}`], ['publicar', 'Publicar', `#/perdas/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// Avisos só para o admin: materiais sem cadastro, movimentos de outros tipos, bases do % que faltam.
function avisosPerdas(c, d, mes) {
  const t = d.totais, itens = [];
  const nSem = Array.isArray(d.semCadastro) ? d.semCadastro.length : d.semCadastro || 0;
  const nSug = Array.isArray(d.semCadastro) ? d.semCadastro.filter((s) => s.sugestao).length : 0;
  if (nSem) itens.push(`<b>${fi(nSem)} material(is) sem cadastro de produto</b>: entram no R$, mas não na CX UNIT nem na categoria.${nSug ? ` ${fi(nSug)} tem produto provável na base de referência, em observação até você confirmar.` : ''} <a href="#/perdas/${c}/${mes}">Ver na página do DL →</a>`);
  const v = d.motivos.VERIFICAR;
  if (v.linhas) itens.push(`${fi(v.linhas)} movimento(s) de outro tipo (ex.: 951 trocas comerciais), ${frc(v.rs)}, ficam fora dos totais.`);
  if (!t.volume) itens.push('Sem o volume do DL no mês: o % sobre o volume não é calculado. Importe a Montagem ou informe em ⚙ Parâmetros.');
  if (!t.faturamento) itens.push('Sem o faturamento acumulado do DL: o % do KPI não é calculado. Confira a tarifa na Montagem ou informe em ⚙ Parâmetros.');
  if (!d.motivos.INVENTARIO.linhas) itens.push('Inventário do mês ainda não importado.');
  return itens.map((x) => `<div class="aviso">${x}</div>`).join('');
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
<p class="small">Sem cadastro, o material entra no R$, mas não na CX UNIT nem na categoria. A sugestão vem da base de referência de produtos e fica <b>em observação</b>: confira se é mesmo o mesmo produto e clique em <b>Confirmar</b> para gravar no cadastro do DL. Para corrigir os valores antes, use a caixa de produtos em <a href="#/perdas/parametros/${mes}">⚙ Parâmetros</a>.</p>`;
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

// ---------------------------------------------------------------- página do DL: o mesmo quadro da aba Resumo da planilha
// Ordem fixa das categorias de cada planilha; categoria nova (ou material sem cadastro) entra no fim.
const CATEGORIAS_DL = {
  CBAR: ['SSD', 'ENERGETICO', 'SUCO', 'DESTILADOS', 'AGUA', 'CERVEJA', 'BALAS/GOMAS', 'BISCOITO', 'CHA', 'ISOTONICO'],
  CCRT: ['SSD', 'ENERGETICO', 'SUCO', 'CERVEJA', 'AGUA', 'DESTILADOS', 'BALAS/GOMAS', 'ISOTONICO', 'CHA', 'GAS CARBONICO', 'BISCOITO'],
};
const TITULO_DL = { CBAR: 'CBAR', CCRT: 'JUAZEIRO' };
const zero = (x) => !x || Math.abs(x) < 0.005;
// Formato contábil da planilha: "R$ 1.234,56", "-R$ 8,00" e "R$ -" no zero.
const brl = (x) => (x == null ? '–' : zero(x) ? 'R$ -' : `${x < 0 ? '-' : ''}R$ ${nf(2).format(Math.abs(x))}`);
const cxi = (x) => (x == null ? '–' : nf(0).format(Math.round(x) || 0));
const pct = (x, casas) => (x == null || !Number.isFinite(x) ? '–' : `${nf(casas).format(x * 100 || 0)}%`);
// Seta da planilha: perda (zero ou positivo) = ▼ vermelha; sobra (negativo) = ▲ verde.
const seta = (x) => (x < -0.005 ? '<span class="t-up" title="sobra">▲</span> ' : '<span class="t-down" title="perda">▼</span> ');

function quadroCategorias(c, d) {
  const porNome = new Map(d.categorias.map((x) => [x.categoria, x]));
  const nomes = [...CATEGORIAS_DL[c], ...d.categorias.map((x) => x.categoria).filter((n) => !CATEGORIAS_DL[c].includes(n))];
  const ajuste = d.totais.ajustePreco || 0;
  const linha = (nome, v) => {
    const inv = v?.INVENTARIO || 0, rota = v?.ROTA || 0, est = v?.ESTOQUE || 0;
    return `<tr><td class="t">${E(nome)}</td><td class="pd-inv">${brl(inv)}</td><td>${brl(rota)}</td><td>${brl(est)}</td><td class="pd-soma">${brl(rota + est)}</td><td class="pd-soma">${seta(inv + rota + est)}${brl(inv + rota + est)}</td><td class="pd-vao"></td><td class="pd-inv">${brl(v?.TRANSPORTE || 0)}</td></tr>`;
  };
  const m = d.motivos, inv = m.INVENTARIO.rs + ajuste, rota = m.ROTA.rs, est = m.ESTOQUE.rs;
  return `<div class="pd-faixa">Perdas por categoria</div><div class="tw scroll"><table class="pd-tab pd-cat"><thead><tr><th class="t">Categoria</th><th class="pd-inv">Inventário</th><th>Rota</th><th>Estoque</th><th class="pd-soma">Perdas rota e estoque</th><th class="pd-soma">Perdas total</th><th class="pd-vao"></th><th class="pd-inv" title="Informativo: não entra em Perdas total">Transporte *</th></tr></thead><tbody>
${nomes.map((n) => linha(n, porNome.get(n))).join('')}
${linha('AJUSTES DE PREÇO', { INVENTARIO: ajuste })}
<tr class="pd-total"><td class="t">TOTAL</td><td>${seta(inv)}${brl(inv)}</td><td>${seta(rota)}${brl(rota)}</td><td>${seta(est)}${brl(est)}</td><td>${seta(rota + est)}${brl(rota + est)}</td><td>${seta(inv + rota + est)}${brl(inv + rota + est)}</td><td class="pd-vao"></td><td>${brl(m.TRANSPORTE.rs)}</td></tr>
</tbody></table></div>`;
}

function quadroProdutos(d) {
  const lista = d.produtos.map((x) => ({ ...x, soma: x.INVENTARIO + x.ROTA + x.ESTOQUE })).sort((a, b) => b.soma - a.soma);
  return `<div class="pd-faixa">Perdas por produto</div><div class="tw scroll"><table class="pd-tab pd-prod"><thead><tr><th class="t">Categoria</th><th class="t">Produto</th><th>Inventário</th><th>Rota</th><th>Estoque</th><th class="pd-soma">Perdas rota e estoque</th><th class="pd-soma">Total</th><th class="pd-vao"></th><th class="pd-inv" title="Informativo: não entra no Total">Transporte *</th></tr></thead><tbody>
${lista.map((x) => `<tr><td class="t">${E(x.categoria)}</td><td class="t">${E(x.produto)}</td><td>${brl(x.INVENTARIO)}</td><td>${brl(x.ROTA)}</td><td>${brl(x.ESTOQUE)}</td><td class="pd-soma">${brl(x.ROTA + x.ESTOQUE)}</td><td class="pd-soma">${seta(x.soma)}${brl(x.soma)}</td><td class="pd-vao"></td><td class="pd-inv">${brl(x.TRANSPORTE)}</td></tr>`).join('')}
</tbody></table></div><p class="small">* Transporte é informativo: não entra em Perdas total nem em Total.</p>`;
}

// Blocos "PERDAS EM CXS UNITÁRIAS": como na planilha, com o sinal do SAP (negativo = perda; positivo = sobra).
// TOTAL CUSTO = soma dos valores do SAP; CUSTO P/ CX UNIT = TOTAL CUSTO ÷ TT PERDAS CX UNIT.
function blocoCx(titulo, volume, cx, rs, partes = null) {
  const lin = (rot, v, cls = '', parte = null) => `<tr class="${cls}"><td class="t">${rot}</td><td>${v}</td>${partes ? `<td class="pd-parte">${parte == null ? '' : pct(parte, 1)}</td>` : ''}</tr>`;
  return `<div class="tw"><table class="pd-tab pd-cx"><thead><tr><th class="t" colspan="${partes ? 3 : 2}">${titulo}</th></tr></thead><tbody>
${lin('VOLUME CX UNIT', cxi(volume))}
${lin('TT PERDAS CX UNIT', cxi(0 - cx), 'pd-amarelo', partes?.cx)}
${lin('%', pct(volume ? (0 - cx) / volume : null, 3))}
${lin('CUSTO P/ CX UNIT', brl(cx ? rs / cx : 0))}
${lin('TOTAL CUSTO', brl(0 - rs), 'pd-amarelo', partes?.rs)}
</tbody></table></div>`;
}

function quadroCx(d) {
  const t = d.totais, m = d.motivos;
  const bloco = (k, titulo) => blocoCx(titulo, t.volume, m[k].cx, m[k].rs, { cx: t.totalCx ? m[k].cx / t.totalCx : null, rs: t.total ? m[k].rs / t.total : null });
  return `${blocoCx('Perdas em CXS unitárias', t.volume, t.totalCx, t.total)}
<div class="pd-quatro">${bloco('ESTOQUE', 'Estoque')}${bloco('ROTA', 'Rota')}${bloco('TRANSPORTE', 'Transporte')}${bloco('INVENTARIO', 'Inventário')}</div>
<p class="small">Neste quadro vale o sinal do SAP, como na planilha: negativo = perda, positivo = sobra. Nas tabelas de categoria e produto, perda é positiva.</p>`;
}

export function paginaDLPerdas(c, d, { mes, admin, topo }) {
  if (!d || !d.temDados) return `${topo}<div class="aviso">Sem dados de perdas de ${E(DLS_PERDAS[c])} em ${nomeMes(mes)}.</div>`;
  const t = d.totais, m = d.motivos;
  const kpi = `<table class="kv"><tbody>
<tr><td>Perdas rota + estoque (KPI)</td><td>${frc(t.rotaEstoque)}</td></tr>
<tr><td>% do faturamento acumulado</td><td>${fp2(t.pctKPI)}</td></tr>
<tr><td>Faturamento acumulado</td><td>${frc(t.faturamento)} <span class="small">${E(d.fontes?.faturamento || '')}</span></td></tr>
<tr><td>Volume do DL (CX UNIT)</td><td>${fcx(t.volume)} <span class="small">${E(d.fontes?.volume || '')}</span></td></tr>
<tr><td>% sobre a tendência (como era)</td><td>${fp2(t.pctKPITendencia)} <span class="small">faturamento tendência ${frc(t.fatTendencia)}</span></td></tr>
${t.ajustePreco ? `<tr><td>Perdas fech. op.</td><td>${frc(t.fechamentoOp)} <span class="small">ajuste de preço ${frc(t.ajustePreco)}</span></td></tr>` : ''}
${m.VERIFICAR.linhas ? `<tr><td>Outros tipos de movimento (fora do total)</td><td>${frc(m.VERIFICAR.rs)} <span class="small">${fi(m.VERIFICAR.linhas)} linha(s)</span></td></tr>` : ''}
</tbody></table>`;
  const dias = d.porDia?.length ? `<h3>Por dia de lançamento (MB59)</h3><div class="tw scroll"><table><thead><tr><th class="t">Dia</th><th>Rota</th><th>Estoque</th><th>Transporte</th><th>Total</th></tr></thead><tbody>
${d.porDia.map((x) => `<tr><td class="t">${fdata(x.data)}</td><td>${frc(x.ROTA)}</td><td>${frc(x.ESTOQUE)}</td><td>${frc(x.TRANSPORTE)}</td><td>${frc(x.ROTA + x.ESTOQUE + x.TRANSPORTE)}</td></tr>`).join('')}</tbody></table></div>` : '';
  const semCad = admin && Array.isArray(d.semCadastro) && d.semCadastro.length ? `<section class="bloco"><div class="faixa">Materiais sem cadastro de produto</div><div class="corpo">${tabelaSemCadastro(d.semCadastro.map((s) => ({ ...s, c })), mes)}</div></section>` : '';
  return `${topo}${admin ? avisosPerdas(c, d, mes) : ''}
<div class="pd-titulo"><b>PERDAS DE ESTOQUE ${TITULO_DL[c]}</b>${d.ultimoDia ? `<span>ATUALIZADO DIA: ${fdata(d.ultimoDia)}</span>` : ''}</div>
<p><button class="btn" id="exportarPD">⬇ Exportar planilha (.xlsx)</button> <span id="msgPD" class="small"></span></p>
<div class="pd-planilha"><div class="pd-esq">${quadroCategorias(c, d)}${quadroProdutos(d)}</div><div class="pd-dir">${quadroCx(d)}</div></div>
${semCad}<details class="pd-mais"><summary>KPI e perdas por dia</summary>${kpi}${dias}</details>`;
}

// ---------------------------------------------------------------- telas (Firestore)
async function topoPerdas(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? mesesAdmin(mes, await P.mesesPerdasPublicados()) : await P.mesesPerdasPublicados());
    meses.add(mes);
    sel = seletorMes([...meses].sort().reverse(), mes);
    if (ctx.adminNaTela() && ['CBAR', 'CCRT'].includes(aba)) {
      sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
    }
  }
  return `<h1>Perdas de estoque — ${E(titulo)}</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasPerdas(aba, mes, ctx.adminNaTela())}`;
}
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
async function resultadoPerdas(ctx, mes) {
  if (rascunho(ctx)) return P.calcularPerdasAoVivo(mes);
  const x = await P.lerPerdasPublicado(mes);
  return { ...x, atualizado: x.publicadoEm };
}
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };

async function telaDL(ctx, c, mes) {
  ctx.html('<p class="small">Calculando perdas…</p>');
  const topo = await topoPerdas(ctx, c, mes, DLS_PERDAS[c]), r = await resultadoPerdas(ctx, mes);
  ctx.html(paginaDLPerdas(c, r.dls?.[c], { mes, admin: rascunho(ctx), topo }));
  status(r.atualizado); ctx.ligarTopo((m) => `#/perdas/${c}/${m}`);
  const exp = document.getElementById('exportarPD');
  if (exp) exp.onclick = async () => {
    const msg = document.getElementById('msgPD');
    exp.disabled = true; msg.textContent = 'Montando a planilha…';
    try { await baixarPerdas(c, r.dls[c], mes); msg.textContent = '✓ planilha gerada'; } catch (err) { msg.innerHTML = ctx.erro(err); }
    exp.disabled = false;
  };
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
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Conteúdo</th><th>MB59</th><th>Inventário</th><th class="t">Mês</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/perdas/CBAR/${mes}">Conferir rascunho</a></p>`;
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
${campo(c, 'volume', 'Volume CX UNIT (vazio = Montagem)', mo.acm ?? x.dados[c]?.volumePlanilha, 'ACM do mês na Montagem de Cargas')}
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
  const topo = await topoPerdas(ctx, 'publicar', mes, `Publicar · ${nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/perdas/CBAR/${mes}`;
  ctx.html(`${topo}<p>Publica os totais por motivo, categoria, produto e dia. A lista de materiais sem cadastro não vai para os leitores.</p><p><a class="btn sec" href="#/perdas/CBAR/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar perdas ${nomeMes(mes)}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input type="text" readonly value="${E(link)}" style="width:100%;max-width:640px"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await P.publicarPerdas(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((m) => `#/perdas/publicar/${m}`);
}

// p = partes da rota (#/perdas/<sub>/<mes>)
export async function rotearPerdas(p, ctx) {
  const sub = p[1], mes = ctx.mesP(p[2]) || (ctx.adminNaTela() ? ctx.mesAtual() : (await P.mesesPerdasPublicados())[0] || ctx.mesAtual());
  // Sem tela de resumo: abre direto a primeira DL (Barreiras).
  if (!sub || sub === 'resumo' || sub === 'CBAR') return telaDL(ctx, 'CBAR', mes);
  if (DLS_PERDAS[sub]) return telaDL(ctx, sub, mes);
  if (!ctx.adminNaTela()) return ctx.html('<p>Área restrita ao administrador.</p>');
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'parametros') return telaParametros(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  return telaDL(ctx, 'CBAR', mes);
}
