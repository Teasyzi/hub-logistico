// REPROG (DAs): clientes com pedido reprogramado, por dia e por revenda (CB NORTE / CB SUL). Funções puras (sem Firestore).
// Fontes (ficha AUDITORIA/REPROG_DAs.md):
//   - TXT do ERP "MOVIMENTO POR CLIENTE NO PERIODO" (VDPDR007), um por revenda e por dia: pedidos, itens e valores;
//   - BASE ATUALIZADA.xlsx (abas NORTE e SUL, cabeçalho "CLI (CÓD)"): razão social, cidade, vendedor, supervisor e dia de rota;
//   - planilhas antigas: "CB NORTE/SUL - REPROGRAMAÇÃO.xlsx" (aba Resumo = clientes do último dia e dias digitados; aba base)
//     e "REPROGRAMAÇÃO DIA A DIA.xlsx" (uma aba por dia com o relatório colado em A:H).
// "DIAS REPROGRAMADOS" é digitado pelo administrador todo dia (decisão do usuário); o Hub mostra o do dia anterior ao lado.
export const REVENDAS_RP = { NORTE: 'CB NORTE', SUL: 'CB SUL' };
export const EMPRESA_RP = 'CB DISTRIBUIDORA DE BEBIDAS LTDA';
export const TOTAL_RP = 'TOTAL PED./CLI.';

const RE_CLI = /^\d{4}-\d{4}$/;
const numBR = (s) => { const t = String(s ?? '').trim(); if (!t) return null; const n = Number(t.replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const iso = (d, m, a) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
// DT.EMI do relatório: ddmmaa (às vezes sem o zero à esquerda: 90726 = 09/07/26).
export function dataDtEmi(v) {
  const s = String(v ?? '').replace(/\D/g, '').padStart(6, '0');
  if (s.length !== 6 || s === '000000') return null;
  return iso(+s.slice(0, 2), +s.slice(2, 4), 2000 + +s.slice(4, 6));
}
export const fdataRP = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
const arred = (v) => Math.round(v * 100) / 100;

// Revenda pelo nome do arquivo: "REPROG N.TXT", "... NORTE ...", "CB SUL - ...". null se não der para saber.
export function revendaDoNome(nome) {
  const n = String(nome || '').toUpperCase().replace(/\.[A-Z0-9]+$/, '');
  if (/\bNORTE\b/.test(n) || /(^|[\s_-])N$/.test(n)) return 'NORTE';
  if (/\bSUL\b/.test(n) || /(^|[\s_-])S$/.test(n)) return 'SUL';
  return null;
}

// ---------------------------------------------------------------- TXT (VDPDR007)
// Linha de pedido: "0001 000   251126   000000  0040-0034 NOME (20)            4 44 65  0  800/  0 001-1000584-DESCRICAO  15,32  12.256,00"
// Itens seguintes só têm a parte do produto; o pedido fecha na linha "TOTAL PED./CLI.". O cabeçalho se repete a cada página.
const RE_PED = /^(\d{4}) (\d{3})\s+(\d{5,6})\s+(\d{6})\s+(\d{4}-\d{4}) (.{1,20})/;
const RE_ITEM = /(-?[\d.]+)\/\s*\d*\s+\d{3}-(\d{5,8})-(.*?)\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})\s*$/;
const RE_TOT = /(-?[\d.]+)\/\d{4}\s+TOTAL PED\.\/CLI\.\s+(-?[\d.]+,\d{2})/;

export function ehTxtRP(texto) { return /VDPDR007/.test(texto) && /TOTAL PED\.\/CLI\./.test(texto); }

export function lerTxtRP(texto, nome = '') {
  const linhas = String(texto).replace(/\r/g, '').split('\n');
  const per = texto.match(/PERIODO DE (\d\d)\/(\d\d)\/(\d{4}) A (\d\d)\/(\d\d)\/(\d{4})/);
  const pedidos = [], avisos = [], datas = new Set();
  let atual = null, semPedido = 0;
  const item = (l) => {
    const m = l.match(RE_ITEM);
    if (!m) return false;
    if (!atual) { semPedido++; return true; }
    atual.itens.push({ cod: m[2].replace(/^0+(?=\d{7})/, ''), desc: m[3].trim(), q: numBR(m[1]) ?? 0, vt: numBR(m[5]) ?? 0 });
    return true;
  };
  for (const bruta of linhas) {
    const l = bruta.replace(/\f/g, '');
    if (!l.trim()) continue;
    const t = l.match(RE_TOT);
    if (t) {
      if (atual) { atual.total = numBR(t[2]); atual.q = numBR(t[1]); pedidos.push(atual); atual = null; }
      continue;
    }
    const p = l.match(RE_PED);
    if (p) {
      if (atual) { avisos.push(`pedido ${atual.ped} do cliente ${atual.cli} sem a linha de total`); pedidos.push(atual); }
      const dia = dataDtEmi(p[3]);
      if (dia) datas.add(dia);
      atual = { ped: p[1], cli: p[5], nome: p[6].trim(), dia, itens: [], total: null, q: null };
      item(l.slice(p[0].length));
      continue;
    }
    item(l);
  }
  if (atual) { avisos.push(`pedido ${atual.ped} do cliente ${atual.cli} sem a linha de total`); pedidos.push(atual); }
  if (semPedido) avisos.push(`${semPedido} item(ns) antes do primeiro pedido foram ignorados`);
  // Conferência: soma dos itens = total do pedido.
  let difs = 0;
  for (const x of pedidos) {
    const s = arred(x.itens.reduce((a, i) => a + i.vt, 0));
    if (x.total == null) x.total = s; else if (Math.abs(s - x.total) > 0.011) difs++;
  }
  if (difs) avisos.push(`${difs} pedido(s) com soma dos itens diferente do TOTAL PED./CLI.`);
  const dia = per ? iso(+per[4], +per[5], +per[6]) : [...datas].sort().at(-1) || null;
  if (per && (per[1] !== per[4] || per[2] !== per[5])) avisos.push(`o relatório cobre ${per[1]}/${per[2]} a ${per[4]}/${per[5]}; o Hub grava como ${fdataRP(dia)}`);
  return { tipo: 'TXT VDPDR007', dia, revendaArq: revendaDoNome(nome), pedidos, avisos };
}

// Clientes do dia na ordem do relatório (como J:K da aba do dia), com valor, pedidos e itens.
export function clientesDoDiaRP(pedidos) {
  const m = new Map();
  for (const p of pedidos) {
    const c = m.get(p.cli) || { cli: p.cli, nome: p.nome, valor: 0, ped: 0, itens: 0 };
    c.valor = arred(c.valor + (p.total || 0)); c.ped++; c.itens += p.itens.length;
    m.set(p.cli, c);
  }
  return [...m.values()];
}

// Forma compacta para o Firestore: clientes [[cli, nome, valor, ped, itens]], pedidos [[ped, cli, total, [[cod, q, vt]]]], prod {cod: desc}.
export function compactarDiaRP(pedidos) {
  const prod = {};
  for (const p of pedidos) for (const i of p.itens) if (!prod[i.cod]) prod[i.cod] = i.desc;
  return {
    clientes: clientesDoDiaRP(pedidos).map((c) => [c.cli, c.nome, c.valor, c.ped, c.itens]),
    pedidos: pedidos.map((p) => [p.ped, p.cli, p.total, p.itens.map((i) => [i.cod, i.q, i.vt])]),
    prod,
  };
}
export function expandirClientesRP(cl) { return (cl || []).map(([cli, nome, valor, ped, itens]) => ({ cli, nome, valor, ped, itens })); }

// ---------------------------------------------------------------- planilhas (SheetJS)
const linhasAba = (ws) => (ws ? XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: false }) : []);
const txt = (v) => (v == null ? '' : String(v).trim());
const sem = (s) => txt(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

// Cadastro de clientes de uma aba (BASE ATUALIZADA: NORTE/SUL, cabeçalho na linha 6; planilha antiga: aba base, linha 2).
// Devolve {clientes: {cli: [razao, cidade, vendCod, supCod, pasta]}, vends: {cod: nome}, sups: {cod: nome}, n}.
export function lerBaseAbaRP(ws) {
  const L = linhasAba(ws);
  const h = L.findIndex((r) => r && r.some((c) => sem(c) === 'CLI (COD)') && r.some((c) => sem(c) === 'RAZAO SOCIAL'));
  if (h < 0) return null;
  const cab = L[h].map(sem), col = (n, k = 0) => cab.reduce((a, c, i) => (c === n ? [...a, i] : a), [])[k] ?? -1;
  const cods = cab.reduce((a, c, i) => (c === 'CLI (COD)' ? [...a, i] : a), []);
  // A coluna do código "0000-0000" (há duas "CLI (CÓD)"; a outra é o número sem traço).
  const amostra = L.slice(h + 1, h + 60);
  const cCli = cods.find((i) => amostra.some((r) => RE_CLI.test(txt(r?.[i])))) ?? cods.at(-1);
  const c = { razao: col('RAZAO SOCIAL'), cidade: col('CIDADE'), supCod: col('SUP (COD)'), sup: col('SUP'), vendCod: col('VEND (COD)'), vend: col('VEND'), pasta: col('PASTA') };
  const out = { clientes: {}, vends: {}, sups: {}, n: 0 };
  const cod = (v) => { const t = txt(v); return /^\d+(\.0+)?$/.test(t) ? String(parseInt(t, 10)) : t; };
  for (const r of L.slice(h + 1)) {
    const cli = txt(r?.[cCli]);
    if (!RE_CLI.test(cli)) continue;
    const vc = cod(r[c.vendCod]), sc = cod(r[c.supCod]);
    out.clientes[cli] = [txt(r[c.razao]), txt(r[c.cidade]), vc, sc, txt(r[c.pasta])];
    if (vc && c.vend >= 0 && txt(r[c.vend])) out.vends[vc] = txt(r[c.vend]);
    if (sc && c.sup >= 0 && txt(r[c.sup])) out.sups[sc] = txt(r[c.sup]);
    out.n++;
  }
  return out.n ? out : null;
}

// Revenda pelo título "CB DISTRIBUIDORA ... - CB NORTE" de uma aba.
function revendaDoTitulo(ws) {
  for (const r of linhasAba(ws).slice(0, 6)) for (const c of r || []) { const s = sem(c); if (/CB NORTE$/.test(s)) return 'NORTE'; if (/CB SUL$/.test(s)) return 'SUL'; }
  return null;
}

// Aba de um dia (planilha "dia a dia"): A:H = DT.EMI, cliente, nome, quant, reduzido, descrição, unitário, valor; subtotal em F.
function pedidosDaAba(ws) {
  const L = linhasAba(ws), pedidos = [];
  let atual = null, n = 0;
  for (const r of L) {
    const cli = txt(r?.[1]);
    if (!RE_CLI.test(cli)) continue;
    const desc = txt(r[5]);
    if (/^T?OTAL PED\.\/CLI\.$/.test(desc)) {
      if (atual && atual.cli === cli) { atual.total = typeof r[7] === 'number' ? arred(r[7]) : numBR(r[7]); pedidos.push(atual); atual = null; }
      continue;
    }
    if (!atual || atual.cli !== cli) {
      if (atual) pedidos.push(atual);
      atual = { ped: String(++n).padStart(4, '0'), cli, nome: txt(r[2]), dia: dataDtEmi(r[0]), itens: [], total: null };
    }
    const q = typeof r[3] === 'number' ? r[3] : numBR(r[3]) ?? 0, vt = typeof r[7] === 'number' ? r[7] : numBR(r[7]) ?? 0;
    atual.itens.push({ cod: txt(r[4]), desc, q, vt: arred(vt) });
  }
  if (atual) pedidos.push(atual);
  for (const p of pedidos) if (p.total == null) p.total = arred(p.itens.reduce((a, i) => a + i.vt, 0));
  return pedidos;
}

// Reconhece o arquivo .xls/.xlsx. tipos:
//   'base'      → {bases: {NORTE?: base, SUL?: base}, dataBase}
//   'resumo'    → planilha antiga "CB NORTE/SUL - REPROGRAMAÇÃO": {revenda, ordem: [cli], dias: {cli: n}, bases}
//   'diaadia'   → {dias: [{dia, aba, pedidos}]} (revenda pelo cadastro, na gravação)
export function lerPlanilhaRP(wb, nome = '') {
  const nomes = wb.SheetNames, aba = (n) => wb.Sheets[nomes.find((x) => sem(x) === sem(n))];
  // BASE ATUALIZADA
  if (aba('NORTE') || aba('SUL')) {
    const bases = {};
    for (const u of ['NORTE', 'SUL']) { const b = aba(u) && lerBaseAbaRP(aba(u)); if (b) bases[u] = b; }
    if (Object.keys(bases).length) {
      const d = linhasAba(aba('NORTE') || aba('SUL')).slice(0, 5).flat().map(txt).join(' ').match(/ATUALIZADO EM:?\s*(\d\d)\/(\d\d)\/(\d{4})/);
      return { tipo: 'base', bases, dataBase: d ? iso(+d[1], +d[2], +d[3]) : null };
    }
  }
  // Planilha antiga do Resumo
  if (aba('Resumo')) {
    const ws = aba('Resumo'), revenda = revendaDoTitulo(ws) || revendaDoNome(nome);
    const L = linhasAba(ws), h = L.findIndex((r) => r && r.some((c) => sem(c) === 'COD CLIENTE'));
    if (h >= 0) {
      const cab = L[h].map(sem), cB = cab.indexOf('COD CLIENTE'), cJ = cab.findIndex((c) => /DIAS REPROGRAMADOS/.test(c));
      const ordem = [], dias = {};
      for (const r of L.slice(h + 1)) {
        const cli = txt(r?.[cB]);
        if (!RE_CLI.test(cli)) continue;
        ordem.push(cli);
        const v = r[cJ];
        if (typeof v === 'number' && v > 0) dias[cli] = v;
      }
      const b = aba('base') && lerBaseAbaRP(aba('base'));
      return { tipo: 'resumo', revenda, ordem, dias, bases: b && revenda ? { [revenda]: b } : {} };
    }
  }
  // Dia a dia: abas "dd-mm"
  const abasDia = nomes.filter((n) => /^\d{2}-\d{2}$/.test(n));
  if (abasDia.length) {
    const porDia = new Map();
    for (const n of abasDia) {
      const pedidos = pedidosDaAba(wb.Sheets[n]);
      if (!pedidos.length) continue;
      const cont = {};
      for (const p of pedidos) if (p.dia) cont[p.dia] = (cont[p.dia] || 0) + 1;
      const dia = Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!dia) continue;
      // Duas abas do mesmo dia: fica a de mais pedidos (a outra vai para os avisos).
      const ja = porDia.get(dia);
      if (!ja || ja.pedidos.length < pedidos.length) porDia.set(dia, { dia, aba: n, pedidos, outra: ja?.aba });
    }
    return { tipo: 'diaadia', dias: [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia)) };
  }
  return { tipo: null };
}

// Qual revenda tem mais clientes da lista no cadastro (bases = {NORTE: {clientes}, SUL: {clientes}}).
// Os códigos se repetem entre as revendas (~6.800 em comum), então exige folga: a melhor com ≥ 90% e ≥ 1,3× a outra.
// null sem cadastro ou sem folga (aí vale o nome do arquivo).
export function revendaPeloCadastroRP(clis, bases) {
  const n = Object.keys(REVENDAS_RP).map((u) => [u, bases?.[u]?.clientes ? clis.filter((x) => bases[u].clientes[x]).length : 0]).sort((a, b) => b[1] - a[1]);
  const [[u, a], [, b]] = n;
  return a && a >= clis.length * 0.9 && a >= b * 1.3 ? u : null;
}

// ---------------------------------------------------------------- Resumo (como a aba Resumo da planilha)
// dia = {clientes: [{cli, nome, valor, ped, itens}], dias: {cli: n}}; base = {clientes, vends, sups}; anterior = {dia, dias} | null.
// As linhas ficam na ordem do relatório TXT (o maior número de dias vem primeiro nele): o Hub não reordena.
export function resumoRP(dia, base, anterior = null) {
  const dias = dia?.dias || {}, ant = anterior?.dias || {}, cad = base?.clientes || {};
  const linhas = (dia?.clientes || []).map((c, i) => {
    const b = cad[c.cli];
    return {
      i, cli: c.cli, nomeRel: c.nome, razao: b?.[0] || '', cidade: b?.[1] || '', vend: b?.[2] || '', vendNome: base?.vends?.[b?.[2]] || '',
      sup: b?.[3] || '', supNome: base?.sups?.[b?.[3]] || '', pasta: b?.[4] || '', semCadastro: !b,
      dias: Number.isFinite(dias[c.cli]) ? dias[c.cli] : null, anterior: Number.isFinite(ant[c.cli]) ? ant[c.cli] : null,
      valor: c.valor ?? null, ped: c.ped ?? null, itens: c.itens ?? null,
    };
  });
  // Quadro por supervisor (E:G): código, nome e clientes reprogramados; ordem do código.
  const sups = new Map();
  for (const x of linhas) { const k = x.sup || '—'; const s = sups.get(k) || { sup: k, nome: x.supNome, n: 0 }; s.n++; sups.set(k, s); }
  const quadro = [...sups.values()].sort((a, b) => (+a.sup || 1e9) - (+b.sup || 1e9) || a.sup.localeCompare(b.sup));
  const digitados = linhas.filter((x) => x.dias != null).length;
  const tot = { clientes: linhas.length, pedidos: linhas.reduce((a, x) => a + (x.ped || 0), 0), itens: linhas.reduce((a, x) => a + (x.itens || 0), 0), valor: arred(linhas.reduce((a, x) => a + (x.valor || 0), 0)) };
  return { linhas, quadro, digitados, semCadastro: linhas.filter((x) => x.semCadastro).length, tot };
}

// Farol da coluna DIAS REPROGRAMADOS (formatação condicional da planilha: 1 = amarelo, 2 ou mais = vermelho).
export const farolRP = (n) => (n == null ? '' : n >= 2 ? 'c-no' : n >= 1 ? 'c-mid' : 'c-ok');

// Lê o campo de dias: inteiro ≥ 0; vazio = não digitado.
export function lerDiasRP(s) {
  const t = String(s ?? '').trim();
  if (!t) return null;
  if (!/^\d{1,4}$/.test(t)) throw new Error(`Dias inválido: "${s}" (use um número inteiro)`);
  return +t;
}
