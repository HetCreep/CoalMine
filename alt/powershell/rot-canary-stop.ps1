# Code-Health Tier 2 (Stop)
# At a natural stop, if code was edited this session, nudge the agent to run /rot-canary QUICK
# on the touched files. Loop-guarded (stop_hook_active), one-shot per edit-batch, kill-switchable.
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

function Load-CoalmineConfig {
  $p = Join-Path (Find-GitRoot) '.coalmine.json'
  if (-not (Test-Path $p)) { return $null }
  try {
    $rawJson = [System.IO.File]::ReadAllText($p)
    $cleanJson = Remove-JsoncComments $rawJson
    return $cleanJson | ConvertFrom-Json
  } catch {
    return $null
  }
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
  $staleDays = 7
  if ($cfg) {
    $disabled = if ($null -ne $cfg.disabledCanaries) { $cfg.disabledCanaries } else { $cfg.disable } # legacy key honored
    # Node parity: force to an array. ConvertFrom-Json PRESERVES a single-element array,
    # but the if-expression assignment above enumerates a single-element Object[] into a
    # scalar String — so an old `-is [array]` guard dropped {"disabledCanaries":["rot-canary"]}
    # to @() and the kill-switch silently no-op'd. @($disabled) re-wraps a scalar (and $null) safely.
    $disabledArr = @($disabled)
    if ($disabledArr -contains 'rot-canary' -or $disabledArr -contains 'all') { exit 0 }
    $rcCfgMode = if ($null -ne $cfg.rotCanaryMode) { $cfg.rotCanaryMode } else { $cfg.mode } # legacy key honored
    if ($rcCfgMode -eq 'off' -or $rcCfgMode -eq 'manual') { exit 0 }
    if ($null -ne $cfg.tempSweepStaleDays) { $staleDays = $cfg.tempSweepStaleDays }
  }
  if ((Get-RcMode) -ne 'auto') { exit 0 }

  # Phoenix #1 (zero garbage) + #8 (deterministic): sweep stale rot-canary temp files
  # (legacy rotcanary-* prefix too), throttled to once per 24h by a marker file's
  # timestamp - no randomness. The 0-byte marker is the machine-level gate itself.
  $marker = Join-Path $env:TEMP 'rot-canary-sweep.marker'
  $doSweep = $true
  if ([System.IO.File]::Exists($marker)) {
    if ([System.IO.File]::GetLastWriteTimeUtc($marker) -gt [DateTime]::UtcNow.AddHours(-24)) { $doSweep = $false }
  }
  if ($doSweep) {
    [System.IO.File]::WriteAllText($marker, '')
    Get-ChildItem (Join-Path $env:TEMP 'rot-canary-*'), (Join-Path $env:TEMP 'rotcanary-*') -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -ne 'rot-canary-sweep.marker' -and $_.LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-$staleDays) } |
      Remove-Item -Force -ErrorAction SilentlyContinue
  }

  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { exit 0 }
  # Strip a leading BOM some shells prepend when piping stdin.
  $raw = $raw.TrimStart([char]0xFEFF)
  $in = $raw | ConvertFrom-Json
  if ($in.stop_hook_active) { exit 0 }
  $sid = $in.session_id; if (-not (Test-ValidSessionId $sid)) { exit 0 }
  $base = Join-Path $env:TEMP "rot-canary-$sid"
  $touched = "$base.touched"
  if (-not [System.IO.File]::Exists($touched)) { exit 0 }
  $scanned = "$base.scanned"
  $touchedTicks = [System.IO.File]::GetLastWriteTimeUtc($touched).Ticks
  if ([System.IO.File]::Exists($scanned)) {
    # Marker stores the .touched ticks captured at nudge time
    $stored = 0L
    $rawMark = ([System.IO.File]::ReadAllText($scanned)).Trim()
    if ($rawMark -match '^\d+$') { $stored = [long]$rawMark }
    if ($touchedTicks -le $stored) {
      # Batch already acknowledged on a previous stop — state no longer needed.
      foreach ($f in @($touched, "$base.smells", $scanned)) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
      exit 0
    }
  }
  $files = [System.IO.File]::ReadAllLines($touched) | Where-Object { $_ -and [System.IO.File]::Exists($_) } | Sort-Object -Unique
  if (-not $files) { exit 0 }

  # autoScanFileCap and autoScanFileCapSlice implementation.
  # Clamp at read time to a positive integer (Node≡PS parity) — the schema bound
  # (min:1) is enforced only by verify.mjs, never at hook read time. Without this,
  # {0} emits an empty-list nudge and {-1}/non-int makes Select-Object -First throw.
  $fileCap = 10
  $fileCapSlice = 5
  if ($cfg) {
    if ($cfg.autoScanFileCap -ne $null) { $fileCap = [Math]::Max(1, [int][Math]::Floor([double]$cfg.autoScanFileCap)) }
    if ($cfg.autoScanFileCapSlice -ne $null) { $fileCapSlice = [Math]::Max(1, [int][Math]::Floor([double]$cfg.autoScanFileCapSlice)) }
  }

  $capNotice = ''
  if ($files.Count -gt $fileCap) {
    # Sort by last write time (newest first)
    $files = $files | Sort-Object { (Get-Item $_).LastWriteTimeUtc } -Descending
    $files = $files | Select-Object -First $fileCapSlice
    $capNotice = "`n`n(Auto-scan capped at $fileCapSlice files to prevent token leakage; remaining files can be scanned manually)"
  } else {
    $files = $files | Sort-Object
  }

  $smellText = ''
  if ([System.IO.File]::Exists("$base.smells")) {
    $sm = [System.IO.File]::ReadAllLines("$base.smells") | Where-Object { $_ } | Sort-Object -Unique
    if ($sm) { $smellText = "`nTripwires flagged at edit time:`n" + ($sm -join "`n") }
  }
  # Acknowledgement marker — stores the .touched ticks captured at nudge time.
  [System.IO.File]::WriteAllText($scanned, [string]$touchedTicks)
  $list = ($files | ForEach-Object { "  - $_" }) -join "`n"
  $reason = "Code-health auto-check (session end): code files were edited this session. Before stopping, invoke the rot-canary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:`n$list$smellText$capNotice`n`nReport CONFIRMED findings only (severity table; one line if none). If findings exist and a user is present, end by offering the fix menu via your question tool - never fix without a chosen option. (Disable: create ~/.claude/.rot-canary-off)"
  $out = @{ decision = 'block'; reason = $reason } | ConvertTo-Json -Compress
  Write-Output $out
  exit 0
} catch { exit 0 }
