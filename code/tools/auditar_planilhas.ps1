<#
.SYNOPSIS
  Inventário somente-leitura das planilhas dos acompanhamentos e das amostras de relatórios-fonte.

.DESCRIPTION
  Abre cada .xlsx/.xlsm como zip (modo compartilhado, nunca grava), lista abas, estado
  (visível/oculta), dimensão, linha de cabeçalho provável, links externos, conexões
  (Power Query/ODBC) e presença de VBA. Para .txt lê a primeira linha não vazia.
  .xls (BIFF8) e .xlsb só entram na lista de arquivos (o Hub lê .xls em code/hub/xls.py).

  Saídas (em -Saida):
    arquivos.csv   um registro por arquivo (todas as datas)
    inventario.csv um registro por aba (arquivos alterados desde -Desde, ou na raiz da pasta)
    amostras.csv   um registro por aba/arquivo das amostras em -Amostras

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File code\tools\auditar_planilhas.ps1 `
    -Raiz "Z:\OPERACIONAL\Logistica e Dist\Informações Logisticas" `
    -Amostras "$env:USERPROFILE\Downloads\Relatorios fonte" -Saida AUDITORIA
#>
param(
  [string]$Raiz = 'Z:\OPERACIONAL\Logistica e Dist\Informações Logisticas',
  [string]$Amostras = "$env:USERPROFILE\Downloads\Relatorios fonte",
  [string]$Saida = 'AUDITORIA',
  [datetime]$Desde = '2026-06-01'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

$Pastas = @(
  'Analise da quilometragem planejada', 'Cargas em aberto', "Fill rate Insuficiencia - CB's Norte e Sul",
  'Imagens Frota', 'KPI Distribuição e Logística', 'Montadores', 'Montagem de Cargas',
  "Perdas de Estoque - DL's", 'PES - Resultados comerciais e logisticos\PED - Logistica', 'REPROG',
  'Retorno por motivo', 'Transportes - 1x1'
)
$NsRel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function Read-ZipText($zip, [string]$nome) {
  $e = $zip.GetEntry($nome)
  if (-not $e) { return $null }
  $r = New-Object IO.StreamReader($e.Open())
  try { $r.ReadToEnd() } finally { $r.Close() }
}

function Get-Strings($zip) {
  $lista = New-Object System.Collections.Generic.List[string]
  $e = $zip.GetEntry('xl/sharedStrings.xml')
  if (-not $e) { return $lista }
  $xr = [Xml.XmlReader]::Create($e.Open())
  $atual = $null
  while ($xr.Read()) {
    if ($xr.NodeType -eq 'Element' -and $xr.LocalName -eq 'si') { $atual = New-Object Text.StringBuilder }
    elseif ($xr.NodeType -eq 'Element' -and $xr.LocalName -eq 't' -and $xr.Depth -le 3) {
      [void]$atual.Append($xr.ReadElementContentAsString())
      # ReadElementContentAsString já avançou: se parou no </si>, fecha aqui (o próximo Read() pularia o nó)
      if ($xr.NodeType -eq 'EndElement' -and $xr.LocalName -eq 'si') { $lista.Add($atual.ToString()) }
    }
    elseif ($xr.NodeType -eq 'EndElement' -and $xr.LocalName -eq 'si') { $lista.Add($atual.ToString()) }
  }
  $xr.Close()
  $lista
}

# Lê as primeiras $max linhas de uma aba e devolve a dimensão e a linha com mais textos (cabeçalho provável).
function Get-SheetHead($zip, [string]$parte, $strings, [int]$max = 15) {
  $e = $zip.GetEntry($parte)
  $res = [ordered]@{ dim = ''; linha = ''; cab = ''; textos = 0 }
  if (-not $e) { return $res }
  $xr = [Xml.XmlReader]::Create($e.Open())
  $linhas = 0; $cells = $null; $rowN = ''; $t = ''
  $fecha = {
    if ($null -ne $cells -and $cells.Count -gt $res.textos) { $res.textos = $cells.Count; $res.linha = $rowN; $res.cab = ($cells -join ' | ') }
  }
  while ($xr.Read()) {
    if ($xr.NodeType -ne 'Element') { continue }
    switch ($xr.LocalName) {
      'dimension' { $res.dim = $xr.GetAttribute('ref') }
      'row' { & $fecha; $linhas++; if ($linhas -gt $max) { $cells = $null; break }; $cells = New-Object System.Collections.Generic.List[string]; $rowN = $xr.GetAttribute('r') }
      'c' { $t = $xr.GetAttribute('t') }
      'v' { $v = $xr.ReadElementContentAsString(); if ($null -ne $cells) { $s = if ($t -eq 's') { $strings[[int]$v].Trim() } elseif ($t -eq 'str') { $v.Trim() } else { '' }; if ($s) { $cells.Add($s) } } }   # 'str' = texto gravado direto (exports web, ex.: Easy Pallet)
      't' { if ($null -ne $cells) { $s = $xr.ReadElementContentAsString().Trim(); if ($s) { $cells.Add($s) } } }   # só existe dentro de <is> (texto inline)
    }
    if ($linhas -gt $max) { break }
  }
  & $fecha
  $xr.Close()
  $res
}

function Get-Workbook([IO.FileInfo]$arq) {
  $fs = [IO.File]::Open($arq.FullName, 'Open', 'Read', 'ReadWrite')
  $zip = New-Object IO.Compression.ZipArchive -ArgumentList $fs, ([IO.Compression.ZipArchiveMode]::Read)
  try {
    $strings = Get-Strings $zip
    [xml]$wb = Read-ZipText $zip 'xl/workbook.xml'
    [xml]$rels = Read-ZipText $zip 'xl/_rels/workbook.xml.rels'
    $mapa = @{}; foreach ($r in $rels.Relationships.Relationship) { $mapa[$r.Id] = $r.Target }
    $links = @()
    foreach ($x in ($zip.Entries | Where-Object FullName -like 'xl/externalLinks/_rels/*')) {
      [xml]$xr = Read-ZipText $zip $x.FullName
      foreach ($rr in $xr.Relationships.Relationship) { $links += [uri]::UnescapeDataString($rr.Target) }
    }
    $conns = @()
    $c = Read-ZipText $zip 'xl/connections.xml'
    if ($c) { [xml]$cx = $c; foreach ($cn in $cx.connections.connection) {
      $tipo = if ([string]$cn.dbPr.connection -match 'Mashup') { 'PowerQuery' } elseif ($cn.dbPr) { 'ODBC/OLEDB' } else { 'outra' }
      $conns += "$($cn.name) [$tipo]" } }
    $vba = [bool]$zip.GetEntry('xl/vbaProject.bin')
    $abas = foreach ($s in $wb.workbook.sheets.sheet) {
      $alvo = $mapa[$s.GetAttribute('id', $NsRel)]
      $parte = 'xl/' + ($alvo -replace '^/?xl/', '')
      $h = Get-SheetHead $zip $parte $strings
      [pscustomobject]@{ aba = $s.name; estado = $(if ($s.state) { $s.state } else { 'visible' }); dim = $h.dim; linha = $h.linha; cab = $h.cab }
    }
    [pscustomobject]@{ abas = $abas; links = ($links | Select-Object -Unique) -join ' ; '; conns = $conns -join ' ; '; vba = $vba }
  } finally { $zip.Dispose(); $fs.Close() }
}

function Get-TxtHead([IO.FileInfo]$arq) {
  $enc = [Text.Encoding]::GetEncoding(1252)
  $linhas = [IO.File]::ReadLines($arq.FullName, $enc) | Select-Object -First 15
  $cab = $linhas | Where-Object { $_ -match '[A-Za-z]{3}' -and $_ -notmatch '^\s*\d' } | Select-Object -First 1   # primeira linha de texto que não começa com número
  [pscustomobject]@{ abas = @([pscustomobject]@{ aba = '(txt)'; estado = ''; dim = ''; linha = ''; cab = (($cab -split '\t|\s{2,}') | Where-Object { $_.Trim() }) -join ' | ' }); links = ''; conns = ''; vba = $false }
}

function Add-Rows($lista, [string]$grupo, [IO.FileInfo]$arq, [string]$base, $info) {
  foreach ($a in $info.abas) {
    $lista.Add([pscustomobject]@{
      acompanhamento = $grupo; arquivo = $arq.Name; relativo = $arq.FullName.Substring($base.Length).TrimStart('\')
      modificado = $arq.LastWriteTime.ToString('yyyy-MM-dd'); tamanho_kb = [math]::Round($arq.Length / 1KB)
      aba = $a.aba; estado = $a.estado; dimensao = $a.dim; linha_cabecalho = $a.linha
      cabecalho = $(if ($a.cab.Length -gt 1500) { $a.cab.Substring(0, 1500) } else { $a.cab })
      links_externos = $info.links; conexoes = $info.conns; vba = $info.vba })
  }
}

New-Item -ItemType Directory -Force -Path $Saida | Out-Null
$arquivos = New-Object System.Collections.Generic.List[object]
$inventario = New-Object System.Collections.Generic.List[object]

foreach ($p in $Pastas) {
  $dir = Join-Path $Raiz $p
  if (-not (Test-Path -LiteralPath $dir)) { Write-Warning "Pasta não encontrada: $dir"; continue }
  $todos = Get-ChildItem -LiteralPath $dir -Recurse -File -Force | Where-Object { $_.Name -notlike '~$*' -and $_.Name -ne 'Thumbs.db' }
  foreach ($f in $todos) {
    $arquivos.Add([pscustomobject]@{ acompanhamento = $p; relativo = $f.FullName.Substring($dir.Length).TrimStart('\'); extensao = $f.Extension.ToLower(); modificado = $f.LastWriteTime.ToString('yyyy-MM-dd'); tamanho_kb = [math]::Round($f.Length / 1KB); na_raiz = ($f.DirectoryName -eq $dir) })
  }
  if ($p -eq 'Imagens Frota') { continue }   # só fotos e consolidados; o site já existe
  $alvos = $todos | Where-Object { $_.Extension -match '^\.(xlsx|xlsm|txt)$' -and ($_.LastWriteTime -ge $Desde -or $_.DirectoryName -eq $dir) }
  foreach ($f in $alvos) {
    Write-Host "  $p\$($f.Name)"
    try {
      $info = if ($f.Extension -eq '.txt') { Get-TxtHead $f } else { Get-Workbook $f }
      Add-Rows $inventario $p $f $dir $info
    } catch { Write-Warning "Falhou: $($f.FullName): $_" }
  }
}

$linhasAmostras = New-Object System.Collections.Generic.List[object]
if (Test-Path -LiteralPath $Amostras) {
  foreach ($f in Get-ChildItem -LiteralPath $Amostras -File) {
    if ($f.Extension -match '^\.(xlsx|xlsm)$') { $info = Get-Workbook $f }
    elseif ($f.Extension -eq '.txt') { $info = Get-TxtHead $f }
    else { $info = [pscustomobject]@{ abas = @([pscustomobject]@{ aba = '(xls/BIFF: ler com code/hub/xls.py)'; estado = ''; dim = ''; linha = ''; cab = '' }); links = ''; conns = ''; vba = $false } }
    Add-Rows $linhasAmostras 'Relatorios fonte' $f $Amostras $info
  }
}

$arquivos | Export-Csv -Path (Join-Path $Saida 'arquivos.csv') -NoTypeInformation -Encoding UTF8 -Delimiter ';'
$inventario | Export-Csv -Path (Join-Path $Saida 'inventario.csv') -NoTypeInformation -Encoding UTF8 -Delimiter ';'
$linhasAmostras | Export-Csv -Path (Join-Path $Saida 'amostras.csv') -NoTypeInformation -Encoding UTF8 -Delimiter ';'
"arquivos: $($arquivos.Count) | abas inventariadas: $($inventario.Count) | abas de amostras: $($linhasAmostras.Count)"
