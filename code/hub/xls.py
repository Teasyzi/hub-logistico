"""Leitor mínimo de .xls (BIFF8, Excel 97-2003) só com a biblioteca padrão.

Usado para as exportações SAP ZSD0090/ZSD0092. Lê valores (texto, número, resultado
de fórmula); ignora formatação. Interface igual à de `hub.xlsx.Pasta`.
"""
from __future__ import annotations

import struct

_FIM = 0xFFFFFFFA


def _cfb_streams(blob: bytes) -> dict[str, bytes]:
    """Lê os streams de primeiro nível de um Compound File (MS-CFB)."""
    if blob[:8] != bytes.fromhex('D0CF11E0A1B11AE1'):
        raise ValueError('não é um arquivo .xls (Compound File)')
    ss = 1 << struct.unpack('<H', blob[30:32])[0]
    mss = 1 << struct.unpack('<H', blob[32:34])[0]
    first_dir, cutoff, first_mf, _n_mf, first_difat, n_difat = struct.unpack('<I4xIIIII', blob[48:76])
    difat = list(struct.unpack('<109I', blob[76:512]))
    sec = lambda n: blob[(n + 1) * ss:(n + 2) * ss]
    s = first_difat
    while n_difat > 0 and s < _FIM:
        a = struct.unpack(f'<{ss // 4}I', sec(s))
        difat += a[:-1]
        s = a[-1]
        n_difat -= 1
    fat = []
    for fs in difat:
        if fs < _FIM:
            fat += struct.unpack(f'<{ss // 4}I', sec(fs))

    def cadeia(s):
        visto = 0
        while s < _FIM and visto < len(fat) + 1:
            yield s
            s = fat[s]
            visto += 1

    dirdata = b''.join(sec(x) for x in cadeia(first_dir))
    ents = []
    for i in range(len(dirdata) // 128):
        e = dirdata[i * 128:(i + 1) * 128]
        nl = struct.unpack('<H', e[64:66])[0]
        ents.append((e[:max(nl - 2, 0)].decode('utf-16-le', 'ignore'), e[66],
                     *struct.unpack('<II', e[116:124])))
    root = ents[0]
    mini = b''.join(sec(x) for x in cadeia(root[2]))
    minifat = []
    for x in cadeia(first_mf):
        minifat += struct.unpack(f'<{ss // 4}I', sec(x))
    out = {}
    for nome, tipo, inicio, tam in ents[1:]:
        if tipo != 2:
            continue
        if tam < cutoff:
            buf, s = bytearray(), inicio
            while s < _FIM and len(buf) < tam:
                buf += mini[s * mss:(s + 1) * mss]
                s = minifat[s]
            out[nome] = bytes(buf[:tam])
        else:
            out[nome] = b''.join(sec(x) for x in cadeia(inicio))[:tam]
    return out


def _rk(v: int) -> float:
    if v & 2:
        num = float(v >> 2 if not (v & 0x80000000) else (v >> 2) - (1 << 30))
    else:
        num = struct.unpack('<d', struct.pack('<Q', (v & 0xFFFFFFFC) << 32))[0]
    return num / 100 if v & 1 else num


class _Segmentos:
    """Leitura sequencial sobre SST + CONTINUE (strings podem cruzar registros)."""

    def __init__(self, partes):
        self.partes, self.i, self.pos = partes, 0, 0

    def _garante(self):
        while self.pos >= len(self.partes[self.i]):
            self.i += 1
            self.pos = 0

    def ler(self, n: int) -> bytes:
        out = bytearray()
        while n:
            self._garante()
            p = self.partes[self.i]
            pedaco = p[self.pos:self.pos + n]
            out += pedaco
            self.pos += len(pedaco)
            n -= len(pedaco)
        return bytes(out)

    def texto(self) -> str:
        nchar = struct.unpack('<H', self.ler(2))[0]
        flags = self.ler(1)[0]
        runs = struct.unpack('<H', self.ler(2))[0] if flags & 8 else 0
        ext = struct.unpack('<I', self.ler(4))[0] if flags & 4 else 0
        largo = flags & 1
        chars = []
        while nchar:
            self._garante()
            disp = len(self.partes[self.i]) - self.pos
            porc = max(1, disp // (2 if largo else 1))
            k = min(nchar, porc)
            dados = self.ler(k * (2 if largo else 1))
            chars.append(dados.decode('utf-16-le' if largo else 'latin-1'))
            nchar -= k
            if nchar:  # continua no próximo CONTINUE, que começa com novo byte de flag
                self._garante()
                largo = self.ler(1)[0] & 1
        self.ler(runs * 4 + ext)
        return ''.join(chars)


def _str_curta(b: bytes, off: int, len_bytes: int = 2):
    n = struct.unpack('<H', b[off:off + 2])[0] if len_bytes == 2 else b[off]
    off += len_bytes
    largo = b[off] & 1
    off += 1
    raw = b[off:off + n * (2 if largo else 1)]
    return raw.decode('utf-16-le' if largo else 'latin-1')


class PastaXls:
    """Pasta .xls aberta em memória. `linhas(aba)` igual a `hub.xlsx.Pasta`."""

    def __init__(self, caminho):
        self.caminho = str(caminho)
        with open(self.caminho, 'rb') as f:
            streams = _cfb_streams(f.read())
        wb = streams.get('Workbook') or streams.get('Book')
        if wb is None:
            raise ValueError('stream Workbook ausente')
        self._wb = wb
        self.abas: dict[str, int] = {}
        self.estado: dict[str, str] = {}
        self._sst: list[str] = []
        pos, sst_partes, em_sst = 0, [], False
        while pos + 4 <= len(wb):
            rid, ln = struct.unpack('<HH', wb[pos:pos + 4])
            dados = wb[pos + 4:pos + 4 + ln]
            if rid == 0x0085:
                off = struct.unpack('<I', dados[:4])[0]
                vis = dados[4]
                nome = _str_curta(dados, 6, 1)
                self.abas[nome] = off
                self.estado[nome] = 'visible' if vis == 0 else 'hidden'
            elif rid == 0x00FC:
                sst_partes, em_sst = [dados], True
            elif rid == 0x003C and em_sst:
                sst_partes.append(dados)
            else:
                if em_sst:
                    self._ler_sst(sst_partes)
                    em_sst = False
                if rid == 0x000A:  # EOF do globals
                    break
            pos += 4 + ln

    def _ler_sst(self, partes):
        seg = _Segmentos(partes)
        _total, unicos = struct.unpack('<II', seg.ler(8))
        self._sst = [seg.texto() for _ in range(unicos)]

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        pass

    def fechar(self):
        pass

    def linhas(self, aba: str, parar_apos_vazias: int = 2000):
        wb = self._wb
        pos = self.abas[aba]
        celulas: dict[int, dict[int, object]] = {}
        pendente = None
        while pos + 4 <= len(wb):
            rid, ln = struct.unpack('<HH', wb[pos:pos + 4])
            d = wb[pos + 4:pos + 4 + ln]
            pos += 4 + ln
            if rid == 0x000A:
                break
            if rid in (0x00FD, 0x0203, 0x027E, 0x0204, 0x0006, 0x0205, 0x00BD):
                r, c = struct.unpack('<HH', d[:4])
            if rid == 0x00FD:
                celulas.setdefault(r, {})[c] = self._sst[struct.unpack('<I', d[6:10])[0]]
            elif rid == 0x0203:
                celulas.setdefault(r, {})[c] = struct.unpack('<d', d[6:14])[0]
            elif rid == 0x027E:
                celulas.setdefault(r, {})[c] = _rk(struct.unpack('<I', d[6:10])[0])
            elif rid == 0x00BD:
                ultima = struct.unpack('<H', d[-2:])[0]
                for k, col in enumerate(range(c, ultima + 1)):
                    rk = struct.unpack('<I', d[4 + k * 6 + 2:4 + k * 6 + 6])[0]
                    celulas.setdefault(r, {})[col] = _rk(rk)
            elif rid == 0x0204:
                celulas.setdefault(r, {})[c] = _str_curta(d, 6, 2)
            elif rid == 0x0205:
                if d[7] == 0:
                    celulas.setdefault(r, {})[c] = bool(d[6])
            elif rid == 0x0006:
                res = d[6:14]
                if res[6:8] == b'\xff\xff':
                    if res[0] == 0:
                        pendente = (r, c)
                    elif res[0] == 1:
                        celulas.setdefault(r, {})[c] = bool(res[2])
                else:
                    celulas.setdefault(r, {})[c] = struct.unpack('<d', res)[0]
            elif rid == 0x0207 and pendente:
                celulas.setdefault(pendente[0], {})[pendente[1]] = _str_curta(d, 0, 2)
                pendente = None
        for r in sorted(celulas):
            vals = {c: v for c, v in celulas[r].items() if v not in ('', None)}
            if not vals:
                continue
            largura = max(vals) + 1
            yield r + 1, [vals.get(i) for i in range(largura)]


def abrir(caminho):
    """Abre .xls, .xlsx ou .xlsm pelo conteúdo (não pela extensão)."""
    with open(caminho, 'rb') as f:
        assinatura = f.read(8)
    if assinatura.startswith(b'PK'):
        from hub.xlsx import Pasta
        return Pasta(caminho)
    if assinatura == bytes.fromhex('D0CF11E0A1B11AE1'):
        return PastaXls(caminho)
    raise ValueError(f'formato não suportado: {caminho}')
