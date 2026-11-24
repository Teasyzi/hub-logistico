// Retorno por motivo (4 unidades): leitura dos arquivos e cálculo puro.
// Regras (AUDITORIA/Retorno_por_Motivo.md §11, decididas em 24/11/2026):
//   - DLs: retorno = soma de Cxs Unitarias das linhas Externo do VOLUMES DE RETORNOS / ZSD0090, pelo motivo do SAP;
//     volume = soma de Cxs Unitaria da venda (os dois já importados na Montagem). Mês = Dt Remessa.
//   - DAs: retorno por motivo (cx unit) e por motorista (R$) vêm das exportações do BI; o volume (Saída) é digitado.
//   - % oficial (KPI e PES) = "s/ cancelamento": (retorno − CANCELAMENTO DE NF) ÷ (volume − CANCELAMENTO DE NF).
//     Só esse motivo sai. Os que já foram tirados alguma vez (consignação, erro na emissão) contam, mas ficam
//     "em observação" quando aparecem.
export const UNIDADES_RET = { NORTE: 'CB Norte', SUL: 'CB Sul', CBAR: 'DL Barreiras', CCRT: 'DL Juazeiro' };
export const DAS_RET = ['NORTE', 'SUL'];
export const DLS_RET = ['CBAR', 'CCRT'];

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const chave = (s) => semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// Motivo como aparece na tela: maiúsculas e espaços simples (o BI manda "Title Case"; as planilhas, maiúsculas).
export function motivoNorm(m) {
  const s = String(m ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toUpperCase();
  return s || '-';
}
export const ehCancelamento = (m) => chave(m) === 'cancelamento de nf';
// Já foram desconsiderados alguma vez em 2026 (consignação no Norte; erro na emissão no Sul). O texto da consignação
// já veio com a acentuação quebrada ("CONSIGNA€ÇO"), por isso a comparação é só pelo começo.
export const ehObservacao = (m) => { const k = chave(m); return k.startsWith('retorno de consigna') || k === 'erro na emissao da nota fiscal'; };

const numero = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim();
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const x = Number(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(x) ? x : 0;
};
// Sempre a partir de A1 (índice 0 = linha 1, coluna A): as abas CB NORTE / CB SUL começam em B2.
function linhas(ws) {
  if (!ws || !ws['!ref']) return [];
  const r = XLSX.utils.decode_range(ws['!ref']);
  r.s.r = 0; r.s.c = 0;
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null, blankrows: true, range: r });
}
const unidadeRevenda = (v) => { const k = chave(v); return /\bnorte\b/.test(k) ? 'NORTE' : /\bsul\b/.test(k) ? 'SUL' : null; };

// Soma por chave (motivo ou motorista), preservando o primeiro texto visto.
function somar(lista, campo) {
  const m = new Map();
  for (const x of lista) {
    const k = campo === 'motivo' ? motivoNorm(x.motivo) : String(x.nome ?? '').replace(/\s+/g, ' ').trim() || '-';
    const kk = campo === 'motivo' ? k : chave(k);
    const atual = m.get(kk) || (campo === 'motivo' ? { motivo: k, cx: 0 } : { nome: k, rs: 0 });
    if (campo === 'motivo') atual.cx += x.cx; else atual.rs += x.rs;
    m.set(kk, atual);
  }
  return [...m.values()];
}

// Exportação do BI (uma linha por revenda): "Revenda | Dev Motivo | Dev (Caixa Unitária)" ou
// "Revenda | Motorista | Dev (R$)". A base completa antiga (jan/26) também tem "Saída (Caixa Unitária)": aí dá o volume.
function lerBI(rows) {
  const i = rows.findIndex((l) => l && l.some((v) => chave(v) === 'revenda'));
  if (i < 0) return null;
  const cab = rows[i].map(chave), col = (...nomes) => cab.findIndex((c) => nomes.includes(c));
  const cRev = col('revenda'), cMot = col('dev motivo'), cCx = col('dev caixa unitaria'), cNome = col('motorista'), cRS = col('dev r'), cSai = col('saida caixa unitaria');
  const temMotivo = cMot >= 0 && cCx >= 0, temMotorista = cNome >= 0 && cRS >= 0;
  if (!temMotivo && !temMotorista) return null;
  const out = {}, ign = new Set();
  for (const l of rows.slice(i + 1)) {
    if (!l || l.every((v) => v == null || v === '')) continue;
    const u = unidadeRevenda(l[cRev]);
    if (!u) { if (l[cRev] != null && String(l[cRev]).trim()) ign.add(String(l[cRev]).trim()); continue; }
    const o = (out[u] ??= { motivos: temMotivo ? [] : null, motoristas: temMotorista ? [] : null, volume: cSai >= 0 ? 0 : null });
    if (temMotivo) o.motivos.push({ motivo: l[cMot], cx: numero(l[cCx]) });
    if (temMotorista) o.motoristas.push({ nome: l[cNome], rs: numero(l[cRS]) });
    if (cSai >= 0) o.volume += numero(l[cSai]);
  }
  for (const o of Object.values(out)) {
    if (o.motivos) o.motivos = somar(o.motivos, 'motivo').filter((x) => Math.abs(x.cx) > 1e-9);
    if (o.motoristas) o.motoristas = somar(o.motoristas, 'nome').filter((x) => Math.abs(x.rs) > 1e-9);
  }
  const tipo = [temMotivo && 'BI · retorno por motivo (cx unit)', temMotorista && 'BI · retorno por motorista (R$)', cSai >= 0 && 'volume (Saída)'].filter(Boolean).join(' + ');
  return { tipo, unidades: out, ignoradas: [...ign] };
}

// Planilha antiga "MM. Retorno - <Mês>.xlsx" (histórico dos DAs): abas CB NORTE / CB SUL (motivo C:D, volume E5,
// motorista Q:R) ou, em jan–fev/26, a aba DAS (Norte em C:D/E5, Sul em Q:R/S5). Os DLs saem da Montagem.
function lerPlanilhaAntiga(wb) {
  const tabelaAte = (rows, cTexto, cValor, fim) => {
    const out = [];
    for (let r = 7; r < Math.min(rows.length, 80); r++) {
      const t = rows[r]?.[cTexto];
      if (t == null || String(t).trim() === '') continue;
      if (fim.test(String(t).trim())) break;
      out.push({ t: String(t).trim(), v: numero(rows[r]?.[cValor]) });
    }
    return out;
  };
  const bloco = (rows, cM, cV, cVol, comMotorista) => {
    const mot = tabelaAte(rows, cM, cV, /^TOTAL RETORNO$/i);
    if (!mot.length) return null;
    const motoristas = comMotorista ? tabelaAte(rows, 16, 17, /^TOTAL$/i).map((x) => ({ nome: x.t, rs: x.v })) : null;
    return { motivos: somar(mot.map((x) => ({ motivo: x.t, cx: x.v })), 'motivo').filter((x) => Math.abs(x.cx) > 1e-9),
      motoristas: motoristas && motoristas.length ? somar(motoristas, 'nome') : null, volume: numero(rows[4]?.[cVol]) || null };
  };
  const unidades = {};
  for (const [aba, u] of [['CB NORTE', 'NORTE'], ['CB SUL', 'SUL']]) {
    if (!wb.Sheets[aba]) continue;
    const b = bloco(linhas(wb.Sheets[aba]), 2, 3, 4, true);
    if (b) unidades[u] = b;
  }
  if (!Object.keys(unidades).length && wb.Sheets.DAS) {
    const rows = linhas(wb.Sheets.DAS);
    const n = bloco(rows, 2, 3, 4, false), s = bloco(rows, 16, 17, 18, false);
    if (n) unidades.NORTE = n;
    if (s) unidades.SUL = s;
  }
  return Object.keys(unidades).length ? { tipo: 'planilha antiga de Retorno (CB Norte / CB Sul)', unidades, ignoradas: [] } : null;
}

// Devolve {tipo, unidades:{NORTE|SUL:{motivos|null, motoristas|null, volume|null}}, ignoradas} ou {tipo:null}.
export function lerArquivoRetorno(wb) {
  if (wb.Sheets['CB NORTE'] || wb.Sheets['CB SUL'] || (wb.Sheets.DAS && wb.Sheets.DLS)) {
    const x = lerPlanilhaAntiga(wb);
    if (x) return x;
  }
  for (const n of wb.SheetNames) {
    const x = lerBI(linhas(wb.Sheets[n]));
    if (x && Object.keys(x.unidades).length) return x;
  }
  return { tipo: null, unidades: {}, ignoradas: [] };
}

// DLs: a partir da venda e do retorno guardados pela Montagem (venda: {data, cxu}; retorno: {data, mot, ext, cxu}).
export function retornoDL({ venda = [], retorno = [], mes }) {
  const doMes = (x) => String(x.data || '').startsWith(mes);
  const vendaMes = venda.filter(doMes), ext = retorno.filter((r) => doMes(r) && r.ext);
  return {
    motivos: somar(ext.map((r) => ({ motivo: r.mot, cx: r.cxu || 0 })), 'motivo').filter((x) => Math.abs(x.cx) > 1e-9),
    volume: vendaMes.length ? vendaMes.reduce((s, v) => s + (v.cxu || 0), 0) : null,
    linhasExterno: ext.length,
    linhasInterno: retorno.filter((r) => doMes(r) && !r.ext).length,
    cxInterno: retorno.filter((r) => doMes(r) && !r.ext).reduce((s, r) => s + (r.cxu || 0), 0),
    ultimoDia: [...vendaMes, ...ext].map((x) => x.data).sort().at(-1) || null,
  };
}

// Uma unidade: {motivos:[{motivo,cx}], motoristas:[{nome,rs}]|null, volume} → tabelas e totais.
export function calcularUnidade(u, { volume = null } = {}) {
  const vol = volume ?? u?.volume ?? null;
  const lista = [...(u?.motivos || [])].sort((a, b) => b.cx - a.cx);
  const retorno = lista.reduce((s, m) => s + m.cx, 0);
  const cancelamento = lista.filter((m) => ehCancelamento(m.motivo)).reduce((s, m) => s + m.cx, 0);
  const semCanc = retorno - cancelamento, volSemCanc = vol == null ? null : vol - cancelamento;
  let acum = 0;
  const base = lista.filter((m) => !ehCancelamento(m.motivo));
  const motivos = lista.map((m) => {
    const canc = ehCancelamento(m.motivo);
    if (!canc) acum += m.cx;
    return { motivo: m.motivo, cx: m.cx, cancelamento: canc, observacao: ehObservacao(m.motivo),
      pctRetorno: canc || !semCanc ? null : m.cx / semCanc, pctAcumulado: canc || !semCanc ? null : acum / semCanc,
      pctVolume: vol ? m.cx / vol : null };
  });
  const motoristas = u?.motoristas ? [...u.motoristas].sort((a, b) => b.rs - a.rs) : null;
  const totalRS = motoristas ? motoristas.reduce((s, m) => s + m.rs, 0) : null;
  return {
    temDados: lista.length > 0,
    motivos,
    observacao: motivos.filter((m) => m.observacao),
    motoristas: motoristas && motoristas.map((m) => ({ ...m, pct: totalRS ? m.rs / totalRS : null })),
    totais: { retorno, cancelamento, semCanc, volume: vol, volSemCanc,
      pctTotal: vol ? retorno / vol : null, pctSemCanc: volSemCanc ? semCanc / volSemCanc : null,
      totalRS, motoristas: motoristas ? motoristas.length : null, motivos: base.length },
  };
}

// dados: {NORTE|SUL: {motivos, motoristas, volume}, CBAR|CCRT: {venda, retorno}}; parametros: {U: {volume}}
export function calcularRetorno({ mes, dados = {}, parametros = {} }) {
  const unidades = {};
  for (const u of Object.keys(UNIDADES_RET)) {
    const par = parametros[u] || {};
    let fonte, info = {};
    if (DLS_RET.includes(u)) {
      const d = retornoDL({ ...(dados[u] || {}), mes });
      fonte = d; info = { linhasExterno: d.linhasExterno, linhasInterno: d.linhasInterno, cxInterno: d.cxInterno, ultimoDia: d.ultimoDia };
    } else fonte = dados[u] || {};
    const volume = par.volume ?? fonte.volume ?? null;
    const origemVolume = par.volume != null ? 'digitado em ⚙ Parâmetros' : fonte.volume != null ? (DLS_RET.includes(u) ? 'venda da Montagem (cx unit)' : 'do arquivo importado') : null;
    unidades[u] = { unidade: u, nome: UNIDADES_RET[u], mes, ...calcularUnidade(fonte, { volume }), origemVolume, ...info,
      arquivos: fonte.arquivos || null };
  }
  return { mes, unidades };
}

// O que os leitores veem: números e motivos. A lista de motoristas (nomes) fica só no rascunho do admin.
export function agregadoPublicadoRetorno(r) {
  return Object.fromEntries(Object.entries(r.unidades).map(([u, d]) => [u, {
    unidade: u, nome: d.nome, temDados: d.temDados, totais: d.totais, origemVolume: d.origemVolume,
    motivos: d.motivos,
  }]));
}
