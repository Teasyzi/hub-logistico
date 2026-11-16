"""Importadores da Montagem de Cargas.

Tipos reconhecidos pelo CONTEÚDO (não pelo nome do arquivo):
- venda      : VOLUMES DE VENDAS (Barreiras) / ZSD0092 (Juazeiro)
- retorno    : VOLUMES DE RETORNOS (Barreiras) / ZSD0090 (Juazeiro)
- resumo     : Resumo de Planejamento - Diário (Roadnet), um dia por arquivo
- montagem   : planilha antiga 'MM - Montagem de Cargas - CB Logística' (histórico)
- reprog     : planilha antiga 'Reprogramação DL's - MM Mês' (histórico)

Regra de substituição: uma exportação é o acumulado do período; ao importar, as
linhas do mesmo centro e das mesmas datas são trocadas pelas novas.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

from hub.numeros import num, texto
from hub.xls import abrir
from hub.xlsx import serial_para_data, tabela

EXTENSOES = ('.xls', '.xlsx', '.xlsm')


class Resultado(dict):
    """{'arquivo','tipo','centro','linhas','data_ref','aviso','status'}"""


def _hash(caminho) -> str:
    h = hashlib.sha256()
    with open(caminho, 'rb') as f:
        for bloco in iter(lambda: f.read(1 << 20), b''):
            h.update(bloco)
    return h.hexdigest()


def _iso(v):
    d = serial_para_data(v)
    return d.isoformat() if d else None


def _primeira_aba_com(pasta, coluna):
    for aba in pasta.abas:
        for n, valores in pasta.linhas(aba):
            if coluna in [str(v).strip() if v is not None else '' for v in valores]:
                return aba
            if n > 30:
                break
    return None


def detectar(pasta) -> str | None:
    abas = set(pasta.abas)
    if {'Resumo Geral', 'Paradas'} <= abas:
        return 'resumo'
    if {'RESUMO', 'BARREIRAS', 'JUAZEIRO', 'Venda Barreiras'} <= abas:
        return 'montagem'
    if {'BARREIRAS', 'JUAZEIRO'} <= abas and not ({'Venda Barreiras'} & abas):
        for _, v in pasta.linhas('BARREIRAS'):
            if 'VOLUME UC TOTAL' in [str(x).strip() for x in v if x is not None]:
                return 'reprog'
    aba = _primeira_aba_com(pasta, 'Transporte')
    if aba:
        for _, v in pasta.linhas(aba):
            cab = [str(x).strip() for x in v if x is not None]
            if 'Motivo Nome' in cab:
                return 'retorno'
            if 'Taxa Ocupação' in cab and 'Cxs Unitaria' in cab:
                return 'venda'
            break
    return None


# ---------------------------------------------------------------- venda / retorno
def _linhas_venda(pasta, aba):
    _, dados = tabela(pasta, aba, 'Transporte')
    for x in dados:
        centro, transp = texto(x.get('Centro')), texto(x.get('Transporte'))
        if not centro or not transp or not _iso(x.get('Dt Remessa')):
            continue
        yield dict(centro=centro, dt_remessa=_iso(x.get('Dt Remessa')), transporte=transp,
                   carga=texto(x.get('Carga')), veiculo=texto(x.get('Veiculo')), placa=texto(x.get('Placa')),
                   canal=texto(x.get('Canal')), motorista=texto(x.get('Motorista Nome')),
                   total_cliente=num(x.get('Total Cliente')), total_notas=num(x.get('Total Notas')),
                   cxs_fisicas=num(x.get('Cxs Fisicas')), cubos=num(x.get('Cubos')),
                   cxs_unitaria=num(x.get('Cxs Unitaria')), taxa_ocupacao=num(x.get('Taxa Ocupação')),
                   cap_cubica=num(x.get('Cap. Cúbica')), km_realizado=num(x.get('KM Realizado')),
                   km_planejado=num(x.get('KM Planejado')), status=texto(x.get('Status Fornecimento')))


def _linhas_retorno(pasta, aba):
    _, dados = tabela(pasta, aba, 'Motivo Nome')
    for i, x in enumerate(dados):
        centro = texto(x.get('Centro'))
        if not centro or not _iso(x.get('Dt Remessa')):
            continue
        yield dict(centro=centro, dt_remessa=_iso(x.get('Dt Remessa')), transporte=texto(x.get('Transporte')),
                   tipo_transporte=texto(x.get('Tipo de transporte')), cliente=texto(x.get('Cliente')),
                   nome_cliente=texto(x.get('Nome Fantasia')) or texto(x.get('Nome')), carga=texto(x.get('Carga')),
                   motorista=texto(x.get('Nome Mot.')), material=texto(x.get('Material')),
                   denominacao=texto(x.get('Denominação')), categoria=texto(x.get('Categoria')),
                   nota=texto(x.get('Nota')), motivo_cod=texto(x.get('Motivo Cod.')),
                   motivo=texto(x.get('Motivo Nome')), cxs_fisica=num(x.get('Cxs Fisica)')),
                   cxs_unitarias=num(x.get('Cxs Unitarias)')), valor=num(x.get('Valor total incl.imp.')),
                   cubos=num(x.get('Cubos')), tipo_pedido=texto(x.get('Tipo Pedido')),
                   retorno=(texto(x.get('Retorno')) or '').upper() or None, seq=i)


def _substituir(con, tabela_db, linhas, imp_id):
    """Troca, para cada transporte presente no arquivo, as linhas antigas pelas novas.

    Por transporte (e não por data) porque a exportação de um mês traz retornos atrasados
    com data de remessa do mês anterior; trocar o dia inteiro apagaria o resto daquele dia.
    """
    if not linhas:
        return 0
    chaves = {(l['centro'], l['transporte']) for l in linhas if l.get('transporte')}
    for c, t in chaves:
        con.execute(f'DELETE FROM {tabela_db} WHERE centro=? AND transporte=?', (c, t))
    cols = list(linhas[0]) + ['importacao_id']
    sql = f'INSERT OR REPLACE INTO {tabela_db} ({",".join(cols)}) VALUES ({",".join("?" * len(cols))})'
    con.executemany(sql, [tuple(l.values()) + (imp_id,) for l in linhas])
    return len(linhas)


# ---------------------------------------------------------------- resumo de planejamento
def _resumo(pasta):
    """Lê a linha 8 de 'Resumo Geral' (valores salvos, sem recalcular) e a aba Paradas."""
    cab, val = None, None
    for n, v in pasta.linhas('Resumo Geral'):
        if n == 7:
            cab = v
        if n == 8:
            val = v
            break
    campos = {str(c).strip(): (val[i] if i < len(val) else None) for i, c in enumerate(cab) if c}
    # B7='Unidade', C7=<centro>; B8='Período', C8=<data planejada, valor salvo>
    centro = texto(cab[2])
    data = _iso(val[2])
    _, paradas = tabela(pasta, 'Paradas', 'Carga')
    so_reprog = [p for p in paradas if str(p.get('Carga') or '').strip().upper() == 'REPROG']
    _, cargas = tabela(pasta, 'Resumo Geral', 'Entregas')
    cargas = [c for c in cargas if c.get('Carga') and c.get('Veiculo') is not None]
    plan = dict(centro=centro, data=data, volume_plan=num(campos.get('Volume Plan')),
                entregas=num(campos.get('Entregas Plan')), cargas=num(campos.get('Cargas')),
                cubos_plan=num(campos.get('Cubos Plan')), ocupacao=num(campos.get('Ocupação')),
                cx_uc_plan=num(campos.get('Cx UC Plan')), reprog_uc=num(campos.get('Reprog')),
                reprog_cli=num(campos.get('Reprog Cli')), uc_total=num(campos.get('UC Total')),
                total_cliente=num(campos.get('Total Cliente')),
                reprog_so_cubos=sum(num(p.get('Cubos')) for p in so_reprog),
                reprog_so_cli=float(len(so_reprog)))
    detalhe = [dict(centro=centro, data=data, carga=texto(c['Carga']), veiculo=texto(c.get('Veiculo')),
                    area=texto(c.get('Área')), entregas=num(c.get('Entregas')), volume=num(c.get('Volume')),
                    cubos=num(c.get('Cubos')), cap_cubos=num(c.get('Cap Cubos')),
                    distancia=num(c.get('Distancia Planejada')), ocupacao=num(c.get('Ocupação')))
               for c in cargas]
    return plan, detalhe


_PESO_ORIGEM = {'legado': 1, 'resumo': 2, 'manual': 3}


def _gravar_plan(con, plan, origem, imp_id):
    """Grava o planejamento do dia. Edição manual > Resumo do dia > planilha antiga."""
    if not plan['centro'] or not plan['data']:
        return
    existe = con.execute('SELECT origem FROM planejamento WHERE centro=? AND data=?',
                         (plan['centro'], plan['data'])).fetchone()
    if existe and _PESO_ORIGEM.get(existe['origem'], 0) > _PESO_ORIGEM[origem]:
        return
    cols = list(plan) + ['origem', 'importacao_id']
    con.execute(f'INSERT OR REPLACE INTO planejamento ({",".join(cols)}) VALUES ({",".join("?" * len(cols))})',
                tuple(plan.values()) + (origem, imp_id))


# ---------------------------------------------------------------- planilhas antigas (histórico)
_COLS_DIA = {'C': 2, 'D': 3, 'E': 4, 'G': 6, 'H': 7, 'I': 8, 'J': 9, 'R': 17, 'S': 18}
_ABA_CENTRO = {'BARREIRAS': 'CBAR', 'JUAZEIRO': 'CCRT'}


def _montagem_legada(con, pasta, imp_id, arquivo):
    n = 0
    for aba_v, aba_r in (('Venda Barreiras', 'Retorno Barreiras'), ('Venda Juazeiro', 'Retorno Juazeiro')):
        n += _substituir(con, 'venda', list(_linhas_venda(pasta, aba_v)), imp_id)
        n += _substituir(con, 'retorno', list(_linhas_retorno(pasta, aba_r)), imp_id)
    meses = set()
    for aba, centro in _ABA_CENTRO.items():
        for num_linha, v in pasta.linhas(aba):
            if not (10 <= num_linha <= 40) or len(v) < 3 or not isinstance(v[1], float):
                continue
            data = _iso(v[1])
            meses.add(data[:7])
            g = lambda i: v[i] if i < len(v) and isinstance(v[i], float) else None
            for col, i in _COLS_DIA.items():
                if g(i) is not None:
                    con.execute('INSERT OR REPLACE INTO referencia_planilha VALUES (?,?,?,?,?)',
                                (centro, data, col, g(i), arquivo))
            if g(3):  # entregas digitadas -> planejamento histórico
                _gravar_plan(con, dict(centro=centro, data=data, volume_plan=None, entregas=g(3), cargas=g(4),
                                       cubos_plan=None, ocupacao=g(6), cx_uc_plan=None, reprog_uc=g(8),
                                       reprog_cli=g(9), uc_total=None, total_cliente=None,
                                       reprog_so_cubos=None, reprog_so_cli=None), 'legado', imp_id)
    # parâmetros do RESUMO (coluna D = Barreiras, I = Juazeiro)
    res = {num_linha: v for num_linha, v in pasta.linhas('RESUMO')}
    mes = max(meses) if meses else None
    if mes:
        from hub.db import gravar_parametro
        for centro, i in (('CBAR', 3), ('CCRT', 8)):
            mapa = {'dias_uteis': 5, 'volume_aa': 10, 'meta_volume': 11, 'tarifa': 16,
                    'faturamento_aa': 17, 'meta_faturamento': 18}
            for chave, linha in mapa.items():
                v = res.get(linha)
                if v and i < len(v) and isinstance(v[i], float):
                    existe = con.execute('SELECT origem FROM parametro WHERE centro=? AND mes=? AND chave=?',
                                         (centro, mes, chave)).fetchone()
                    if not existe or existe['origem'] != 'manual':
                        gravar_parametro(con, centro, mes, chave, v[i], 'planilha')
    return n, mes


def _reprog_legada(con, pasta, imp_id):
    n = 0
    for aba, centro in _ABA_CENTRO.items():
        for num_linha, v in pasta.linhas(aba):
            if num_linha < 7 or len(v) < 2 or not isinstance(v[1], float):
                continue
            data = _iso(v[1])
            g = lambda i: v[i] if i < len(v) and isinstance(v[i], float) else None
            if g(2) is None and g(14) is None:
                continue
            row = con.execute('SELECT * FROM planejamento WHERE centro=? AND data=?', (centro, data)).fetchone()
            if row is None:
                continue
            upd = {}
            if row['reprog_so_cubos'] is None:
                upd['reprog_so_cubos'] = g(2) or 0.0
            if row['reprog_so_cli'] is None:
                upd['reprog_so_cli'] = g(14) or 0.0
            if row['uc_total'] is None and g(3) is not None:
                upd['uc_total'] = g(3)
            if upd:
                con.execute(f'UPDATE planejamento SET {",".join(k + "=?" for k in upd)} WHERE centro=? AND data=?',
                            (*upd.values(), centro, data))
                n += 1
    return n


# ---------------------------------------------------------------- entrada única
def importar_arquivo(con, caminho, forcar=False) -> Resultado:
    caminho = Path(caminho)
    r = Resultado(arquivo=caminho.name, tipo=None, centro=None, linhas=0, data_ref=None, aviso=None, status='ok')
    h = _hash(caminho)
    if not forcar and con.execute('SELECT 1 FROM importacao WHERE hash=?', (h,)).fetchone():
        r['status'] = 'já importado'
        return r
    try:
        pasta = abrir(caminho)
    except Exception as e:  # arquivo corrompido, aberto no Excel, formato desconhecido
        r['status'], r['aviso'] = 'erro', str(e)
        return r
    tipo = detectar(pasta)
    r['tipo'] = tipo
    if tipo is None:
        r['status'] = 'ignorado'
        return r
    if forcar:
        con.execute('DELETE FROM importacao WHERE hash=?', (h,))
    cur = con.execute('INSERT INTO importacao (arquivo, hash, tipo) VALUES (?,?,?)', (caminho.name, h, tipo))
    imp_id = cur.lastrowid
    if tipo in ('venda', 'retorno'):
        aba = _primeira_aba_com(pasta, 'Transporte')
        linhas = list((_linhas_venda if tipo == 'venda' else _linhas_retorno)(pasta, aba))
        r['linhas'] = _substituir(con, tipo, linhas, imp_id)
        centros = sorted({l['centro'] for l in linhas})
        r['centro'] = ','.join(centros)
        datas = sorted({l['dt_remessa'] for l in linhas})
        r['data_ref'] = f'{datas[0]} a {datas[-1]}' if datas else None
    elif tipo == 'resumo':
        plan, detalhe = _resumo(pasta)
        r['centro'], r['data_ref'] = plan['centro'], plan['data']
        ultima_venda = con.execute('SELECT max(dt_remessa) m FROM venda WHERE centro=?', (plan['centro'],)).fetchone()['m']
        # normal: data planejada = último dia da exportação de venda (D+1 já faturado) ou depois
        if ultima_venda and plan['data'] and plan['data'] < ultima_venda:
            r['aviso'] = (f"data do planejamento ({plan['data']}) é anterior à última venda ({ultima_venda}): "
                          'o arquivo pode ter sido aberto com edição habilitada e recalculado. Confira a data.')
        _gravar_plan(con, plan, 'resumo', imp_id)
        con.execute('DELETE FROM planejamento_carga WHERE centro=? AND data=?', (plan['centro'], plan['data']))
        for d in detalhe:
            cols = list(d) + ['importacao_id']
            con.execute(f'INSERT OR REPLACE INTO planejamento_carga ({",".join(cols)}) VALUES ({",".join("?" * len(cols))})',
                        tuple(d.values()) + (imp_id,))
        r['linhas'] = 1 + len(detalhe)
    elif tipo == 'montagem':
        r['linhas'], r['data_ref'] = _montagem_legada(con, pasta, imp_id, caminho.name)
        r['centro'] = 'CBAR,CCRT'
    elif tipo == 'reprog':
        r['linhas'] = _reprog_legada(con, pasta, imp_id)
        r['centro'] = 'CBAR,CCRT'
    con.execute('UPDATE importacao SET centro=?, data_ref=?, linhas=?, aviso=? WHERE id=?',
                (r['centro'], r['data_ref'], r['linhas'], r['aviso'], imp_id))
    con.commit()
    return r


def importar_pasta(con, pasta, padrao_nome=None):
    """Importa todos os arquivos reconhecidos de uma pasta (ignora travas ~$ do Excel).
    Ordem: histórico antigo primeiro, depois exportações e Resumos (mais novos por último)."""
    arquivos = [p for p in Path(pasta).iterdir()
                if p.suffix.lower() in EXTENSOES and not p.name.startswith('~$')
                and (padrao_nome is None or re.search(padrao_nome, p.name, re.I))]
    prioridade = lambda p: (0 if 'montagem de cargas' in p.name.lower() else
                            1 if 'reprograma' in p.name.lower() else 2, p.stat().st_mtime)
    return [importar_arquivo(con, p) for p in sorted(arquivos, key=prioridade)]
