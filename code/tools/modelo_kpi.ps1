# Gera o modelo da exportação do KPI (docs/modelos/kpi.xlsx) a partir da planilha oficial
# "KPI Distribuição e Logística - <Mês>.xlsx": só a aba LOGÍSTICA E DISTRIBUIÇÃO, com os mesmos estilos, tema, larguras,
# mesclagens, colunas ocultas (Kardex), formatação condicional e configuração de página, SEM os números:
#   - as células com número ou fórmula ficam só com o estilo (a exportação preenche);
#   - os textos (títulos, BASE/META/ACM, nomes das unidades) e os "-" ficam como estão;
#   - saem a aba oculta "Montagem das cargas", os links externos, impressoras, autor e calcChain.
# Uso: powershell -File code\tools\modelo_kpi.ps1 -Kpi "<KPI Distribuição e Logística - Novembro.xlsx>"
param([Parameter(Mandatory = $true)][string]$Kpi)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$destino = Join-Path $raiz 'docs\modelos'
New-Item -ItemType Directory -Force $destino | Out-Null
$utf8 = New-Object Text.UTF8Encoding($false)

function Ler-Entrada($zip, [string]$n) {
  $e = $zip.GetEntry($n); if (-not $e) { return $null }
  $r = New-Object IO.StreamReader($e.Open(), $utf8); $t = $r.ReadToEnd(); $r.Close(); return $t
}

$tmp = Join-Path $env:TEMP 'modelo_kpi_origem.xlsx'
$in = [IO.File]::Open($Kpi, 'Open', 'Read', 'ReadWrite'); $out = [IO.File]::Create($tmp); $in.CopyTo($out); $in.Close(); $out.Close()
$zin = [IO.Compression.ZipFile]::OpenRead($tmp)
$wb = Ler-Entrada $zin 'xl/workbook.xml'; $rels = Ler-Entrada $zin 'xl/_rels/workbook.xml.rels'
$rid = [regex]::Match($wb, '<sheet name="LOGÍSTICA E DISTRIBUIÇÃO"[^>]*r:id="(rId\d+)"').Groups[1].Value
if (-not $rid) { throw 'Não achei a aba LOGÍSTICA E DISTRIBUIÇÃO.' }
$alvo = [regex]::Match($rels, "<Relationship [^>]*Id=`"$rid`"[^>]*>").Value
$alvo = 'xl/' + [regex]::Match($alvo, 'Target="([^"]+)"').Groups[1].Value.TrimStart('/').Replace('xl/', '')
$x = Ler-Entrada $zin $alvo
# Células com número ou fórmula: fica <c r s/>. Texto (t="s") fica.
$x = [regex]::Replace($x, '<c ([^>]*?)(?:/>|>(.*?)</c>)', {
  param($m)
  $a = $m.Groups[1].Value
  if ($a -match '\bt="s"') { return $m.Value }
  $a = ($a -replace '\s*t="[^"]*"', '')
  return "<c $a/>"
}, 'Singleline')
$x = $x -replace '(<pageSetup[^>]*?)\s+r:id="[^"]*"', '$1'
$x = $x -replace '<sheetView ([^>]*?)tabSelected="1"', '<sheetView $1tabSelected="1"'

$arq = Join-Path $destino 'kpi.xlsx'
if (Test-Path $arq) { Remove-Item $arq }
$zout = [IO.Compression.ZipFile]::Open($arq, 'Create')
$escrever = { param($n, $t) $ne = $zout.CreateEntry($n, 'Optimal'); $w = New-Object IO.StreamWriter($ne.Open(), $utf8); $w.Write($t); $w.Close() }
foreach ($e in $zin.Entries) {
  $n = $e.FullName
  if ($n -match '^xl/(worksheets/|externalLinks/|printerSettings/|persons/|connections\.xml|calcChain\.xml)|^customXml/|^docProps/') { continue }
  $t = Ler-Entrada $zin $n
  if ($n -eq '[Content_Types].xml') {
    $t = $t -replace '<Override PartName="/(xl/worksheets/[^"]+|xl/externalLinks/[^"]+|xl/persons/[^"]+|xl/connections\.xml|xl/calcChain\.xml|customXml/[^"]+|docProps/[^"]+)"[^>]*/>', ''
    $t = $t -replace '<Default Extension="bin"[^>]*/>', ''
    $t = $t -replace '</Types>', '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
  } elseif ($n -eq '_rels/.rels') {
    $t = $t -replace '<Relationship [^>]*Target="docProps/[^"]*"[^>]*/>', ''
  } elseif ($n -eq 'xl/_rels/workbook.xml.rels') {
    $t = $t -replace '<Relationship [^>]*Target="[^"]*(worksheets/|externalLinks/|connections\.xml|calcChain\.xml|persons/|customXml/)[^"]*"[^>]*/>', ''
    $t = $t -replace '</Relationships>', '<Relationship Id="rIdKPI1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
  } elseif ($n -eq 'xl/workbook.xml') {
    $t = $t -replace '<mc:AlternateContent[^>]*><mc:Choice Requires="x15"><x15ac:absPath[^>]*/></mc:Choice></mc:AlternateContent>', ''
    $t = [regex]::Replace($t, '<sheets>.*?</sheets>', '<sheets><sheet name="LOGÍSTICA E DISTRIBUIÇÃO" sheetId="1" r:id="rIdKPI1"/></sheets>', 'Singleline')
    $t = [regex]::Replace($t, '<externalReferences>.*?</externalReferences>', '', 'Singleline')
    $t = [regex]::Replace($t, '<definedNames>.*?</definedNames>', '<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">''LOGÍSTICA E DISTRIBUIÇÃO''!$A$1:$T$35</definedName></definedNames>', 'Singleline')
    $t = $t -replace '<bookViews><workbookView ([^>]*?)activeTab="\d+"', '<bookViews><workbookView $1'
    $t = $t -replace '<fileSharing[^>]*/>', ''
  }
  & $escrever $n $t
}
& $escrever 'xl/worksheets/sheet1.xml' $x
$zin.Dispose(); $zout.Dispose(); Remove-Item $tmp
"$arq : $((Get-Item $arq).Length) bytes"
