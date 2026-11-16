"""Conversão dos números como chegam das exportações SAP/Excel."""
from __future__ import annotations


def num(valor) -> float:
    """'1883.000' -> 1883.0 · ' 65,44%' -> 0.6544 · '100,00-%' -> -1.0 · None -> 0.0"""
    if valor is None or valor == '':
        return 0.0
    if isinstance(valor, bool):
        return float(valor)
    if isinstance(valor, (int, float)):
        return float(valor)
    s = str(valor).strip().replace('\xa0', '')
    if not s:
        return 0.0
    pct = s.endswith('%')
    s = s.rstrip('%').strip()
    neg = s.endswith('-') or s.startswith('-')
    s = s.strip('-').strip()
    if ',' in s and '.' in s:      # 1.234,56
        s = s.replace('.', '').replace(',', '.')
    elif ',' in s:                  # 65,44
        s = s.replace(',', '.')
    try:
        x = float(s) if s else 0.0
    except ValueError:
        return 0.0
    if neg:
        x = -x
    return x / 100 if pct else x


def texto(valor) -> str | None:
    """Códigos (transporte, cliente) às vezes chegam como número: normaliza para texto."""
    if valor is None or valor == '':
        return None
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    return str(valor).strip()


def div(a, b):
    """Divisão que devolve None quando o denominador é 0 (o '-' da planilha)."""
    return a / b if b else None
