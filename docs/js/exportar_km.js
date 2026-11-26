// Mapeamento do resumo oficial KM para a folha Analise por dia.
import {
  abrirModeloXlsm, lerAbaXlsm, definirNumeroSeExistirXlsm, definirNumeroCriandoXlsm, definirTextoSeExistirXlsm, baixarModeloXlsm,
} from './xlsm.js?v=20261126-06';

const serialExcel = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);
const colunaDia = (dia) => {
  let n = dia + 1, s = '';
  while (n) { const x = (n - 1) % 26; s = String.fromCharCode(65 + x) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
const linhas = { NORTE: [3, 4, 5, 6, 7, 8], SUL: [10, 11, 12, 13, 14, 15], CBAR: [17, 18, 19, 20, 21, 22], CCRT: [24, 25, 26, 27, 28, 29] };
const sem = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];

function gravarDia(ws, row, col, valor) {
  definirNumeroCriandoXlsm(ws, `${col}${row}`, valor);
}

function preencherUnidade(ws, codigo, unidade, mes) {
  const [linhaData, planejadoRow, realizadoRow, diferencaRow, dispersaoRow, custoRow] = linhas[codigo];
  const diasMes = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();
  for (let dia = 1; dia <= 31; dia++) {
    const col = colunaDia(dia);
    const data = dia <= diasMes ? `${mes}-${String(dia).padStart(2, '0')}` : null;
    definirTextoSeExistirXlsm(ws, `${col}2`, data ? sem[new Date(`${data}T12:00:00Z`).getUTCDay()] : '');
    definirNumeroSeExistirXlsm(ws, `${col}${linhaData}`, data ? serialExcel(data) : null);
    const d = data ? unidade.dias.find((x) => x.data === data) : null;
    gravarDia(ws, planejadoRow, col, d?.planejado ?? null);
    gravarDia(ws, realizadoRow, col, d?.realizado ?? null);
    gravarDia(ws, diferencaRow, col, d?.diferenca ?? null);
    gravarDia(ws, dispersaoRow, col, d?.dispersao ?? null);
    gravarDia(ws, custoRow, col, d && unidade.totais.cpk != null ? d.diferenca * unidade.totais.cpk : null);
  }
}

function preencherTotalGeral(ws, resultado, mes) {
  const diasMes = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();
  for (let dia = 1; dia <= 31; dia++) {
    const col = colunaDia(dia), data = dia <= diasMes ? `${mes}-${String(dia).padStart(2, '0')}` : null;
    const us = Object.values(resultado.unidades);
    const ds = data ? us.map((u) => u.dias.find((x) => x.data === data)) : [];
    const soma = (k) => ds.some(Boolean) ? ds.reduce((n, d) => n + (Number(d?.[k]) || 0), 0) : null;
    gravarDia(ws, 30, col, soma('planejado'));
    gravarDia(ws, 31, col, soma('realizado'));
    gravarDia(ws, 32, col, soma('diferenca'));
    const p = soma('planejado'), r = soma('realizado');
    gravarDia(ws, 33, col, p ? r / p - 1 : null);
  }
}

export async function exportarKM(arquivoModelo, mes, resultado) {
  const modelo = await abrirModeloXlsm(arquivoModelo);
  const folha = await lerAbaXlsm(modelo, 'Analise por dia');
  for (const codigo of Object.keys(linhas)) {
    const unidade = resultado.unidades[codigo];
    if (!unidade?.dias) throw new Error(`O resultado de KM não contém ${codigo}.`);
    preencherUnidade(folha.xml, codigo, unidade, mes);
  }
  preencherTotalGeral(folha.xml, resultado, mes);
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  await baixarModeloXlsm(modelo, [folha], `KM Planejado x Realizado - ${meses[+mes.slice(5, 7) - 1]}.xlsm`);
}
