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
    saida.push({ login: String(login || nome).trim(), nome: String(nome || login).trim(), base, data, fonteCadastro: true,
      diarista: row.some((v) => /diarista/i.test(String(v || ''))),
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

const textoCabecalho = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();

function numeroPlanilha(valor, rotulo, arquivo, linha, { inteiro = false } = {}) {
  let n;
  if (typeof valor === 'number') n = valor;
  else {
    let s = String(valor ?? '').trim();
    if (!s) throw new Error(`${arquivo}, linha ${linha}: ${rotulo} está vazio.`);
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (inteiro && /^\d{1,3}(?:\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    n = Number(s);
  }
  if (!Number.isFinite(n) || n < 0 || (inteiro && !Number.isInteger(n))) {
    throw new Error(`${arquivo}, linha ${linha}: ${rotulo} precisa ser um número ${inteiro ? 'inteiro ' : ''}não negativo.`);
  }
  return n;
}

function lerListaDiaria(wb, file, base) {
  const aba = Object.keys(wb.Sheets).find((nome) => textoCabecalho(nome) === 'listas trabalhadas');
  if (!aba) return null;
  const match = file.name.match(/^(\d{4}-\d{2}-\d{2})-listas-trabalhadas\.(?:xlsx|xlsm)$/i);
  if (!match) throw new Error(`${file.name}: o nome precisa começar pela data no formato AAAA-MM-DD-listas-trabalhadas.`);
  const data = match[1], d = new Date(`${data}T00:00:00Z`);
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== data) throw new Error(`${file.name}: a data no nome do arquivo não é válida.`);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[aba], { header: 1, raw: true, defval: null });
  const cabecalho = (rows[0] || []).map(textoCabecalho);
  const coluna = (nome) => cabecalho.indexOf(textoCabecalho(nome));
  const ix = { posicao: coluna('Posição'), nome: coluna('Montador'), login: coluna('Login'), caixas: coluna('Caixas'), cxHora: coluna('Caixas/Hora'), erros: coluna('Erros') };
  const ixTipo = ['Tipo', 'Vínculo', 'Categoria', 'Classificação'].map(coluna).find((i) => i >= 0) ?? -1;
  const faltando = Object.entries(ix).filter(([, i]) => i < 0).map(([k]) => k);
  if (faltando.length) throw new Error(`${file.name}: cabeçalho incompleto; faltam ${faltando.join(', ')}.`);
  const registros = [], logins = new Set(), posicoes = new Set();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (!row.some((v) => String(v ?? '').trim())) continue;
    const linha = i + 1, nome = String(row[ix.nome] ?? '').replace(/\s+/g, ' ').trim(), login = String(row[ix.login] ?? '').trim();
    if (!nome || !login) throw new Error(`${file.name}, linha ${linha}: montador e login são obrigatórios.`);
    const chaveLogin = login.toLocaleLowerCase('pt-BR');
    if (logins.has(chaveLogin)) throw new Error(`${file.name}, linha ${linha}: login duplicado (${login}).`);
    logins.add(chaveLogin);
    const posicao = numeroPlanilha(row[ix.posicao], 'posição', file.name, linha, { inteiro: true });
    if (posicao < 1 || posicoes.has(posicao)) throw new Error(`${file.name}, linha ${linha}: posição repetida ou inválida (${posicao}).`);
    posicoes.add(posicao);
    const metr = Object.fromEntries([
      ['paletes', 'Paletes'], ['misto', 'Misto'], ['lpDuplo', 'LP Duplo'], ['container', 'Container'], ['gaveta', 'Gaveta'],
    ].map(([chave, rotulo]) => {
      const indice = coluna(rotulo);
      return [chave, indice < 0 || row[indice] == null || String(row[indice]).trim() === '' ? null : numeroPlanilha(row[indice], rotulo, file.name, linha, { inteiro: true })];
    }));
    const tipo = ixTipo < 0 ? '' : String(row[ixTipo] ?? '').trim();
    registros.push({ nome, login, base, data, tipo, fonteCadastro: false, observacao: false, diarista: /diarista/i.test(tipo),
      caixas: numeroPlanilha(row[ix.caixas], 'caixas', file.name, linha, { inteiro: true }),
      cxHora: numeroPlanilha(row[ix.cxHora], 'caixas/hora', file.name, linha),
      erros: numeroPlanilha(row[ix.erros], 'erros', file.name, linha, { inteiro: true }),
      posicao, ...metr,
    });
  }
  if (!registros.length) throw new Error(`${file.name}: não há linhas de produção para importar.`);
  if (posicoes.size !== registros.length || [...posicoes].some((p, i) => p !== i + 1)) throw new Error(`${file.name}: as posições do ranking precisam começar em 1 e seguir sem lacunas.`);
  for (let i = 1; i < registros.length; i++) {
    if (registros[i].cxHora > registros[i - 1].cxHora) throw new Error(`${file.name}: o ranking não está em ordem decrescente de caixas/hora (linhas ${i + 1} e ${i + 2}).`);
  }
  return { tipo: 'diaria', data, registros, arquivo: file.name };
}

export async function importarMontadoresArquivos(files, baseDiaria, confirmarNovos = false) {
  if (!globalThis.XLSX) throw new Error('O leitor de planilhas não carregou. Atualize a página.');
  const lista = [...files];
  if (!lista.length) throw new Error('Selecione pelo menos um arquivo.');
  const analises = await Promise.all(lista.map(async (file) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const diaria = lerListaDiaria(wb, file, baseDiaria);
      if (diaria) return diaria;
      if (wb.Sheets.DA && wb.Sheets.DL) return { tipo: 'oficial', arquivo: file.name, registros: await lerMontadoresXlsx(file) };
      throw new Error('formato não reconhecido; esperava a aba listas-trabalhadas ou as abas DA e DL.');
    } catch (e) { throw new Error(`${file.name}: ${e.message.replace(`${file.name}: `, '')}`); }
  }));
  const tipos = new Set(analises.map((a) => a.tipo));
  if (tipos.size > 1) throw new Error('Não misture listas diárias e planilha oficial DA/DL no mesmo lote. Nenhum dado foi alterado.');
  if (tipos.has('oficial') && analises.length > 1) throw new Error('Selecione apenas uma planilha oficial DA/DL por importação. Nenhum dado foi alterado.');

  const dados = await lerDadosMontadores();
  let registros;
  if (tipos.has('diaria')) {
    if (!['NORTE', 'SUL', 'CBAR', 'CCRT'].includes(baseDiaria)) throw new Error('Selecione uma unidade válida para as listas diárias. Nenhum dado foi alterado.');
    const datas = analises.map((a) => a.data);
    if (new Set(datas).size !== datas.length) throw new Error('O lote contém mais de um arquivo para a mesma data. Remova a cópia repetida; nenhum dado foi alterado.');
    const cadastro = new Map(), temCadastro = dados.registros.some((r) => r.fonteCadastro) || dados.registros.some((r) => r.posicao == null);
    for (const r of dados.registros.filter((x) => x.fonteCadastro || (temCadastro && x.posicao == null))) {
      r.fonteCadastro = true;
      const chave = String(r.login || '').trim().toLocaleLowerCase('pt-BR');
      if (!chave) continue;
      const pessoa = cadastro.get(chave) || { bases: new Set(), nome: r.nome, diarista: false };
      if (r.base) pessoa.bases.add(r.base);
      if (!pessoa.nome && r.nome) pessoa.nome = r.nome;
      pessoa.diarista ||= r.diarista === true;
      cadastro.set(chave, pessoa);
    }
    const novos = new Map();
    for (const r of analises.flatMap((a) => a.registros)) {
      const pessoa = cadastro.get(r.login.toLocaleLowerCase('pt-BR'));
      if (!pessoa) {
        r.observacao = true;
        novos.set(r.login.toLocaleLowerCase('pt-BR'), { login: r.login, nome: r.nome });
        continue;
      }
      if (pessoa.bases.size > 1) throw new Error(`O login ${r.login} aparece em mais de uma unidade no cadastro já importado. Confira a planilha oficial; nenhum dado foi alterado.`);
      const unidadeCadastro = [...pessoa.bases][0];
      if (unidadeCadastro && unidadeCadastro !== baseDiaria) throw new Error(`O login ${r.login} está cadastrado em ${unidadeCadastro}, mas o lote foi marcado como ${baseDiaria}. Nenhum dado foi alterado.`);
      r.diarista ||= pessoa.diarista;
      if (pessoa.nome) r.nome = String(pessoa.nome).replace(/\s+/g, ' ').trim();
    }
    if (novos.size && !confirmarNovos) return { tipo: 'diaria', necessitaConfirmacao: true, novos: [...novos.values()], arquivos: analises.map(({ arquivo, data, registros: linhas }) => ({ arquivo, data, linhas: linhas.length })) };
    const substituidas = new Set(datas.map((data) => `${baseDiaria}|${data}`));
    const anteriores = dados.registros.filter((r) => !substituidas.has(`${r.base}|${r.data}`));
    registros = [...anteriores, ...analises.flatMap((a) => a.registros)];
  } else registros = analises[0].registros;
  const origem = analises.map((a) => a.arquivo).join(' | ');
  await salvarDadosMontadores(registros, origem);
  return { tipo: analises[0].tipo, base: tipos.has('diaria') ? baseDiaria : null, arquivos: analises.map(({ arquivo, data, registros: linhas }) => ({ arquivo, data: data || '', linhas: linhas.length })), total: analises.reduce((n, a) => n + a.registros.length, 0), registros: registros.length, novos: [...(tipos.has('diaria') ? new Map(analises.flatMap((a) => a.registros).filter((r) => r.observacao).map((r) => [r.login.toLocaleLowerCase('pt-BR'), r.login])).values() : [])] };
}

export const dadosMontadores = async () => (await lerDadosMontadores()).registros;
export const temCadastroMontadores = async () => {
  const dados = await lerDadosMontadores();
  return dados.registros.some((r) => r.fonteCadastro) || dados.registros.some((r) => r.posicao == null);
};
export const atualizacaoMontadores = async () => (await lerDadosMontadores()).atualizado || null;

export function calcularMontadores(registros, mes, temCadastro = false) {
  const loginsCadastro = new Set(registros.filter((r) => r.fonteCadastro).map((r) => String(r.login || '').toLocaleLowerCase('pt-BR')));
  if (temCadastro && !loginsCadastro.size) for (const r of registros.filter((x) => x.posicao == null)) loginsCadastro.add(String(r.login || '').toLocaleLowerCase('pt-BR'));
  const dias = new Map(), pessoas = new Map();
  for (const r of registros.filter((x) => x.data?.startsWith(`${mes}-`))) {
    const id = `${r.base}|${r.login}|${r.data}`;
    const dia = dias.get(id) || { base: r.base, login: r.login, nome: r.nome, data: r.data, caixas: 0, cxHora: 0, erros: 0,
      posicao: null, paletes: null, misto: null, lpDuplo: null, container: null, gaveta: null, diarista: false, observacao: false, tipo: r.tipo || '' };
    dia.caixas += NUM(r.caixas); dia.cxHora += NUM(r.cxHora); dia.erros += NUM(r.erros); dias.set(id, dia);
    dia.diarista ||= r.diarista === true || /diarista/i.test(String(r.tipo || r.vinculo || r.categoria || ''));
    dia.observacao ||= r.observacao === true || (r.fonteCadastro !== true && !loginsCadastro.has(String(r.login || '').toLocaleLowerCase('pt-BR')));
    if (r.posicao != null) dia.posicao = r.posicao;
    for (const k of ['paletes', 'misto', 'lpDuplo', 'container', 'gaveta']) {
      if (r[k] != null) dia[k] = (dia[k] || 0) + NUM(r[k]);
    }
  }
  for (const d of dias.values()) {
    const id = `${d.base}|${d.login}`;
    const p = pessoas.get(id) || { base: d.base, login: d.login, nome: d.nome, caixas: 0, erros: 0, dias: 0, cxHoraDias: [], diario: [], diarista: false, observacao: false };
    p.caixas += d.caixas; p.erros += d.erros; if (d.caixas > 0 || d.cxHora > 0) { p.dias += 1; p.cxHoraDias.push(d.cxHora); }
    p.diarista ||= d.diarista; p.observacao ||= d.observacao;
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
