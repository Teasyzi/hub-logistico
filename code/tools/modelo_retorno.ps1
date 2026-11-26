# Gera o modelo da exportacao do Retorno por motivo (docs/modelos/retorno.xlsx) a partir de uma planilha oficial
# "MM. Retorno - <Mes>.xlsx": as abas CB NORTE, CB SUL e DLS com os mesmos estilos, tema, molduras e graficos, SEM dados
# e SEM nomes:
#   - ficam as linhas de titulo (1 a 7) e, no lugar das tabelas, linhas-modelo (so estilos):
#     8 = linha de motivo/motorista, 9 = vazia, 10 = total, 11 = vazia, 12 = total sem cancelamento, 13 = vazia,
#     14 = base da moldura. Cada lado (B:N e P em diante) usa as suas proprias linhas de origem;
#   - os graficos perdem os caches (que guardam nomes e valores) e os indices do total e do "sem cancelamento" viram
#     900 e 901, que a exportacao troca pela posicao do mes;
#   - saem as abas ocultas (cbar, ccrt), impressoras, autor e calcChain; textos sem celula sao apagados.
# Uso: powershell -File code\tools\modelo_retorno.ps1 -Planilha "<10. Retorno - Outubro.xlsx>"
# As linhas de origem abaixo sao as da planilha de out/26. (Arquivo sem acentos de proposito: PowerShell 5.1.)
param([Parameter(Mandatory = $true)][string]$Planilha)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$destino = Join-Path $raiz 'docs\modelos'
$utf8 = New-Object Text.UTF8Encoding($false)

# Linhas de origem por aba: esquerda (motivos) = dado, vazia, total, vazia, sem cancelamento, vazia, base;
# direita (motoristas ou Juazeiro) = dado, vazia, total, vazia, vazia, vazia, base.
$ORIGEM = @{
  'sheet1' = @{ e = @(8, 28, 29, 30, 31, 32, 33); d = @(8, 41, 42, 41, 41, 41, 43); totalIdx = 21; scIdx = 23 }
  'sheet2' = @{ e = @(8, 22, 23, 24, 25, 26, 32); d = @(8, 37, 38, 37, 37, 37, 39); totalIdx = 15; scIdx = 17 }
  'sheet3' = @{ e = @(8, 22, 23, 24, 23, 24, 31); d = @(8, 25, 26, 25, 25, 25, 31); totalIdx = -1; scIdx = -1 }
}

function Ler-Entrada($zip, [string]$n) {
  $e = $zip.GetEntry($n); if (-not $e) { return $null }
  $r = New-Object IO.StreamReader($e.Open(), $utf8); $t = $r.ReadToEnd(); $r.Close(); return $t
}
function So-Estilo([string]$cel, [int]$linha) {
  $a = [regex]::Match($cel, '^<c ([^>]*?)(?:/>|>)').Groups[1].Value -replace '\s*t="[^"]*"', ''
  $a = $a -replace 'r="([A-Z]+)\d+"', "r=`"`${1}$linha`""
  return "<c $a/>"
}
function Num-Coluna([string]$col) { $n = 0; foreach ($ch in $col.ToCharArray()) { $n = $n * 26 + ([int]$ch - 64) }; return $n }

$tmp = Join-Path $env:TEMP 'modelo_retorno.xlsx'
$in = [IO.File]::Open($Planilha, 'Open', 'Read', 'ReadWrite'); $out = [IO.File]::Create($tmp); $in.CopyTo($out); $in.Close(); $out.Close()
$zin = [IO.Compression.ZipFile]::OpenRead($tmp)
$wb = Ler-Entrada $zin 'xl/workbook.xml'
foreach ($par in @(@('CB NORTE', 'rId1'), @('CB SUL', 'rId2'), @('DLS', 'rId3'))) {
  if ($wb -notmatch "<sheet name=`"$($par[0])`"[^>]*r:id=`"$($par[1])`"") { throw "Aba $($par[0]) fora da ordem esperada" }
}
$ssXml = Ler-Entrada $zin 'xl/sharedStrings.xml'
$usados = New-Object 'System.Collections.Generic.HashSet[int]'
$abas = @{}
foreach ($nome in 'sheet1', 'sheet2', 'sheet3') {
  $o = $ORIGEM[$nome]
  $x = Ler-Entrada $zin "xl/worksheets/$nome.xml"
  $ini = $x.IndexOf('<sheetData>'); $fim = $x.IndexOf('</sheetData>')
  $antes = $x.Substring(0, $ini); $depois = $x.Substring($fim + '</sheetData>'.Length)
  $linhas = @{}
  foreach ($m in [regex]::Matches($x.Substring($ini, $fim - $ini), '<row [^>]*?(?:/>|>.*?</row>)', 'Singleline')) {
    $linhas[[int][regex]::Match($m.Value, '<row r="(\d+)"').Groups[1].Value] = $m.Value
  }
  $celulas = { param($r) @([regex]::Matches([string]$linhas[$r], '<c [^>]*?(?:/>|>.*?</c>)', 'Singleline') | ForEach-Object { $_.Value }) }
  $sb = New-Object Text.StringBuilder
  foreach ($r in 1..7) {
    if (-not $linhas.ContainsKey($r)) { continue }
    $abre = [regex]::Match($linhas[$r], '^<row [^>]*?/?>').Value
    if ($abre.EndsWith('/>')) { [void]$sb.Append($abre); continue }
    $cels = foreach ($c in (& $celulas $r)) {
      # So rotulos de titulo e cabecalho (E5/S5 = volume e a linha 6 nao ficam).
      if ($r -ne 6 -and $c -match '^<c [^>]*t="s"' -and $c -match '<v>(\d+)</v>') { [void]$usados.Add([int]$matches[1]); $c } else { So-Estilo $c $r }
    }
    [void]$sb.Append($abre + ($cels -join '') + '</row>')
  }
  foreach ($k in 0..6) {
    $r = 8 + $k
    $esq = @(& $celulas $o.e[$k] | Where-Object { (Num-Coluna ([regex]::Match($_, '^<c r="([A-Z]+)').Groups[1].Value)) -le 14 })
    $dir = @(& $celulas $o.d[$k] | Where-Object { (Num-Coluna ([regex]::Match($_, '^<c r="([A-Z]+)').Groups[1].Value)) -ge 16 })
    $cels = @($esq + $dir | ForEach-Object { So-Estilo $_ $r })
    [void]$sb.Append("<row r=`"$r`">" + ($cels -join '') + '</row>')
  }
  $antes = $antes -replace '<dimension ref="[^"]*"/>', '<dimension ref="B1:AC14"/>'
  $depois = $depois -replace '(<pageSetup[^>]*?)\s+r:id="[^"]*"', '$1'
  $abas[$nome] = $antes + '<sheetData>' + $sb.ToString() + '</sheetData>' + $depois
}
$script:k = 0
$ssNovo = [regex]::Replace($ssXml, '<si>.*?</si>', { param($m) $i = $script:k; $script:k++; if ($usados.Contains($i)) { $m.Value } else { '<si><t></t></si>' } }, 'Singleline')

# Graficos -> aba (para os indices do total e do sem cancelamento).
$abaDoGrafico = @{}
foreach ($d in 1..3) {
  foreach ($m in [regex]::Matches((Ler-Entrada $zin "xl/drawings/_rels/drawing$d.xml.rels"), 'Target="\.\./charts/(chart\d+)\.xml"')) { $abaDoGrafico[$m.Groups[1].Value] = "sheet$d" }
}

$arq = Join-Path $destino 'retorno.xlsx'
if (Test-Path $arq) { Remove-Item $arq }
$zout = [IO.Compression.ZipFile]::Open($arq, 'Create')
$escrever = { param($n, $t) $ne = $zout.CreateEntry($n, 'Optimal'); $w = New-Object IO.StreamWriter($ne.Open(), $utf8); $w.Write($t); $w.Close() }
foreach ($e in $zin.Entries) {
  $n = $e.FullName
  if ($n -match '^xl/(worksheets/sheet[45]\.xml|printerSettings/|persons/|calcChain\.xml)|^customXml/|^docProps/') { continue }
  $t = Ler-Entrada $zin $n
  if ($n -match '^xl/worksheets/(sheet[123])\.xml$') { $t = $abas[$matches[1]] }
  elseif ($n -match '^xl/worksheets/_rels/') { $t = $t -replace '<Relationship [^>]*Target="[^"]*printerSettings/[^"]*"[^>]*/>', '' }
  elseif ($n -match '^xl/charts/(chart\d+)\.xml$') {
    $o = $ORIGEM[$abaDoGrafico[$matches[1]]]
    $t = [regex]::Replace($t, '<c:(strCache|numCache)>.*?</c:\1>', '', 'Singleline')
    # So na serie da esquerda ($C): troca os indices do total e do sem cancelamento por 900 e 901.
    if ($t -match '\$C\$8') {
      $ti = $o.totalIdx; $si = $o.scIdx
      if ($ti -lt 0) { $ti = 15 }   # DLS: so o rotulo do total (indice 15)
      $t = $t -replace "(<c:(?:dPt|dLbl)><c:idx val=`")$ti(`"/>)", '${1}900${2}'
      if ($si -ge 0) { $t = $t -replace "(<c:(?:dPt|dLbl)><c:idx val=`")$si(`"/>)", '${1}901${2}' }
    } elseif ($t -match '\$Q\$8') {
      $t = $t -replace '(<c:(?:dPt|dLbl)><c:idx val=")18("/>)', '${1}900${2}'
    }
  }
  elseif ($n -eq '[Content_Types].xml') { $t = $t -replace '<Override PartName="/(xl/worksheets/sheet[45]\.xml|xl/persons/[^"]+|xl/calcChain\.xml|customXml/[^"]+|docProps/[^"]+)"[^>]*/>', '' }
  elseif ($n -eq '_rels/.rels') { $t = $t -replace '<Relationship [^>]*Target="docProps/[^"]*"[^>]*/>', '' }
  elseif ($n -eq 'xl/_rels/workbook.xml.rels') { $t = $t -replace '<Relationship [^>]*Target="[^"]*(worksheets/sheet[45]\.xml|calcChain\.xml|persons/|customXml/)[^"]*"[^>]*/>', '' }
  elseif ($n -eq 'xl/workbook.xml') {
    $t = $t -replace '<mc:AlternateContent[^>]*><mc:Choice Requires="x15"><x15ac:absPath[^>]*/></mc:Choice></mc:AlternateContent>', ''
    $t = $t -replace '<sheet name="(cbar|ccrt)"[^>]*/>', ''
    $t = [regex]::Replace($t, '<definedNames>.*?</definedNames>', '', 'Singleline')
    $t = $t -replace '<xr:revisionPtr [^>]*/>', ''
    $t = $t -replace '(<workbookView [^>]*?)\s+activeTab="\d+"', '$1'
  }
  elseif ($n -eq 'xl/sharedStrings.xml') { $t = $ssNovo }
  & $escrever $n $t
}
$zin.Dispose(); $zout.Dispose(); Remove-Item $tmp
"$arq : $((Get-Item $arq).Length) bytes"
$ss = @([regex]::Matches($ssXml, '<si>.*?</si>', 'Singleline') | ForEach-Object { ([regex]::Matches($_.Value, '<t[^>]*>(.*?)</t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join '' })
"textos no modelo: " + (($usados | Sort-Object | ForEach-Object { $ss[$_] }) -join ' | ')
