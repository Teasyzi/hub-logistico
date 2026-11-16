"""Servidor local do Hub (só biblioteca padrão). Escuta apenas em 127.0.0.1."""
from __future__ import annotations

import datetime as dt
import threading
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from hub import config, db, importar, paginas
from hub.montagem import meses_disponiveis
from hub.numeros import num


def _mes_padrao(con):
    ms = meses_disponiveis(con)
    return ms[0] if ms else dt.date.today().strftime('%Y-%m')


def _valor(txt):
    txt = (txt or '').strip()
    return None if txt == '' else num(txt)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _enviar(self, corpo, codigo=200, tipo='text/html; charset=utf-8'):
        dados = corpo.encode('utf-8')
        self.send_response(codigo)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def _redir(self, destino):
        self.send_response(303)
        self.send_header('Location', destino)
        self.end_headers()

    def _rota(self, metodo):
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        form = {}
        if metodo == 'POST':
            n = int(self.headers.get('Content-Length') or 0)
            form = {k: v[0] for k, v in parse_qs(self.rfile.read(n).decode('utf-8'), keep_blank_values=True).items()}
        con = db.conectar()
        try:
            mes = q.get('mes') or _mes_padrao(con)
            rotas = paginas.Rotas()
            p = u.path.rstrip('/') or '/'
            if p == '/':
                return self._enviar(paginas.pagina_inicio(con, rotas, mes))
            if p == '/montagem':
                return self._enviar(paginas.pagina_montagem(con, rotas, mes))
            if p.startswith('/montagem/') and p.split('/')[-1] in db.UNIDADES:
                return self._enviar(paginas.pagina_detalhe(con, rotas, p.split('/')[-1], mes))
            if p == '/parametros':
                if metodo == 'POST':
                    for chave_form, txt in form.items():
                        centro, chave = chave_form.split('__', 1)
                        v = _valor(txt)
                        if v is None:
                            con.execute('DELETE FROM parametro WHERE centro=? AND mes=? AND chave=?', (centro, mes, chave))
                        else:
                            db.gravar_parametro(con, centro, mes, chave, v)
                    con.commit()
                    return self._redir(f'/parametros?mes={mes}&ok=1')
                return self._enviar(paginas.pagina_parametros(con, mes, q.get('ok') == '1'))
            if p.startswith('/planejamento/') and p.split('/')[-1] in db.UNIDADES:
                centro = p.split('/')[-1]
                if metodo == 'POST':
                    self._salvar_plan(con, centro, form)
                    return self._redir(f'/planejamento/{centro}?mes={mes}&ok=1')
                return self._enviar(paginas.pagina_planejamento(con, centro, mes, q.get('ok') == '1'))
            if p == '/importar':
                res = importar.importar_pasta(con, config.pasta_entrada()) if metodo == 'POST' else None
                return self._enviar(paginas.pagina_importar(con, config.pasta_entrada(), res))
            if p == '/exportar':
                destino = exportar(con)
                return self._enviar(f'<p>Exportado em {destino}</p><p><a href="/">voltar</a></p>')
            return self._enviar('<h1>Página não encontrada</h1><a href="/">Início</a>', 404)
        except Exception:
            return self._enviar(f'<pre>{paginas.E(traceback.format_exc())}</pre>', 500)
        finally:
            con.close()

    def _salvar_plan(self, con, centro, form):
        por_dia = {}
        for k, txt in form.items():
            data, campo = k.split('__', 1)
            por_dia.setdefault(data, {})[campo] = _valor(txt)
        for data, vals in por_dia.items():
            atual = con.execute('SELECT * FROM planejamento WHERE centro=? AND data=?', (centro, data)).fetchone()
            atual = dict(atual) if atual else {}
            if all(atual.get(c) == v or (atual.get(c) is not None and v is not None
                                         and abs(atual[c] - v) <= 1e-9 * max(1.0, abs(v)))
                   for c, v in vals.items()):
                continue  # nada mudou nesse dia
            if not atual:
                if all(v is None for v in vals.values()):
                    continue
                con.execute('INSERT INTO planejamento (centro, data, origem) VALUES (?,?,?)', (centro, data, 'manual'))
            sets = ', '.join(f'{c}=?' for c in vals)
            con.execute(f"UPDATE planejamento SET {sets}, origem='manual' WHERE centro=? AND data=?",
                        (*vals.values(), centro, data))
        con.commit()

    def do_GET(self):
        self._rota('GET')

    def do_POST(self):
        self._rota('POST')


def exportar(con, destino: Path | None = None) -> Path:
    """Gera a versão estática (sem formulários) para enviar ou abrir sem o servidor."""
    destino = destino or config.pasta_dados() / 'site'
    destino.mkdir(parents=True, exist_ok=True)
    mes = _mes_padrao(con)
    rotas = paginas.Rotas(estatico=True)
    (destino / 'index.html').write_text(paginas.pagina_inicio(con, rotas, mes), encoding='utf-8')
    (destino / 'montagem.html').write_text(paginas.pagina_montagem(con, rotas, mes), encoding='utf-8')
    for c in db.UNIDADES:
        (destino / f'montagem_{c}.html').write_text(paginas.pagina_detalhe(con, rotas, c, mes), encoding='utf-8')
    return destino


def servir(porta=8765, abrir_navegador=True):
    srv = ThreadingHTTPServer(('127.0.0.1', porta), Handler)
    url = f'http://127.0.0.1:{porta}/'
    print(f'Hub Logístico em {url}  (dados: {config.pasta_dados()})  — feche esta janela para parar.')
    if abrir_navegador:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    srv.serve_forever()
