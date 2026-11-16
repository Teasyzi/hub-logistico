"""Hub Logístico — linha de comando.

    python hub.py                 abre o Hub no navegador (servidor local)
    python hub.py importar [pasta] importa as exportações da pasta (padrão: pasta de entrada)
    python hub.py historico <pasta> importa planilhas antigas de Montagem/Reprogramação
    python hub.py validar AAAA-MM  confere o Hub contra a planilha antiga importada
    python hub.py exportar         gera a versão HTML estática
"""
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))

from hub import config, db, importar, validar, web  # noqa: E402


def _tabela(res):
    for r in res:
        if r['status'] == 'ignorado':
            continue
        print(f"{r['status']:>13} {str(r['tipo']):9} {str(r['centro'] or ''):10} {r['linhas']:>6}  "
              f"{str(r['data_ref'] or ''):25} {r['arquivo']}  {r['aviso'] or ''}")


def _opcoes(args):
    """--dados PASTA --entrada PASTA --porta N --sem-navegador (sobrepõem o hub.ini)."""
    import os
    resto, op, i = [], {}, 0
    while i < len(args):
        a = args[i]
        if a in ('--dados', '--entrada', '--porta'):
            op[a[2:]] = args[i + 1]
            i += 2
            continue
        if a == '--sem-navegador':
            op['sem-navegador'] = True
        else:
            resto.append(a)
        i += 1
    if 'dados' in op:
        os.environ['HUB_DADOS'] = op['dados']
    if 'entrada' in op:
        os.environ['HUB_ENTRADA'] = op['entrada']
    return resto, op


def main(args):
    args, op = _opcoes(args)
    cmd = args[0] if args else 'servir'
    if cmd == 'servir':
        web.servir(int(op.get('porta', 8765)), not op.get('sem-navegador'))
    elif cmd == 'importar':
        con = db.conectar()
        _tabela(importar.importar_pasta(con, args[1] if len(args) > 1 else config.pasta_entrada()))
    elif cmd == 'historico':
        con = db.conectar()
        _tabela(importar.importar_pasta(con, args[1], r'montagem de cargas|reprograma'))
    elif cmd == 'validar':
        con = db.conectar()
        for c in db.UNIDADES:
            n, div = validar.comparar(con, c, args[1])
            print(f'{c}: {n} valores conferidos, {len(div)} divergências')
            for d in div:
                print('   ', d)
    elif cmd == 'exportar':
        print('exportado em', web.exportar(db.conectar()))
    else:
        print(__doc__)


if __name__ == '__main__':
    main(sys.argv[1:])
