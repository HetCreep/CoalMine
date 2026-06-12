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

function Load-CoalmineConfig {
  $p = Join-Path (Get-Location) '.coalmine.json'
  if (-not (Test-Path $p)) { return $null }
  try {
    $rawJson = [System.IO.File]::ReadAllText($p)
    # Strip comments
    $cleanJson = $rawJson -replace '(?m)^\s*//.*$', '' -replace '(?s)/\*.*?\*/', ''
    return $cleanJson | ConvertFrom-Json
  } catch {
    return $null
  }
}

try {
  $cfg = Load-CoalmineConfig
  $staleDays = 7
  if ($cfg) {
    if ($cfg.disabledCanaries -contains 'rot-canary' -or $cfg.disabledCanaries -contains 'all') { exit 0 }
    if ($cfg.rotCanaryMode -eq 'off' -or $cfg.rotCanaryMode -eq 'manual') { exit 0 }
    if ($cfg.tempSweepStaleDays -ne $null) { $staleDays = $cfg.tempSweepStaleDays }
  }
  if ((Get-RcMode) -ne 'auto') { exit 0 }

  # Phoenix #1 (zero garbage): sweep rot-canary-* temp files older than configured days
  Get-ChildItem (Join-Path $env:TEMP 'rot-canary-*') -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-$staleDays) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { exit 0 }
  $in = $raw | ConvertFrom-Json
  if ($in.stop_hook_active) { exit 0 }
  $sid = $in.session_id; if (-not $sid) { exit 0 }
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

  # autoScanFileCap and autoScanFileCapSlice implementation
  $fileCap = 10
  $fileCapSlice = 5
  if ($cfg) {
    if ($cfg.autoScanFileCap -ne $null) { $fileCap = $cfg.autoScanFileCap }
    if ($cfg.autoScanFileCapSlice -ne $null) { $fileCapSlice = $cfg.autoScanFileCapSlice }
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
  $reason = "Code-health auto-check (session end): code files were edited this session. Before stopping, invoke the rot-canary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:`n$list$smellText$capNotice`n`nThe skill has the full procedure. Report CONFIRMED findings only as a severity table; if nothing material, say so in one line. If findings exist and the user is present, finish by offering the fix menu via your question tool - never fix without a chosen option. (To disable this auto-check: create ~/.claude/.rot-canary-off)"
  $out = @{ decision = 'block'; reason = $reason } | ConvertTo-Json -Compress
  Write-Output $out
  exit 0
} catch { exit 0 }
