// Mapeamento da Montagem para o modelo oficial; a edição OOXML é compartilhada.
import { abrirModeloXlsm, lerAbaXlsm, definirNumeroPreservandoFormulaXlsm, definirTextoXlsm, baixarModeloXlsm } from './xlsm.js?v=20261126-02';

const serialExcel = (iso) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);
const cel = (col, row) => `${col}${row}`;

function preencherResumo(ws, r, col) {
  const set = (row, value) => definirNumeroPreservandoFormulaXlsm(ws, cel(col, row), value);
  set(5, r.dias_uteis);
  set(10, r.volume_aa); set(11, r.meta_volume); set(12, r.dia_anterior); set(13, r.acm);
  set(14, r.tendencia);
  definirNumeroPreservandoFormulaXlsm(ws, cel(col === 'D' ? 'E' : 'J', 14), r.tend_vs_meta);
  set(16, r.tarifa); set(17, r.faturamento_aa); set(18, r.meta_faturamento);
  set(19, r.fat_dia_anterior); set(20, r.fat_acm); set(21, r.fat_tendencia);
  definirNumeroPreservandoFormulaXlsm(ws, cel(col === 'D' ? 'E' : 'J', 21), r.fat_tend_vs_meta);
}

function preencherDiario(ws, resultado) {
  resultado.dias.forEach((d, i) => {
    const row = 10 + i;
    definirNumeroPreservandoFormulaXlsm(ws, `B${row}`, serialExcel(d.data));
    for (const [col, value] of [
      ['C', d.vol_cxf], ['D', d.entregas], ['E', d.cargas], ['F', d.cubos], ['G', d.ocupacao],
      ['H', d.cx_unit], ['I', d.reprog_uc], ['J', d.reprog_cli], ['R', d.ret_vol], ['S', d.ret_cli],
    ]) definirNumeroPreservandoFormulaXlsm(ws, `${col}${row}`, value);
  });
}

export async function exportarMontagem(arquivoModelo, mes, resultados) {
  const modelo = await abrirModeloXlsm(arquivoModelo), data = new Date().toLocaleDateString('pt-BR');
  const planilhas = [];
  const resumo = await lerAbaXlsm(modelo, 'RESUMO');
  definirTextoXlsm(resumo.xml, 'B3', `ATUALIZADO EM: ${data}`);
  const unidades = [['CBAR', 'BARREIRAS', 'D'], ['CCRT', 'JUAZEIRO', 'I']];
  for (const [centro, aba, col] of unidades) {
    const resultado = resultados[centro];
    if (!resultado?.dias?.length) throw new Error(`Não há dados de Montagem para ${centro} em ${mes}.`);
    preencherResumo(resumo.xml, resultado.resumo, col);
    const detalhe = await lerAbaXlsm(modelo, aba);
    preencherDiario(detalhe.xml, resultado);
    planilhas.push(detalhe);
  }
  planilhas.push(resumo);
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [, mm] = mes.split('-');
  const nome = `${String(+mm).padStart(2,'0')} - Montagem de Cargas - ${meses[+mm - 1]}.xlsm`;
  await baixarModeloXlsm(modelo, planilhas, nome);
}
