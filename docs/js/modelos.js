const DB = 'hub-logistico-local';
const VERSAO = 1;

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('modelos')) db.createObjectStore('modelos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('dados')) db.createObjectStore('dados', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Não consegui abrir o armazenamento local do navegador.'));
  });
}

async function transacao(store, modo, operacao) {
  const db = await abrirDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, modo), os = tx.objectStore(store);
      let result;
      try { result = operacao(os); } catch (e) { reject(e); return; }
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error || new Error('Falha ao salvar os dados neste navegador.'));
      tx.onabort = () => reject(tx.error || new Error('A gravação local foi cancelada.'));
    });
  } finally { db.close(); }
}

export async function salvarModeloLocal(id, file) {
  if (!file) throw new Error('Escolha o modelo oficial.');
  await transacao('modelos', 'readwrite', (os) => os.put({
    id, nome: file.name, tipo: file.type, atualizado: Date.now(), arquivo: file.slice(0, file.size, file.type),
  }));
}

export async function lerModeloLocal(id) {
  const rec = await transacao('modelos', 'readonly', (os) => os.get(id));
  if (!rec) return null;
  return new File([rec.arquivo], rec.nome, { type: rec.tipo || 'application/octet-stream', lastModified: rec.atualizado });
}

export async function infoModeloLocal(id) {
  const rec = await transacao('modelos', 'readonly', (os) => os.get(id));
  return rec ? { nome: rec.nome, atualizado: rec.atualizado } : null;
}

export async function salvarDadosMontadores(registros, origem) {
  await transacao('dados', 'readwrite', (os) => os.put({ id: 'montadores', registros, origem, atualizado: Date.now() }));
}

export async function lerDadosMontadores() {
  const rec = await transacao('dados', 'readonly', (os) => os.get('montadores'));
  return rec || { registros: [], origem: '', atualizado: null };
}

export function conectarModeloExportacao({ id, inputId, statusId, botaoId, executar }) {
  const input = document.getElementById(inputId), status = document.getElementById(statusId), botao = document.getElementById(botaoId);
  let modelo = null;
  const atualizar = async () => {
    const info = await infoModeloLocal(id);
    modelo = info ? await lerModeloLocal(id) : null;
    status.textContent = info
      ? `Modelo salvo neste navegador: ${info.nome}. Escolha outro arquivo para trocar.`
      : 'Escolha o modelo oficial uma vez. Ele ficará salvo somente neste navegador.';
    botao.disabled = !modelo;
  };
  atualizar().catch((e) => { status.textContent = e.message; botao.disabled = true; });
  input.onchange = async () => {
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    try {
      status.textContent = 'Salvando o modelo neste navegador…';
      await salvarModeloLocal(id, arquivo);
      await atualizar();
    } catch (e) { status.textContent = `Não consegui salvar o modelo: ${e.message}`; botao.disabled = true; }
  };
  botao.onclick = async () => {
    if (!modelo) return;
    botao.disabled = true;
    try {
      await executar(modelo);
      status.textContent = `Arquivo exportado usando ${modelo.name}. O modelo salvo não foi alterado.`;
    } catch (e) { status.textContent = `Exportação não concluída: ${e.message}`; }
    botao.disabled = false;
  };
}
