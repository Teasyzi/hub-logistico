// Telas do Transportes 1x1 (CB Norte, CB Sul, DL Barreiras, DL Juazeiro): uma aba por unidade (indicador, quadro por
// dia com o gráfico ao lado e, só para o admin, motoristas e cargas editáveis) e ⚙ Particularidades (lista para os
// supervisores, com o possível editável). As funções pagina* são puras (dados → HTML) e servem à prévia local.
import { E, fi, fd, fp, fdata, nomeMes, seletorMes } from './views.js?v=20261125-3';
import { UNIDADES_TX, DAS_TX, META_CUB_TX, FAIXA_ABONO_TX, lerArquivoTX, textoForaTX } from './transportes.js?v=20261125-3';
import * as T from './dados_transportes.js?v=20261125-3';
import * as D from './dados.js?v=20261125-3';

const UNIDADE_PADRAO = 'NORTE';
const f2 = (x) => fd(x, 2);
const fcub = (x) => (x == null ? '' : fd(x, 2));
const farol = (dif) => (dif == null ? '' : dif <= 1e-9 ? 'c-ok' : 'c-no');
const seta = (dif) => (dif == null ? '' : dif <= 1e-9 ? '<span class="t-up">▼</span>' : '<span class="t-down">▲</span>');
const ehDA = (u) => DAS_TX.includes(u);

export function abasTX(ativa, mes, admin) {
  const a = Object.entries(UNIDADES_TX).map(([u, n]) => [u, n.toUpperCase(), `#/transportes/${u}/${mes}`]);
  const adm = admin ? [['particularidades', 'Particularidades', `#/transportes/particularidades/${mes}`], ['importar', 'Importar', `#/transportes/importar/${mes}`], ['publicar', 'Publicar', `#/transportes/publicar/${mes}`]] : [];
  return `<nav class="abas">${a.map(([k, t, h]) => `<a class="${k === ativa ? 'on' : ''}" href="${h}">${t}</a>`).join('')}`
    + `${adm.map(([k, t, h]) => `<a class="adm ${k === ativa ? 'on' : ''}" href="${h}">⚙ ${t}</a>`).join('')}</nav>`;
}

// Ajudantes por carga em cada dia (barra) com a meta do dia (traço), como o quadro por dia da planilha.
export function graficoDiasTX(dias) {
  const ds = dias.filter((d) => d.cargas);
  if (!ds.length) return '';
  const lin = 22, topo = 4, rotW = 56, barW = 330, w = rotW + barW + 120, h = topo * 2 + ds.length * lin;
  const max = Math.max(2.3, ...ds.map((d) => Math.max(d.realizado, d.meta)));
  const x = (v) => rotW + (v / max) * barW;
  const it = ds.map((d, i) => {
    const y = topo + i * lin;
    return `<text x="${rotW - 6}" y="${y + 15}" text-anchor="end">${fdata(d.data)}</text>`
      + `<rect class="tx-real" x="${rotW}" y="${y + 4}" width="${(x(d.realizado) - rotW).toFixed(1)}" height="${lin - 8}" rx="2"><title>${fdata(d.data)}: ${f2(d.realizado)} ajudantes por carga · meta ${f2(d.meta)}</title></rect>`
      + `<line class="tx-meta" x1="${x(d.meta).toFixed(1)}" x2="${x(d.meta).toFixed(1)}" y1="${y + 1}" y2="${y + lin - 1}"/>`
      + `<text class="val" x="${(Math.max(x(d.realizado), x(d.meta)) + 5).toFixed(1)}" y="${y + 15}">${f2(d.realizado)} · ${fp(d.dif, 1)}</text>`;
  }).join('');
  return `<div class="grafico-legenda"><span><i class="tx-real"></i>AJUDANTES POR CARGA</span><span><i class="tx-meta"></i>META (POSSÍVEIS +5%)</span></div>`
    + `<svg class="ret-grafico" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Ajudantes por carga e meta, por dia">${it}<line x1="${rotW}" x2="${rotW}" y1="${topo}" y2="${h - topo}" stroke="var(--axis)"/></svg>`;
}

const legendaCargas = () => `<div class="legenda"><span><i class="tx-auto"></i>abono automático (até ${FAIXA_ABONO_TX} abaixo da meta)</span><span><i class="tx-part"></i>abonada por particularidade (possível editado)</span>
<span><i class="tx-pend"></i>falta lançar ajudantes ou cubagem (fora da conta)</span><span><i class="tx-fora"></i>fora da conta (repetida, juntada, carreta, equipamento, excluída)</span></div>`;

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
  const lin = (x) => `<tr><td class="t">${fdata(x.data)}</td><td>${fi(x.cargas)}</td><td>${f2(x.meta)}</td><td>${f2(x.realizado)}</td><td>${x.cargas ? fd(x.realizado - x.meta, 2) : '–'}</td><td class="${farol(x.dif)}">${fp(x.dif, 1)}</td></tr>`;
  const tabela = `<div class="tw scroll"><table><thead><tr><th class="t">Dia</th><th>Cargas</th><th>Possíveis +5%</th><th>Ajudantes</th><th>Dif.</th><th>Dif. %</th></tr></thead><tbody>
${d.dias.map(lin).join('')}<tr class="tot"><td class="t">Mês</td><td>${fi(t.cargas)}</td><td>${f2(t.meta)}</td><td>${f2(t.realizado)}</td><td>${t.cargas ? fd(t.realizado - t.meta, 2) : '–'}</td><td>${fp(t.dif, 1)}</td></tr></tbody></table></div>`;
  return `<section class="bloco"><div class="faixa">Por dia</div><div class="corpo"><div class="ret-lado">${tabela}<div>${graficoDiasTX(d.dias)}</div></div>
<p class="small">Possíveis +5% = média, por carga, de 1 ajudante até ${fi(d.metaCub)} de cubagem e 2 acima, × 1,05. Ajudantes = média dos ajudantes por carga. Dif. % = ajudantes ÷ possíveis − 1 (verde: dentro da meta).</p></div></section>`;
}

function quadroMotoristas(d) {
  if (!d.motoristas.length) return '';
  return `<section class="bloco"><div class="faixa">Por motorista</div><div class="corpo"><div class="tw scroll"><table><thead><tr><th class="t">Motorista</th><th>Cargas</th><th>Possíveis +5%</th><th>Ajudantes</th><th>Dif. %</th></tr></thead><tbody>
${d.motoristas.map((m) => `<tr><td class="t">${E(m.nome)}</td><td>${fi(m.cargas)}</td><td>${f2(m.meta)}</td><td>${f2(m.realizado)}</td><td class="${farol(m.dif)}">${fp(m.dif, 1)}</td></tr>`).join('')}</tbody></table></div>
<p class="small">Só no rascunho do admin: os nomes não vão para a publicação.</p></div></section>`;
}

const classeCarga = (c) => (c.fora ? 'tx-fora' : c.pendente ? 'tx-pend' : c.abono === 'particularidade' ? 'tx-part' : c.abono === 'automatico' ? 'tx-auto' : '');
function situacao(c) {
  const t = [];
  if (c.fora) t.push(`<span class="tag">${E(textoForaTX(c.fora))}${c.fora === 'repetida' && c.repeteLinha ? ` (linha ${c.repeteLinha})` : ''}${c.fora === 'juntada' && c.juntadaEm ? ` à linha ${c.juntadaEm}` : ''}</span>`);
  if (c.pendente) t.push(`<span class="tag">${E(c.pendente)}: lançar</span>`);
  if (c.abono === 'automatico') t.push('<span class="tag">abono automático</span>');
  if (c.abono === 'particularidade') t.push('<span class="tag">particularidade</span>');
  if (c.excesso && c.abono !== 'particularidade') t.push('<span class="tag">acima do possível</span>');
  if (c.fretesNoDia && !c.fora) t.push(`<span class="tag" title="Se for a mesma viagem: digite a cubagem somada numa linha e exclua as outras.">freteiro · ${c.fretesNoDia} linhas no dia</span>`);
  if (c.partes) t.push(`<span class="tag" title="${E(c.partes.map((p) => `linha ${p.linha}: ${p.rota} (${fcub(p.cub)})`).join(' + '))}">${c.partes.length} linhas juntadas</span>`);
  if (c.ajManual) t.push(`<span class="tag" title="Na fonte: ${c.ajOrigem ?? 'vazio'}">ajudantes digitados</span>`);
  if (c.cubManual) t.push(`<span class="tag" title="Na fonte: ${c.cubOrigem ?? 'vazio'}">cubagem digitada</span>`);
  return t.join(' ');
}
const ident = (u, c) => (ehDA(u) ? `<td class="t">${E(c.rota)}</td><td class="t">${E(c.placa)}</td>` : `<td class="t">${E(c.transporte)}${c.bloco ? ` <span class="small">${E(c.bloco)}</span>` : ''}${c.rota ? `<br><span class="small">${E(c.rota)}</span>` : ''}</td><td class="t">${E(c.placa || '')}</td>`);
const campo = (nome, v, cls = '') => `<input type="text" class="${cls}" data-campo="${nome}" value="${v == null ? '' : E(typeof v === 'number' ? String(v).replace('.', ',') : v)}">`;

function quadroCargas(u, d) {
  if (!d.cargas.length) return '';
  const dias = [...new Set(d.cargas.map((c) => c.data))];
  const lin = (c) => `<tr class="${classeCarga(c)}" data-u="${u}" data-k="${E(c.chave)}" data-dia="${c.data}">
<td class="t">${fdata(c.data)}</td>${ident(u, c)}<td class="t">${E(c.motorista)}</td>
<td class="ed">${campo('cub', c.cubManual ? c.cub : null, '')}<span class="small">${fcub(c.cubOrigem)}</span></td>
<td class="ed">${campo('aj', c.ajManual ? c.aj : null, '')}<span class="small">${c.ajOrigem ?? 'vazio'}</span></td>
<td>${c.regra == null ? '–' : f2(c.regra)}</td><td class="ed">${campo('poss', c.possManual ? c.poss : null)}<span class="small">${c.possAuto == null ? '' : f2(c.possAuto)}</span></td>
<td>${c.dif == null ? '–' : fd(c.dif, 2)}</td><td class="t">${situacao(c)}</td><td class="ed">${campo('obs', c.obs, 'obs')}</td>
<td class="ed">${c.foraFonte === 'repetida' ? `<label class="chk"><input type="checkbox" data-campo="incluir" ${c.fora ? '' : 'checked'}> contar</label>` : `<label class="chk"><input type="checkbox" data-campo="excluir" ${c.fora === 'excluida' ? 'checked' : ''}> excluir</label>`}</td><td class="st-salvo"></td></tr>`;
  return `<section class="bloco"><div class="faixa">Cargas · conferência do admin <span><select id="filtroDia"><option value="">Todos os dias</option>${dias.map((x) => `<option value="${x}">${fdata(x)}</option>`).join('')}</select></span></div><div class="corpo">
${legendaCargas()}<div class="tw scroll"><table class="tx-cargas"><thead><tr><th class="t">Dia</th><th class="t">${ehDA(u) ? 'Rota' : 'Transporte'}</th><th class="t">Placa</th><th class="t">Motorista</th>
<th>Cubagem<br><span class="small">digitar · fonte</span></th><th>Ajudantes<br><span class="small">digitar · fonte</span></th><th>Possível regra</th><th>Possível<br><span class="small">editar · calculado</span></th><th>Dif.</th><th class="t">Situação</th><th class="t">Observação</th><th class="t">Conta</th><th></th></tr></thead>
<tbody>${d.cargas.map(lin).join('')}</tbody></table></div>
<p class="small">Os campos em branco usam o valor da fonte (em cinza). Digite para corrigir; apague para voltar ao da fonte. Cada mudança é salva na hora e recalcula a tela.</p></div></section>`;
}

function avisos(u, d, mes) {
  const t = d.totais, it = [];
  if (!d.temDados) it.push(`Sem cargas de ${E(d.nome)} em ${nomeMes(mes)}. <a href="#/transportes/importar/${mes}">Importar ${ehDA(u) ? 'a montagem' : 'a escala'}</a>`);
  if (t.pendentes) it.push(`<b>${fi(t.pendentes)} carga(s) sem ajudantes ou sem cubagem</b> na fonte: ficam fora da conta até você lançar (linhas em amarelo).`);
  if (t.excesso) it.push(`${fi(t.excesso)} carga(s) com ajudantes acima do possível: estão em <a href="#/transportes/particularidades/${mes}">⚙ Particularidades</a>.`);
  if (t.automatico) it.push(`${fi(t.automatico)} carga(s) com abono automático (cubagem de ${fi(d.metaCub - FAIXA_ABONO_TX)} a ${fi(d.metaCub)} e 2 ajudantes ou mais: possível 2,10).`);
  if (t.fora) it.push(`${fi(t.fora)} linha(s) fora da conta (repetida, juntada, carreta, equipamento ou excluída), riscadas na lista de cargas.`);
  if (t.cargas && t.metaRegra != null && Math.abs(t.meta - t.metaRegra) > 1e-9) it.push(`Sem os abonos, a meta seria ${f2(t.metaRegra)} e a dif. ${fp(t.difRegra)}.`);
  return it.map((x) => `<div class="aviso">${x}</div>`).join('');
}

export function paginaUnidadeTX(u, d, { mes, admin, topo }) {
  if (!d || (!d.temDados && !admin)) return `${topo}<div class="aviso">Sem cargas de ${E(UNIDADES_TX[u])} em ${nomeMes(mes)}.</div>`;
  if (!d.temDados) return `${topo}${avisos(u, d, mes)}`;
  return `${topo}${tiles(d)}${admin ? avisos(u, d, mes) : ''}${quadroDias(d)}${admin ? quadroMotoristas(d) + quadroCargas(u, d) : ''}`;
}

// ---------------------------------------------------------------- particularidades
const doMesComExcesso = (r) => Object.fromEntries(Object.keys(UNIDADES_TX).map((u) => [u, (r.unidades[u]?.cargas || []).filter((c) => c.excesso)]));
export function paginaParticularidadesTX(r, { mes, topo }) {
  const por = doMesComExcesso(r);
  const total = Object.values(por).reduce((a, l) => a + l.length, 0);
  const bloco = (u) => {
    const l = por[u];
    const linha = (c) => `<tr class="${classeCarga(c)}" data-u="${u}" data-k="${E(c.chave)}"><td class="t">${fdata(c.data)}</td>${ident(u, c)}<td class="t">${E(c.motorista)}</td>
<td>${fcub(c.cub)}</td><td>${fi(c.aj)}</td><td>${f2(c.possAuto)}</td><td class="ed">${campo('poss', c.possManual ? c.poss : null)}</td><td class="ed">${campo('obs', c.obs, 'obs')}</td><td class="st-salvo"></td></tr>`;
    return `<section class="bloco"><div class="faixa">${E(UNIDADES_TX[u])} <span class="badge">${fi(l.length)} carga(s)</span></div><div class="corpo">${l.length
      ? `<div class="tw scroll"><table class="tx-cargas"><thead><tr><th class="t">Dia</th><th class="t">${ehDA(u) ? 'Rota' : 'Transporte'}</th><th class="t">Placa</th><th class="t">Motorista</th><th>Cubagem</th><th>Ajudantes</th><th>Possível</th><th>Possível editado</th><th class="t">Motivo / observação</th><th></th></tr></thead><tbody>${l.map(linha).join('')}</tbody></table></div>`
      : '<p class="small">Nenhuma carga acima do possível.</p>'}</div></section>`;
  };
  return `${topo}<p class="sub">Cargas que saíram com mais ajudantes que o possível (regra da cubagem + abono automático). Mande a lista aos supervisores; com o motivo de cada carga, edite o possível das que forem abonadas (ficam em vermelho-escuro e passam a contar com o possível editado). A lista só informa: sem a edição, o indicador não muda.</p>
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

// Edição na tela (cargas e particularidades): cada campo salva na hora. salvar(u, mes, chave, {campo: valor}).
const lerNum = (s) => { const t = String(s).trim(); if (!t) return null; const x = Number(t.replace(/\./g, '').replace(',', '.')); if (!Number.isFinite(x)) throw new Error(`Número inválido: ${t}`); return x; };
export function ligarEdicaoTX(raiz, { mes, salvar, depois, erro }) {
  raiz.querySelectorAll('tr[data-k] [data-campo]').forEach((el) => {
    el.addEventListener('change', async () => {
      const tr = el.closest('tr'), st = tr.querySelector('.st-salvo'), k = el.dataset.campo;
      try {
        const v = el.type === 'checkbox' ? el.checked : k === 'obs' ? el.value.trim() : lerNum(el.value);
        if (st) st.innerHTML = '<span class="small">salvando…</span>';
        await salvar(tr.dataset.u, mes, tr.dataset.k, { [k]: v });
        await depois();
      } catch (e) { if (st) st.innerHTML = erro(e); }
    });
  });
  const f = raiz.querySelector('#filtroDia');
  if (f) {
    const aplicar = () => raiz.querySelectorAll('tr[data-dia]').forEach((tr) => { tr.hidden = !!f.value && tr.dataset.dia !== f.value; });
    f.onchange = () => { try { sessionStorage.setItem('txFiltroDia', f.value); } catch { /* sem storage */ } aplicar(); };
    try { const v = sessionStorage.getItem('txFiltroDia'); if (v && [...f.options].some((o) => o.value === v)) f.value = v; } catch { /* sem storage */ }
    aplicar();
  }
}

// ---------------------------------------------------------------- telas (Firestore)
async function topoTX(ctx, aba, mes, titulo, comMes = true) {
  let sel = '';
  if (comMes) {
    const meses = new Set(ctx.adminNaTela() ? [ctx.mesAtual(), mes, ...(await T.mesesTXPublicados())] : await T.mesesTXPublicados());
    meses.add(mes);
    sel = seletorMes([...meses].sort().reverse(), mes);
    if (ctx.adminNaTela() && UNIDADES_TX[aba]) {
      sel += ` · <select id="selModo"><option value="rascunho" ${ctx.estado.modo === 'rascunho' ? 'selected' : ''}>Rascunho</option><option value="publicado" ${ctx.estado.modo === 'publicado' ? 'selected' : ''}>Publicado</option></select>`;
    }
  }
  return `<h1>Transportes 1x1 — ${E(titulo)}</h1><p class="sub">${sel}</p><p id="statusAtualizacao" class="status-atualizacao" role="status"></p>${abasTX(aba, mes, ctx.adminNaTela())}`;
}
const rascunho = (ctx) => ctx.adminNaTela() && ctx.estado.modo === 'rascunho';
const status = (data) => { const el = document.getElementById('statusAtualizacao'); if (el) el.textContent = data ? `Última atualização: ${data.toLocaleString('pt-BR')}` : 'Última atualização ainda não registrada'; };
const manterRolagem = async (f) => { const y = window.scrollY; await f(); window.scrollTo(0, y); };

async function telaUnidade(ctx, u, mes) {
  ctx.html('<p class="small">Calculando…</p>');
  const topo = await topoTX(ctx, u, mes, `${UNIDADES_TX[u]} · ${nomeMes(mes)}`);
  if (!rascunho(ctx)) {
    const x = await T.lerTXPublicado(mes), d = x.unidades[u];
    ctx.html(d?.temDados ? paginaUnidadeTX(u, { ...d, motoristas: [], cargas: [] }, { mes, admin: false, topo }) : `${topo}<div class="aviso">O 1x1 de ${E(UNIDADES_TX[u])} em ${nomeMes(mes)} ainda não foi publicado.</div>`);
    status(x.publicadoEm); ctx.ligarTopo((m) => `#/transportes/${u}/${m}`);
    return;
  }
  const desenhar = async () => {
    const r = await T.calcularTXAoVivo(mes);
    ctx.html(paginaUnidadeTX(u, r.unidades[u], { mes, admin: true, topo }) + (r.arquivos[u]?.length ? `<p class="small">Fonte: ${E(r.arquivos[u].join(', '))}.</p>` : ''));
    status(r.atualizado); ctx.ligarTopo((m) => `#/transportes/${u}/${m}`);
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
  return `<div class="tw scroll"><table><thead><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th><th>Cargas</th><th class="t">Dias</th><th class="t">Por</th></tr></thead><tbody>${l}</tbody></table></div>`;
}

async function telaImportar(ctx, mes) {
  const topo = await topoTX(ctx, 'importar', mes, 'Importar arquivos', false);
  ctx.html(`${topo}<p class="sub">CB Norte e CB Sul: a planilha "MONTAGEM DAS CARGAS" de cada unidade (abas diárias, colunas Ajudantes e Cubagem; só entram as ROTAS DO DIA). DL Barreiras: "TRANSPORTE 1X1 E 1X2". DL Juazeiro: a ESCALA de motoristas e auxiliares. A unidade é reconhecida pelo arquivo.</p>
<div class="modelo-box"><label>Mês de referência <input id="mesArq" type="month" value="${mes}"></label> <span class="small">usado quando a aba traz só o dia (montagem Sul: "04", "05"…)</span></div>
<div class="drop" id="drop"><p>Arraste os arquivos aqui ou selecione</p><input type="file" id="arqs" multiple accept=".xls,.xlsx,.xlsm"></div><div id="res"></div>
<p class="small">Reimportar substitui os dias que o arquivo traz. Os ajustes feitos à mão (ajudantes, possível, observação) ficam guardados por carga e continuam valendo.</p>
<h2>Últimas importações do 1x1</h2><div id="hist">${historico(await D.ultimasImportacoes('transportes'))}</div>`);
  const processar = async (files) => {
    const mesArq = document.getElementById('mesArq').value;
    let rows = '', ultimo = mesArq, uniUlt = UNIDADE_PADRAO;
    for (const f of files) {
      try {
        if (!/^\d{4}-\d{2}$/.test(mesArq)) throw new Error('Escolha o mês de referência.');
        const x = lerArquivoTX(XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: false }), mesArq, f.name);
        if (!x.tipo) throw new Error('Não reconheci o arquivo: esperava a montagem Norte/Sul (Placa, Ajudantes, Cubagem), o "TRANSPORTE 1X1 E 1X2" de Barreiras ou a ESCALA de Juazeiro.');
        const n = await T.gravarCargasTX(x.unidade, x.cargas, f.name);
        const conta = x.cargas.filter((c) => !c.fora).length, fora = x.cargas.length - conta, sem = x.cargas.filter((c) => !c.fora && (!c.aj || c.cub == null)).length;
        const periodo = `${fdata(x.dias[0])} a ${fdata(x.dias.at(-1))}`;
        await D.registrarImportacao({ arquivo: f.name, tipo: x.tipo, linhas: conta, periodo, acompanhamento: 'transportes' });
        ultimo = x.dias.at(-1).slice(0, 7); uniUlt = x.unidade;
        rows += `<tr><td class="t">${E(f.name)}</td><td class="t">${E(x.tipo)}</td><td class="t">${E(UNIDADES_TX[x.unidade])}</td><td class="t">${n} dia(s): ${periodo}</td><td>${fi(conta)}</td><td>${fi(fora)}</td><td>${fi(sem)}</td><td class="st ok">Importado</td></tr>`;
      } catch (e) { rows += `<tr><td class="t">${E(f.name)}</td><td colspan="7" class="st no">${E(e.message)}</td></tr>`; }
    }
    document.getElementById('res').innerHTML = `<h2>Resultado</h2><div class="tw"><table><thead><tr><th class="t">Arquivo</th><th class="t">Tipo</th><th class="t">Unidade</th><th class="t">Dias</th><th>Cargas</th><th>Fora</th><th>Sem ajudantes / cubagem</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><p><a class="btn" href="#/transportes/${uniUlt}/${ultimo}">Conferir rascunho</a></p>`;
    document.getElementById('hist').innerHTML = historico(await D.ultimasImportacoes('transportes'));
  };
  const drop = document.getElementById('drop');
  document.getElementById('arqs').onchange = (e) => processar(e.target.files);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); processar(e.dataTransfer.files); };
}

async function telaPublicar(ctx, mes) {
  const topo = await topoTX(ctx, 'publicar', mes, `Publicar · ${nomeMes(mes)}`), link = `${location.origin}${location.pathname}#/transportes/${UNIDADE_PADRAO}/${mes}`;
  ctx.html(`${topo}<p>Publica o indicador e o quadro por dia das 4 unidades. Motoristas, cargas e particularidades ficam só no rascunho.</p><p><a class="btn sec" href="#/transportes/${UNIDADE_PADRAO}/${mes}">Conferir antes</a> <button class="btn" id="pub">Publicar 1x1 ${nomeMes(mes)}</button> <span id="msg"></span></p><h2>Link para enviar por e-mail</h2><p><input class="campo-link" type="text" readonly value="${E(link)}"> <button class="btn sec" id="copiar">Copiar</button></p>`);
  document.getElementById('copiar').onclick = () => navigator.clipboard.writeText(link);
  document.getElementById('pub').onclick = async (e) => { e.target.disabled = true; try { await T.publicarTX(mes); document.getElementById('msg').innerHTML = '<span class="st ok">✓ publicado</span>'; } catch (err) { document.getElementById('msg').innerHTML = ctx.erro(err); } e.target.disabled = false; };
  ctx.ligarTopo((m) => `#/transportes/publicar/${m}`);
}

// p = partes da rota (#/transportes/<sub>/<mes>). Sem aba de resumo: o padrão é a primeira unidade.
export async function rotearTX(p, ctx) {
  const sub = p[1], mes = ctx.mesP(p[2]) || (ctx.adminNaTela() ? ctx.mesAtual() : (await T.mesesTXPublicados())[0] || ctx.mesAtual());
  if (UNIDADES_TX[sub]) return telaUnidade(ctx, sub, mes);
  if (!sub || !ctx.adminNaTela()) { location.replace(`#/transportes/${UNIDADE_PADRAO}/${mes}`); return; }
  if (sub === 'particularidades') return telaParticularidades(ctx, mes);
  if (sub === 'importar') return telaImportar(ctx, mes);
  if (sub === 'publicar') return telaPublicar(ctx, mes);
  location.replace(`#/transportes/${UNIDADE_PADRAO}/${mes}`);
}
