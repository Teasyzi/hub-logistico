# Gera o modelo da exportacao de Cargas em aberto (docs/modelos/cargas.xlsx) a partir da planilha oficial
# "Acompanhamento de Cargas em aberto.xlsx": mesmos estilos, tema, larguras, coluna oculta e formatacao condicional, SEM
# clientes: ficam os titulos (linhas 1 a 5), a linha 6 como linha-modelo da lista (so estilos) e o quadro "carga em aberto
# mais antiga" (I5:L8, rotulos). Saem impressora, autor, calcChain e nomes definidos; textos sem celula sao apagados.
# Uso: powershell -File code\tools\modelo_cargas.ps1 -Planilha "<Acompanhamento de Cargas em aberto.xlsx>"
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

$tmp = Join-Path $env:TEMP 'modelo_cargas.xlsx'
$in = [IO.File]::Open($Planilha, 'Open', 'Read', 'ReadWrite'); $out = [IO.File]::Create($tmp); $in.CopyTo($out); $in.Close(); $out.Close()
$zin = [IO.Compression.ZipFile]::OpenRead($tmp)
$ssXml = Ler-Entrada $zin 'xl/sharedStrings.xml'
$usados = New-Object 'System.Collections.Generic.HashSet[int]'
$x = Ler-Entrada $zin 'xl/worksheets/sheet1.xml'
$ini = $x.IndexOf('<sheetData>'); $fim = $x.IndexOf('</sheetData>')
$antes = $x.Substring(0, $ini); $depois = $x.Substring($fim + '</sheetData>'.Length)
$linhas = [regex]::Matches($x.Substring($ini, [Math]::Min($fim - $ini, 20000)), '<row [^>]*?(?:/>|>.*?</row>)', 'Singleline')
$sb = New-Object Text.StringBuilder
foreach ($m in $linhas) {
  $rv = $m.Value; $r = [int][regex]::Match($rv, '<row r="(\d+)"').Groups[1].Value
  if ($r -gt 8) { break }
  $abre = [regex]::Match($rv, '^<row [^>]*?>').Value
  $cels = foreach ($c in [regex]::Matches($rv, '<c [^>]*?(?:/>|>.*?</c>)', 'Singleline') | ForEach-Object { $_.Value }) {
    $col = [regex]::Match($c, '^<c r="([A-Z]+)').Groups[1].Value
    # Rotulos fixos: titulos e cabecalho (linhas 1 a 5) e a coluna I do quadro lateral.
    if ($c -match '^<c [^>]*t="s"' -and $c -match '<v>(\d+)</v>' -and ($r -le 5 -or $col -eq 'I')) { [void]$usados.Add([int]$matches[1]); $c } else { So-Estilo $c }
  }
  [void]$sb.Append($abre + ($cels -join '') + '</row>')
}
$antes = $antes -replace '<dimension ref="[^"]*"/>', '<dimension ref="A1:L8"/>'
$depois = $depois -replace '(<pageSetup[^>]*?)\s+r:id="[^"]*"', '$1'
$sheet = $antes + '<sheetData>' + $sb.ToString() + '</sheetData>' + $depois

# So os textos usados: o sharedStrings e remontado (a planilha tem milhares de clientes) e os indices sao trocados.
$sis = @([regex]::Matches($ssXml, '<si>.*?</si>', 'Singleline') | ForEach-Object { $_.Value })
$mapa = @{}; $novos = @()
foreach ($i in ($usados | Sort-Object)) { $mapa[$i] = $novos.Count; $novos += $sis[$i] }
$sheet = [regex]::Replace($sheet, '(<c [^>]*t="s"[^>]*><v>)(\d+)(</v>)', { param($m) $m.Groups[1].Value + $mapa[[int]$m.Groups[2].Value] + $m.Groups[3].Value })
$ssNovo = [regex]::Match($ssXml, '^.*?<sst [^>]*?>', 'Singleline').Value
$ssNovo = ($ssNovo -replace '\bcount="\d+"', "count=`"$($novos.Count)`"" -replace 'uniqueCount="\d+"', "uniqueCount=`"$($novos.Count)`"") + ($novos -join '') + '</sst>'

$arq = Join-Path $destino 'cargas.xlsx'
if (Test-Path $arq) { Remove-Item $arq }
$zout = [IO.Compression.ZipFile]::Open($arq, 'Create')
$escrever = { param($n, $t) $ne = $zout.CreateEntry($n, 'Optimal'); $w = New-Object IO.StreamWriter($ne.Open(), $utf8); $w.Write($t); $w.Close() }
foreach ($e in $zin.Entries) {
  $n = $e.FullName
  if ($n -match '^xl/(worksheets/|printerSettings/|persons/|calcChain\.xml)|^customXml/|^docProps/') { continue }
  $t = Ler-Entrada $zin $n
  if ($n -eq '[Content_Types].xml') { $t = $t -replace '<Override PartName="/(xl/persons/[^"]+|xl/calcChain\.xml|customXml/[^"]+|docProps/[^"]+)"[^>]*/>', '' }
  elseif ($n -eq '_rels/.rels') { $t = $t -replace '<Relationship [^>]*Target="docProps/[^"]*"[^>]*/>', '' }
  elseif ($n -eq 'xl/_rels/workbook.xml.rels') { $t = $t -replace '<Relationship [^>]*Target="[^"]*(calcChain\.xml|persons/|customXml/)[^"]*"[^>]*/>', '' }
  elseif ($n -eq 'xl/workbook.xml') {
    $t = $t -replace '<mc:AlternateContent[^>]*><mc:Choice Requires="x15"><x15ac:absPath[^>]*/></mc:Choice></mc:AlternateContent>', ''
    $t = [regex]::Replace($t, '<definedNames>.*?</definedNames>', '', 'Singleline')
    $t = $t -replace '<xr:revisionPtr [^>]*/>', ''
  } elseif ($n -eq 'xl/sharedStrings.xml') { $t = $ssNovo }
  & $escrever $n $t
}
& $escrever 'xl/worksheets/sheet1.xml' $sheet
$zin.Dispose(); $zout.Dispose(); Remove-Item $tmp
"$arq : $((Get-Item $arq).Length) bytes"
"textos no modelo: " + (($novos | ForEach-Object { $_ -replace '<[^>]+>', '' }) -join ' | ')
