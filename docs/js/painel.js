// Painel principal: a prévia de cada card. Funções puras (os dados vêm de dados_painel.js).
// Cada prévia recebe o resultado já lido do acompanhamento; null = sem dados.
import { E, fi, fd, fp, fdata, nomeMes, farolKM } from './views.js?v=20261126-13';

export const CARDS_PAINEL = [
  ['montagem', 'Montagem de cargas (DLs)', '#/montagem'], ['kpi', 'KPI Distribuição e Logística', '#/kpi'], ['pes', 'PES Logístico', '#/pes'],
  ['cargas', 'Cargas em aberto', '#/cargas'], ['montadores', 'Montadores', '#/montadores/NORTE'], ['perdas', 'Perdas de estoque DLs', '#/perdas'],
  ['km', 'KM planejado × realizado', '#/km'], ['retorno', 'Retorno por motivo', '#/retorno'], ['transportes', 'Transportes 1x1', '#/transportes'],
  ['fillrate', 'Fill rate · Insuficiência', '#/fillrate'], ['gestao', 'Gestão à vista', '#/gestao'], ['reprog', 'REPROG (DAs)', '#/reprog'],
];

const NOMES = { NORTE: 'CB Norte', SUL: 'CB Sul', CBAR: 'Barreiras', CCRT: 'Juazeiro' };
const nota = (t) => `<p class="small">${t}</p>`;
const cel = (v, cls = '') => `<td${cls ? ` class="${cls}"` : ''}>${v}</td>`;
const tabela = (cab, linhas) => `<div class="tw"><table class="painel-t"><thead><tr>${cab.map((c, i) => `<th${i ? '' : ' class="t"'}>${c}</th>`).join('')}</tr></thead>
<tbody>${linhas.map(([rot, ...cels]) => `<tr><td class="t">${rot}</td>${cels.join('')}</tr>`).join('')}</tbody></table></div>`;
const sinal = (v, bom) => (v == null ? '' : bom ? 'c-ok' : 'c-no');
const dias = (d) => (d == null ? '–' : `${fi(d)} dia${d === 1 ? '' : 's'}`);

export const PREVIAS = {
  // x = {mes, dls: {CBAR: resultado da Montagem | null, CCRT}}
  montagem: (x) => x && tabela(['DL', 'ACM (CX UNIT)', 'Tend. vs meta', 'Ocupação'], ['CBAR', 'CCRT'].map((c) => {
    const r = x.dls[c];
    if (!r) return [NOMES[c], cel('–'), cel('–'), cel('–')];
    const t = r.resumo.tend_vs_meta;
    return [NOMES[c], cel(fi(r.resumo.acm)), cel(fp(t, 1), sinal(t, t >= 0)), cel(fp(r.media.ocupacao, 1))];
  })) + nota(`${nomeMes(x.mes)} · ocupação é a média do mês.`),

  // x = {mes, ok, no, sem}
  kpi: (x) => x && tabela(['Farol', 'Indicadores'], [['Dentro da meta', cel(fi(x.ok), x.ok ? 'c-ok' : '')], ['Fora da meta', cel(fi(x.no), x.no ? 'c-no' : '')], ['Sem número', cel(fi(x.sem))]])
    + nota(`${nomeMes(x.mes)}.`),

  // x = {mes, dls: {CBAR: {feitos, possiveis} | null, CCRT}}
  pes: (x) => x && tabela(['DL', 'Pontos', 'Possíveis'], ['CBAR', 'CCRT'].map((c) => [NOMES[c], cel(fi(x.dls[c]?.feitos)), cel(fi(x.dls[c]?.possiveis))])) + nota(`${nomeMes(x.mes)}.`),

  // x = {data, NORTE: dias, SUL: dias}
  cargas: (x) => x && tabela(['Revenda', 'Carga mais antiga em aberto'], ['NORTE', 'SUL'].map((c) => [NOMES[c], cel(dias(x[c]))])) + nota(`Foto de ${fdata(x.data)}.`),

  // x = {mes, NORTE: média | null, …}
  montadores: (x) => x && tabela(['Base', 'CX/H'], Object.keys(NOMES).map((c) => [NOMES[c], cel(x[c] == null ? '–' : fd(x[c], 1))])) + nota(`Média dos montadores em ${nomeMes(x.mes)}.`),

  // x = {mes, dls: {CBAR: {rs, pctCx} | null, CCRT}}
  perdas: (x) => x && tabela(['DL', 'Perda (R$)', '% CX UNIT'], ['CBAR', 'CCRT'].map((c) => [NOMES[c], cel(x.dls[c] ? fd(x.dls[c].rs, 2) : '–'), cel(fp(x.dls[c]?.pctCx, 3))]))
    + nota(`${nomeMes(x.mes)} · negativo = sobra.`),

  // x = {mes, unidades: {NORTE: totais do KM | null, …}}
  km: (x) => x && tabela(['Unidade', 'Plan.', 'Real.', 'Disp.'], Object.keys(NOMES).map((c) => {
    const t = x.unidades[c];
    return t ? [NOMES[c], cel(fi(t.planejado)), cel(fi(t.realizado)), cel(fp(t.dispersao, 1), farolKM(t.dispersao, t.meta))] : [NOMES[c], cel('–'), cel('–'), cel('–')];
  })) + nota(`${nomeMes(x.mes)} · km planejado, realizado e dispersão acumulados.`),

  // x = {mes, unidades: {NORTE: {semCanc, total} | null, …}}
  retorno: (x) => x && tabela(['Unidade', '% total', '% sem canc. NF'], Object.keys(NOMES).map((c) => [NOMES[c], cel(fp(x.unidades[c]?.total)), cel(fp(x.unidades[c]?.semCanc))]))
    + nota(`${nomeMes(x.mes)} · o oficial é o sem cancelamento de NF.`),

  // x = {mes, meta, realizado, dif}
  transportes: (x) => x && tabela(['Geral', 'Ajudantes por carga'], [['Meta + 5%', cel(fd(x.meta, 2))], ['Realizado', cel(fd(x.realizado, 2))], ['Dif.', cel(fp(x.dif), sinal(x.dif, x.dif <= 1e-9))]])
    + nota(`${nomeMes(x.mes)}.`),

  // x = {mes, unidades: {NORTE: {insuf, meta} | null, SUL}}
  fillrate: (x) => x && tabela(['Revenda', 'Insuficiência', 'Meta'], ['NORTE', 'SUL'].map((c) => {
    const t = x.unidades[c];
    return [NOMES[c], cel(fp(t?.insuf), sinal(t?.insuf, t?.insuf <= t?.meta)), cel(fp(t?.meta, 0))];
  })) + nota(`${nomeMes(x.mes)}.`),

  // x = {dls: {CBAR: {mes, volume} | null, CCRT}}
  gestao: (x) => x && tabela(['DL', 'Mês', 'Volume (CX UNIT)'], ['CBAR', 'CCRT'].map((c) => [NOMES[c], cel(x.dls[c] ? nomeMes(x.dls[c].mes) : '–'), cel(fi(x.dls[c]?.volume))]))
    + nota('Último mês preenchido.'),

  // x = {NORTE: {dia, clientes, repetidos | null} | null, SUL}  (repetidos = 2 dias ou mais; null = dias não digitados)
  reprog: (x) => x && tabela(['Revenda', 'Dia', 'Clientes', '2 dias ou mais'], ['NORTE', 'SUL'].map((c) => {
    const r = x[c];
    if (!r) return [NOMES[c], cel('–'), cel('–'), cel('–')];
    return [NOMES[c], cel(fdata(r.dia).slice(0, 5)), cel(fi(r.clientes)), cel(r.repetidos == null ? '–' : fi(r.repetidos), r.repetidos ? 'c-no' : '')];
  })) + nota('Último dia importado.'),
};

export const semDadosPainel = '<p class="small">Sem dados ainda.</p>';

export function painelPrincipal() {
  return `<h1>Painel principal</h1><p class="sub">Prévia de cada acompanhamento (dados atuais do rascunho). Cada um tem link próprio para enviar por e-mail; quem recebe vê só aquele acompanhamento.</p>
<div class="grid painel">${CARDS_PAINEL.map(([id, n, h]) => `<div class="bloco"><div class="faixa">${E(n)}</div><div class="corpo">
<div data-previa="${id}"><p class="small">Carregando…</p></div>
<div class="painel-botoes"><a class="btn" href="${h}">Abrir</a> <button class="btn sec" data-copiar="${h}">Copiar link</button></div></div></div>`).join('')}
<div class="bloco"><div class="faixa">Acessos</div><div class="corpo"><p class="small">Quem pode ver o que foi publicado.</p><div class="painel-botoes"><a class="btn" href="#/acessos">Gerenciar</a></div></div></div></div>`;
}

// carregar = {id: async () => dados | null}. Cada card se preenche sozinho; a falha de um não derruba os outros.
export function preencherPainel(raiz, carregar) {
  return Promise.all(CARDS_PAINEL.map(async ([id]) => {
    const alvo = raiz.querySelector(`[data-previa="${id}"]`);
    if (!alvo || !carregar[id]) return;
    try {
      const x = await carregar[id]();
      alvo.innerHTML = PREVIAS[id](x) || semDadosPainel;
    } catch (e) {
      alvo.innerHTML = `<p class="small">Não foi possível ler: ${E(e?.message || e)}</p>`;
    }
  }));
}
