"""Confere os números calculados pelo Hub contra os valores salvos na planilha antiga."""
from __future__ import annotations

from hub.montagem import calcular

COLUNAS = {'C': 'vol_cxf', 'D': 'entregas', 'E': 'cargas', 'G': 'ocupacao', 'H': 'cx_unit',
           'I': 'reprog_uc', 'J': 'reprog_cli', 'R': 'ret_vol', 'S': 'ret_cli'}


def comparar(con, centro, mes, tolerancia=1e-6):
    """Devolve (n_conferidos, divergencias[(data, coluna, planilha, hub)])."""
    calc = {d['data']: d for d in calcular(con, centro, mes)['dias']}
    n, div = 0, []
    for r in con.execute('SELECT * FROM referencia_planilha WHERE centro=? AND data LIKE ? ORDER BY data, coluna',
                         (centro, f'{mes}-%')):
        hub = calc.get(r['data'], {}).get(COLUNAS[r['coluna']])
        plan = r['valor']
        n += 1
        if hub is None and abs(plan) < tolerancia:
            continue
        if hub is None or abs(hub - plan) > max(tolerancia, abs(plan) * tolerancia):
            div.append((r['data'], r['coluna'], plan, hub))
    return n, div
