"""Testes do Hub com dados sintéticos (sem arquivos reais: eles têm nomes de clientes).

    python -B -m unittest discover -s tests      (dentro da pasta code)
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from hub import db, montagem  # noqa: E402
from hub.numeros import num, texto  # noqa: E402
from hub.xlsx import serial_para_data  # noqa: E402


class TestNumeros(unittest.TestCase):
    def test_formatos_sap(self):
        self.assertEqual(num('1883.000'), 1883.0)
        self.assertAlmostEqual(num(' 65,44%'), 0.6544)
        self.assertAlmostEqual(num('100,00-%'), -1.0)
        self.assertEqual(num('1.234,5'), 1234.5)
        self.assertEqual(num(None), 0.0)
        self.assertEqual(num('%'), 0.0)
        self.assertEqual(texto(5135095.0), '5135095')

    def test_serial(self):
        self.assertEqual(str(serial_para_data(46296)), '2026-10-01')
        self.assertEqual(str(serial_para_data(46339.0)), '2026-11-13')


def _banco():
    con = db.conectar(':memory:')
    ins = lambda t, **k: con.execute(f'INSERT INTO {t} ({",".join(k)}) VALUES ({",".join("?" * len(k))})', tuple(k.values()))
    # dia 03: 2 cargas; dia 04 é a pré-venda (já tem venda, como na exportação real)
    ins('venda', centro='CBAR', dt_remessa='2026-11-03', transporte='T1', cxs_fisicas=1000, cxs_unitaria=1200)
    ins('venda', centro='CBAR', dt_remessa='2026-11-03', transporte='T2', cxs_fisicas=500, cxs_unitaria=600)
    ins('venda', centro='CBAR', dt_remessa='2026-11-04', transporte='T3', cxs_fisicas=800, cxs_unitaria=1000)
    # retornos do dia 03: T1 externo (2 clientes), T2 primeiro registro interno e depois externo
    for seq, (t, cli, ret, u) in enumerate([('T1', 'C1', 'EXTERNO', 10), ('T1', 'C2', 'EXTERNO', 8),
                                            ('T2', 'C3', 'INTERNO', 5), ('T2', 'C4', 'EXTERNO', 2)]):
        ins('retorno', centro='CBAR', dt_remessa='2026-11-03', transporte=t, tipo_transporte='0001', cliente=cli,
            retorno=ret, cxs_fisica=u, cxs_unitarias=u, seq=seq, importacao_id=1)
    ins('planejamento', centro='CBAR', data='2026-11-03', entregas=40, cargas=2, ocupacao=0.7, reprog_uc=160,
        reprog_cli=4, uc_total=2000, reprog_so_cubos=50, reprog_so_cli=3, origem='resumo')
    ins('planejamento', centro='CBAR', data='2026-11-04', entregas=30, cargas=1, ocupacao=0.8, reprog_uc=0,
        reprog_cli=0, uc_total=1000, reprog_so_cubos=0, reprog_so_cli=0, origem='resumo')
    for k, v in {'dias_uteis': 19, 'meta_volume': 30000, 'tarifa': 3.0}.items():
        db.gravar_parametro(con, 'CBAR', '2026-11', k, v)
    return con


class TestMontagem(unittest.TestCase):
    def setUp(self):
        self.m = montagem.calcular(_banco(), 'CBAR', '2026-11')
        self.d3 = next(d for d in self.m['dias'] if d['data'] == '2026-11-03')

    def test_volume_liquido_de_retorno(self):
        self.assertEqual(self.d3['vol_cxf'], 1500 - 25)
        self.assertEqual(self.d3['cx_unit'], 1800 - 25)
        self.assertAlmostEqual(self.d3['cubos'], 1775 / 1.6)

    def test_retornos(self):
        self.assertAlmostEqual(self.d3['ret_vol'], 20 / 1800)        # só externo ÷ venda bruta
        self.assertAlmostEqual(self.d3['ret_cli'], 1 / 40)           # T1 (T2 começa com INTERNO)
        self.assertAlmostEqual(self.d3['ret_cli_clientes'], 3 / 40)  # C1, C2, C4

    def test_dias_trabalhados_e_tendencia(self):
        r = self.m['resumo']
        self.assertEqual(r['dias_trabalhados'], 1)                   # 2 dias com entregas − pré-venda
        self.assertAlmostEqual(r['acm'], 1775 + 1000)
        self.assertAlmostEqual(r['tendencia'], 2775 / 1 * 19)
        self.assertAlmostEqual(r['fat_acm'], 2775 * 3.0)
        self.assertEqual(self.m['prevenda']['data'], '2026-11-04')

    def test_reprog_so_reprog(self):
        rp = self.m['reprog']
        self.assertAlmostEqual(rp['rp_reprog'], 50 * 1.6)
        self.assertAlmostEqual(rp['pct'], 80 / 3000)
        self.assertAlmostEqual(rp['pct_cli'], 3 / 70)


if __name__ == '__main__':
    unittest.main()
