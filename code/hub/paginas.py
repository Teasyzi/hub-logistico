"""Páginas HTML do Hub (sem dependências externas; gráficos em SVG inline)."""
from __future__ import annotations

import datetime as dt
import html

from hub import db
from hub.montagem import calcular, meses_disponiveis, motivos_retorno

E = html.escape
MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

# metas dos indicadores PES Logístico 2026 (INDICATORS.md §2)
META_PES = {'ret_vol': 0.01, 'ret_cli': 0.02, 'reprog_vol': 0.03, 'reprog_cli': 0.03}

CSS = """
:root{color-scheme:light;--page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink2:#52514e;--muted:#898781;
--grid:#e1e0d9;--axis:#c3c2b7;--border:rgba(11,11,11,.10);--s1:#2a78d6;--s2:#eb6834;
--good:#006300;--goodbg:#e6f4e6;--bad:#d03b3b;--badbg:#fbeaea;--warn:#8a5a00;--warnbg:#fdf3dc;--accent:#2a78d6}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])){color-scheme:dark;--page:#0d0d0d;
--surface:#1a1a19;--ink:#f0efec;--ink2:#c3c2b7;--muted:#898781;--grid:#2c2c2a;--axis:#383835;
--border:rgba(255,255,255,.10);--s1:#3987e5;--s2:#d95926;--good:#0ca30c;--goodbg:#132613;--bad:#e66767;
--badbg:#2b1515;--warn:#fab219;--warnbg:#2b2210;--accent:#3987e5}}
*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--ink);
font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--accent)}header{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;padding:12px 20px;
background:var(--surface);border-bottom:1px solid var(--border)}header b{font-size:16px}
nav a{margin-right:14px;text-decoration:none;color:var(--ink2)}nav a.on{color:var(--ink);font-weight:600}
main{max-width:1280px;margin:0 auto;padding:20px 16px 48px}h1{font-size:20px;margin:0 0 4px}
h2{font-size:16px;margin:28px 0 10px}.sub{color:var(--ink2);margin:0 0 16px}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.card h3{margin:0 0 8px;font-size:15px;display:flex;align-items:center;gap:8px}
.dot{width:10px;height:10px;border-radius:50%;display:inline-block}
.tiles{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 12px}
.tile .l{color:var(--ink2);font-size:12px}.tile .v{font-size:22px;font-weight:600}.tile .d{font-size:12px;color:var(--ink2)}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
.tw{overflow-x:auto;background:var(--surface);border:1px solid var(--border);border-radius:10px}
th,td{padding:6px 8px;text-align:right;border-bottom:1px solid var(--grid);white-space:nowrap}
th{color:var(--ink2);font-weight:600;font-size:12px;position:sticky;top:0;background:var(--surface)}
td:first-child,th:first-child,td.t,th.t{text-align:left}tr.tot td{font-weight:600;border-top:2px solid var(--axis)}
tr.pv td{background:var(--warnbg)}
.kv{width:100%}.kv td{border:0;padding:3px 0}.kv td:first-child{color:var(--ink2)}
.st{display:inline-flex;gap:4px;align-items:center;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600}
.st.ok{color:var(--good);background:var(--goodbg)}.st.no{color:var(--bad);background:var(--badbg)}
.st.na{color:var(--ink2);background:var(--grid)}
.btn{display:inline-block;padding:7px 14px;border-radius:8px;border:1px solid var(--border);background:var(--accent);
color:#fff;text-decoration:none;font-weight:600;cursor:pointer;font:inherit}.btn.sec{background:var(--surface);color:var(--ink)}
.aviso{background:var(--warnbg);color:var(--warn);border-radius:8px;padding:8px 12px;margin:10px 0}
input[type=number],input[type=text]{width:120px;padding:4px 6px;border:1px solid var(--axis);border-radius:6px;
background:var(--surface);color:var(--ink);font:inherit;text-align:right}
form.inline{display:inline}select{font:inherit;padding:4px;border-radius:6px}
svg text{fill:var(--muted);font-size:11px}.small{font-size:12px;color:var(--ink2)}
.tag{font-size:11px;color:var(--ink2);border:1px solid var(--grid);border-radius:4px;padding:0 4px}
"""


# ---------------------------------------------------------------- formatação pt-BR
def _br(s):
    return s.replace(',', 'X').replace('.', ',').replace('X', '.')


def fi(x):
    return '–' if x is None else _br(f'{x:,.0f}')


def fd(x, n=1):
    return '–' if x is None else _br(f'{x:,.{n}f}')


def fp(x, n=2):
    return '–' if x is None else _br(f'{x * 100:,.{n}f}') + '%'


def fr(x):
    return '–' if x is None else 'R$ ' + _br(f'{x:,.0f}')


def fdata(iso):
    d = dt.date.fromisoformat(iso)
    return f'{d.day:02d}/{d.month:02d}'


def nome_mes(mes):
    a, m = mes.split('-')
    return f'{MESES[int(m) - 1]}/{a}'


def status(ok, txt_ok, txt_no):
    if ok is None:
        return '<span class="st na">sem dado</span>'
    return f'<span class="st ok">✓ {E(txt_ok)}</span>' if ok else f'<span class="st no">✕ {E(txt_no)}</span>'


# ---------------------------------------------------------------- navegação (servidor ou arquivos estáticos)
class Rotas:
    def __init__(self, estatico=False):
        self.estatico = estatico

    def __call__(self, caminho, mes=None):
        if not self.estatico:
            return caminho + (f'?mes={mes}' if mes else '')
        nome = {'/': 'index', '/montagem': 'montagem'}.get(caminho)
        if nome is None and caminho.startswith('/montagem/'):
            nome = 'montagem_' + caminho.rsplit('/', 1)[1]
        return f'{nome or "index"}.html'


def layout(titulo, corpo, rotas, ativo='', mes=None):
    links = [('/', 'Início'), ('/montagem', 'Montagem de cargas')]
    if not rotas.estatico:
        links += [('/parametros', 'Parâmetros'), ('/importar', 'Importar')]
    nav = ''.join(f'<a class="{"on" if p == ativo else ""}" href="{rotas(p, mes)}">{t}</a>' for p, t in links)
    gerado = dt.datetime.now().strftime('%d/%m/%Y %H:%M')
    return (f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(titulo)} · Hub Logístico</title>'
            f'<style>{CSS}</style></head><body><header><b>Hub Logístico</b><nav>{nav}</nav>'
            f'<span class="small" style="margin-left:auto">{"versão estática · " if rotas.estatico else ""}gerado {gerado}</span>'
            f'</header><main>{corpo}</main></body></html>')


def seletor_mes(con, rotas, caminho, mes):
    if rotas.estatico:
        return f'<p class="sub">Mês: <b>{nome_mes(mes)}</b></p>'
    ops = ''.join(f'<option value="{m}" {"selected" if m == mes else ""}>{nome_mes(m)}</option>'
                  for m in meses_disponiveis(con) or [mes])
    return (f'<form class="inline" method="get" action="{caminho}">Mês: <select name="mes" onchange="this.form.submit()">'
            f'{ops}</select></form>')


# ---------------------------------------------------------------- gráficos SVG
def grafico_barras(dias, campo, cor, meta=None, rotulo_meta='meta', formato=fi, altura=200, pct=False):
    """Barras por dia com linha de referência opcional; <title> dá o tooltip por barra."""
    pts = [(d['data'], d[campo]) for d in dias]
    vals = [v for _, v in pts if v is not None]
    if not vals:
        return '<p class="small">Sem dados no período.</p>'
    w, pl, pr, pt, pb = 900, 56, 12, 12, 26
    topo = max(vals + ([meta] if meta else [])) * 1.1 or 1
    n = len(pts)
    bw = (w - pl - pr) / n
    y = lambda v: pt + (altura - pt - pb) * (1 - v / topo)
    partes = [f'<svg viewBox="0 0 {w} {altura}" width="100%" role="img" aria-label="gráfico diário">']
    for k in range(5):
        v = topo * k / 4
        partes.append(f'<line x1="{pl}" x2="{w - pr}" y1="{y(v):.1f}" y2="{y(v):.1f}" stroke="var(--grid)"/>'
                      f'<text x="{pl - 6}" y="{y(v) + 4:.1f}" text-anchor="end">{formato(v)}</text>')
    for i, (data, v) in enumerate(pts):
        x = pl + i * bw
        if v:
            h = max(y(0) - y(v), 1)
            partes.append(f'<rect x="{x + 1:.1f}" y="{y(v):.1f}" width="{max(bw - 2, 1):.1f}" height="{h:.1f}" rx="3" '
                          f'fill="{cor}"><title>{fdata(data)}: {formato(v)}</title></rect>')
        if i % 2 == 0 or n <= 16:
            partes.append(f'<text x="{x + bw / 2:.1f}" y="{altura - 8}" text-anchor="middle">{int(data[-2:])}</text>')
    partes.append(f'<line x1="{pl}" x2="{w - pr}" y1="{y(0):.1f}" y2="{y(0):.1f}" stroke="var(--axis)"/>')
    if meta:
        partes.append(f'<line x1="{pl}" x2="{w - pr}" y1="{y(meta):.1f}" y2="{y(meta):.1f}" stroke="var(--ink2)" '
                      f'stroke-dasharray="5 4" stroke-width="1.5"/><text x="{w - pr}" y="{y(meta) - 5:.1f}" '
                      f'text-anchor="end" style="fill:var(--ink2)">{E(rotulo_meta)} {formato(meta)}</text>')
    partes.append('</svg>')
    return ''.join(partes)


# ---------------------------------------------------------------- blocos
def _cor(centro):
    return f'var(--s{db.UNIDADES[centro]["cor"]})'


def bloco_resumo_dl(m, rotas):
    c, r, med, pv, t, rp = m['centro'], m['resumo'], m['media'], m['prevenda'], m['total'], m['reprog']
    u = db.UNIDADES[c]
    falta = [k for k in ('dias_uteis', 'meta_volume', 'tarifa') if r.get(k) is None]
    aviso = (f'<div class="aviso">Parâmetros do mês faltando: {", ".join(falta)}. '
             f'<a href="{rotas("/parametros", m["mes"])}">Preencher</a></div>') if falta and not rotas.estatico else ''
    tend_ok = None if r['tend_vs_meta'] is None else r['tend_vs_meta'] >= 0
    linhas_pes = [
        ('% retorno volume', t['ret_vol'], META_PES['ret_vol']),
        ('% retorno cliente', t['ret_cli'], META_PES['ret_cli']),
        ('% reprog. volume', rp['pct'], META_PES['reprog_vol']),
        ('% reprog. cliente', rp['pct_cli'], META_PES['reprog_cli']),
    ]
    pes = ''.join(f'<tr><td>{n}</td><td>{fp(v)}</td><td>≤ {fp(meta, 0)}</td>'
                  f'<td>{status(None if v is None else v <= meta, "na meta", "fora")}</td></tr>' for n, v, meta in linhas_pes)
    return f"""
<div class="card"><h3><span class="dot" style="background:{_cor(c)}"></span>{E(u['nome'])}
 <span class="tag">{c}</span></h3>{aviso}
<div class="tiles">
 <div class="tile"><div class="l">Volume ACM (cx unit)</div><div class="v">{fi(r['acm'])}</div>
  <div class="d">meta {fi(r['meta_volume'])}</div></div>
 <div class="tile"><div class="l">Tendência do mês</div><div class="v">{fi(r['tendencia'])}</div>
  <div class="d">{status(tend_ok, fp(r['tend_vs_meta'], 1) + ' vs meta', fp(r['tend_vs_meta'], 1) + ' vs meta')}</div></div>
 <div class="tile"><div class="l">Faturamento ACM</div><div class="v">{fr(r['fat_acm'])}</div>
  <div class="d">tendência {fr(r['fat_tendencia'])} ({fp(r['fat_tend_vs_meta'], 1)})</div></div>
 <div class="tile"><div class="l">Dias úteis · trab. · rest.</div><div class="v">{fi(r['dias_uteis'])} · {r['dias_trabalhados']} · {fi(r['dias_restantes'])}</div>
  <div class="d">volume AA {fi(r['volume_aa'])}</div></div>
</div>
<h2 style="margin-top:16px">Montagem</h2>
<table class="kv"><tr><th class="t"></th><th>Pré-venda{(' ' + fdata(pv['data'])) if pv else ''}</th><th>Média do mês</th></tr>
<tr><td>Cx unit plan</td><td>{fi(pv['cx_unit'] if pv else None)}</td><td>{fi(med['cx_unit'])}</td></tr>
<tr><td>Cargas</td><td>{fi(pv['cargas'] if pv else None)}</td><td>{fd(med['cargas'])}/dia ({fi(t['cargas'])} no mês)</td></tr>
<tr><td>Tx ocupação</td><td>{fp(pv['ocupacao'] if pv else None, 1)}</td><td>{fp(med['ocupacao'], 1)}</td></tr>
<tr><td>Vol. reprog. (cx unit)</td><td>{fi(pv['reprog_uc'] if pv else None)}</td><td>{fi(med['reprog_uc'])}</td></tr>
<tr><td>Tx reprog.</td><td>{fp(pv['tx_reprog'] if pv else None, 1)}</td><td>{fp(med['tx_reprog'], 1)}</td></tr>
<tr><td>Clientes reprog.</td><td>{fi(pv['reprog_cli'] if pv else None)}</td><td>{fd(med['reprog_cli'])}</td></tr>
<tr><td>Cubos por carga</td><td>{fd(pv['cubos_carga'] if pv else None)}</td><td>{fd(med['cubos_carga'])}</td></tr>
<tr><td>Cx unit por carga</td><td>{fd(pv['cx_carga'] if pv else None)}</td><td>{fd(med['cx_carga'])}</td></tr>
<tr><td>Entregas por carga</td><td>{fd(pv['entregas_carga'] if pv else None)}</td><td>{fd(med['entregas_carga'])}</td></tr>
</table>
<h2 style="margin-top:16px">Indicadores PES (acumulado)</h2>
<table class="kv"><tr><th class="t"></th><th>Real</th><th>Meta</th><th></th></tr>{pes}</table>
<p style="margin:14px 0 0"><a class="btn" href="{rotas('/montagem/' + c, m['mes'])}">Detalhe {E(u['nome'])} →</a></p>
</div>"""


def pagina_inicio(con, rotas, mes):
    cards = ''
    for c in db.UNIDADES:
        m = calcular(con, c, mes)
        r = m['resumo']
        tend_ok = None if r['tend_vs_meta'] is None else r['tend_vs_meta'] >= 0
        cards += (f'<div class="tile"><div class="l"><span class="dot" style="background:{_cor(c)}"></span> '
                  f'{E(db.UNIDADES[c]["nome"])} · volume ACM</div><div class="v">{fi(r["acm"])}</div>'
                  f'<div class="d">tendência {fi(r["tendencia"])} {status(tend_ok, fp(r["tend_vs_meta"], 1), fp(r["tend_vs_meta"], 1))}</div></div>'
                  f'<div class="tile"><div class="l">{E(db.UNIDADES[c]["nome"])} · retorno vol. / reprog. vol.</div>'
                  f'<div class="v">{fp(m["total"]["ret_vol"])} · {fp(m["reprog"]["pct"])}</div>'
                  f'<div class="d">metas PES ≤ 1% · ≤ 3%</div></div>')
    acomp = [('Montagem de cargas (DLs)', rotas('/montagem', mes), 'ativo'),
             ('KPI Distribuição e Logística', None, 'próxima fase'), ('PES Logístico', None, 'próxima fase'),
             ('Cargas em aberto', None, 'planejado'), ('Montadores', None, 'planejado'),
             ('Perdas de estoque', None, 'planejado'), ('KM planejado × realizado', None, 'planejado'),
             ('Retorno por motivo', None, 'planejado'), ('Fill rate', None, 'planejado'),
             ('Gestão à vista', None, 'planejado'), ('Custos de descarga', None, 'planejado')]
    lista = ''.join(f'<div class="card"><h3>{E(n)}</h3><p class="small">{s}</p>'
                    + (f'<a class="btn" href="{h}">Abrir →</a>' if h else '') + '</div>' for n, h, s in acomp)
    corpo = (f'<h1>Painel principal</h1><p class="sub">Indicadores-chave de {nome_mes(mes)}. '
             f'{seletor_mes(con, rotas, "/", mes)}</p><div class="tiles">{cards}</div>'
             f'<h2>Acompanhamentos</h2><div class="grid">{lista}</div>')
    return layout('Início', corpo, rotas, '/', mes)


def pagina_montagem(con, rotas, mes):
    ms = [calcular(con, c, mes) for c in db.UNIDADES]
    blocos = ''.join(bloco_resumo_dl(m, rotas) for m in ms)
    ult = con.execute("SELECT max(importado_em) u FROM importacao").fetchone()['u']
    corpo = (f'<h1>Montagem de cargas — {nome_mes(mes)}</h1>'
             f'<p class="sub">Resumo das DLs (equivale à aba RESUMO). Última importação: {E(ult or "nenhuma")}. '
             f'{seletor_mes(con, rotas, "/montagem", mes)}</p><div class="grid">{blocos}</div>')
    return layout('Montagem de cargas', corpo, rotas, '/montagem', mes)


def pagina_detalhe(con, rotas, centro, mes):
    m = calcular(con, centro, mes)
    u, r, cor = db.UNIDADES[centro], m['resumo'], _cor(centro)
    meta_dia = r['meta_volume'] / r['dias_uteis'] if r['meta_volume'] and r['dias_uteis'] else None
    dias = [d for d in m['dias'] if d['cx_unit'] or d['entregas']]
    pv = m['prevenda']['data'] if m['prevenda'] else None

    def linha(d, cls=''):
        o = {'resumo': 'Resumo', 'legado': 'planilha', 'manual': 'manual'}.get(d.get('origem_plan'), '')
        return (f'<tr class="{cls}"><td>{d.get("dia_semana", "")} {fdata(d["data"]) if "data" in d else d.get("rot", "")}</td>'
                f'<td>{fi(d["vol_cxf"])}</td><td>{fi(d["entregas"])}</td><td>{fi(d["cargas"])}</td><td>{fi(d["cubos"])}</td>'
                f'<td>{fp(d["ocupacao"], 1)}</td><td>{fi(d["cx_unit"])}</td><td>{fi(d["reprog_uc"])}</td><td>{fi(d["reprog_cli"])}</td>'
                f'<td>{fp(d["tx_reprog"], 1)}</td><td>{fd(d["cubos_carga"])}</td><td>{fd(d["cx_carga"])}</td>'
                f'<td>{fd(d["entregas_carga"])}</td><td>{fd(d["drop_cubos"])}</td><td>{fd(d["drop_cx"])}</td>'
                f'<td>{fp(d["ret_vol"])}</td><td>{fp(d["ret_cli"])}</td><td>{fp(d.get("ret_cli_clientes"))}</td>'
                f'<td class="t small">{o}</td></tr>')

    cab = ('<tr><th class="t">Dia</th><th>Vol plan cx fís</th><th>Entregas</th><th>Cargas</th><th>Cubos</th><th>Tx ocup.</th>'
           '<th>Cx unit plan</th><th>Vol reprog</th><th>Cli reprog</th><th>Tx reprog</th><th>Cubos/veíc.</th>'
           '<th>Cx unit/carga</th><th>Entregas/carga</th><th>Drop cubos</th><th>Drop cx unit</th>'
           '<th>Retorno vol.</th><th>Retorno cli. (planilha)</th><th>Retorno cli. (por cliente)</th><th class="t">Origem plan.</th></tr>')
    t, med = dict(m['total']), dict(m['media'])
    tot = linha({**t, 'rot': 'TOTAL', 'ocupacao': None, 'tx_reprog': None, 'cubos_carga': None, 'cx_carga': None,
                 'entregas_carga': None, 'drop_cubos': None, 'drop_cx': None}, 'tot')
    media = linha({**med, 'rot': 'MÉDIA', 'ret_cli_clientes': None}, 'tot')
    corpo_tab = ''.join(linha(d, 'pv' if d['data'] == pv else '') for d in dias)

    rp_lin = ''.join(f'<tr class="{"pv" if d["data"] == pv else ""}"><td>{d["dia_semana"]} {fdata(d["data"])}</td>'
                     f'<td>{fd(d["rp_cubos"])}</td><td>{fi(d["rp_uc_total"])}</td><td>{fd(d["rp_reprog"])}</td>'
                     f'<td>{fp(d["rp_pct"])}</td><td>{fi(d["entregas"])}</td><td>{fi(d["rp_cli"])}</td><td>{fp(d["rp_pct_cli"])}</td></tr>'
                     for d in dias if d['rp_uc_total'] or d['rp_cli'] is not None)
    rp = m['reprog']
    rp_tot = (f'<tr class="tot"><td>TOTAL</td><td>{fd(rp["rp_cubos"])}</td><td>{fi(rp["rp_uc_total"])}</td>'
              f'<td>{fd(rp["rp_reprog"])}</td><td>{fp(rp["pct"])}</td><td>{fi(rp["entregas"])}</td><td>{fi(rp["rp_cli"])}</td>'
              f'<td>{fp(rp["pct_cli"])}</td></tr>')
    mot = motivos_retorno(con, centro, mes)
    tot_mot = sum(x['cx'] or 0 for x in mot) or 1
    mot_lin = ''.join(f'<tr><td class="t">{E(x["motivo"] or "(sem motivo)")}</td><td>{fd(x["cx"])}</td>'
                      f'<td>{fp((x["cx"] or 0) / tot_mot, 1)}</td><td>{fi(x["clientes"])}</td></tr>' for x in mot)
    editar = '' if rotas.estatico else (f' <a class="btn sec" href="/planejamento/{centro}?mes={mes}">Editar planejamento do mês</a>'
                                        f' <a class="btn sec" href="/parametros?mes={mes}">Parâmetros</a>')
    corpo = f"""
<p><a href="{rotas('/montagem', mes)}">← Montagem de cargas</a></p>
<h1><span class="dot" style="background:{cor}"></span> {E(u['nome'])} — {nome_mes(mes)}</h1>
<p class="sub">Detalhe diário (equivale à aba {'BARREIRAS' if centro == 'CBAR' else 'JUAZEIRO'} e à Reprogramação DL's).
{seletor_mes(con, rotas, '/montagem/' + centro, mes)}{editar}</p>
<div class="tiles">
 <div class="tile"><div class="l">Volume ACM</div><div class="v">{fi(r['acm'])}</div><div class="d">meta {fi(r['meta_volume'])}</div></div>
 <div class="tile"><div class="l">Tendência vs meta</div><div class="v">{fp(r['tend_vs_meta'], 1)}</div><div class="d">{fi(r['tendencia'])} cx unit</div></div>
 <div class="tile"><div class="l">Faturamento ACM</div><div class="v">{fr(r['fat_acm'])}</div><div class="d">tarifa {fd(r['tarifa'], 2)}</div></div>
 <div class="tile"><div class="l">Retorno volume</div><div class="v">{fp(t['ret_vol'])}</div><div class="d">meta PES ≤ 1%</div></div>
 <div class="tile"><div class="l">% reprog. volume (PES)</div><div class="v">{fp(rp['pct'])}</div><div class="d">{('folga até a meta: ' + fi(rp['folga_uc'])) if (rp['folga_uc'] or 0) >= 0 else ('acima da meta em ' + fi(-rp['folga_uc']))} cx unit</div></div>
</div>
<h2>Cx unit por dia</h2><div class="card">{grafico_barras(m['dias'], 'cx_unit', cor, meta_dia, 'meta diária')}</div>
<h2>Retorno de volume por dia</h2><div class="card">{grafico_barras(m['dias'], 'ret_vol', cor, META_PES['ret_vol'], 'meta PES', lambda v: fp(v, 1))}</div>
<h2>Diário</h2><p class="small">Linha destacada = pré-venda (último Resumo importado). "Retorno cli. (planilha)" replica a fórmula
atual (cargas com 1º item externo ÷ entregas); "por cliente" conta clientes com retorno externo ÷ entregas.</p>
<div class="tw"><table>{cab}{corpo_tab}{tot}{media}</table></div>
<h2>Reprogramação DL's (só cargas REPROG)</h2>
<div class="tw"><table><tr><th class="t">Dia</th><th>Cubos</th><th>Volume UC total</th><th>Reprogramação</th><th>% reprog.</th>
<th>Entregas plan</th><th>Reprog cli</th><th>% reprog. cli</th></tr>{rp_lin}{rp_tot}</table></div>
<h2>Retorno externo por motivo</h2>
<div class="tw"><table><tr><th class="t">Motivo</th><th>Cx unit</th><th>% do retorno</th><th>Clientes</th></tr>{mot_lin}</table></div>
"""
    return layout(u['nome'], corpo, rotas, '/montagem', mes)


def pagina_parametros(con, mes, salvo=False):
    linhas = ''
    for chave, (rot, padrao) in db.PARAMETROS.items():
        campos = ''
        for c in db.UNIDADES:
            r = con.execute('SELECT valor, origem FROM parametro WHERE centro=? AND mes=? AND chave=?', (c, mes, chave)).fetchone()
            v = '' if r is None or r['valor'] is None else _br(f"{r['valor']:.10g}")
            dica = f' <span class="tag">{r["origem"]}</span>' if r else (f' <span class="tag">padrão {padrao}</span>' if padrao is not None else '')
            campos += f'<td><input type="text" inputmode="decimal" name="{c}__{chave}" value="{E(str(v))}">{dica}</td>'
        linhas += f'<tr><td class="t">{E(rot)}</td>{campos}</tr>'
    cab = ''.join(f'<th>{E(u["nome"])}</th>' for u in db.UNIDADES.values())
    ok = '<div class="aviso">Parâmetros salvos.</div>' if salvo else ''
    corpo = (f'<h1>Parâmetros do mês — {nome_mes(mes)}</h1><p class="sub">Valores digitados à mão (antes no RESUMO da planilha). '
             f'Use ponto ou vírgula como decimal. Deixe vazio para apagar.</p>{ok}'
             f'<form method="post" action="/parametros?mes={mes}"><div class="tw"><table><tr><th class="t">Parâmetro</th>{cab}</tr>'
             f'{linhas}</table></div><p><button class="btn" type="submit">Salvar</button> '
             f'<a class="btn sec" href="/montagem?mes={mes}">Voltar</a></p></form>')
    return layout('Parâmetros', corpo, Rotas(), '/parametros', mes)


CAMPOS_PLAN = [('entregas', 'Entregas plan'), ('cargas', 'Cargas'), ('ocupacao', 'Tx ocupação (0,xx)'),
               ('reprog_uc', 'Vol reprog (cx unit)'), ('reprog_cli', 'Qtd cli reprog'),
               ('uc_total', 'UC total (Reprog DL)'), ('reprog_so_cubos', 'Cubos REPROG'), ('reprog_so_cli', 'Cli REPROG')]


def pagina_planejamento(con, centro, mes, salvo=False):
    from hub.montagem import _dias_do_mes
    plan = {r['data']: dict(r) for r in con.execute('SELECT * FROM planejamento WHERE centro=? AND data LIKE ?', (centro, f'{mes}-%'))}
    cab = ''.join(f'<th>{E(n)}</th>' for _, n in CAMPOS_PLAN)
    linhas = ''
    for d in _dias_do_mes(mes):
        k = d.isoformat()
        p = plan.get(k, {})
        cels = ''.join(f'<td><input type="text" inputmode="decimal" name="{k}__{c}" '
                       f'value="{"" if p.get(c) is None else _br(f"{p[c]:.12g}")}"></td>' for c, _ in CAMPOS_PLAN)
        linhas += f'<tr><td>{fdata(k)}</td>{cels}<td class="t small">{p.get("origem", "")}</td></tr>'
    ok = '<div class="aviso">Planejamento salvo (dias alterados passam a ter origem "manual").</div>' if salvo else ''
    corpo = (f'<p><a href="/montagem/{centro}?mes={mes}">← Detalhe</a></p><h1>Planejamento — {E(db.UNIDADES[centro]["nome"])} — {nome_mes(mes)}</h1>'
             f'<p class="sub">Normalmente vem do Resumo de Planejamento importado. Edite só para corrigir ou preencher um dia sem Resumo.</p>{ok}'
             f'<form method="post" action="/planejamento/{centro}?mes={mes}"><div class="tw"><table>'
             f'<tr><th class="t">Dia</th>{cab}<th class="t">Origem</th></tr>{linhas}</table></div>'
             f'<p><button class="btn" type="submit">Salvar</button></p></form>')
    return layout('Planejamento', corpo, Rotas(), '/montagem', mes)


def pagina_importar(con, entrada, resultados=None):
    res = ''
    if resultados is not None:
        lin = ''.join(f'<tr><td class="t">{E(r["arquivo"])}</td><td class="t">{E(r["status"])}</td><td class="t">{E(str(r["tipo"]))}</td>'
                      f'<td class="t">{E(str(r["centro"] or ""))}</td><td>{r["linhas"]}</td><td class="t">{E(str(r["data_ref"] or ""))}</td>'
                      f'<td class="t">{E(r["aviso"] or "")}</td></tr>' for r in resultados if r['status'] != 'ignorado')
        res = (f'<h2>Resultado</h2><div class="tw"><table><tr><th class="t">Arquivo</th><th class="t">Status</th><th class="t">Tipo</th>'
               f'<th class="t">Centro</th><th>Linhas</th><th class="t">Período / data</th><th class="t">Aviso</th></tr>{lin}</table></div>'
               if lin else '<p>Nenhum arquivo novo reconhecido na pasta.</p>')
    hist = ''.join(f'<tr><td class="t">{E(r["importado_em"])}</td><td class="t">{E(r["arquivo"])}</td><td class="t">{E(r["tipo"])}</td>'
                   f'<td class="t">{E(r["centro"] or "")}</td><td>{r["linhas"]}</td><td class="t">{E(r["data_ref"] or "")}</td>'
                   f'<td class="t">{E(r["aviso"] or "")}</td></tr>'
                   for r in con.execute('SELECT * FROM importacao ORDER BY id DESC LIMIT 30'))
    corpo = (f'<h1>Importar arquivos</h1><p class="sub">Pasta de entrada: <b>{E(str(entrada))}</b>. O Hub reconhece pelo conteúdo: '
             f'VOLUMES DE VENDAS/RETORNOS (Barreiras), ZSD0092/ZSD0090 (Juazeiro), Resumo de Planejamento (CBAR e CCRT) '
             f'e as planilhas antigas de Montagem/Reprogramação (histórico). Arquivos já importados são pulados.</p>'
             f'<div class="aviso">Resumo de Planejamento: salve o arquivo sem habilitar a edição antes, para não recalcular a data (C8).</div>'
             f'<form method="post" action="/importar"><button class="btn" type="submit">Importar agora</button></form>{res}'
             f'<h2>Últimas importações</h2><div class="tw"><table><tr><th class="t">Quando</th><th class="t">Arquivo</th><th class="t">Tipo</th>'
             f'<th class="t">Centro</th><th>Linhas</th><th class="t">Período / data</th><th class="t">Aviso</th></tr>{hist}</table></div>')
    return layout('Importar', corpo, Rotas(), '/importar')
