// Cargas em aberto (DAs CB Norte e CB Sul): leitura da Consulta BI e cálculo do aging.
// Funções puras (sem Firebase). A planilha oficial usa só as linhas com Data_Acerto = "-";
// o export do BI traz o mês inteiro, então as linhas já acertadas viram o "tempo médio de acerto".

export const REVENDAS = {
  NORTE: { nome: 'CB Norte', bi: 'CB CE Norte', cor: 'var(--s1)' },
  SUL: { nome: 'CB Sul', bi: 'CB CE Sul', cor: 'var(--s2)' },
};
// Urgência pelos dias em aberto (regra da gestão, 23/11/2026): uma carga não pode chegar a 7 dias
// sem acerto, então 6 dias ou mais já é crítico. 3–5 dias = atenção.
export const DIAS_CRITICO = 6;
export const FAIXAS = [
  { rotulo: '0–2 dias', de: 0, ate: 2, classe: '', nivel: 'ok' },
  { rotulo: '3–5 dias · atenção', de: 3, ate: DIAS_CRITICO - 1, classe: 'c-mid', nivel: 'atencao' },
  { rotulo: `${DIAS_CRITICO} dias ou mais · crítico`, de: DIAS_CRITICO, ate: Infinity, classe: 'c-no', nivel: 'critico' },
];
export const faixaDe = (dias) => FAIXAS.find((f) => dias >= f.de && dias <= f.ate) || FAIXAS[0];

const EPOCA = Date.UTC(1899, 11, 30);
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function isoData(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(EPOCA + Math.round(v) * 86400000).toISOString().slice(0, 10);
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);

function numero(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s || s === '-') return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? n : 0;
}

const COLUNAS = {
  rev: 'revenda', cli: 'cli cod', nome: 'cli razao social', acerto: 'data acerto', emissao: 'data emissao', cxu: 'venda caixa unitaria',
};

function localizar(wb) {
  for (const nome of wb.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, blankrows: false });
    const ix = linhas.slice(0, 20).findIndex((l) => {
      const c = (l || []).map(norm);
      return c.includes(COLUNAS.acerto) && c.includes(COLUNAS.cxu);
    });
    if (ix >= 0) return { linhas, ix };
  }
  return null;
}

// Reconhece o export da Consulta BI (o nome do arquivo é um GUID, então só o cabeçalho conta).
export const ehConsultaCargas = (wb) => localizar(wb) != null;

export function lerConsultaCargas(wb) {
  const achou = localizar(wb);
  if (!achou) throw new Error('Não encontrei as colunas Data_Acerto e Venda Caixa Unitária da Consulta BI.');
  const cab = achou.linhas[achou.ix].map(norm), col = {};
  for (const [k, rotulo] of Object.entries(COLUNAS)) {
    col[k] = cab.indexOf(rotulo);
    if (col[k] < 0) throw new Error(`Coluna não encontrada na Consulta BI: ${rotulo}.`);
  }
  const linhas = [];
  let ignoradas = 0;
  for (const l of achou.linhas.slice(achou.ix + 1)) {
    const revTxt = norm(l[col.rev]);
    const rev = /norte/.test(revTxt) ? 'NORTE' : /sul/.test(revTxt) ? 'SUL' : null;
    const emissao = isoData(l[col.emissao]);
    if (!rev || !emissao) { if (l.some((v) => v != null && v !== '')) ignoradas++; continue; }
    const acertoTxt = String(l[col.acerto] ?? '').trim();
    linhas.push({
      rev, cli: String(l[col.cli] ?? '').trim(), nome: String(l[col.nome] ?? '').trim(),
      emissao, acerto: acertoTxt === '' || acertoTxt === '-' ? null : isoData(l[col.acerto]), cxu: numero(l[col.cxu]),
    });
  }
  return { linhas, ignoradas };
}

// Foto do dia: lista das vendas em aberto (com nome, só admin) + resumo das já acertadas.
export function montarFoto(linhas, dataRef) {
  const abertas = linhas.filter((l) => !l.acerto).map(({ rev, cli, nome, emissao, cxu }) => ({ rev, cli, nome, emissao, cxu }));
  const acertadas = {};
  for (const l of linhas.filter((x) => x.acerto)) {
    const a = (acertadas[l.rev] ??= { qtd: 0, cxu: 0, somaDias: 0 });
    a.qtd++; a.cxu += l.cxu; a.somaDias += Math.max(0, diasEntre(l.emissao, l.acerto));
  }
  const emissoes = linhas.map((l) => l.emissao).sort();
  return { data: dataRef, abertas, acertadas, emissaoDe: emissoes[0] || null, emissaoAte: emissoes.at(-1) || null, totalLinhas: linhas.length };
}

export function calcularCargas(foto) {
  const revendas = {};
  for (const [c, r] of Object.entries(REVENDAS)) {
    const lista = foto.abertas.filter((l) => l.rev === c)
      .map((l) => ({ ...l, dias: Math.max(0, diasEntre(l.emissao, foto.data)) }))
      .sort((a, b) => b.dias - a.dias || b.cxu - a.cxu);
    const faixas = FAIXAS.map((f) => {
      const xs = lista.filter((l) => l.dias >= f.de && l.dias <= f.ate);
      return { rotulo: f.rotulo, classe: f.classe, nivel: f.nivel, qtd: xs.length, cxu: xs.reduce((s, l) => s + l.cxu, 0) };
    });
    const porDia = new Map();
    for (const l of lista) { const d = porDia.get(l.emissao) || { data: l.emissao, qtd: 0, cxu: 0 }; d.qtd++; d.cxu += l.cxu; porDia.set(l.emissao, d); }
    const ac = foto.acertadas?.[c];
    revendas[c] = {
      nome: r.nome, cor: r.cor, qtd: lista.length, clientes: new Set(lista.map((l) => l.cli)).size,
      cxu: lista.reduce((s, l) => s + l.cxu, 0), maisAntiga: lista[0] || null, faixas,
      porEmissao: [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data)),
      acerto: ac ? { qtd: ac.qtd, cxu: ac.cxu, diasMedio: ac.qtd ? ac.somaDias / ac.qtd : null } : null,
      lista,
    };
  }
  return { data: foto.data, emissaoDe: foto.emissaoDe, emissaoAte: foto.emissaoAte, revendas };
}

// O que os leitores recebem: só números e o código do cliente (sem razão social).
export function agregadoPublicadoCargas(resultado) {
  const revendas = Object.fromEntries(Object.entries(resultado.revendas).map(([c, r]) => [c, {
    ...r, maisAntiga: r.maisAntiga ? { cli: r.maisAntiga.cli, emissao: r.maisAntiga.emissao, dias: r.maisAntiga.dias, cxu: r.maisAntiga.cxu } : null,
    lista: r.lista.map(({ cli, emissao, dias, cxu }) => ({ cli, emissao, dias, cxu })),
  }]));
  return { ...resultado, revendas };
}
