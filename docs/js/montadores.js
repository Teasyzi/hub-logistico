import { lerCadastroMontadores, gravarCadastroMontadores, gravarDiasMontadores, lerDiasMontadores, lerMesesMontadores } from './dados_montadores.js?v=20261126-11';

const BASES = { 'CB NORTE': 'NORTE', 'CB SUL': 'SUL', 'LOG I - BARREIRAS': 'CBAR', 'LOG II - JUAZEIRO': 'CCRT' };
const NUM = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const chaveCadastro = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '');
const codigoBase = (v) => { const x = String(v || '').trim().toLocaleUpperCase('pt-BR'); return BASES[x] || (Object.values(BASES).includes(x) ? x : null); };

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
    const sistema = String(row[0] || '').trim(), nomeCompleto = String(row[1] || '').trim(), baseRaw = codigoBase(row[2]), loginRaw = String(row[4] || '').trim();
    const login = String(row[5] || loginRaw || '').trim(), caixas = row[6], cxHora = row[7], erros = row[8], data = isoData(row[9]);
    const nome = String(row[10] || nomeCompleto || sistema || login).trim(), base = codigoBase(row[11]) || baseRaw;
    const diarista = row.some((v) => /diarista/i.test(String(v || '')));
    if (data && base && (login || nome)) {
      saida.push({ login: login || nome, loginCadastro: loginRaw || login, nome, nomeCompleto, sistema, loginOriginal: loginRaw, base, data, fonteCadastro: true, diarista,
        caixas: NUM(caixas), cxHora: NUM(cxHora), erros: NUM(erros) });
    } else if (baseRaw && (loginRaw || sistema || nomeCompleto)) {
      saida.push({ login: loginRaw || sistema || nomeCompleto, nome: nomeCompleto || sistema || loginRaw, sistema, loginOriginal: loginRaw,
        base: baseRaw, data: null, fonteCadastro: true, cadastroOnly: true, diarista, caixas: 0, cxHora: 0, erros: 0 });
    }
  }
  return saida;
}

export async function lerMontadoresXlsx(file) {
  if (!globalThis.XLSX) throw new Error('O leitor de planilhas não carregou. Atualize a página.');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  if (!wb.Sheets.DA || !wb.Sheets.DL) throw new Error('O arquivo precisa ser o acompanhamento oficial de Montadores com as abas DA e DL.');
  const registros = [...lerFolha(wb, 'DA'), ...lerFolha(wb, 'DL'), ...lerCadastroAba(wb, 'DA'), ...lerCadastroAba(wb, 'DL')];
  if (!registros.length) throw new Error('Não encontrei linhas válidas nas abas DA e DL.');
  return registros;
}

const textoCabecalho = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();

function lerCadastroAba(wb, nomeAba) {
  const sheet = wb.Sheets[nomeAba];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  const cabecalhoIdx = rows.findIndex((row) => ['sistema', 'nome completo', 'base'].every((h) => row.map(textoCabecalho).includes(h)));
  if (cabecalhoIdx < 0) return [];
  const cab = rows[cabecalhoIdx].map(textoCabecalho);
  const ixSistema = cab.indexOf('sistema'), ixNome = cab.indexOf('nome completo'), ixBase = cab.indexOf('base');
  const ixLogin = cab.findIndex((v) => ['login', 'usuario', 'user', 'matricula'].includes(v));
  const ixTipo = cab.findIndex((v) => ['tipo', 'vinculo', 'categoria', 'classificacao'].includes(v));
  const saida = [];
  for (let i = cabecalhoIdx + 1; i < rows.length; i++) {
    const row = rows[i] || [], sistema = String(row[ixSistema] ?? '').replace(/\s+/g, ' ').trim();
    const nome = String(row[ixNome] ?? '').replace(/\s+/g, ' ').trim(), base = codigoBase(row[ixBase]);
    const login = String((ixLogin >= 0 ? row[ixLogin] : null) || sistema || nome).trim();
    if (!base || (!sistema && !nome && !login)) continue;
    const tipo = ixTipo < 0 ? '' : String(row[ixTipo] ?? '').trim();
    const loginCadastro = ixLogin >= 0 ? String(row[ixLogin] ?? '').trim() : '';
    saida.push({ login: loginCadastro, loginCadastro, loginOriginal: loginCadastro, sistema, nome: nome || sistema || loginCadastro,
      base, data: null, fonteCadastro: true, cadastroOnly: true, tipo,
      diarista: /diarista/i.test(`${sistema} ${nome} ${tipo}`), caixas: 0, cxHora: 0, erros: 0 });
  }
  return saida;
}

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
    registros.push({ nome, login, base, data, tipo, fonteCadastro: false, cadastroValidado: false, observacao: false, diarista: /diarista/i.test(tipo),
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

// Cadastro DA/DL = banco de dados (unidade de cada montador). Pessoa fora do cadastro (novato) entra na
// unidade escolhida no lote e fica em observação até ser confirmada.
function cadastroDe(registros, origem) {
  const pessoas = new Map();
  for (const r of registros) {
    if (!r.base) continue;
    const chave = chaveCadastro(r.loginCadastro || r.loginOriginal || r.login || r.sistema || r.nome);
    if (!chave) continue;
    const p = pessoas.get(chave) || { pessoa: chave, login: r.loginCadastro || r.loginOriginal || '', nome: r.nome || '', base: r.base, diarista: false, aliases: new Set() };
    if (p.base !== r.base) continue; // mesma pessoa em duas unidades: fica a primeira (conferir na planilha)
    if (!p.login && r.loginCadastro) p.login = r.loginCadastro;
    if (!p.nome && r.nome) p.nome = r.nome;
    p.diarista ||= r.diarista === true;
    for (const a of [r.login, r.loginCadastro, r.loginOriginal, r.sistema, r.nome, r.nomeCompleto]) { const k = chaveCadastro(a); if (k) p.aliases.add(k); }
    pessoas.set(chave, p);
  }
  return [...pessoas.values()].map((p) => ({ ...p, aliases: [...p.aliases], origem }));
}

async function cadastroPorAlias() {
  const mapa = new Map();
  for (const p of await lerCadastroMontadores()) {
    for (const a of p.aliases || []) {
      if (!mapa.has(a)) mapa.set(a, p);
      else if (mapa.get(a)?.pessoa !== p.pessoa) mapa.set(a, null); // nome igual em duas pessoas: não usa
    }
  }
  return mapa;
}

function acharCadastro(mapa, r) {
  const cands = [mapa.get(chaveCadastro(r.login)), mapa.get(chaveCadastro(r.nome))].filter(Boolean);
  const unicos = [...new Map(cands.map((p) => [p.pessoa, p])).values()];
  if (unicos.length > 1) throw new Error(`O login ${r.login} e o nome ${r.nome} apontam para cadastros diferentes. Confira o cadastro; nenhum dado foi alterado.`);
  return unicos[0] || null;
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
  if (!['NORTE', 'SUL', 'CBAR', 'CCRT'].includes(baseDiaria)) throw new Error('Selecione uma unidade válida para os montadores fora do cadastro. Nenhum dado foi alterado.');

  const origem = analises.map((a) => a.arquivo).join(' | ');
  const porDia = new Map(), entrar = (r) => { if (!porDia.has(r.data)) porDia.set(r.data, []); porDia.get(r.data).push(r); };
  let cadastroNovo = null, novos = [], total = 0;

  if (tipos.has('oficial')) {
    // Planilha oficial: o cadastro inteiro é trocado e a produção do mês entra nas unidades que ela traz.
    const oficial = analises[0].registros;
    cadastroNovo = cadastroDe(oficial, origem);
    for (const r of oficial) {
      if (!r.data || r.cadastroOnly) continue;
      r.cadastroValidado = true; r.observacao = false; entrar(r); total++;
    }
  } else {
    const datas = analises.map((a) => a.data);
    if (new Set(datas).size !== datas.length) throw new Error('O lote contém mais de um arquivo para a mesma data. Remova a cópia repetida; nenhum dado foi alterado.');
    const mapa = await cadastroPorAlias(), porNovo = new Map();
    for (const a of analises) for (const r of a.registros) {
      const pessoa = acharCadastro(mapa, r);
      if (pessoa) {
        r.base = pessoa.base; r.cadastroValidado = true; r.observacao = false;
        r.login = pessoa.login || r.login; r.nome = pessoa.nome || r.nome; r.diarista ||= pessoa.diarista === true;
      } else {
        r.base = baseDiaria; r.cadastroValidado = false; r.observacao = true;
        porNovo.set(chaveCadastro(r.login), { pessoa: chaveCadastro(r.login), login: r.login, nome: r.nome, base: baseDiaria, diarista: r.diarista === true, aliases: [chaveCadastro(r.login), chaveCadastro(r.nome)].filter(Boolean), origem });
      }
      entrar(r); total++;
    }
    novos = [...porNovo.values()].map((p) => ({ login: p.login, nome: p.nome, unidade: p.base }));
    if (novos.length && !confirmarNovos) {
      return { tipo: 'diaria', necessitaConfirmacao: true, novos, arquivos: analises.map(({ arquivo, data, registros }) => ({ arquivo, data, linhas: registros.length })) };
    }
    cadastroNovo = [...porNovo.values()];
  }

  if (tipos.has('oficial')) await gravarCadastroMontadores(cadastroNovo, true, origem);
  else if (cadastroNovo.length) await gravarCadastroMontadores(cadastroNovo, false, origem);
  await gravarDiasMontadores(porDia, origem);
  return {
    tipo: analises[0].tipo, base: tipos.has('diaria') ? baseDiaria : null,
    arquivos: analises.map(({ arquivo, data, registros }) => ({ arquivo, data: data || '', linhas: registros.length })),
    total, registros: total, novos,
  };
}

// Leitura para as telas (Firestore): registros do mês e data da última importação.
export const dadosMontadores = (mes) => lerDiasMontadores(mes);
export const mesesMontadores = async () => (await lerMesesMontadores()).meses || [];
export const atualizacaoMontadores = async () => (await lerMesesMontadores()).atualizado || null;

export function calcularMontadores(registros, mes, temCadastro = false) {
  const cadastroPorBase = new Map();
  for (const r of registros.filter((x) => x.fonteCadastro === true || (temCadastro && x.posicao == null))) {
    if (!r.base) continue;
    const aliases = cadastroPorBase.get(r.base) || new Set();
    for (const nome of [r.login, r.loginCadastro, r.loginOriginal, r.sistema, r.nome, r.nomeCompleto]) {
      const chave = chaveCadastro(nome); if (chave) aliases.add(chave);
    }
    cadastroPorBase.set(r.base, aliases);
  }
  const dias = new Map(), pessoas = new Map();
  for (const r of registros.filter((x) => x.data?.startsWith(`${mes}-`))) {
    const id = `${r.base}|${r.login}|${r.data}`;
    const dia = dias.get(id) || { base: r.base, login: r.login, nome: r.nome, data: r.data, caixas: 0, cxHora: 0, erros: 0,
      posicao: null, paletes: null, misto: null, lpDuplo: null, container: null, gaveta: null, diarista: false, observacao: false, cadastroEncontrado: false, tipo: r.tipo || '' };
    dia.caixas += NUM(r.caixas); dia.cxHora += NUM(r.cxHora); dia.erros += NUM(r.erros); dias.set(id, dia);
    dia.diarista ||= r.diarista === true || /diarista/i.test(String(r.tipo || r.vinculo || r.categoria || ''));
    const aliasesBase = cadastroPorBase.get(r.base);
    dia.cadastroEncontrado ||= r.fonteCadastro === true || r.cadastroValidado === true
      || aliasesBase?.has(chaveCadastro(r.login)) || aliasesBase?.has(chaveCadastro(r.nome));
    if (r.posicao != null) dia.posicao = r.posicao;
    for (const k of ['paletes', 'misto', 'lpDuplo', 'container', 'gaveta']) {
      if (r[k] != null) dia[k] = (dia[k] || 0) + NUM(r[k]);
    }
  }
  for (const d of dias.values()) {
    d.observacao = !d.cadastroEncontrado;
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
