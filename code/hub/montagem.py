"""Indicadores da Montagem de Cargas e da Reprogramação DL's.

Replica as fórmulas da planilha '<MM> - Montagem de Cargas - CB Logística.xlsm'
(abas BARREIRAS/JUAZEIRO/RESUMO) e 'Reprogramação DL's' — ver INDICATORS.md §4–5.
Letras entre colchetes indicam a coluna correspondente na planilha.
"""
from __future__ import annotations

import calendar
import datetime as dt
from collections import defaultdict

from hub.db import parametro
from hub.numeros import div

FATOR_CUBO = 1.6
DIAS_SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']


def _dias_do_mes(mes: str):
    a, m = map(int, mes.split('-'))
    return [dt.date(a, m, d) for d in range(1, calendar.monthrange(a, m)[1] + 1)]


def _media(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def calcular(con, centro: str, mes: str) -> dict:
    ini, fim = f'{mes}-01', f'{mes}-31'
    venda = defaultdict(lambda: {'cxf': 0.0, 'cxu': 0.0})
    for r in con.execute('SELECT dt_remessa d, sum(cxs_fisicas) f, sum(cxs_unitaria) u FROM venda '
                         'WHERE centro=? AND dt_remessa BETWEEN ? AND ? GROUP BY 1', (centro, ini, fim)):
        venda[r['d']] = {'cxf': r['f'] or 0.0, 'cxu': r['u'] or 0.0}
    ret = defaultdict(lambda: {'cxf': 0.0, 'cxu': 0.0, 'ext_u': 0.0})
    for r in con.execute("SELECT dt_remessa d, sum(cxs_fisica) f, sum(cxs_unitarias) u, "
                         "sum(CASE WHEN retorno='EXTERNO' THEN cxs_unitarias ELSE 0 END) e FROM retorno "
                         'WHERE centro=? AND dt_remessa BETWEEN ? AND ? GROUP BY 1', (centro, ini, fim)):
        ret[r['d']] = {'cxf': r['f'] or 0.0, 'cxu': r['u'] or 0.0, 'ext_u': r['e'] or 0.0}

    # [S] da planilha: transportes distintos do dia cujo 1º registro de retorno é EXTERNO.
    # Alternativa por cliente: pares (transporte, cliente) com algum retorno EXTERNO.
    primeiro, transp_dia, cli_ext = {}, defaultdict(set), defaultdict(set)
    for r in con.execute('SELECT dt_remessa d, transporte, tipo_transporte, cliente, retorno FROM retorno '
                         'WHERE centro=? AND dt_remessa BETWEEN ? AND ? ORDER BY importacao_id, seq',
                         (centro, ini, fim)):
        primeiro.setdefault(r['transporte'], r['retorno'])
        transp_dia[r['d']].add((r['transporte'], r['tipo_transporte']))
        if r['retorno'] == 'EXTERNO':
            cli_ext[r['d']].add((r['transporte'], r['cliente']))
    s_cont = {d: sum(1 for t, _ in ts if primeiro.get(t) == 'EXTERNO') for d, ts in transp_dia.items()}

    plan = {r['data']: dict(r) for r in con.execute(
        'SELECT * FROM planejamento WHERE centro=? AND data BETWEEN ? AND ?', (centro, ini, fim))}

    dias = []
    for d in _dias_do_mes(mes):
        k = d.isoformat()
        v, rt, p = venda.get(k, {'cxf': 0, 'cxu': 0}), ret.get(k, {'cxf': 0, 'cxu': 0, 'ext_u': 0}), plan.get(k, {})
        C = v['cxf'] - rt['cxf']
        H = v['cxu'] - rt['cxu']
        D, E, G = p.get('entregas'), p.get('cargas'), p.get('ocupacao')
        I, J = p.get('reprog_uc'), p.get('reprog_cli')
        F = H / FATOR_CUBO
        tem = C != 0
        dias.append(dict(
            data=k, dia_semana=DIAS_SEMANA[d.weekday()], vol_cxf=C, entregas=D, cargas=E, cubos=F,
            ocupacao=G, cx_unit=H, reprog_uc=I, reprog_cli=J,
            tx_reprog=div(I or 0, H) if I is not None else None,
            cubos_carga=div(F, E) if tem else None, cx_carga=div(H, E) if tem else None,
            entregas_carga=div(D or 0, E) if tem and D else None,
            drop_cubos=div(F, D) if tem else None, drop_cx=div(H, D) if tem else None,
            ret_vol=div(rt['ext_u'], v['cxu']) if v['cxu'] else None,
            ret_cli=div(s_cont.get(k, 0), D) if D else None,
            ret_cli_clientes=div(len(cli_ext.get(k, ())), D) if D else None,
            origem_plan=p.get('origem'),
            # Reprogramação DL's (só cargas 'REPROG' da aba Paradas)
            rp_cubos=p.get('reprog_so_cubos'), rp_uc_total=p.get('uc_total'),
            rp_reprog=(p['reprog_so_cubos'] * FATOR_CUBO) if p.get('reprog_so_cubos') is not None else None,
            rp_cli=p.get('reprog_so_cli'),
        ))
        x = dias[-1]
        x['rp_pct'] = div(x['rp_reprog'], x['rp_uc_total']) if x['rp_reprog'] is not None and x['rp_uc_total'] else None
        x['rp_pct_cli'] = div(x['rp_cli'], D) if x['rp_cli'] is not None and D else None

    soma = lambda c: sum(x[c] or 0 for x in dias)
    # [RESUMO D6] = COUNTIF(D10:D40,">0") - 1  (o -1 tira o dia da pré-venda, que já tem linha preenchida)
    dias_com_entrega = sum(1 for x in dias if (x['entregas'] or 0) > 0)
    dt_param = parametro(con, centro, mes, 'dias_trabalhados') if _tem_param(con, centro, mes, 'dias_trabalhados') else None
    dias_trab = int(dt_param) if dt_param is not None else max(dias_com_entrega - 1, 0)
    dias_uteis = parametro(con, centro, mes, 'dias_uteis')

    tot = {c: soma(c) for c in ('vol_cxf', 'entregas', 'cargas', 'cubos', 'cx_unit', 'reprog_uc', 'reprog_cli')}
    venda_u = sum(v['cxu'] for v in venda.values())
    tot['ret_vol'] = div(sum(r['ext_u'] for r in ret.values()), venda_u)          # [R8]
    tot['ret_cli'] = div(sum(s_cont.values()), tot['entregas'])                     # [S8]
    tot['ret_cli_clientes'] = div(sum(len(s) for s in cli_ext.values()), tot['entregas'])
    med = {c: div(tot[c], dias_trab) for c in ('vol_cxf', 'entregas', 'cargas', 'cubos', 'cx_unit', 'reprog_uc', 'reprog_cli')}
    med['ocupacao'] = _media(x['ocupacao'] for x in dias)                          # [G9]
    med['tx_reprog'] = div(med['reprog_uc'] or 0, med['cx_unit']) if med['cx_unit'] else None
    med['cubos_carga'] = div(med['cubos'], med['cargas']) if med['cubos'] else None
    med['cx_carga'] = div(med['cx_unit'], med['cargas']) if med['cx_unit'] else None
    med['entregas_carga'] = div(med['entregas'], med['cargas']) if med['entregas'] else None
    med['drop_cubos'] = div(med['cubos'], med['entregas']) if med['cubos'] else None
    med['drop_cx'] = div(med['cx_unit'], med['entregas']) if med['cx_unit'] else None
    med['ret_vol'] = _media(x['ret_vol'] for x in dias)                            # [R9]
    med['ret_cli'] = _media(x['ret_cli'] for x in dias)                            # [S9]

    # pré-venda = último dia planejado do centro (linha PRÉ VENDA = cópia dessa linha)
    ult = con.execute('SELECT max(data) m FROM planejamento WHERE centro=?', (centro,)).fetchone()['m']
    prevenda = next((x for x in dias if x['data'] == ult), None)

    tarifa = parametro(con, centro, mes, 'tarifa')
    meta_v = parametro(con, centro, mes, 'meta_volume')
    meta_f = parametro(con, centro, mes, 'meta_faturamento')
    acm = tot['cx_unit']
    tend = acm / dias_trab * dias_uteis if dias_trab and dias_uteis else None    # [D14]
    fat_acm = acm * tarifa if tarifa else None                                     # [D20]
    fat_tend = fat_acm / dias_trab * dias_uteis if fat_acm and dias_trab and dias_uteis else None
    resumo = dict(
        dias_uteis=dias_uteis, dias_trabalhados=dias_trab, dias_restantes=(dias_uteis - dias_trab) if dias_uteis else None,
        volume_aa=parametro(con, centro, mes, 'volume_aa'), meta_volume=meta_v,
        dia_anterior=prevenda['cx_unit'] if prevenda else None, acm=acm, tendencia=tend,
        tend_vs_meta=div(tend, meta_v) - 1 if tend and meta_v else None,
        tarifa=tarifa, faturamento_aa=parametro(con, centro, mes, 'faturamento_aa'), meta_faturamento=meta_f,
        fat_dia_anterior=prevenda['cx_unit'] * tarifa if prevenda and tarifa else None,
        fat_acm=fat_acm, fat_tendencia=fat_tend,
        fat_tend_vs_meta=div(fat_tend, meta_f) - 1 if fat_tend and meta_f else None,
    )
    # Reprogramação DL's [linha 6]: somas e % sobre o total
    rp = {c: sum(x[c] or 0 for x in dias) for c in ('rp_cubos', 'rp_uc_total', 'rp_reprog', 'rp_cli')}
    rp['entregas'] = tot['entregas']
    rp['pct'] = div(rp['rp_reprog'], rp['rp_uc_total'])                            # [F6] -> PES % reprog volume
    rp['pct_cli'] = div(rp['rp_cli'], rp['entregas'])                              # [P6] -> PES % reprog cliente
    rp['meta'] = parametro(con, centro, mes, 'meta_reprog')
    rp['meta_uc'] = rp['rp_uc_total'] * rp['meta'] if rp['meta'] else None
    rp['folga_uc'] = rp['meta_uc'] - rp['rp_reprog'] if rp['meta_uc'] is not None else None
    return dict(centro=centro, mes=mes, dias=dias, total=tot, media=med, resumo=resumo,
                prevenda=prevenda, reprog=rp)


def _tem_param(con, centro, mes, chave):
    return con.execute('SELECT 1 FROM parametro WHERE centro=? AND mes=? AND chave=?',
                       (centro, mes, chave)).fetchone() is not None


def motivos_retorno(con, centro, mes, so_externo=True, limite=12):
    """Pareto de motivos (cx unit) do mês."""
    filtro = "AND retorno='EXTERNO'" if so_externo else ''
    return [dict(r) for r in con.execute(
        f'SELECT motivo, sum(cxs_unitarias) cx, count(DISTINCT transporte||cliente) clientes FROM retorno '
        f"WHERE centro=? AND dt_remessa BETWEEN ? AND ? {filtro} GROUP BY motivo ORDER BY cx DESC LIMIT ?",
        (centro, f'{mes}-01', f'{mes}-31', limite))]


def meses_disponiveis(con):
    return [r['m'] for r in con.execute(
        "SELECT DISTINCT substr(dt_remessa,1,7) m FROM venda UNION SELECT DISTINCT substr(data,1,7) FROM planejamento "
        'ORDER BY 1 DESC')]
