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
  # SAFER-VALUE-WINS GUARD (corrected 2026-07-09 — the old blanket "no guard
  # needed" verdict was HALF-WRONG): `updateMode` IS read by a hook (the Node
  # conductor) and drives a real consent escalation (an 'auto' check spends
  # tokens + networks unsolicited) — an untrusted project config must not flip
  # an explicit global 'off' up to 'auto'. Guarded below (Node≡PS parity),
  # mirroring CoalWash's mergeSafety. `autoFixMode` is the one true exception:
  # read by the AGENT from the raw file, never by any hook via this merge, so a
  # hook-side guard for IT would protect nothing — that half of the old verdict
  # stands.
  # TWO DEFECTS CLOSED (board #112, 2026-08-13, Node≡PS parity with `47b25bc`):
  # (1) `if (-not $globalCfg) { return $projectCfg }` returned the RAW project
  # config with ZERO merge/clamp applied — worse than the Node original, since
  # not even the shallow-merge loop ran. Both early returns removed; the merge
  # now always runs, and an absent global reads as the SAFER_ENUM key's schema
  # default, never "return project raw" or "anything goes". (2) `[array]::IndexOf`
  # on .NET strings is ordinal (case-sensitive) — the same case-fold hole as the
  # Node CW-H5 shape, letting a project 'AUTO' miss the lookup and ride the
  # earlier shallow-merge unclamped. Both sides are now lowercased before the
  # lookup.
  $globalCfg = Read-CoalmineConfigFile (Join-Path (Join-Path $env:USERPROFILE '.claude') '.coalmine.json')
  $projectCfg = Read-CoalmineConfigFile (Join-Path (Find-GitRoot) '.coalmine.json')
  if (-not $globalCfg -and -not $projectCfg) { return $null }
  $merged = [ordered]@{}
  foreach ($src in @($globalCfg, $projectCfg)) {
    if (-not $src) { continue }
    foreach ($prop in $src.PSObject.Properties) {
      if ($prop.Name -in @('__proto__', 'constructor', 'prototype')) { continue }
      $merged[$prop.Name] = $prop.Value
    }
  }
  # Constrain whenever the PROJECT sets the key — an absent global is its
  # schema default, never "no preference to defend" (board #112). Case-fold
  # both sides before the ordered lookup so a differently-cased project value
  # cannot dodge the clamp.
  $saferEnum = @{ updateMode = @{ order = @('off', 'remind', 'ask', 'auto'); default = 'ask' } } # index 0 = safest; default = config-schema.mjs's declared factory default
  foreach ($key in $saferEnum.Keys) {
    if ($null -eq $projectCfg -or $null -eq $projectCfg.$key) { continue } # project didn't touch this key
    $order = $saferEnum[$key].order
    $globalValue = if ($null -ne $globalCfg -and $null -ne $globalCfg.$key) { $globalCfg.$key } else { $saferEnum[$key].default }
    $gi = [array]::IndexOf($order, ([string]$globalValue).ToLower())
    $pi = [array]::IndexOf($order, ([string]$projectCfg.$key).ToLower())
    if ($gi -eq -1 -or $pi -eq -1) { continue } # unknown value: leave the shallow-merge result
    $merged[$key] = if ($pi -le $gi) { $projectCfg.$key } else { $globalValue } # project may not be LOUDER than the (explicit-or-default) global
  }
  return [PSCustomObject]$merged
}

function Test-ValidSessionId {
  # Phoenix #10 (sandbox): allowlist session_id — a traversal-shaped sid (e.g. ..\..\x)
  # must not escape $env:TEMP via Join-Path. Non-conforming -> fail-silent (Phoenix #4).
  param([string]$Sid)
  return ($Sid -and $Sid -match '^[A-Za-z0-9_-]+$')
}
