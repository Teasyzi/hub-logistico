import { lerCadastroMontadores, gravarCadastroMontadores, gravarDiasMontadores, lerDiasMontadores, lerMesesMontadores } from './dados_montadores.js?v=20261127-2';

const BASES = { 'CB NORTE': 'NORTE', 'CB SUL': 'SUL', 'LOG I - BARREIRAS': 'CBAR', 'LOG II - JUAZEIRO': 'CCRT' };
const ROTULO_BASE = { NORTE: 'CB Norte', SUL: 'CB Sul', CBAR: 'Barreiras', CCRT: 'Juazeiro' };
// Versão do formato do cadastro. O formato antigo juntava o login de uma linha com o nome de outra e não serve mais.
const V_CADASTRO = 2;
const NUM = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const chaveCadastro = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '');
const codigoBase = (v) => { const x = String(v || '').trim().toLocaleUpperCase('pt-BR'); return BASES[x] || (Object.values(BASES).includes(x) ? x : null); };
const limpar = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
// Diarista, teste ou conferente marcado para excluir: fica fora dos rankings, e cada nome do sistema é uma pessoa.
const ehDiarista = (...v) => /diarista|excluir/i.test(v.join(' '));

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

const textoCabecalho = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, ' ').trim();

// As abas DA e DL têm DOIS blocos independentes lado a lado:
//   A:C  cadastro: SISTEMA (nome no sistema), NOME COMPLETO, BASE;
//   E:L  lançamentos: MONTADOR (nome no sistema), LOGIN, caixas, caixa/hora, erros, data, nome completo e base (PROCV).
// A linha do cadastro NÃO tem relação com o lançamento da mesma linha.
function lerAbaOficial(wb, nomeAba) {
  const sheet = wb.Sheets[nomeAba];
  if (!sheet) throw new Error(`O modelo não possui a aba ${nomeAba}.`);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  const cadastro = [], lancamentos = [];
  for (const row of rows) {
    const sistema = limpar(row[0]), completo = limpar(row[1]), baseCad = codigoBase(row[2]);
    if (baseCad && (sistema || completo)) cadastro.push({ sistema: sistema || completo, nomeCompleto: completo || sistema, base: baseCad });
    const montador = limpar(row[4]), login = limpar(row[5]), data = isoData(row[9]);
    const nomeCompleto = limpar(row[10]).startsWith('#') ? '' : limpar(row[10]);
    if (data && (montador || login)) {
      lancamentos.push({ sistema: montador || nomeCompleto || login, login, nomeCompleto, base: codigoBase(row[11]), data,
        caixas: NUM(row[6]), cxHora: NUM(row[7]), erros: NUM(row[8]) });
    }
  }
  return { cadastro, lancamentos };
}

// Uma pessoa = um nome completo, mesmo que apareça com vários nomes no sistema ou vários logins.
// Marca em cada lançamento a pessoa encontrada (l.pessoa).
function montarCadastro(abas, origem) {
  const pessoas = new Map(), porAlias = new Map();
  const criar = (sistema, nomeCompleto, base) => {
    const diarista = ehDiarista(sistema, nomeCompleto);
    const nome = diarista ? sistema : nomeCompleto || sistema;
    let id = chaveCadastro(nome);
    if (!id) return null;
    if (pessoas.has(id) && pessoas.get(id).base !== base) id = `${id}_${base}`;
    const p = pessoas.get(id) || { v: V_CADASTRO, pessoa: id, nome, base, diarista, logins: new Set(), aliases: new Set() };
    for (const a of [sistema, diarista ? sistema : nomeCompleto]) {
      const k = chaveCadastro(a);
      if (!k) continue;
      p.aliases.add(k);
      if (!porAlias.has(k)) porAlias.set(k, p);
    }
    pessoas.set(id, p);
    return p;
  };
  for (const a of abas) for (const c of a.cadastro) criar(c.sistema, c.nomeCompleto, c.base);
  for (const a of abas) for (const l of a.lancamentos) {
    const p = porAlias.get(chaveCadastro(l.sistema)) || porAlias.get(chaveCadastro(l.nomeCompleto)) || (l.base ? criar(l.sistema, l.nomeCompleto, l.base) : null);
    l.pessoa = p;
    if (p && l.login) p.logins.add(l.login);
  }
  return [...pessoas.values()].map((p) => ({ ...p, aliases: [...p.aliases], logins: [...p.logins], login: [...p.logins][0] || '', origem }));
}

// Planilha oficial → {cadastro, registros (produção)}.
export function lerOficial(wb, origem = '') {
  const abas = [lerAbaOficial(wb, 'DA'), lerAbaOficial(wb, 'DL')];
  const cadastro = montarCadastro(abas, origem);
  if (!cadastro.length) throw new Error('Não encontrei o cadastro (SISTEMA, NOME COMPLETO, BASE) nas abas DA e DL.');
  const registros = abas.flatMap((a) => a.lancamentos).map((l) => {
    const p = l.pessoa, base = p?.base || l.base;
    return base && { login: l.login || l.sistema, nome: p?.nome || l.nomeCompleto || l.sistema, sistema: l.sistema, base, data: l.data,
      caixas: l.caixas, cxHora: l.cxHora, erros: l.erros, diarista: p ? p.diarista : ehDiarista(l.sistema, l.nomeCompleto),
      fonteCadastro: true, cadastroValidado: Boolean(p), observacao: !p };
  }).filter(Boolean);
  return { cadastro, registros };
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

export function lerListaDiaria(wb, file) {
  const aba = Object.keys(wb.Sheets).find((nome) => textoCabecalho(nome) === 'listas trabalhadas');
  if (!aba) return null;
  // O navegador acrescenta " (1)", " (2)"… ao baixar arquivos com o mesmo nome.
  const match = file.name.match(/^(\d{4}-\d{2}-\d{2})-listas-trabalhadas(?:\s*\(\d+\))*\.(?:xlsx|xlsm)$/i);
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
    const linha = i + 1, nome = limpar(row[ix.nome]), login = String(row[ix.login] ?? '').trim();
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
    registros.push({ nome, login, data, tipo, fonteCadastro: false, diarista: /diarista/i.test(tipo),
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

// Candidatos do cadastro para uma linha do relatório: primeiro pelo nome; sem nome conhecido, pelo login.
function candidatos(cadastro, r) {
  const k = chaveCadastro(r.nome);
  const porNome = cadastro.filter((p) => (p.aliases || []).includes(k));
  if (porNome.length) return porNome;
  const login = chaveCadastro(r.login);
  return cadastro.filter((p) => (p.logins || []).some((l) => chaveCadastro(l) === login));
}

// Cada arquivo é de UMA unidade: a que tiver mais montadores do arquivo no cadastro.
// baseEscolhida só vale quando nenhum montador do arquivo é conhecido.
function resolverDiaria(analise, cadastro, baseEscolhida) {
  const achados = analise.registros.map((r) => candidatos(cadastro, r));
  const votos = {};
  for (const c of achados) {
    const bases = [...new Set(c.map((p) => p.base))];
    if (bases.length === 1) votos[bases[0]] = (votos[bases[0]] || 0) + 1;
  }
  const ordem = Object.entries(votos).sort((a, b) => b[1] - a[1]);
  if (ordem.length > 1 && ordem[0][1] === ordem[1][1]) {
    throw new Error(`${analise.arquivo}: não deu para saber a unidade (montadores de ${ROTULO_BASE[ordem[0][0]]} e ${ROTULO_BASE[ordem[1][0]]} em igual número).`);
  }
  const base = ordem[0]?.[0] || baseEscolhida;
  if (!ROTULO_BASE[base]) throw new Error(`${analise.arquivo}: nenhum montador está no cadastro. Escolha a unidade no campo ao lado dos arquivos.`);
  const novos = [];
  const registros = analise.registros.map((r, i) => {
    const daBase = achados[i].filter((p) => p.base === base), lista = daBase.length ? daBase : achados[i];
    const p = lista.length === 1 ? lista[0] : null;
    const diarista = r.diarista === true || (p ? p.diarista === true : ehDiarista(r.nome));
    if (!p) novos.push({ v: V_CADASTRO, pessoa: chaveCadastro(r.nome), nome: r.nome, base, diarista, login: r.login, logins: [r.login], aliases: [chaveCadastro(r.nome)] });
    return { ...r, sistema: r.nome, nome: p?.nome || r.nome, base, diarista, cadastroValidado: Boolean(p), observacao: !p };
  });
  return { arquivo: analise.arquivo, data: analise.data, base, registros, novos };
}

const assinatura = (rs) => JSON.stringify(rs.map((r) => [r.login, r.caixas, r.cxHora, r.erros].join('|')).sort());

// Várias datas e várias unidades no mesmo lote. A mesma data+unidade duas vezes: cópia igual é ignorada; diferente, para.
export function resolverLote(analises, cadastro, baseEscolhida) {
  const porChave = new Map(), repetidos = [];
  for (const a of analises) {
    const x = resolverDiaria(a, cadastro, baseEscolhida), chave = `${x.data}|${x.base}`, ja = porChave.get(chave);
    if (!ja) { porChave.set(chave, x); continue; }
    if (assinatura(ja.registros) !== assinatura(x.registros)) {
      throw new Error(`${ja.arquivo} e ${x.arquivo} são de ${ROTULO_BASE[x.base]} na mesma data, com números diferentes. Deixe só o correto; nenhum dado foi alterado.`);
    }
    repetidos.push(x.arquivo);
  }
  return { arquivos: [...porChave.values()], repetidos };
}

export async function importarMontadoresArquivos(files, baseDiaria, confirmarNovos = false) {
  if (!globalThis.XLSX) throw new Error('O leitor de planilhas não carregou. Atualize a página.');
  const lista = [...files];
  if (!lista.length) throw new Error('Selecione pelo menos um arquivo.');
  const analises = await Promise.all(lista.map(async (file) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const diaria = lerListaDiaria(wb, file);
      if (diaria) return diaria;
      if (wb.Sheets.DA && wb.Sheets.DL) return { tipo: 'oficial', arquivo: file.name, ...lerOficial(wb, file.name) };
      throw new Error('formato não reconhecido; esperava a aba listas-trabalhadas ou as abas DA e DL.');
    } catch (e) { throw new Error(`${file.name}: ${e.message.replace(`${file.name}: `, '')}`); }
  }));
  const tipos = new Set(analises.map((a) => a.tipo));
  if (tipos.size > 1) throw new Error('Não misture listas diárias e planilha oficial DA/DL no mesmo lote. Nenhum dado foi alterado.');
  if (tipos.has('oficial') && analises.length > 1) throw new Error('Selecione apenas uma planilha oficial DA/DL por importação. Nenhum dado foi alterado.');

  const origem = analises.map((a) => a.arquivo).join(' | ');
  const porDia = new Map(), entrar = (r) => { if (!porDia.has(r.data)) porDia.set(r.data, []); porDia.get(r.data).push(r); };

  if (tipos.has('oficial')) {
    // Planilha oficial: o cadastro inteiro é trocado e a produção do mês entra nas unidades que ela traz.
    const { cadastro, registros } = analises[0];
    registros.forEach(entrar);
    await gravarCadastroMontadores(cadastro, true, origem);
    await gravarDiasMontadores(porDia, origem);
    return { tipo: 'oficial', arquivos: [{ arquivo: origem, data: '', linhas: registros.length, base: '' }], total: registros.length, registros: registros.length, pessoas: cadastro.length, novos: [], repetidos: [] };
  }

  const cadastro = await lerCadastroMontadores();
  if (!cadastro.length || cadastro.some((p) => p.v !== V_CADASTRO)) {
    throw new Error('Importe primeiro a planilha oficial de Montadores (abas DA e DL), para atualizar o cadastro de nomes e logins.');
  }
  const { arquivos, repetidos } = resolverLote(analises, cadastro, baseDiaria);
  const porNovo = new Map(arquivos.flatMap((a) => a.novos).map((p) => [`${p.pessoa}|${p.base}`, p]));
  const ids = new Set(cadastro.map((p) => p.pessoa));
  const cadastroNovo = [...porNovo.values()].map((p) => ({ ...p, pessoa: ids.has(p.pessoa) ? `${p.pessoa}_${p.base}` : p.pessoa, origem }));
  const novos = cadastroNovo.map((p) => ({ login: p.login, nome: p.nome, unidade: p.base }));
  const resumo = arquivos.map((a) => ({ arquivo: a.arquivo, data: a.data, linhas: a.registros.length, base: ROTULO_BASE[a.base] }));
  if (novos.length && !confirmarNovos) return { tipo: 'diaria', necessitaConfirmacao: true, novos, arquivos: resumo };

  let total = 0;
  for (const a of arquivos) for (const r of a.registros) { entrar(r); total++; }
  if (cadastroNovo.length) await gravarCadastroMontadores(cadastroNovo, false, origem);
  await gravarDiasMontadores(porDia, origem);
  return { tipo: 'diaria', arquivos: resumo, total, registros: total, novos, repetidos };
}

// Leitura para as telas (Firestore): registros do mês e data da última importação.
export const dadosMontadores = (mes) => lerDiasMontadores(mes);
export const mesesMontadores = async () => (await lerMesesMontadores()).meses || [];
export const atualizacaoMontadores = async () => (await lerMesesMontadores()).atualizado || null;

export function calcularMontadores(registros, mes) {
  // A pessoa é o nome completo: logins diferentes do mesmo nome somam na mesma linha.
  const dias = new Map(), pessoas = new Map();
  for (const r of registros.filter((x) => x.data?.startsWith(`${mes}-`))) {
    const quem = chaveCadastro(r.nome) || chaveCadastro(r.login), id = `${r.base}|${quem}|${r.data}`;
    const dia = dias.get(id) || { base: r.base, quem, logins: new Set(), nome: r.nome, data: r.data, caixas: 0, cxHora: 0, erros: 0, horas: 0, linhas: 0,
      posicao: null, paletes: null, misto: null, lpDuplo: null, container: null, gaveta: null, diarista: false, observacao: false, cadastroEncontrado: false, tipo: r.tipo || '' };
    if (r.login) dia.logins.add(r.login);
    if (!dia.linhas) dia.cxHora = NUM(r.cxHora);
    dia.horas += NUM(r.cxHora) > 0 ? NUM(r.caixas) / NUM(r.cxHora) : 0; dia.linhas++;
    dia.caixas += NUM(r.caixas); dia.erros += NUM(r.erros); dias.set(id, dia);
    dia.diarista ||= r.diarista === true || /diarista/i.test(String(r.tipo || ''));
    dia.cadastroEncontrado ||= r.fonteCadastro === true || r.cadastroValidado === true;
    if (r.posicao != null) dia.posicao = r.posicao;
    for (const k of ['paletes', 'misto', 'lpDuplo', 'container', 'gaveta']) {
      if (r[k] != null) dia[k] = (dia[k] || 0) + NUM(r[k]);
    }
  }
  for (const d of dias.values()) {
    // Mais de um lançamento no dia (dois logins): CX/H = caixas ÷ horas, e não a soma dos CX/H.
    if (d.linhas > 1 && d.horas > 0) d.cxHora = d.caixas / d.horas;
    d.observacao = !d.cadastroEncontrado;
    d.login = [...d.logins].join(', ');
    const id = `${d.base}|${d.quem}`;
    const p = pessoas.get(id) || { base: d.base, logins: new Set(), nome: d.nome, caixas: 0, erros: 0, dias: 0, cxHoraDias: [], diario: [], diarista: false, observacao: false };
    for (const l of d.logins) p.logins.add(l);
    p.caixas += d.caixas; p.erros += d.erros; if (d.caixas > 0 || d.cxHora > 0) { p.dias += 1; p.cxHoraDias.push(d.cxHora); }
    p.diarista ||= d.diarista; p.observacao ||= d.observacao;
    p.diario.push(d); pessoas.set(id, p);
  }
  const porBase = Object.fromEntries(Object.values(BASES).map((b) => [b, []]));
  for (const p of pessoas.values()) {
    p.login = [...p.logins].join(', ');
    p.mediaCxHora = p.cxHoraDias.length ? p.cxHoraDias.reduce((a, b) => a + b, 0) / p.cxHoraDias.length : 0;
    p.mediaCaixasDia = p.dias ? p.caixas / p.dias : 0; p.gratificacao = p.caixas * 0.003;
    p.diario.sort((a, b) => a.data.localeCompare(b.data)); porBase[p.base]?.push(p);
  }
  for (const list of Object.values(porBase)) list.sort((a, b) => b.mediaCxHora - a.mediaCxHora || b.caixas - a.caixas);
  return porBase;
}

export const BASES_MONTADORES = BASES;
