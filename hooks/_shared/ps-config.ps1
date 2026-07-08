function Find-GitRoot {
  $dir = (Get-Location).Path
  while ($true) {
    if (Test-Path (Join-Path $dir '.git')) { return $dir }
    $parent = Split-Path $dir -Parent
    if (-not $parent -or $parent -eq $dir) { return (Get-Location).Path }
    $dir = $parent
  }
}

function Remove-JsoncComments {
  # Port of Node stripJsonc: strips // and /* */ comments OUTSIDE strings only.
  # The regex alternation matches either a quoted string (consuming \" or any non-quote/non-backslash
  # char, so a value ending in \\ terminates the string correctly instead of leaking escape state)
  # or a // line comment, or a /* */ block comment — comments outside strings become empty string.
  param([string]$Text)
  $result = [System.Text.StringBuilder]::new($Text.Length)
  $i = 0
  $len = $Text.Length
  while ($i -lt $len) {
    $c = $Text[$i]
    if ($c -eq '"') {
      # consume string literal, preserving content
      $null = $result.Append($c); $i++
      while ($i -lt $len) {
        $sc = $Text[$i]
        $null = $result.Append($sc); $i++
        if ($sc -eq '\' -and $i -lt $len) { $null = $result.Append($Text[$i]); $i++ }  # escaped char
        elseif ($sc -eq '"') { break }
      }
    } elseif ($c -eq '/' -and ($i + 1) -lt $len -and $Text[$i + 1] -eq '/') {
      # // line comment — skip to end of line
      while ($i -lt $len -and $Text[$i] -ne "`n") { $i++ }
    } elseif ($c -eq '/' -and ($i + 1) -lt $len -and $Text[$i + 1] -eq '*') {
      # /* */ block comment — skip to */
      $i += 2
      while ($i -lt $len -and -not ($Text[$i] -eq '*' -and ($i + 1) -lt $len -and $Text[$i + 1] -eq '/')) { $i++ }
      if ($i -lt $len) { $i += 2 }
    } else {
      $null = $result.Append($c); $i++
    }
  }
  return $result.ToString()
}

function Read-CoalmineConfigFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $null }
  try {
    $rawJson = [System.IO.File]::ReadAllText($Path)
    $cleanJson = Remove-JsoncComments $rawJson
    $parsed = $cleanJson | ConvertFrom-Json
    if ($parsed -is [PSCustomObject]) { return $parsed }
    return $null
  } catch {
    return $null
  }
}

function Load-CoalmineConfig {
  # Two-level (Node twin parity): global ~/.claude/.coalmine.json overlaid per key
  # by the project <gitroot>/.coalmine.json (project wins). __proto__/constructor/
  # prototype keys dropped at merge for parity with the Node guard.
  $globalCfg = Read-CoalmineConfigFile (Join-Path (Join-Path $env:USERPROFILE '.claude') '.coalmine.json')
  $projectCfg = Read-CoalmineConfigFile (Join-Path (Find-GitRoot) '.coalmine.json')
  if (-not $globalCfg) { return $projectCfg }
  if (-not $projectCfg) { return $globalCfg }
  $merged = [ordered]@{}
  foreach ($src in @($globalCfg, $projectCfg)) {
    foreach ($prop in $src.PSObject.Properties) {
      if ($prop.Name -in @('__proto__', 'constructor', 'prototype')) { continue }
      $merged[$prop.Name] = $prop.Value
    }
  }
  return [PSCustomObject]$merged
}

function Test-ValidSessionId {
  # Phoenix #10 (sandbox): allowlist session_id — a traversal-shaped sid (e.g. ..\..\x)
  # must not escape $env:TEMP via Join-Path. Non-conforming -> fail-silent (Phoenix #4).
  param([string]$Sid)
  return ($Sid -and $Sid -match '^[A-Za-z0-9_-]+$')
}
