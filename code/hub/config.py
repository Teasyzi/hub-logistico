"""Caminhos do Hub. Ordem: variáveis de ambiente > hub.ini ao lado do código > padrão.

hub.ini (exemplo em hub.ini.exemplo):
    [caminhos]
    dados = C:\\HubLogistico\\dados        ; banco hub.db e páginas exportadas
    entrada = C:\\Users\\voce\\Downloads   ; onde ficam as exportações a importar
"""
from __future__ import annotations

import configparser
import os
from pathlib import Path

RAIZ_CODIGO = Path(__file__).resolve().parent.parent


def _ini():
    cp = configparser.ConfigParser(inline_comment_prefixes=(';', '#'))
    cp.read(RAIZ_CODIGO / 'hub.ini', encoding='utf-8')
    return cp['caminhos'] if cp.has_section('caminhos') else {}


def pasta_dados() -> Path:
    v = os.environ.get('HUB_DADOS') or _ini().get('dados')
    p = Path(v) if v else Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'HubLogistico'
    p.mkdir(parents=True, exist_ok=True)
    return p


def pasta_entrada() -> Path:
    v = os.environ.get('HUB_ENTRADA') or _ini().get('entrada')
    return Path(v) if v else Path.home() / 'Downloads'


def caminho_banco() -> Path:
    return pasta_dados() / 'hub.db'
