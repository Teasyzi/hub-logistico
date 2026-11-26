# Gera o modelo da exportacao do 1x1 (docs/modelos/transportes.xlsx) a partir da planilha oficial
# "NN - Acompanhamento de transportes - 1x1 - <Mes>.xlsx": abas RESUMO (com os botoes), DA - CB Norte, DA - CB Sul,
# DL - CB Barreiras e DL - CB Juazeiro, com os mesmos estilos, larguras, colunas ocultas, paineis e setas, SEM cargas e
# SEM nomes:
#   - nas abas das unidades ficam as linhas 1 a 7 (rotulos e formulas do topo) e a linha 8 como linha-modelo (so estilos);
#   - no RESUMO ficam os rotulos, as metas de cubagem e as formulas (sem os resultados);
#   - saem a aba oculta Planilha1 (nomes), o vinculo externo, impressoras, autor, calcChain e nomes definidos; o
#     sharedStrings e remontado so com os rotulos.
# Uso: powershell -File code\tools\modelo_transportes.ps1 -Planilha "<planilha 1x1>"
# (Arquivo sem acentos de proposito: PowerShell 5.1.)
param([Parameter(Mandatory = $true)][string]$Planilha)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$destino = Join-Path $raiz 'docs\modelos'
$utf8 = New-Object Text.UTF8Encoding($false)

function Ler-Entrada($zip, [string]$n) {
  $e = $zip.GetEntry($n); if (-not $e) { return $null }
  $r = New-Object IO.StreamReader($e.Open(), $utf8); $t = $r.ReadToEnd(); $r.Close(); return $t
}
function So-Estilo([string]$cel) {
  $a = [regex]::Match($cel, '^<c ([^>]*?)(?:/>|>)').Groups[1].Value -replace '\s*t="[^"]*"', ''
  return "<c $a/>"
}

$tmp = Join-Path $env:TEMP 'modelo_tx.xlsx'
$in = [IO.File]::Open($Planilha, 'Open', 'Read', 'ReadWrite'); $out = [IO.File]::Create($tmp); $in.CopyTo($out); $in.Close(); $out.Close()
$zin = [IO.Compression.ZipFile]::OpenRead($tmp)
$wb = Ler-Entrada $zin 'xl/workbook.xml'
$ordem = @('RESUMO', 'DA - CB Norte', 'DA - CB Sul', 'DL - CB Barreiras', 'DL - CB Juazeiro')
foreach ($i in 0..4) { if ($wb -notmatch "<sheet name=`"$($ordem[$i])`"[^>]*r:id=`"rId$($i + 1)`"") { throw "Aba $($ordem[$i]) fora da ordem esperada" } }
$ssXml = Ler-Entrada $zin 'xl/sharedStrings.xml'
$sis = @([regex]::Matches($ssXml, '<si>.*?</si>', 'Singleline') | ForEach-Object { $_.Value })
$mapa = @{}; $novos = New-Object Collections.ArrayList
$abas = @{}
foreach ($n in 1..5) {
  $x = Ler-Entrada $zin "xl/worksheets/sheet$n.xml"
  $ini = $x.IndexOf('<sheetData>'); $fim = $x.IndexOf('</sheetData>')
  $antes = $x.Substring(0, $ini); $depois = $x.Substring($fim + '</sheetData>'.Length)
  $sb = New-Object Text.StringBuilder
  foreach ($m in [regex]::Matches($x.Substring($ini, $fim - $ini), '<row [^>]*?(?:/>|>.*?</row>)', 'Singleline')) {
    $rv = $m.Value; $r = [int][regex]::Match($rv, '<row r="(\d+)"').Groups[1].Value
    if ($n -gt 1 -and $r -gt 8) { break }
    $abre = [regex]::Match($rv, '^<row [^>]*?/?>').Value
    if ($abre.EndsWith('/>')) { [void]$sb.Append($abre); continue }
    $cels = foreach ($c in [regex]::Matches($rv, '<c [^>]*?(?:/>|>.*?</c>)', 'Singleline') | ForEach-Object { $_.Value }) {
      $col = [regex]::Match($c, '^<c r="([A-Z]+)').Groups[1].Value
      $dataTopo = ($n -eq 1 -and "$col$r" -eq 'A3') -or ($n -gt 1 -and $r -eq 3)
      if ($n -gt 1 -and $r -eq 8) { So-Estilo $c }
      elseif ($dataTopo) { So-Estilo $c }
      elseif ($c -match '<f[ >/]') { $c -replace '<v>[^<]*</v>', '' -replace '\s+t="(str|e)"', '' }
      elseif ($c -match '^<c [^>]*t="s"' -and $c -match '<v>(\d+)</v>') {
        $i = [int]$matches[1]
        if (-not $mapa.ContainsKey($i)) { $mapa[$i] = $novos.Count; [void]$novos.Add($sis[$i]) }
        $c -replace '<v>\d+</v>', "<v>$($mapa[$i])</v>"
      } elseif ($n -eq 1) { $c }
      else { So-Estilo $c }
    }
    [void]$sb.Append($abre + ($cels -join '') + '</row>')
  }
  $depois = $depois -replace '(<pageSetup[^>]*?)\s+r:id="[^"]*"', '$1'
  $antes = $antes -replace 'topLeftCell="A\d+" activePane', 'topLeftCell="A8" activePane' -replace '<selection pane="bottomLeft"[^>]*/>', '<selection pane="bottomLeft"/>' -replace '\s+tabSelected="1"', ''
  if ($n -eq 1) { $antes = $antes -replace '<sheetView ', '<sheetView tabSelected="1" ' }
  $abas["sheet$n"] = $antes + '<sheetData>' + $sb.ToString() + '</sheetData>' + $depois
}
$ssNovo = [regex]::Match($ssXml, '^.*?<sst [^>]*?>', 'Singleline').Value
$ssNovo = ($ssNovo -replace '\bcount="\d+"', "count=`"$($novos.Count)`"" -replace 'uniqueCount="\d+"', "uniqueCount=`"$($novos.Count)`"") + ($novos -join '') + '</sst>'

$arq = Join-Path $destino 'transportes.xlsx'
if (Test-Path $arq) { Remove-Item $arq }
$zout = [IO.Compression.ZipFile]::Open($arq, 'Create')
$escrever = { param($n, $t) $ne = $zout.CreateEntry($n, 'Optimal'); $w = New-Object IO.StreamWriter($ne.Open(), $utf8); $w.Write($t); $w.Close() }
foreach ($e in $zin.Entries) {
  $n = $e.FullName
  if ($n -match '^xl/(worksheets/sheet6\.xml|worksheets/_rels/sheet6|externalLinks/|printerSettings/|persons/|calcChain\.xml)|^customXml/|^docProps/') { continue }
  $t = Ler-Entrada $zin $n
  if ($n -match '^xl/worksheets/(sheet[1-5])\.xml$') { $t = $abas[$matches[1]] }
  elseif ($n -match '^xl/worksheets/_rels/') { $t = $t -replace '<Relationship [^>]*Target="[^"]*printerSettings/[^"]*"[^>]*/>', '' }
  elseif ($n -eq '[Content_Types].xml') { $t = $t -replace '<Override PartName="/(xl/worksheets/sheet6\.xml|xl/externalLinks/[^"]+|xl/persons/[^"]+|xl/calcChain\.xml|customXml/[^"]+|docProps/[^"]+)"[^>]*/>', '' }
  elseif ($n -eq '_rels/.rels') { $t = $t -replace '<Relationship [^>]*Target="docProps/[^"]*"[^>]*/>', '' }
  elseif ($n -eq 'xl/_rels/workbook.xml.rels') { $t = $t -replace '<Relationship [^>]*Target="[^"]*(worksheets/sheet6\.xml|externalLinks/|calcChain\.xml|persons/|customXml/)[^"]*"[^>]*/>', '' }
  elseif ($n -eq 'xl/workbook.xml') {
    $t = $t -replace '<mc:AlternateContent[^>]*><mc:Choice Requires="x15"><x15ac:absPath[^>]*/></mc:Choice></mc:AlternateContent>', ''
    $t = $t -replace '<sheet name="Planilha1"[^>]*/>', ''
    $t = [regex]::Replace($t, '<externalReferences>.*?</externalReferences>', '', 'Singleline')
    $t = [regex]::Replace($t, '<definedNames>.*?</definedNames>', '', 'Singleline')
    $t = $t -replace '<xr:revisionPtr [^>]*/>', '' -replace '(<workbookView [^>]*?)\s+activeTab="\d+"', '$1' -replace '(<workbookView [^>]*?)\s+firstSheet="\d+"', '$1'
  } elseif ($n -eq 'xl/sharedStrings.xml') { $t = $ssNovo }
  & $escrever $n $t
}
$zin.Dispose(); $zout.Dispose(); Remove-Item $tmp
"$arq : $((Get-Item $arq).Length) bytes"
"textos no modelo: " + (($novos | ForEach-Object { $_ -replace '<[^>]+>', '' }) -join ' | ')
