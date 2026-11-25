# Gera os modelos da exportação do REPROG (docs/modelos/reprog_<NORTE|SUL>.xlsx) a partir das planilhas oficiais
# "CB NORTE - REPROGRAMAÇÃO.xlsx" e "CB SUL - REPROGRAMAÇÃO.xlsx": só a aba Resumo, com os mesmos estilos, tema, larguras,
# formatação condicional (farol) e configuração de página, SEM clientes e SEM nomes:
#   - ficam as linhas de título (1 e 2), uma linha-modelo do quadro por supervisor (sem código e sem nome), a linha do total,
#     o cabeçalho da lista e uma linha-modelo da lista (só os estilos);
#   - saem as abas ocultas (consulta e base), a consulta do Power Query, conexões, tabelas, impressoras, autor e calcChain;
#   - os textos que não ficam em nenhuma célula são apagados do sharedStrings (os índices continuam valendo).
# Uso: powershell -File code\tools\modelo_reprog.ps1 -Norte "<CB NORTE - REPROGRAMAÇÃO.xlsx>" -Sul "<CB SUL - REPROGRAMAÇÃO.xlsx>"
param([Parameter(Mandatory = $true)][string]$Norte, [Parameter(Mandatory = $true)][string]$Sul)
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
function Texto-Celula([string]$cel, $ss) {
  if ($cel -match 't="s"' -and $cel -match '<v>(\d+)</v>') { return $ss[[int]$matches[1]] }
  return $null
}
# Tira o valor e a fórmula de uma célula (fica r e s).
function So-Estilo([string]$cel) {
  $m = [regex]::Match($cel, '^<c ([^>]*?)(?:/>|>)')
  $a = ($m.Groups[1].Value -replace '\s*t="[^"]*"', '')
  return "<c $a/>"
}

foreach ($par in @(@('NORTE', $Norte), @('SUL', $Sul))) {
  $tmp = Join-Path $env:TEMP "modelo_rp_$($par[0]).xlsx"
  $in = [IO.File]::Open($par[1], 'Open', 'Read', 'ReadWrite'); $out = [IO.File]::Create($tmp); $in.CopyTo($out); $in.Close(); $out.Close()
  $zin = [IO.Compression.ZipFile]::OpenRead($tmp)
  $wb = Ler-Entrada $zin 'xl/workbook.xml'; $rels = Ler-Entrada $zin 'xl/_rels/workbook.xml.rels'
  $rid = [regex]::Match($wb, '<sheet name="Resumo"[^>]*r:id="(rId\d+)"').Groups[1].Value
  $alvo = [regex]::Match($rels, "<Relationship [^>]*Id=`"$rid`"[^>]*>").Value
  $alvo = 'xl/' + [regex]::Match($alvo, 'Target="([^"]+)"').Groups[1].Value.TrimStart('/').Replace('xl/', '')
  # sharedStrings (texto puro por índice) e a lista de <si> originais.
  $ssXml = Ler-Entrada $zin 'xl/sharedStrings.xml'
  $sis = [regex]::Matches($ssXml, '<si>.*?</si>', 'Singleline')
  $ss = @($sis | ForEach-Object { ([regex]::Matches($_.Value, '<t[^>]*>(.*?)</t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join '' })
  # Aba Resumo: escolhe as linhas-modelo.
  $x = Ler-Entrada $zin $alvo
  $ini = $x.IndexOf('<sheetData>'); $fim = $x.IndexOf('</sheetData>')
  $antes = $x.Substring(0, $ini); $depois = $x.Substring($fim + '</sheetData>'.Length)
  $rows = [regex]::Matches($x.Substring($ini, $fim - $ini), '<row [^>]*?(?:/>|>.*?</row>)', 'Singleline')
  $usados = New-Object 'System.Collections.Generic.HashSet[int]'
  $novas = @(); $sup = $false; $cab = $false; $dado = $false
  foreach ($row in $rows) {
    $rv = $row.Value; $r = [int][regex]::Match($rv, '<row r="(\d+)"').Groups[1].Value
    $cels = [regex]::Matches($rv, '<c [^>]*?(?:/>|>.*?</c>)', 'Singleline') | ForEach-Object { $_.Value }
    $textos = @($cels | ForEach-Object { Texto-Celula $_ $ss })
    $abre = [regex]::Match($rv, '^<row [^>]*?>').Value
    $ehCab = $textos -contains 'CÓD CLIENTE'
    $ehTotal = @($textos | Where-Object { $_ -match '^CB (NORTE|SUL)$' }).Count -gt 0
    $ehSup = -not $ehCab -and -not $ehTotal -and ($rv -match 'COUNTIF\(')
    if ($r -le 2) {
      foreach ($c in $cels) { if ($c -match 't="s"' -and $c -match '<v>(\d+)</v>') { [void]$usados.Add([int]$matches[1]) } }
      $novas += $rv
    } elseif ($ehSup -and -not $sup) {
      # Linha-modelo do quadro: estilos de A..G, sem código, nome nem fórmula (a exportação preenche).
      $sup = $true; $novas += $abre + (($cels | ForEach-Object { So-Estilo $_ }) -join '') + '</row>'
    } elseif ($ehTotal) {
      foreach ($c in $cels) { if ($c -match 't="s"' -and $c -match '<v>(\d+)</v>') { [void]$usados.Add([int]$matches[1]) } }
      $novas += $abre + (($cels | ForEach-Object { if ($_ -match 't="s"') { $_ } else { So-Estilo $_ } }) -join '') + '</row>'
    } elseif ($ehCab) {
      $cab = $true
      foreach ($c in $cels) { if ($c -match 't="s"' -and $c -match '<v>(\d+)</v>') { [void]$usados.Add([int]$matches[1]) } }
      $novas += $rv
    } elseif ($cab -and -not $dado) {
      $dado = $true; $novas += $abre + (($cels | ForEach-Object { So-Estilo $_ }) -join '') + '</row>'
    }
  }
  if (-not ($sup -and $cab -and $dado)) { throw "Não achei as linhas-modelo em $($par[1])" }
  $antes = $antes -replace '<dimension ref="[^"]*"/>', '<dimension ref="A1:J1"/>'
  $depois = $depois -replace '(<pageSetup[^>]*?)\s+r:id="[^"]*"', '$1'
  $sheet = $antes + '<sheetData>' + ($novas -join '') + '</sheetData>' + $depois
  $k = 0
  $ssNovo = [regex]::Replace($ssXml, '<si>.*?</si>', { param($m) $i = $script:k; $script:k++; if ($usados.Contains($i)) { $m.Value } else { '<si><t></t></si>' } }, 'Singleline')

  $arq = Join-Path $destino "reprog_$($par[0]).xlsx"
  if (Test-Path $arq) { Remove-Item $arq }
  $zout = [IO.Compression.ZipFile]::Open($arq, 'Create')
  $escrever = { param($n, $t) $ne = $zout.CreateEntry($n, 'Optimal'); $w = New-Object IO.StreamWriter($ne.Open(), $utf8); $w.Write($t); $w.Close() }
  foreach ($e in $zin.Entries) {
    $n = $e.FullName
    if ($n -match '^xl/(worksheets/|tables/|queryTables/|printerSettings/|persons/|connections\.xml|calcChain\.xml)|^customXml/|^docProps/') { continue }
    $t = Ler-Entrada $zin $n
    if ($n -eq '[Content_Types].xml') {
      $t = $t -replace '<Override PartName="/(xl/worksheets/[^"]+|xl/tables/[^"]+|xl/queryTables/[^"]+|xl/persons/[^"]+|xl/connections\.xml|xl/calcChain\.xml|customXml/[^"]+|docProps/[^"]+)"[^>]*/>', ''
      $t = $t -replace '</Types>', '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
    } elseif ($n -eq '_rels/.rels') {
      $t = $t -replace '<Relationship [^>]*Target="docProps/[^"]*"[^>]*/>', ''
    } elseif ($n -eq 'xl/_rels/workbook.xml.rels') {
      $t = $t -replace '<Relationship [^>]*Target="[^"]*(worksheets/|connections\.xml|calcChain\.xml|persons/|customXml/)[^"]*"[^>]*/>', ''
      $t = $t -replace '</Relationships>', '<Relationship Id="rIdRP1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
    } elseif ($n -eq 'xl/workbook.xml') {
      $t = $t -replace '<mc:AlternateContent[^>]*><mc:Choice Requires="x15"><x15ac:absPath[^>]*/></mc:Choice></mc:AlternateContent>', ''
      $t = [regex]::Replace($t, '<sheets>.*?</sheets>', '<sheets><sheet name="Resumo" sheetId="1" r:id="rIdRP1"/></sheets>', 'Singleline')
      $t = [regex]::Replace($t, '<definedNames>.*?</definedNames>', '', 'Singleline')
      $t = $t -replace '<bookViews><workbookView ([^>]*?)activeTab="\d+"', '<bookViews><workbookView $1'
    } elseif ($n -eq 'xl/sharedStrings.xml') {
      $t = $ssNovo
    }
    & $escrever $n $t
  }
  & $escrever 'xl/worksheets/sheet1.xml' $sheet
  $zin.Dispose(); $zout.Dispose(); Remove-Item $tmp
  "$arq : $((Get-Item $arq).Length) bytes"
}
