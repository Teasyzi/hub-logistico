"""Leitor mínimo de .xlsx/.xlsm só com a biblioteca padrão.

Devolve os valores salvos pelo Excel (não recalcula fórmulas). Datas chegam como
número serial; use `serial_para_data` quando a coluna for de data.
"""
from __future__ import annotations

import datetime as _dt
import posixpath
import re
import zipfile
import xml.etree.ElementTree as ET

_M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
_R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
_PR = '{http://schemas.openxmlformats.org/package/2006/relationships}'
_EPOCA = _dt.date(1899, 12, 30)


def serial_para_data(valor) -> _dt.date | None:
    """Converte o serial do Excel (sistema 1900) em date. Aceita texto dd/mm/aaaa."""
    if valor is None or valor == '':
        return None
    if isinstance(valor, (int, float)):
        return _EPOCA + _dt.timedelta(days=int(valor))
    texto = str(valor).strip()
    for fmt in ('%d/%m/%Y', '%d.%m.%Y', '%Y-%m-%d', '%d/%m/%y'):
        try:
            return _dt.datetime.strptime(texto, fmt).date()
        except ValueError:
            pass
    return None


def indice_coluna(ref: str) -> int:
    """'A1' -> 0, 'AF7' -> 31."""
    n = 0
    for ch in re.match(r'[A-Z]+', ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


class Pasta:
    """Pasta de trabalho aberta para leitura."""

    def __init__(self, caminho):
        self.caminho = str(caminho)
        self._z = zipfile.ZipFile(self.caminho)
        self._strings = None
        wb = ET.fromstring(self._z.read('xl/workbook.xml'))
        rels = {r.get('Id'): r.get('Target')
                for r in ET.fromstring(self._z.read('xl/_rels/workbook.xml.rels')).iter(_PR + 'Relationship')}
        self.abas: dict[str, str] = {}
        self.estado: dict[str, str] = {}
        for s in wb.iter(_M + 'sheet'):
            alvo = rels[s.get(_R + 'id')]
            parte = alvo.lstrip('/') if alvo.startswith('/') else posixpath.normpath(posixpath.join('xl', alvo))
            self.abas[s.get('name')] = parte
            self.estado[s.get('name')] = s.get('state', 'visible')

    def fechar(self):
        self._z.close()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.fechar()

    def _carregar_strings(self):
        if self._strings is not None:
            return
        self._strings = []
        if 'xl/sharedStrings.xml' not in self._z.namelist():
            return
        with self._z.open('xl/sharedStrings.xml') as f:
            for _, el in ET.iterparse(f):
                if el.tag == _M + 'si':
                    self._strings.append(''.join(t.text or '' for t in el.iter(_M + 't')))
                    el.clear()

    def linhas(self, aba: str, parar_apos_vazias: int = 2000):
        """Gera (numero_da_linha, [valores]) só para linhas com algum valor.

        Para depois de `parar_apos_vazias` linhas seguidas sem valor, o que protege
        contra abas com intervalo usado inflado (formatação até a linha 1.048.576).
        """
        self._carregar_strings()
        vazias = 0
        with self._z.open(self.abas[aba]) as f:
            for _, el in ET.iterparse(f):
                if el.tag != _M + 'row':
                    continue
                valores: dict[int, object] = {}
                for c in el.iter(_M + 'c'):
                    v = c.find(_M + 'v')
                    t = c.get('t')
                    if t == 'inlineStr':
                        valor = ''.join(x.text or '' for x in c.iter(_M + 't'))
                    elif v is None or v.text is None:
                        continue
                    elif t == 's':
                        valor = self._strings[int(v.text)]
                    elif t in ('str', 'e'):
                        valor = v.text
                    elif t == 'b':
                        valor = v.text == '1'
                    else:
                        try:
                            valor = float(v.text)
                        except ValueError:
                            valor = v.text
                    if valor == '':
                        continue
                    valores[indice_coluna(c.get('r'))] = valor
                numero = int(el.get('r'))
                el.clear()
                if not valores:
                    vazias += 1
                    if vazias >= parar_apos_vazias:
                        break
                    continue
                vazias = 0
                largura = max(valores) + 1
                yield numero, [valores.get(i) for i in range(largura)]


def tabela(pasta: Pasta, aba: str, cabecalho_obrigatorio: str):
    """Localiza a linha de cabeçalho que contém `cabecalho_obrigatorio` e devolve
    (cabecalho, linhas_de_dados), cada linha como dict {nome_coluna: valor}.

    Colunas repetidas ganham sufixo ' #2', ' #3'.
    """
    cab = None
    dados = []
    for _, valores in pasta.linhas(aba):
        if cab is None:
            textos = [str(v).strip() if v is not None else '' for v in valores]
            if cabecalho_obrigatorio in textos:
                cab, vistos = [], {}
                for nome in textos:
                    vistos[nome] = vistos.get(nome, 0) + 1
                    cab.append(nome if vistos[nome] == 1 else f'{nome} #{vistos[nome]}')
            continue
        linha = {cab[i]: valores[i] for i in range(min(len(cab), len(valores))) if cab[i]}
        if any(v is not None for v in linha.values()):
            dados.append(linha)
    return cab, dados
