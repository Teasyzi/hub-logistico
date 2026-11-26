// Telas do Transportes 1x1: RESUMO (como a aba da planilha) e uma aba por unidade (indicador, por dia, por motorista e
// a lista de cargas, que o leitor vê só para consulta e o admin confere e edita). ⚙ Particularidades: lista para os
// supervisores, com o possível editável. As funções pagina* são puras (dados → HTML) e servem à prévia local.
import { E, fi, fd, fp, fdata, nomeMes, seletorMes, mesesAdmin } from './views.js?v=20261126-12';
import { UNIDADES_TX, DAS_TX, META_CUB_TX, FAIXA_ABONO_TX, lerArquivoTX, textoForaTX, resumoTX } from './transportes.js?v=20261126-12';
import * as T from './dados_transportes.js?v=20261126-12';
import { baixarTransportes } from './exportar_transportes.js?v=20261126-12';
import * as D from './dados.js?v=20261126-12';

const ABA_PADRAO = 'resumo';
const f2 = (x) => fd(x, 2);
const fcub = (x) => (x == null ? '–' : fd(x, 2));
const farol = (dif) => (dif == null ? '' : dif <= 1e-9 ? 'c-ok' : 'c-no');
// Regra das setas: sinal positivo = ▲ verde; negativo = ▼ vermelho.
const seta = (dif) => (dif == null ? '' : dif >= 0 ? '<span class="t-up">▲</span>' : '<span class="t-down">▼</span>');
const ehDA = (u) => DAS_TX.includes(u);
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
const ROTULO_RESUMO = { NORTE: 'DA - CB NORTE', SUL: 'DA - CB SUL', CBAR: 'DL - BARREIRAS', CCRT: 'DL - JUAZEIRO' };

export function abasTX(ativa, mes, admin) {
  const a = [['resumo', 'RESUMO', `#/transportes/resumo/${mes}`], ...Object.entries(UNIDADES_TX).map(([u, n]) => [u, n.toUpperCase(), `#/transportes/${u}/${mes}`])];
  const adm = admin ? [['particularidades', 'Particularidades', `#/transportes/particularidades/${mes}`], ['importar', 'Importar', `#/transportes/importar/${mes}`], ['publicar', 'Publicar', `#/transportes/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// ---------------------------------------------------------------- RESUMO
export function paginaResumoTX(r, { mes, admin, topo }) {
  const us = Object.keys(UNIDADES_TX).map((u) => r.unidades?.[u]).filter(Boolean);
  if (!us.some((d) => d.temDados)) return `${topo}<div class="aviso">Sem cargas do 1x1 em ${nomeMes(mes)}.${admin ? ` <a href="#/transportes/importar/${mes}">Importar</a>` : ''}</div>`;
  const g = r.geral || resumoTX(r.unidades).geral;
  const lin = (d) => { const t = d.totais, ud = t.ultimoDia;
    return `<tr><td class="t"><a href="#/transportes/${d.unidade}/${mes}">${ROTULO_RESUMO[d.unidade]}</a></td><td>${f2(t.meta)}</td><td>${ud ? `${f2(ud.realizado)} <span class="small">(${fdata(ud.data)})</span>` : '–'}</td>
<td>${f2(t.realizado)}</td><td class="${farol(t.dif)}">${fp(t.dif)}</td><td>${fi(d.metaCub)}</td><td>${fi(t.cargas)}</td></tr>`; };
  const tabela = `<div class="tw scroll tx-resumo"><table><thead><tr><th class="t">Unidade</th><th>Meta + 5%</th><th>Dia anterior</th><th>Realizado</th><th>Dif.</th><th>Meta cubagem</th><th>Cargas</th></tr></thead><tbody>
${us.map(lin).join('')}
<tr class="tot"><td class="t">GERAL</td><td>${f2(g.meta)}</td><td>${f2(g.diaAnterior)}</td><td>${f2(g.realizado)}</td><td>${fp(g.dif)}</td><td>${fi(g.metaCub)}</td><td>${fi(g.cargas)}</td></tr></tbody></table></div>`;
  const pend = admin ? us.filter((d) => d.totais.pendentes || d.totais.excesso || d.semCadastro?.length).map((d) => `<li><a href="#/transportes/${d.unidade}/${mes}">${E(d.nome)}</a>: ${[
    d.totais.pendentes && `${fi(d.totais.pendentes)} carga(s) sem ajudantes ou cubagem`, d.totais.excesso && `${fi(d.totais.excesso)} acima do possível`,
    d.semCadastro?.length && `${fi(d.semCadastro.length)} motorista(s) sem nome completo`].filter(Boolean).join(' · ')}</li>`).join('') : '';
  return `${topo}${tabela}
<p class="small">Meta + 5% = média dos possíveis por carga (1 ajudante até a meta de cubagem e 2 acima, × 1,05, com os abonos). Realizado = média de ajudantes por carga. Dif. = realizado ÷ meta − 1 (verde: dentro da meta). Dia anterior = ajudantes por carga no último dia lançado. GERAL = todas as cargas das 4 unidades.</p>
${pend ? `<div class="aviso"><b>Para conferir</b><ul>${pend}</ul></div>` : ''}`;
}

// ---------------------------------------------------------------- unidade
function tiles(d) {
  const t = d.totais, ud = t.ultimoDia;
  return `<div class="tiles">
<div class="tile"><div class="l">Meta (possíveis +5%)</div><div class="v">${f2(t.meta)}</div><div class="d">ajudantes por carga · cubagem ${fi(d.metaCub)}</div></div>
<div class="tile"><div class="l">Realizado</div><div class="v">${f2(t.realizado)}</div><div class="d">ajudantes por carga</div></div>
<div class="tile"><div class="l">Dif.</div><div class="v">${fp(t.dif)} ${seta(t.dif)}</div><div class="d">realizado ÷ meta − 1 · ${fi(t.cargas)} cargas</div></div>
<div class="tile"><div class="l">Dia anterior${ud ? ` (${fdata(ud.data)})` : ''}</div><div class="v">${ud ? f2(ud.realizado) : '–'}</div><div class="d">${ud ? `meta ${f2(ud.meta)} · ${fp(ud.dif, 1)} ${seta(ud.dif)}` : 'sem cargas'}</div></div></div>`;
}

function quadroDias(d) {
  const t = d.totais;
  const lin = (x) => `<tr><td class="t">${fdata(x.data)}</td><td>${fi(x.cargas)}</td><td>${f2(x.meta)}</td><td>${f2(x.realizado)}</td><td class="${farol(x.dif)}">${fp(x.dif, 1)}</td></tr>`;
  return `<section class="bloco"><div class="faixa">Por dia</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Dia</th><th>Cargas</th><th>Possíveis +5%</th><th>Ajudantes</th><th>Dif.</th></tr></thead><tbody>
${d.dias.map(lin).join('')}<tr class="tot"><td class="t">Mês</td><td>${fi(t.cargas)}</td><td>${f2(t.meta)}</td><td>${f2(t.realizado)}</td><td>${fp(t.dif, 1)}</td></tr></tbody></table></div></div></section>`;
}

function quadroMotoristas(d) {
  return `<section class="bloco tx-mot"><div class="faixa">Por motorista <span class="badge">${fi(d.motoristas.length)}</span></div><div class="corpo">${d.motoristas.length ? `<div class="tw scroll"><table><thead><tr><th class="t">Motorista</th><th>Cargas</th><th>Possíveis +5%</th><th>Ajudantes</th><th>Dif.</th></tr></thead><tbody>
${d.motoristas.map((m) => `<tr><td class="t">${E(m.nome)}</td><td>${fi(m.cargas)}</td><td>${f2(m.meta)}</td><td>${f2(m.realizado)}</td><td class="${farol(m.dif)}">${fp(m.dif, 1)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small">Sem cargas.</p>'}</div></section>`;
}

const classeCarga = (c) => (c.fora ? 'tx-fora' : c.pendente ? 'tx-pend' : c.abono === 'particularidade' ? 'tx-part' : c.abono === 'automatico' ? 'tx-auto' : '');
const tokensSit = (c) => [c.conta ? 'conta' : '', c.abono === 'automatico' ? 'auto' : '', c.abono === 'particularidade' ? 'part' : '', c.excesso ? 'excesso' : '',
  c.pendente ? 'pend' : '', c.fora ? 'fora' : '', c.semCadastro ? 'semcad' : '', c.ajManual || c.cubManual || c.possManual ? 'editada' : ''].filter(Boolean).join(' ');
function situacao(c) {
  const t = [];
  if (c.fora) t.push(`<span class="tag">${E(textoForaTX(c.fora))}${c.fora === 'repetida' && c.repeteLinha ? ` (linha ${c.repeteLinha})` : ''}${c.fora === 'juntada' && c.juntadaEm ? ` à linha ${c.juntadaEm}` : ''}</span>`);
  if (c.pendente) t.push(`<span class="tag">${E(c.pendente)}: lançar</span>`);
  if (c.abono === 'automatico') t.push('<span class="tag">abono automático</span>');
  if (c.abono === 'particularidade') t.push('<span class="tag">particularidade</span>');
  if (c.excesso && c.abono !== 'particularidade') t.push('<span class="tag">acima do possível</span>');
  if (c.fretesNoDia && !c.fora) t.push(`<span class="tag" title="Se for a mesma viagem: digite a cubagem somada numa linha e exclua as outras.">freteiro · ${c.fretesNoDia} linhas no dia</span>`);
  if (c.partes) t.push(`<span class="tag" title="${E(c.partes.map((p) => `linha ${p.linha}: ${p.rota} (${fcub(p.cub)})`).join(' + '))}">${c.partes.length} linhas juntadas</span>`);
  if (c.semCadastro) t.push(`<span class="tag" title="Na fonte: ${E(c.motoristaArquivo)}">sem nome completo</span>`);
  return t.join(' ');
}
const ident = (u, c) => (ehDA(u) ? `<td class="t">${E(c.rota)}</td><td class="t">${E(c.placa)}</td>`
  : `<td class="t">${E(c.transporte)}${c.bloco ? ` <span class="small">${E(c.bloco)}</span>` : ''}${c.rota ? `<br><span class="small">${E(c.rota)}</span>` : ''}</td><td class="t">${E(c.placa || '')}</td>`);
const numTela = (v, casas = null) => (v == null ? '' : (casas == null ? String(Math.round(v * 100) / 100) : v.toFixed(casas)).replace('.', ','));
// Campo editável com o valor que vale; se foi alterado à mão, fica destacado e mostra o valor original embaixo.
function campoNum(nome, valor, original, manual, rotuloOrig) {
  const casas = nome === 'poss' ? 2 : null, o = original == null ? 'vazio' : numTela(original, casas);
  return `<input type="text" inputmode="decimal" class="${manual ? 'alt' : ''}" data-campo="${nome}" data-orig="${original == null ? '' : original}" value="${numTela(valor, casas)}"
 title="${manual ? `Alterado à mão. ${rotuloOrig}: ${o}. Apague para voltar.` : `Digite para alterar (${rotuloOrig}: ${o}).`}">${manual ? `<span class="orig">${rotuloOrig}: ${o}</span>` : ''}`;
}

function filtros(u, d, admin) {
  const dias = [...new Set(d.cargas.map((c) => c.data))];
  const mots = [...new Set(d.cargas.map((c) => c.motorista).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const sit = [['', 'Todas as situações'], ['conta', 'Contam no indicador'], ['excesso', 'Acima do possível'], ['auto', 'Abono automático'], ['part', 'Particularidade (abonada)'],
    ['pend', 'Falta lançar (sem ajudantes/cubagem)'], ['fora', 'Fora da conta (riscadas)'], ['editada', 'Editadas à mão'], ['semcad', 'Motorista sem nome completo']];
  return `<div class="filtros-tx" data-u="${u}">
<label>Dia <select data-f="dia"><option value="">Todos</option>${dias.map((x) => `<option value="${x}">${fdata(x)}</option>`).join('')}</select></label>
<label>Motorista <select data-f="mot"><option value="">Todos</option>${mots.map((m) => `<option value="${E(norm(m))}">${E(m)}</option>`).join('')}</select></label>
${admin ? `<label>Situação <select data-f="sit">${sit.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>` : ''}
<label>Buscar <input type="text" data-f="txt" placeholder="${ehDA(u) ? 'rota ou placa' : 'transporte ou percurso'}"></label>
<span class="small" data-f="n"></span></div>`;
}

function quadroCargas(u, d, admin) {
  const lista = admin ? d.cargas : d.cargas.filter((c) => c.conta);
  if (!lista.length) return '';
  const linA = (c) => `<tr class="${classeCarga(c)}" data-u="${u}" data-k="${E(c.chave)}" data-dia="${c.data}" data-mot="${E(norm(c.motorista))}" data-sit="${tokensSit(c)}" data-txt="${E(norm([c.rota, c.placa, c.transporte].join(' ')))}">
<td class="t">${fdata(c.data)}</td>${ident(u, c)}<td class="t">${E(c.motorista)}</td>
<td class="ed">${campoNum('cub', c.cub, c.cubOrigem, c.cubManual, 'fonte')}</td>
<td class="ed">${campoNum('aj', c.aj, c.ajOrigem, c.ajManual, 'fonte')}</td>
<td class="ed">${campoNum('poss', c.poss, c.possAuto, c.possManual, 'calculado')}</td>
<td class="t">${situacao(c)}</td><td class="ed"><input type="text" class="obs" data-campo="obs" value="${E(c.obs)}"></td>
<td class="ed">${c.foraFonte === 'repetida' ? `<label class="chk"><input type="checkbox" data-campo="incluir" ${c.fora ? '' : 'checked'}> contar</label>` : `<label class="chk"><input type="checkbox" data-campo="excluir" ${c.fora === 'excluida' ? 'checked' : ''}> excluir</label>`}</td><td class="st-salvo"></td></tr>`;
  const linL = (c) => `<tr data-dia="${c.data}" data-mot="${E(norm(c.motorista))}" data-txt="${E(norm([c.rota, c.placa, c.transporte].join(' ')))}">
<td class="t">${fdata(c.data)}</td>${ident(u, c)}<td class="t">${E(c.motorista)}</td><td>${fcub(c.cub)}</td><td>${fi(c.aj)}</td><td>${f2(c.poss)}</td><td class="${c.dif > 1e-9 ? 'c-no' : ''}">${fd(c.dif, 2)}</td></tr>`;
  const cab = `<th class="t">Dia</th><th class="t">${ehDA(u) ? 'Rota' : 'Transporte'}</th><th class="t">Placa</th><th class="t">Motorista</th><th>Cubagem</th><th>Ajudantes</th><th>Possível +5%</th>${admin ? '' : '<th>Dif.</th>'}`;
  return `<section class="bloco"><div class="faixa">${admin ? 'Cargas · conferência do admin' : 'Cargas do mês'}</div><div class="corpo">
${filtros(u, d, admin)}${admin ? legendaCargas() : ''}
<div class="tw scroll"><table class="tx-cargas${admin ? ' adm' : ''}"><thead><tr>${cab}${admin ? '<th class="t">Situação</th><th class="t">Observação</th><th class="t">Conta</th><th></th>' : ''}</tr></thead>
<tbody>${lista.map(admin ? linA : linL).join('')}</tbody></table></div>
<p class="small">${admin ? 'Cubagem, ajudantes e possível mostram o valor que vale. Para corrigir, digite por cima: a célula fica destacada e mostra o valor original embaixo. Apague (ou volte ao original) para desfazer. Cada mudança é salva na hora e recalcula a tela.'
    : 'Cargas que contam no indicador. Possível +5% = 1,05 até a meta de cubagem e 2,10 acima; Dif. = ajudantes − possível (vermelho: acima do possível).'}</p></div></section>`;
}
const legendaCargas = () => `<div class="legenda"><span><i class="tx-auto"></i>abono automático (até ${FAIXA_ABONO_TX} abaixo da meta)</span><span><i class="tx-part"></i>abonada por particularidade (possível editado)</span>
<span><i class="tx-pend"></i>falta lançar ajudantes ou cubagem (fora da conta)</span><span><i class="tx-fora"></i>fora da conta (repetida, juntada, carreta, equipamento, excluída)</span></div>`;

function avisos(u, d, mes) {
  const t = d.totais, it = [];
  if (!d.temDados) it.push(`Sem cargas de ${E(d.nome)} em ${nomeMes(mes)}. <a href="#/transportes/importar/${mes}">Importar ${ehDA(u) ? 'a montagem' : 'a escala'}</a>`);
  if (t.pendentes) it.push(`<b>${fi(t.pendentes)} carga(s) sem ajudantes ou sem cubagem</b> na fonte: ficam fora da conta até você lançar (filtro "Falta lançar").`);
  if (d.semCadastro?.length) it.push(`<b>${fi(d.semCadastro.length)} motorista(s) sem nome completo</b> (${d.semCadastro.slice(0, 6).map((m) => E(m.nome)).join(', ')}${d.semCadastro.length > 6 ? '…' : ''}): <a href="#/transportes/importar/${mes}">completar em ⚙ Importar</a>.`);
  if (t.excesso) it.push(`${fi(t.excesso)} carga(s) com ajudantes acima do possível: estão em <a href="#/transportes/particularidades/${mes}">⚙ Particularidades</a>.`);
  if (t.automatico) it.push(`${fi(t.automatico)} carga(s) com abono automático (cubagem de ${fi(d.metaCub - FAIXA_ABONO_TX)} a ${fi(d.metaCub)} e 2 ajudantes ou mais: possível 2,10).`);
  if (t.fora) it.push(`${fi(t.fora)} linha(s) fora da conta (repetida, juntada, carreta, equipamento ou excluída), riscadas na lista.`);
  if (t.cargas && t.metaRegra != null && Math.abs(t.meta - t.metaRegra) > 1e-9) it.push(`Sem os abonos, a meta seria ${f2(t.metaRegra)} e a dif. ${fp(t.difRegra)}.`);
  return it.map((x) => `<div class="aviso">${x}</div>`).join('');
}

export function paginaUnidadeTX(u, d, { mes, admin, topo }) {
  if (!d || (!d.temDados && !admin)) return `${topo}<div class="aviso">Sem cargas de ${E(UNIDADES_TX[u])} em ${nomeMes(mes)}.</div>`;
  if (!d.temDados) return `${topo}${avisos(u, d, mes)}`;
  return `${topo}${tiles(d)}${admin ? avisos(u, d, mes) : ''}<div class="g2 tx-lado">${quadroDias(d)}${quadroMotoristas(d)}</div>${quadroCargas(u, d, admin)}`;
}

// ---------------------------------------------------------------- particularidades
const doMesComExcesso = (r) => Object.fromEntries(Object.keys(UNIDADES_TX).map((u) => [u, (r.unidades[u]?.cargas || []).filter((c) => c.excesso)]));
export function paginaParticularidadesTX(r, { mes, topo }) {
  const por = doMesComExcesso(r);
  const total = Object.values(por).reduce((a, l) => a + l.length, 0);
  const bloco = (u) => {
    const l = por[u];
    const linha = (c) => `<tr class="${classeCarga(c)}" data-u="${u}" data-k="${E(c.chave)}"><td class="t">${fdata(c.data)}</td>${ident(u, c)}<td class="t">${E(c.motorista)}</td>
<td>${fcub(c.cub)}</td><td>${fi(c.aj)}</td><td class="ed">${campoNum('poss', c.poss, c.possAuto, c.possManual, 'calculado')}</td><td class="ed"><input type="text" class="obs" data-campo="obs" value="${E(c.obs)}"></td><td class="st-salvo"></td></tr>`;
    return `<section class="bloco"><div class="faixa">${E(UNIDADES_TX[u])} <span class="badge">${fi(l.length)} carga(s)</span></div><div class="corpo">${l.length
      ? `<div class="tw scroll"><table class="tx-cargas adm"><thead><tr><th class="t">Dia</th><th class="t">${ehDA(u) ? 'Rota' : 'Transporte'}</th><th class="t">Placa</th><th class="t">Motorista</th><th>Cubagem</th><th>Ajudantes</th><th>Possível +5%</th><th class="t">Motivo / observação</th><th></th></tr></thead><tbody>${l.map(linha).join('')}</tbody></table></div>`
      : '<p class="small">Nenhuma carga acima do possível.</p>'}</div></section>`;
  };
  return `${topo}<p class="sub">Cargas que saíram com mais ajudantes que o possível (regra da cubagem + abono automático). Mande a lista aos supervisores; com o motivo de cada carga, digite o novo possível nas que forem abonadas (ficam em vermelho-escuro e passam a contar com o possível editado). A lista só informa: sem a edição, o indicador não muda.</p>
<p><button class="btn" id="baixarPart" ${total ? '' : 'disabled'}>Baixar particularidades (.xlsx)</button> <span class="small">${fi(total)} carga(s) em ${nomeMes(mes)} · uma aba por unidade, com a coluna de motivo em branco para o supervisor</span></p>
${legendaCargas()}<div class="pes-dls">${Object.keys(UNIDADES_TX).map(bloco).join('')}</div>`;
}

export function exportarParticularidadesTX(r, mes) {
  const por = doMesComExcesso(r), wb = XLSX.utils.book_new();
  for (const [u, l] of Object.entries(por)) {
    const da = ehDA(u);
    const cab = ['DATA', ...(da ? ['DESCRIÇÃO DA ROTA', 'PLACA'] : ['TRANSPORTE']), 'MOTORISTA', 'CUBAGEM', 'AJUDANTES', 'POSSÍVEIS +5%', 'POSSÍVEL EDITADO', 'MOTIVO / OBSERVAÇÃO'];
    const linhas = l.map((c) => [fdata(c.data), ...(da ? [c.rota, c.placa] : [c.transporte]), c.motorista, c.cub, c.aj, c.possAuto, c.possManual ? c.poss : null, c.obs || null]);
    const ws = XLSX.utils.aoa_to_sheet([[`${UNIDADES_TX[u].toUpperCase()} · META 1X1 ${META_CUB_TX[u]} CUBOS · ${nomeMes(mes).toUpperCase()}`], cab, ...linhas]);
    ws['!cols'] = cab.map((h) => ({ wch: /ROTA|MOTORISTA|MOTIVO/.test(h) ? 34 : 14 }));
    XLSX.utils.book_append_sheet(wb, ws, UNIDADES_TX[u].toUpperCase());
  }
  XLSX.writeFile(wb, `Particularidades 1x1 - ${nomeMes(mes).replace('/', ' ')}.xlsx`);
}

// ---------------------------------------------------------------- comportamento (edição e filtros)
const lerNum = (s) => { const t = String(s).trim(); if (!t) return null; const x = Number(t.replace(/\./g, '').replace(',', '.')); if (!Number.isFinite(x)) throw new Error(`Número inválido: ${t}`); return x; };
// Edição (cargas e particularidades): cada campo salva na hora. Voltar ao valor original apaga o ajuste.
export function ligarEdicaoTX(raiz, { mes, salvar, depois, erro }) {
  raiz.querySelectorAll('tr[data-k] [data-campo]').forEach((el) => {
    el.addEventListener('change', async () => {
      const tr = el.closest('tr'), st = tr.querySelector('.st-salvo'), k = el.dataset.campo;
      try {
        let v = el.type === 'checkbox' ? el.checked : k === 'obs' ? el.value.trim() : lerNum(el.value);
        if (typeof v === 'number' && el.dataset.orig !== '' && Math.abs(v - Number(el.dataset.orig)) < 1e-9) v = null;
        if (st) st.innerHTML = '<span class="small">salvando…</span>';
        await salvar(tr.dataset.u, mes, tr.dataset.k, { [k]: v });
        await depois();
      } catch (e) { if (st) st.innerHTML = erro(e); }
    });
  });
}
// Filtros da lista de cargas (leitor e admin). Lembra a escolha enquanto a aba do navegador estiver aberta.
export function ligarFiltrosTX(raiz) {
  const box = raiz.querySelector('.filtros-tx');
  if (!box) return;
  const chaveSS = `txFiltros_${box.dataset.u}`, f = (n) => box.querySelector(`[data-f="${n}"]`);
  try { const s = JSON.parse(sessionStorage.getItem(chaveSS) || '{}'); for (const [n, v] of Object.entries(s)) { const el = f(n); if (el && (el.tagName !== 'SELECT' || [...el.options].some((o) => o.value === v))) el.value = v; } } catch { /* sem storage */ }
  const aplicar = () => {
    const dia = f('dia')?.value || '', mot = f('mot')?.value || '', sit = f('sit')?.value || '', txt = norm(f('txt')?.value || '');
    let n = 0, tot = 0;
    raiz.querySelectorAll('.tx-cargas tr[data-dia]').forEach((tr) => {
      tot++;
      const ok = (!dia || tr.dataset.dia === dia) && (!mot || tr.dataset.mot === mot) && (!sit || (tr.dataset.sit || '').split(' ').includes(sit)) && (!txt || tr.dataset.txt.includes(txt));
      tr.hidden = !ok; if (ok) n++;
    });
    f('n').textContent = `${fi(n)} de ${fi(tot)} linha(s)`;
    try { sessionStorage.setItem(chaveSS, JSON.stringify({ dia, mot, sit, txt: f('txt')?.value || '' })); } catch { /* sem storage */ }
  };
  box.querySelectorAll('select').forEach((s) => { s.onchange = aplicar; });
  f('txt').oninput = aplicar;
  aplicar();
}

// ---------------------------------------------------------------- telas (Firestore)
async function topoTX(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? mesesAdmin(mes, await T.mesesTXPublicados()) : await T.mesesTXPublicados());
    meses.add(mes);
    sel = seletorMes([...meses].sort().reverse(), mes);
    if (ctx.adminNaTela() && (UNIDADES_TX[aba] || aba === 'resumo')) {
      sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
    }
  }
  return `<h1>Transportes 1x1</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasTX(aba, mes, ctx.adminNaTela())}`;
}
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };
const manterRolagem = async (f) => { const y = window.scrollY; await f(); window.scrollTo(0, y); };

// Botão da exportação do mês (RESUMO e as 4 unidades), igual à planilha. r precisa ter as cargas de todas as unidades.
const BOTAO_TX = '<p><button class="btn" id="exportarTX">⬇ Exportar planilha do mês (.xlsx)</button> <span id="msgTX" class="small"></span></p>';
function ligarExportacaoTX(r, mes) {
  const b = document.getElementById('exportarTX');
  if (b) b.onclick = async () => {
    const msg = document.getElementById('msgTX');
    b.disabled = true; msg.textContent = 'Montando a planilha…';
    try { await baixarTransportes(r, mes); msg.textContent = '✓ planilha gerada'; } catch (err) { msg.textContent = err.message; }
    b.disabled = false;
  };
}

async function telaResumo(ctx, mes) {
  ctx.html('<p class="small">Calculando…</p>');
  const topo = await topoTX(ctx, 'resumo', mes, `Resumo · ${nomeMes(mes)}`);
  const r = rascunho(ctx) ? await T.calcularTXAoVivo(mes) : await T.lerTXPublicado(mes);
  const vazio = !rascunho(ctx) && !Object.keys(r.unidades).length;
  ctx.html(vazio ? `${topo}<div class="aviso">O 1x1 de ${nomeMes(mes)} ainda não foi publicado.</div>` : paginaResumoTX(r, { mes, admin: rascunho(ctx), topo: topo + BOTAO_TX }));
  ligarExportacaoTX(r, mes);
  status(r.atualizado || r.publicadoEm); ctx.ligarTopo((m) => `#/transportes/resumo/${m}`);
}

async function telaUnidade(ctx, u, mes) {
  ctx.html('<p class="small">Calculando…</p>');
  const topo = await topoTX(ctx, u, mes, `${UNIDADES_TX[u]} · ${nomeMes(mes)}`);
  if (!rascunho(ctx)) {
    const x = await T.lerTXPublicado(mes), d = x.unidades[u];
    ctx.html(d?.temDados ? paginaUnidadeTX(u, { ...d, motoristas: d.motoristas || [], cargas: d.cargas || [] }, { mes, admin: false, topo: topo + BOTAO_TX }) : `${topo}<div class="aviso">O 1x1 de ${E(UNIDADES_TX[u])} em ${nomeMes(mes)} ainda não foi publicado.</div>`);
    status(x.publicadoEm); ctx.ligarTopo((m) => `#/transportes/${u}/${m}`); ligarFiltrosTX(document);
    ligarExportacaoTX(x, mes);
    return;
  }
  const desenhar = async () => {
    const r = await T.calcularTXAoVivo(mes);
    ctx.html(paginaUnidadeTX(u, r.unidades[u], { mes, admin: true, topo: topo + BOTAO_TX }) + (r.arquivos[u]?.length ? `<p class="small">Fonte: ${E(r.arquivos[u].join(', '))}.</p>` : ''));
    status(r.atualizado); ctx.ligarTopo((m) => `#/transportes/${u}/${m}`);
    ligarFiltrosTX(document);
    ligarExportacaoTX(r, mes);
    ligarEdicaoTX(document, { mes, salvar: T.gravarAjusteTX, depois: () => manterRolagem(desenhar), erro: ctx.erro });
  };
  await desenhar();
}

async function telaParticularidades(ctx, mes) {
  const topo = await topoTX(ctx, 'particularidades', mes, `Particularidades · ${nomeMes(mes)}`);
  const desenhar = async () => {
    const r = await T.calcularTXAoVivo(mes);
    ctx.html(paginaParticularidadesTX(r, { mes, topo }));
    status(r.atualizado); ctx.ligarTopo((m) => `#/transportes/particularidades/${m}`);
    document.getElementById('baixarPart').onclick = () => exportarParticularidadesTX(r, mes);
    ligarEdicaoTX(document, { mes, salvar: T.gravarAjusteTX, depois: () => manterRolagem(desenhar), erro: ctx.erro });
  };
  await desenhar();
}

function historico(imps) {
  const q = (r) => (r.em?.toDate ? r.em.toDate().toLocaleString('pt-BR') : '');
  const l = imps.length ? imps.map((r) => `<tr><td class="t">${q(r)}</td><td class="t">${E(r.arquivo)}</td><td class="t">${E(r.tipo)}</td><td>${r.linhas ?? ''}</td><td class="t">${E(r.periodo || '')}</td><td class="t">${E(r.por || '')}</td></tr>`).join('')
    : '<tr><td colspan="6" class="t small">Ainda não há importações do 1x1.</td></tr>';
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Linhas</th><th class="t">Dias</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

// Motoristas sem nome completo no mês: o admin digita o nome, que fica no cadastro do 1x1 (vale para todos os meses).
export function quadroCadastroTX(r) {
  const us = Object.keys(UNIDADES_TX).filter((u) => r.unidades[u]?.semCadastro?.length);
  if (!us.length) return '<p class="small">Todos os motoristas do mês têm nome completo.</p>';
  return us.map((u) => `<section class="bloco"><div class="faixa">${E(UNIDADES_TX[u])}</div><div class="corpo"><div class="tw scroll"><table class="tx-cad"><thead><tr><th class="t">Nome no arquivo</th><th>Cargas</th><th class="t">Nome completo</th></tr></thead><tbody>
${r.unidades[u].semCadastro.map((m) => `<tr><td class="t">${E(m.nome)}</td><td>${fi(m.cargas)}</td><td class="t"><input type="text" data-u="${u}" data-ap="${E(m.nome)}" list="nomes_${u}"></td></tr>`).join('')}</tbody></table></div></div></section>`).join('');
}

async function telaImportar(ctx, mes) {
  const topo = await topoTX(ctx, 'importar', mes, 'Importar arquivos', false);
  ctx.html(`${topo}<p class="sub">CB Norte e CB Sul: a planilha "MONTAGEM DAS CARGAS" de cada unidade (abas diárias, colunas Ajudantes e Cubagem; só entram as ROTAS DO DIA). DL Barreiras: "TRANSPORTE 1X1 E 1X2". DL Juazeiro: a ESCALA de motoristas e auxiliares. A unidade é reconhecida pelo arquivo.
Para os nomes completos dos motoristas, importe também a planilha antiga do 1x1 ("Acompanhamento de transportes - 1x1"): o Hub lê o de-para da aba Planilha1.</p>
<div class="modelo-box"><label>Mês de referência <input id="mesArq" type="month" value="${mes}"></label> <span class="small">usado quando a aba traz só o dia (montagem Sul: "04", "05"…)</span></div>
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou selecione</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div><div id="res"></div>
<p class="small">Reimportar substitui os dias que o arquivo traz. Os ajustes feitos à mão (ajudantes, possível, observação) ficam guardados por carga e continuam valendo.</p>
<h2 id="cadastro">Motoristas sem nome completo em ${nomeMes(mes)}</h2><div id="cad"><p class="small">Carregando…</p></div>
<h2>Últimas importações do 1x1</h2><div id="hist">${historico(await D.ultimasImportacoes('transportes'))}</div>`);
  const desenharCadastro = async () => {
    const r = await T.calcularTXAoVivo(mes);
    const nomes = Object.fromEntries(Object.keys(UNIDADES_TX).map((u) => [u, [...new Set((r.unidades[u]?.cargas || []).filter((c) => !c.semCadastro).map((c) => c.motorista))]]));
    document.getElementById('cad').innerHTML = `${quadroCadastroTX(r)}${Object.entries(nomes).map(([u, l]) => `<datalist id="nomes_${u}">${l.map((n) => `<option value="${E(n)}">`).join('')}</datalist>`).join('')}
${Object.values(r.unidades).some((d) => d.semCadastro?.length) ? '<p><button class="btn" id="salvarCad">Salvar nomes</button> <span id="msgCad"></span></p>' : ''}`;
    const b = document.getElementById('salvarCad');
    if (b) b.onclick = async () => {
      b.disabled = true;
      try {
        const novos = {};
        for (const i of document.querySelectorAll('#cad input[data-ap]')) if (i.value.trim()) (novos[i.dataset.u] ??= {})[i.dataset.ap] = i.value.trim().toUpperCase();
        const n = await T.gravarCadastroTX(novos);
        await desenharCadastro();
        document.getElementById('msgCad') && (document.getElementById('msgCad').innerHTML = `<span class="st ok">✓ ${fi(n)} nome(s) salvo(s)</span>`);
      } catch (e) { document.getElementById('msgCad').innerHTML = ctx.erro(e); b.disabled = false; }
    };
  };
  desenharCadastro().catch((e) => { document.getElementById('cad').innerHTML = ctx.erro(e); });
  const processar = async (files) => {
    const mesArq = document.getElementById('mesArq').value;
    let rows = '', ultimo = mesArq, abaUlt = ABA_PADRAO;
    for (const f of files) {
      try {
        if (!/^\d{4}-\d{2}$/.test(mesArq)) throw new Error('Escolha o mês de referência.');
        const x = lerArquivoTX(XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false }), mesArq, f.name);
        if (x.cadastro) {
          const n = await T.gravarCadastroTX(x.cadastro);
          await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: n, periodo: '', acompanhamento: 'transportes' });
          rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo)}</td><td class="t">${Object.keys(x.cadastro).map((u) => UNIDADES_TX[u]).join(', ')}</td><td class="t">–</td><td>${fi(n)} nomes</td><td></td><td></td><td class="st ok">Importado</td></tr>`;
          continue;
        }
        if (!x.tipo) throw new Error('Não reconheci o arquivo: esperava a montagem Norte/Sul (Placa, Ajudantes, Cubagem), o "TRANSPORTE 1X1 E 1X2" de Barreiras, a ESCALA de Juazeiro ou a planilha antiga do 1x1 (aba Planilha1).');
        const n = await T.gravarCargasTX(x.unidade, x.cargas, f.name);
        const conta = x.cargas.filter((c) => !c.fora).length, fora = x.cargas.length - conta, sem = x.cargas.filter((c) => !c.fora && (!c.aj || c.cub == null)).length;
        const periodo = `${fdata(x.dias[0])} a ${fdata(x.dias.at(-1))}`;
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: conta, periodo, acompanhamento: 'transportes' });
        ultimo = x.dias.at(-1).slice(0, 7); abaUlt = x.unidade;
        rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo)}</td><td class="t">${E(UNIDADES_TX[x.unidade])}</td><td class="t">${n} dia(s): ${periodo}</td><td>${fi(conta)}</td><td>${fi(fora)}</td><td>${fi(sem)}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${E(f.name)}</td><td colspan="7" class="st no">${E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Unidade</th><th class="t">Dias</th><th>Cargas</th><th>Fora</th><th>Sem ajudantes / cubagem</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/transportes/${abaUlt}/${ultimo}">Conferir rascunho</a></p>`;
    document.getElementById('hist').innerHTML = historico(await D.ultimasImportacoes('transportes'));
    desenharCadastro().catch(() => {});
  };
  const drop = document.getElementById('drop');
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

async function telaPublicar(ctx, mes) {
  const topo = await topoTX(ctx, 'publicar', mes, `Publicar · ${nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/transportes/resumo/${mes}`;
  ctx.html(`${topo}<p>Publica, das 4 unidades, o resumo, o indicador, os quadros por dia e por motorista e a lista das cargas que contam (com o nome completo dos motoristas). As marcas de abono, as observações, as cargas riscadas e as pendentes ficam só no rascunho.</p><p><a class="btn sec" href="#/transportes/resumo/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar 1x1 ${nomeMes(mes)}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input class="campo-link" type="text" readonly value="${E(link)}"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await T.publicarTX(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((m) => `#/transportes/publicar/${m}`);
}

// p = partes da rota (#/transportes/<sub>/<mes>). O padrão é o RESUMO.
export async function rotearTX(p, ctx) {
  const sub = p[1], mes = ctx.mesP(p[2]) || (ctx.adminNaTela() ? ctx.mesAtual() : (await T.mesesTXPublicados())[0] || ctx.mesAtual());
  if (UNIDADES_TX[sub]) return telaUnidade(ctx, sub, mes);
  if (!sub || sub === 'resumo') return telaResumo(ctx, mes);
  if (!ctx.adminNaTela()) { location.replace(`#/transportes/resumo/${mes}`); return; }
  if (sub === 'particularidades') return telaParticularidades(ctx, mes);
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  location.replace(`#/transportes/resumo/${mes}`);
}
