# Gera os modelos da exportação da Gestão à vista (docs/modelos/gestao_a_vista_<DL>.xlsx) a partir das planilhas
# oficiais: mesma estrutura, abas, estilos, tema, larguras, gráficos e fórmulas, SEM dados e SEM nomes.
#   - tira os valores de todas as células que não são texto (a aba Dados e a PLAN 2024 ficam só com rótulos e fórmulas);
#   - tira o cache dos gráficos (o Hub regrava ao exportar);
#   - tira docProps/core.xml (autor), persons, printerSettings, calcChain e o caminho do arquivo (absPath).
# Uso: powershell -File code\tools\modelo_gestao.ps1 -Origem "<pasta com as duas planilhas oficiais de 2026>"
param([Parameter(Mandatory = $true)][string]$Origem)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$destino = Join-Path $raiz 'docs\modelos'
New-Item -ItemType Directory -Force $destino | Out-Null
$utf8 = New-Object Text.UTF8Encoding($false)

function Limpar-Folha([string]$x) {
  # Células: mantém <c r s t="s"> (texto da planilha) e as fórmulas; tira <v> de números, erros e resultados de fórmula.
  $x = [regex]::Replace($x, '<c ([^>]*?)(/>|>(.*?)</c>)', {
    param($m)
    $attrs = $m.Groups[1].Value; $corpo = $m.Groups[3].Value
    if ($m.Groups[2].Value -eq '/>') { return $m.Value }
    if ($attrs -match 't="s"') { return $m.Value }
    # Linha 3 da aba Dados = os meses de cada bloco de anos (a exportação usa para achar os blocos).
    if ($attrs -match 'r="[A-Z]+3"') { return $m.Value }
    $f = [regex]::Match($corpo, '<f[^>]*/>|<f[^>]*>.*?</f>').Value
    $attrs = ($attrs -replace '\s*t="[^"]*"', '')
    if ($f) { return "<c $attrs>$f</c>" } else { return "<c $attrs/>" }
  }, 'Singleline')
  # pageSetup apontava para printerSettings (tirados).
  return ($x -replace '(<pageSetup[^>]*?)\s+r:id="[^"]*"', '$1')
}

function Limpar-Grafico([string]$x) {
  $x = [regex]::Replace($x, '<c:numCache>(.*?)</c:numCache>', { param($m) $fc = [regex]::Match($m.Groups[1].Value, '<c:formatCode>.*?</c:formatCode>').Value; "<c:numCache>$fc<c:ptCount val=""0""/></c:numCache>" }, 'Singleline')
  # Categorias (meses) sem cache; o nome da série (rótulo da linha) fica.
  $x = [regex]::Replace($x, '(<c:cat><c:strRef><c:f>[^<]*</c:f>)<c:strCache>.*?</c:strCache>', '$1<c:strCache><c:ptCount val="0"/></c:strCache>', 'Singleline')
  return $x
}

foreach ($par in @(@('CBAR', 'GESTÃO À VISTA - CB LOG CBAR.xlsx'), @('CCRT', 'GESTÃO À VISTA - CB LOG II CCRT.xlsx'))) {
  $src = Join-Path $Origem $par[1]
  $tmp = Join-Path $env:TEMP "modelo_gav_$($par[0]).xlsx"
  $in = [IO.File]::Open($src, 'Open', 'Read', 'ReadWrite'); $out = [IO.File]::Create($tmp); $in.CopyTo($out); $in.Close(); $out.Close()
  $zin = [IO.Compression.ZipFile]::OpenRead($tmp)
  $alvo = Join-Path $destino "gestao_a_vista_$($par[0]).xlsx"
  if (Test-Path $alvo) { Remove-Item $alvo }
  $zout = [IO.Compression.ZipFile]::Open($alvo, 'Create')
  foreach ($e in $zin.Entries) {
    $n = $e.FullName
    if ($n -match '^xl/persons/|^xl/printerSettings/|^xl/calcChain\.xml$|^docProps/core\.xml$') { continue }
    $leitor = New-Object IO.StreamReader($e.Open(), $utf8); $txt = $leitor.ReadToEnd(); $leitor.Close()
    if ($n -eq '[Content_Types].xml') {
      $txt = $txt -replace '<Override PartName="/(xl/persons/[^"]+|xl/calcChain\.xml|docProps/core\.xml)"[^>]*/>', ''
    } elseif ($n -match '_rels/.*\.rels$' -or $n -eq '_rels/.rels') {
      $txt = $txt -replace '<Relationship [^>]*Target="[^"]*(persons/|printerSettings/|calcChain\.xml|core\.xml)[^"]*"[^>]*/>', ''
    } elseif ($n -eq 'xl/workbook.xml') {
      $txt = $txt -replace '<mc:AlternateContent[^>]*><mc:Choice Requires="x15"><x15ac:absPath[^>]*/></mc:Choice></mc:AlternateContent>', ''
    } elseif ($n -match '^xl/worksheets/sheet\d+\.xml$') {
      $txt = Limpar-Folha $txt
    } elseif ($n -match '^xl/charts/chart\d+\.xml$') {
      $txt = Limpar-Grafico $txt
    }
    $ne = $zout.CreateEntry($n, 'Optimal'); $w = New-Object IO.StreamWriter($ne.Open(), $utf8); $w.Write($txt); $w.Close()
  }
  $zin.Dispose(); $zout.Dispose(); Remove-Item $tmp
  "$alvo : $((Get-Item $alvo).Length) bytes"
}
