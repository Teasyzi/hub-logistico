import { abrirModeloXlsm, lerAbaXlsm, limparCelulaXlsm, definirNumeroCriandoXlsm, definirTextoCriandoXlsm, baixarModeloXlsm } from './xlsm.js?v=20261126-06';

const serial = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);
const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const baseNome = { NORTE: 'CB NORTE', SUL: 'CB SUL', CBAR: 'LOG I - BARREIRAS', CCRT: 'LOG II - JUAZEIRO' };
const colunas = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

function maxRow(ws) {
  const rows = [...ws.getElementsByTagNameNS('http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'c')]
    .map((c) => c.getAttribute('r')?.match(/^([A-Z]+)(\d+)$/))
    .filter((m) => m && /^[F-M]$/.test(m[1]) && Number(m[2]) >= 3)
    .map((m) => Number(m[2]));
  return Math.max(2, ...rows);
}

function preencherFolha(ws, registros) {
  const ultima = Math.max(maxRow(ws), 2 + registros.length);
  for (let row = 3; row <= ultima; row++) for (const col of colunas) limparCelulaXlsm(ws, `${col}${row}`);
  registros.forEach((r, i) => {
    const row = i + 3, dia = DOW[new Date(`${r.data}T12:00:00Z`).getUTCDay()];
    definirTextoCriandoXlsm(ws, `F${row}`, r.login);
    definirNumeroCriandoXlsm(ws, `G${row}`, r.caixas);
    definirNumeroCriandoXlsm(ws, `H${row}`, r.cxHora);
    definirNumeroCriandoXlsm(ws, `I${row}`, r.erros);
    definirNumeroCriandoXlsm(ws, `J${row}`, serial(r.data));
    definirTextoCriandoXlsm(ws, `K${row}`, r.nome);
    definirTextoCriandoXlsm(ws, `L${row}`, baseNome[r.base]);
    definirTextoCriandoXlsm(ws, `M${row}`, dia);
  });
}

export async function exportarMontadores(file, mes, registros) {
  const modelo = await abrirModeloXlsm(file), planilhas = [];
  const grupos = {
    DA: registros.filter((r) => ['NORTE', 'SUL'].includes(r.base) && r.data?.startsWith(`${mes}-`)),
    DL: registros.filter((r) => ['CBAR', 'CCRT'].includes(r.base) && r.data?.startsWith(`${mes}-`)),
  };
  if (!grupos.DA.length && !grupos.DL.length) throw new Error(`Não há dados de Montadores em ${mes}.`);
  for (const nome of ['DA', 'DL']) {
    const folha = await lerAbaXlsm(modelo, nome); preencherFolha(folha.xml, grupos[nome]); planilhas.push(folha);
  }
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const xlsx = file.name.toLowerCase().endsWith('.xlsx'), ext = xlsx ? 'xlsx' : 'xlsm';
  await baixarModeloXlsm(modelo, planilhas, `Acompanhamento de Montadores - ${meses[+mes.slice(5, 7) - 1]}'${mes.slice(2, 4)}.${ext}`);
}
