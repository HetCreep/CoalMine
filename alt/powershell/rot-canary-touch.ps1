# Code-Health Tier 1 (PostToolUse: Write|Edit|MultiEdit)
# Records touched code files for the session + flags unambiguous tripwires. Always non-blocking (exit 0).
$ErrorActionPreference = 'SilentlyContinue'

function Get-RcMode {
  # ~/.claude/.rot-canary-mode = auto|manual|off (absent = auto). .rot-canary-off = off (back-compat).
  $dir = Join-Path $env:USERPROFILE '.claude'
  if (Test-Path (Join-Path $dir '.rot-canary-off')) { return 'off' }
  $f = Join-Path $dir '.rot-canary-mode'
  if (Test-Path $f) { $v = ([System.IO.File]::ReadAllText($f)).Trim().ToLower(); if ('auto','manual','off' -contains $v) { return $v } }
  return 'auto'
}

# <coalmine-shared: ps-config> — synced from hooks/_shared/ps-config.ps1 by build-plugin; edit the partial, not this block
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
  # prototype keys dropped at merge for parity with the Node guard. NO safer-value-wins
  # guard (Node twin parity) — every hook-read key is Phoenix-13 side-effect-free, so a
  # project override has no safety choice to weaken.
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
# </coalmine-shared: ps-config>

try {
  $cfg = Load-CoalmineConfig
  if ($cfg) {
    $disabled = if ($null -ne $cfg.disabledCanaries) { $cfg.disabledCanaries } else { $cfg.disable } # legacy key honored
    # Node parity: force to an array. ConvertFrom-Json PRESERVES a single-element array,
    # but the if-expression assignment above enumerates a single-element Object[] into a
    # scalar String — so an old `-is [array]` guard dropped {"disabledCanaries":["rot-canary"]}
    # to @() and the kill-switch silently no-op'd. @($disabled) re-wraps a scalar (and $null) safely.
    $disabledArr = @($disabled)
    if ($disabledArr -contains 'rot-canary' -or $disabledArr -contains 'all') { exit 0 }
    $rcCfgMode = if ($null -ne $cfg.rotCanaryMode) { $cfg.rotCanaryMode } else { $cfg.mode } # legacy key honored
    if ('off' -eq $rcCfgMode) { exit 0 }
  }
  if ((Get-RcMode) -eq 'off') { exit 0 }

  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { exit 0 }
  # Strip a leading BOM some shells prepend when piping stdin.
  $raw = $raw.TrimStart([char]0xFEFF)
  $in = $raw | ConvertFrom-Json
  $f = $in.tool_input.file_path
  if (-not $f) { exit 0 }
  # Convert to an absolute normalized path so the stop hook can find the file
  # even when later runs use a different working directory.
  if (-not [System.IO.Path]::IsPathRooted($f)) { $f = Join-Path (Get-Location) $f }
  $f = [System.IO.Path]::GetFullPath($f)

  # watchedExtensions override
  $codeExt = @('.cs','.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.rs','.go','.java','.kt','.kts','.cpp','.cc','.cxx','.c','.h','.hpp','.rb','.php','.swift','.dart','.fs','.vb','.scala','.m','.mm')
  if ($cfg -and $cfg.watchedExtensions -and $cfg.watchedExtensions.Count -gt 0) {
    $codeExt = @(foreach ($x in $cfg.watchedExtensions) { if ($x.StartsWith('.')) { $x.ToLower() } else { '.' + $x.ToLower() } })
  }

  $ext = [System.IO.Path]::GetExtension($f).ToLower()
  if ($codeExt -notcontains $ext) { exit 0 }

  $sid = $in.session_id; if (-not (Test-ValidSessionId $sid)) { exit 0 }
  $base = Join-Path $env:TEMP "rot-canary-$sid"
  $touched = "$base.touched"
  $existing = @(); if ([System.IO.File]::Exists($touched)) { $existing = [System.IO.File]::ReadAllLines($touched) }
  # Node parity (hooks-safety §3): compare paths case-insensitively on Windows to avoid duplicate entries
  $fCmp = $f.ToLower(); $existingCmp = $existing | ForEach-Object { $_.ToLower() }
  if ($existingCmp -notcontains $fCmp) { [System.IO.File]::AppendAllText($touched, "$f`r`n") }

  if ([System.IO.File]::Exists($f)) {
    # Skip very large files based on tripwireMaxFileSizeKb
    $maxSizeKb = 100
    # Node parity (rot-canary-touch.js clamp): floor a raw 0/negative to >=1 so a bad
    # project value can't disable the size gate. A JSON number parses to int/long/double
    # (never NaN/Inf), so a type check is the finite check on PS 5.1.
    if ($cfg -and ($cfg.tripwireMaxFileSizeKb -is [int] -or $cfg.tripwireMaxFileSizeKb -is [long] -or $cfg.tripwireMaxFileSizeKb -is [double])) {
      $maxSizeKb = [Math]::Max(1, [Math]::Floor([double]$cfg.tripwireMaxFileSizeKb))
    }
    if ((Get-Item $f).Length -gt ($maxSizeKb * 1KB)) { exit 0 }

    $lines = [System.IO.File]::ReadAllLines($f)
    $n = $lines.Length
    $smells = @()
    # Node parity (hooks/rot-canary-touch.js, CHANGELOG 3.7.11): a real merge conflict always
    # has an angle-bracket opener/closer. A bare '=======' line is a common ASCII section banner
    # in source comments, so flag the '=======' divider only when a '<<<<<<< '/'>>>>>>> ' line
    # CO-OCCURS — never on a lone banner.
    $hasConflictBracket = $false
    foreach ($ln in $lines) { if ($ln -match '^(<<<<<<< |>>>>>>> )') { $hasConflictBracket = $true; break } }
    if ($hasConflictBracket) {
      foreach ($ln in $lines) { if ($ln -match '^(<<<<<<< |>>>>>>> |=======$)') { $smells += 'merge-conflict markers'; break } }
    }

    $maxLines = 800
    if ($cfg -and ($cfg.tripwireMaxLines -is [int] -or $cfg.tripwireMaxLines -is [long] -or $cfg.tripwireMaxLines -is [double])) {
      $maxLines = [Math]::Max(1, [Math]::Floor([double]$cfg.tripwireMaxLines))
    }
    if ($n -gt $maxLines) { $smells += "file >$maxLines lines ($n)" }

    if ($smells.Count) { [System.IO.File]::AppendAllText("$base.smells", ('{0}: {1}' -f $f, ($smells -join '; ')) + "`r`n") }
  }
} catch {}
exit 0
