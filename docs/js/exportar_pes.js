// Mapeamento PES → modelo oficial; o fluxo OOXML compartilhado fica em xlsm.js.
import { abrirModeloXlsm, lerAbaXlsm, definirNumeroXlsm, definirTextoXlsm, baixarModeloXlsm } from './xlsm.js?v=20261126-06';

function preencherAba(ws, placar, data) {
  const porChave = Object.fromEntries(placar.linhas.map((x) => [x.k, x]));
  const ordem = ['ret_vol', 'ret_cli', 'reprog_vol', 'reprog_cli', 'green_mile', 'csat', 'licencas', 'acidentes', 'telemetria'];
  ordem.forEach((k, i) => {
    const linha = i + 7, x = porChave[k];
    if (!x) throw new Error(`O placar não contém o indicador ${k}.`);
    definirNumeroXlsm(ws, `C${linha}`, x.meta);
    definirNumeroXlsm(ws, `D${linha}`, x.real);
    definirNumeroXlsm(ws, `K${linha}`, x.solar);
  });
  definirTextoXlsm(ws, 'B3', `ATUALIZADO EM: ${data}`);
}

export async function exportarPES(arquivoModelo, mes, placares) {
  const modelo = await abrirModeloXlsm(arquivoModelo), data = new Date().toLocaleDateString('pt-BR');
  const planilhas = [];
  for (const [centro, aba] of [['CBAR', 'CBAR'], ['CCRT', 'CCRT']]) {
    const folha = await lerAbaXlsm(modelo, aba);
    preencherAba(folha.xml, placares[centro], data);
    planilhas.push(folha);
  }
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const [, mm] = mes.split('-');
  const nome = `${String(+mm).padStart(2,'0')} - PES - Resultados logisticos - ${meses[+mm - 1]}.xlsm`;
  await baixarModeloXlsm(modelo, planilhas, nome);
}
