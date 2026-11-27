// Exportação dos Montadores no modelo oficial. Nas abas DA e DL, cada lançamento ocupa E:M: MONTADOR (nome no sistema),
// LOGIN, caixas, caixa/hora, erros, data, nome completo e base (PROCV no cadastro A:C, como na planilha) e dia da semana.
// O cadastro (A:C) não é tocado.
import { abrirModeloXlsm, lerAbaXlsm, limparCelulaXlsm, definirNumeroCriandoXlsm, definirTextoCriandoXlsm, definirFormulaCriandoXlsm, baixarModeloXlsm } from './xlsm.js?v=20261127-1';

const serial = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);
const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const baseNome = { NORTE: 'CB NORTE', SUL: 'CB SUL', CBAR: 'LOG I - BARREIRAS', CCRT: 'LOG II - JUAZEIRO' };
const colunas = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
const chave = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

function maxRow(ws) {
  const rows = [...ws.getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'c')]
    .map((c) => c.getAttribute('r')?.match(/^([A-Z]+)(\d+)$/))
    .filter((m) => m && /^[E-M]$/.test(m[1]) && Number(m[2]) >= 3)
    .map((m) => Number(m[2]));
  return Math.max(2, ...rows);
}

// Cadastro do modelo (A:C): nome no sistema → {sistema, nome, base}, e também pelo nome completo.
function cadastroDoModelo(wb, aba) {
  const porSistema = new Map(), porNome = new Map();
  for (const row of XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: true, defval: null })) {
    const sistema = String(row[0] ?? ''), nome = String(row[1] ?? ''), base = String(row[2] ?? '').trim();
    if (!sistema.trim() || !Object.values(baseNome).includes(base)) continue;
    const p = { sistema, nome, base };
    if (!porSistema.has(chave(sistema))) porSistema.set(chave(sistema), p);
    if (!porNome.has(chave(nome))) porNome.set(chave(nome), p);
  }
  return { porSistema, porNome };
}

function preencherFolha(ws, registros, cadastro) {
  const ultima = Math.max(maxRow(ws), 2 + registros.length);
  for (let row = 3; row <= ultima; row++) {
    for (const col of colunas) limparCelulaXlsm(ws, `${col}${row}`);
    const r = registros[row - 3];
    const buscaNome = `IFERROR(VLOOKUP(E${row},A:B,2,0),"")`, buscaBase = `IFERROR(VLOOKUP(K${row},B:C,2,0),"")`;
    if (!r) {
      // Linha livre: as fórmulas ficam, para continuar digitando na planilha.
      definirFormulaCriandoXlsm(ws, `K${row}`, buscaNome);
      definirFormulaCriandoXlsm(ws, `L${row}`, buscaBase);
      continue;
    }
    const noCadastro = cadastro.porSistema.get(chave(r.sistema || r.nome)) || cadastro.porNome.get(chave(r.nome));
    const base = baseNome[r.base];
    definirTextoCriandoXlsm(ws, `E${row}`, noCadastro?.sistema || r.sistema || r.nome);
    definirTextoCriandoXlsm(ws, `F${row}`, r.login);
    definirNumeroCriandoXlsm(ws, `G${row}`, r.caixas);
    definirNumeroCriandoXlsm(ws, `H${row}`, r.cxHora);
    definirNumeroCriandoXlsm(ws, `I${row}`, r.erros);
    definirNumeroCriandoXlsm(ws, `J${row}`, serial(r.data));
    if (noCadastro) definirFormulaCriandoXlsm(ws, `K${row}`, buscaNome, noCadastro.nome);
    else definirTextoCriandoXlsm(ws, `K${row}`, r.nome);
    if (noCadastro && noCadastro.base === base) definirFormulaCriandoXlsm(ws, `L${row}`, buscaBase, base);
    else definirTextoCriandoXlsm(ws, `L${row}`, base);
    definirTextoCriandoXlsm(ws, `M${row}`, DOW[new Date(`${r.data}T12:00:00Z`).getUTCDay()]);
  }
}

export async function exportarMontadores(file, mes, registros) {
  const modelo = await abrirModeloXlsm(file), planilhas = [];
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', sheets: ['DA', 'DL'] });
  const doMes = (bases) => registros.filter((r) => bases.includes(r.base) && r.data?.startsWith(`${mes}-`))
    .sort((a, b) => a.data.localeCompare(b.data) || bases.indexOf(a.base) - bases.indexOf(b.base));
  const grupos = { DA: doMes(['NORTE', 'SUL']), DL: doMes(['CBAR', 'CCRT']) };
  if (!grupos.DA.length && !grupos.DL.length) throw new Error(`Não há dados de Montadores em ${mes}.`);
  for (const nome of ['DA', 'DL']) {
    const folha = await lerAbaXlsm(modelo, nome);
    preencherFolha(folha.xml, grupos[nome], cadastroDoModelo(wb, nome));
    planilhas.push(folha);
  }
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const xlsx = file.name.toLowerCase().endsWith('.xlsx'), ext = xlsx ? 'xlsx' : 'xlsm';
  await baixarModeloXlsm(modelo, planilhas, `Acompanhamento de Montadores - ${meses[+mes.slice(5, 7) - 1]}'${mes.slice(2, 4)}.${ext}`);
}
