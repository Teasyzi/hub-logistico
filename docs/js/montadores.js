import { salvarDadosMontadores, lerDadosMontadores } from './modelos.js';

const BASES = { 'CB NORTE': 'NORTE', 'CB SUL': 'SUL', 'LOG I - BARREIRAS': 'CBAR', 'LOG II - JUAZEIRO': 'CCRT' };
const NUM = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

function isoData(v) {
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null;
  }
  if (v instanceof Date && Number.isFinite(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') {
    const br = v.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
    if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    const x = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (x) return x[0];
  }
  return null;
}

function lerFolha(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error(`O modelo não possui a aba ${sheetName}.`);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 2, raw: true, defval: null });
  const saida = [];
  for (const row of rows) {
    const login = row[5], caixas = row[6], cxHora = row[7], erros = row[8], data = isoData(row[9]);
    const nome = row[10], baseOriginal = String(row[11] || '').trim().toUpperCase();
    const base = BASES[baseOriginal] || (Object.hasOwn(BASES, baseOriginal) ? BASES[baseOriginal] : baseOriginal);
    if (!data || !base || !Object.values(BASES).includes(base) || (!login && !nome)) continue;
    saida.push({ login: String(login || nome).trim(), nome: String(nome || login).trim(), base, data,
      caixas: NUM(caixas), cxHora: NUM(cxHora), erros: NUM(erros) });
  }
  return saida;
}

export async function lerMontadoresXlsx(file) {
  if (!globalThis.XLSX) throw new Error('O leitor de planilhas não carregou. Atualize a página.');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  if (!wb.Sheets.DA || !wb.Sheets.DL) throw new Error('O arquivo precisa ser o acompanhamento oficial de Montadores com as abas DA e DL.');
  const registros = [...lerFolha(wb, 'DA'), ...lerFolha(wb, 'DL')];
  if (!registros.length) throw new Error('Não encontrei linhas válidas nas abas DA e DL.');
  return registros;
}

export const importarMontadoresLocal = async (file) => {
  const registros = await lerMontadoresXlsx(file);
  await salvarDadosMontadores(registros, file.name);
  return registros;
};
export const dadosMontadores = async () => (await lerDadosMontadores()).registros;

export function calcularMontadores(registros, mes) {
  const dias = new Map(), pessoas = new Map();
  for (const r of registros.filter((x) => x.data?.startsWith(`${mes}-`))) {
    const id = `${r.base}|${r.login}|${r.data}`;
    const dia = dias.get(id) || { base: r.base, login: r.login, nome: r.nome, data: r.data, caixas: 0, cxHora: 0, erros: 0 };
    dia.caixas += NUM(r.caixas); dia.cxHora += NUM(r.cxHora); dia.erros += NUM(r.erros); dias.set(id, dia);
  }
  for (const d of dias.values()) {
    const id = `${d.base}|${d.login}`;
    const p = pessoas.get(id) || { base: d.base, login: d.login, nome: d.nome, caixas: 0, erros: 0, dias: 0, cxHoraDias: [], diario: [] };
    p.caixas += d.caixas; p.erros += d.erros; if (d.caixas > 0 || d.cxHora > 0) { p.dias += 1; p.cxHoraDias.push(d.cxHora); }
    p.diario.push(d); pessoas.set(id, p);
  }
  const porBase = Object.fromEntries(Object.values(BASES).map((b) => [b, []]));
  for (const p of pessoas.values()) {
    p.mediaCxHora = p.cxHoraDias.length ? p.cxHoraDias.reduce((a, b) => a + b, 0) / p.cxHoraDias.length : 0;
    p.mediaCaixasDia = p.dias ? p.caixas / p.dias : 0; p.gratificacao = p.caixas * 0.003;
    p.diario.sort((a, b) => a.data.localeCompare(b.data)); porBase[p.base]?.push(p);
  }
  for (const list of Object.values(porBase)) list.sort((a, b) => b.mediaCxHora - a.mediaCxHora || b.caixas - a.caixas);
  return porBase;
}

export const BASES_MONTADORES = BASES;
