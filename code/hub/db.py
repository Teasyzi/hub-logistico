"""Banco SQLite do Hub."""
from __future__ import annotations

import sqlite3

from hub import config

UNIDADES = {
    'CBAR': {'nome': 'DL Barreiras', 'apelido': 'LOG I - Barreiras', 'cor': 1},
    'CCRT': {'nome': 'DL Juazeiro', 'apelido': 'LOG II - Juazeiro', 'cor': 2},
}

# parâmetros mensais editáveis por DL (chave -> rótulo, padrão)
PARAMETROS = {
    'dias_uteis': ('Dias úteis', None),
    'dias_trabalhados': ('Dias trabalhados (deixe vazio para calcular)', None),
    'volume_aa': ('Volume cx unit ano anterior (AA)', None),
    'meta_volume': ('Meta de volume (cx unit)', None),
    'tarifa': ('Tarifa R$ por cx unit', None),
    'faturamento_aa': ('Faturamento ano anterior (R$)', None),
    'meta_faturamento': ('Meta de faturamento (R$)', None),
    'meta_reprog': ('Meta % reprogramação', 0.03),
}

ESQUEMA = """
CREATE TABLE IF NOT EXISTS importacao (
  id INTEGER PRIMARY KEY, arquivo TEXT, hash TEXT UNIQUE, tipo TEXT, centro TEXT,
  data_ref TEXT, linhas INTEGER, aviso TEXT, importado_em TEXT DEFAULT (datetime('now','localtime')));

CREATE TABLE IF NOT EXISTS venda (
  centro TEXT, dt_remessa TEXT, transporte TEXT, carga TEXT, veiculo TEXT, placa TEXT, canal TEXT,
  motorista TEXT, total_cliente REAL, total_notas REAL, cxs_fisicas REAL, cubos REAL,
  cxs_unitaria REAL, taxa_ocupacao REAL, cap_cubica REAL, km_realizado REAL, km_planejado REAL,
  status TEXT, importacao_id INTEGER, PRIMARY KEY (centro, transporte));
CREATE INDEX IF NOT EXISTS ix_venda_data ON venda(centro, dt_remessa);

CREATE TABLE IF NOT EXISTS retorno (
  centro TEXT, dt_remessa TEXT, transporte TEXT, tipo_transporte TEXT, cliente TEXT, nome_cliente TEXT,
  carga TEXT, motorista TEXT, material TEXT, denominacao TEXT, categoria TEXT, nota TEXT,
  motivo_cod TEXT, motivo TEXT, cxs_fisica REAL, cxs_unitarias REAL, valor REAL, cubos REAL,
  tipo_pedido TEXT, retorno TEXT, seq INTEGER, importacao_id INTEGER);
CREATE INDEX IF NOT EXISTS ix_retorno_data ON retorno(centro, dt_remessa);

-- números do Resumo de Planejamento (Roadnet) por dia planejado
CREATE TABLE IF NOT EXISTS planejamento (
  centro TEXT, data TEXT, volume_plan REAL, entregas REAL, cargas REAL, cubos_plan REAL,
  ocupacao REAL, cx_uc_plan REAL, reprog_uc REAL, reprog_cli REAL, uc_total REAL,
  total_cliente REAL, reprog_so_cubos REAL, reprog_so_cli REAL,
  origem TEXT, importacao_id INTEGER, PRIMARY KEY (centro, data));

CREATE TABLE IF NOT EXISTS planejamento_carga (
  centro TEXT, data TEXT, carga TEXT, veiculo TEXT, area TEXT, entregas REAL, volume REAL,
  cubos REAL, cap_cubos REAL, distancia REAL, ocupacao REAL, importacao_id INTEGER,
  PRIMARY KEY (centro, data, carga));

CREATE TABLE IF NOT EXISTS parametro (
  centro TEXT, mes TEXT, chave TEXT, valor REAL, origem TEXT, PRIMARY KEY (centro, mes, chave));

-- valores calculados pela planilha antiga, guardados só para conferência
CREATE TABLE IF NOT EXISTS referencia_planilha (
  centro TEXT, data TEXT, coluna TEXT, valor REAL, arquivo TEXT, PRIMARY KEY (centro, data, coluna));
"""


def conectar(caminho=None) -> sqlite3.Connection:
    con = sqlite3.connect(str(caminho or config.caminho_banco()))
    con.row_factory = sqlite3.Row
    con.executescript(ESQUEMA)
    return con


def parametro(con, centro, mes, chave):
    r = con.execute('SELECT valor FROM parametro WHERE centro=? AND mes=? AND chave=?',
                    (centro, mes, chave)).fetchone()
    if r is not None:
        return r['valor']
    return PARAMETROS[chave][1]


def gravar_parametro(con, centro, mes, chave, valor, origem='manual'):
    con.execute('INSERT INTO parametro VALUES (?,?,?,?,?) ON CONFLICT(centro,mes,chave) '
                'DO UPDATE SET valor=excluded.valor, origem=excluded.origem',
                (centro, mes, chave, valor, origem))
