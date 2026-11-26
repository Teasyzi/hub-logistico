# Gera os modelos da exportacao de Perdas (docs/modelos/perdas_<CBAR|CCRT>.xlsx) a partir das planilhas oficiais
# "... Perdas de Estoque - Barreiras.xlsx" e "... - Juazeiro.xlsx": so a aba Resumo, com os mesmos estilos, tema,
# larguras, mesclas e formatacao condicional (setas), SEM dados:
#   - ficam os rotulos (titulos, categorias, cabecalhos e blocos de CX UNIT) e uma linha-modelo de produto (so estilos);
#   - saem as abas ocultas (Relatorio, Inventario, base), valores, formulas, nomes definidos, impressoras, autor e calcChain;
#   - os textos que nao ficam em nenhuma celula sao apagados do sharedStrings (os indices continuam valendo).
# Uso: powershell -File code\tools\modelo_perdas.ps1 -Barreiras "<planilha>" -Juazeiro "<planilha>"
# (Arquivo sem acentos de proposito: o PowerShell 5.1 le .ps1 sem BOM como ANSI.)
param([Parameter(Mandatory = $true)][string]$Barreiras, [Parameter(Mandatory = $true)][string]$Juazeiro)
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
# Tira o valor e a formula de uma celula (ficam r e s).
function So-Estilo([string]$cel) {
  $a = [regex]::Match($cel, '^<c ([^>]*?)(?:/>|>)').Groups[1].Value -replace '\s*t="[^"]*"', ''
  return "<c $a/>"
}

foreach ($par in @(@('CBAR', $Barreiras), @('CCRT', $Juazeiro))) {
  $tmp = Join-Path $env:TEMP "modelo_perdas_$($par[0]).xlsx"
  $in = [IO.File]::Open($par[1], 'Open', 'Read', 'ReadWrite'); $out = [IO.File]::Create($tmp); $in.CopyTo($out); $in.Close(); $out.Close()
  $zin = [IO.Compression.ZipFile]::OpenRead($tmp)
  $wb = Ler-Entrada $zin 'xl/workbook.xml'; $rels = Ler-Entrada $zin 'xl/_rels/workbook.xml.rels'
  $rid = [regex]::Match($wb, '<sheet name="Resumo"[^>]*r:id="(rId\d+)"').Groups[1].Value
  $alvo = [regex]::Match($rels, "<Relationship [^>]*Id=`"$rid`"[^>]*>").Value
  $alvo = 'xl/' + [regex]::Match($alvo, 'Target="([^"]+)"').Groups[1].Value.TrimStart('/').Replace('xl/', '')
  $ssXml = Ler-Entrada $zin 'xl/sharedStrings.xml'
  $ss = @([regex]::Matches($ssXml, '<si>.*?</si>', 'Singleline') | ForEach-Object { ([regex]::Matches($_.Value, '<t[^>]*>(.*?)</t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join '' })
  $x = Ler-Entrada $zin $alvo
  $ini = $x.IndexOf('<sheetData>'); $fim = $x.IndexOf('</sheetData>')
  $antes = $x.Substring(0, $ini); $depois = $x.Substring($fim + '</sheetData>'.Length)
  $rows = [regex]::Matches($x.Substring($ini, $fim - $ini), '<row [^>]*?(?:/>|>.*?</row>)', 'Singleline')
  $usados = New-Object 'System.Collections.Generic.HashSet[int]'
  $novas = New-Object Text.StringBuilder
  $cab = 0
  foreach ($row in $rows) {
    $rv = $row.Value; $r = [int][regex]::Match($rv, '<row r="(\d+)"').Groups[1].Value
    if ($rv.EndsWith('/>') -and -not $rv.Contains('</row>')) { [void]$novas.Append($rv); continue }
    $abre = [regex]::Match($rv, '^<row [^>]*?>').Value
    $cels = @([regex]::Matches($rv, '<c [^>]*?(?:/>|>.*?</c>)', 'Singleline') | ForEach-Object { $_.Value })
    $modeloProduto = $cab -gt 0
    $saida = foreach ($c in $cels) {
      $col = [regex]::Match($c, '^<c r="([A-Z]+)').Groups[1].Value
      # Rotulo = texto fixo nas colunas dos titulos, categorias, cabecalhos e blocos (A3 e a data: a exportacao escreve).
      if (-not $modeloProduto -and $c -match '^<c [^>]*t="s"' -and $c -match '<v>(\d+)</v>' -and "$col$r" -ne 'A3') {
        $i = [int]$matches[1]; [void]$usados.Add($i)
        if ($col -eq 'B' -and $ss[$i] -eq 'CATEGORIA') { $temB = $true }
        if ($temB -and $col -eq 'C' -and $ss[$i] -eq 'PRODUTO') { $cab = $r }
        $c
      } else { So-Estilo $c }
    }
    [void]$novas.Append($abre + ($saida -join '') + '</row>')
    if ($modeloProduto) { break }
  }
  $temB = $false
  if ($cab -eq 0) { throw "Nao achei o cabecalho de produtos em $($par[1])" }
  $depois = $depois -replace '(<pageSetup[^>]*?)\s+r:id="[^"]*"', '$1'
  $sheet = $antes + '<sheetData>' + $novas.ToString() + '</sheetData>' + $depois
  $script:k = 0
  $ssNovo = [regex]::Replace($ssXml, '<si>.*?</si>', { param($m) $i = $script:k; $script:k++; if ($usados.Contains($i)) { $m.Value } else { '<si><t></t></si>' } }, 'Singleline')

  $arq = Join-Path $destino "perdas_$($par[0]).xlsx"
  if (Test-Path $arq) { Remove-Item $arq }
  $zout = [IO.Compression.ZipFile]::Open($arq, 'Create')
  $escrever = { param($n, $t) $ne = $zout.CreateEntry($n, 'Optimal'); $w = New-Object IO.StreamWriter($ne.Open(), $utf8); $w.Write($t); $w.Close() }
  foreach ($e in $zin.Entries) {
    $n = $e.FullName
    if ($n -match '^xl/(worksheets/|printerSettings/|persons/|calcChain\.xml)|^customXml/|^docProps/') { continue }
    $t = Ler-Entrada $zin $n
    if ($n -eq '[Content_Types].xml') {
      $t = $t -replace '<Override PartName="/(xl/worksheets/[^"]+|xl/persons/[^"]+|xl/calcChain\.xml|customXml/[^"]+|docProps/[^"]+)"[^>]*/>', ''
      $t = $t -replace '</Types>', '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
    } elseif ($n -eq '_rels/.rels') {
      $t = $t -replace '<Relationship [^>]*Target="docProps/[^"]*"[^>]*/>', ''
    } elseif ($n -eq 'xl/_rels/workbook.xml.rels') {
      $t = $t -replace '<Relationship [^>]*Target="[^"]*(worksheets/|calcChain\.xml|persons/|customXml/)[^"]*"[^>]*/>', ''
      $t = $t -replace '</Relationships>', '<Relationship Id="rIdPD1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    } elseif ($n -eq 'xl/workbook.xml') {
      $t = $t -replace '<mc:AlternateContent[^>]*><mc:Choice Requires="x15"><x15ac:absPath[^>]*/></mc:Choice></mc:AlternateContent>', ''
      $t = [regex]::Replace($t, '<sheets>.*?</sheets>', '<sheets><sheet name="Resumo" sheetId="1" r:id="rIdPD1"/></sheets>', 'Singleline')
      $t = [regex]::Replace($t, '<definedNames>.*?</definedNames>', '', 'Singleline')
      $t = $t -replace '<xr:revisionPtr [^>]*/>', ''
    } elseif ($n -eq 'xl/sharedStrings.xml') {
      $t = $ssNovo
    }
    & $escrever $n $t
  }
  & $escrever 'xl/worksheets/sheet1.xml' $sheet
  $zin.Dispose(); $zout.Dispose(); Remove-Item $tmp
  "$arq : $((Get-Item $arq).Length) bytes, cabecalho de produtos na linha $cab"
  "textos no modelo: " + (($usados | Sort-Object | ForEach-Object { $ss[$_] }) -join ' | ')
}
