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
function Get-ProjectOverride {
  # Per-project calibration: .coalmine.json may disable this canary or override mode.
  $p = Join-Path (Get-Location) '.coalmine.json'
  if (Test-Path $p) {
    $cfg = Get-Content $p -Raw | ConvertFrom-Json
    if ($cfg.disabledCanaries -contains 'rot-canary') { return 'off' }
    if ('off','manual' -contains $cfg.rotCanaryMode) { return $cfg.rotCanaryMode }
  }
  return $null
}
try {
  # Phoenix #1 (zero garbage): sweep rot-canary-* temp files older than 7 days
  # left behind by sessions that never reached a second stop (crash/kill).
  Get-ChildItem (Join-Path $env:TEMP 'rot-canary-*') -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-7) } |
    Remove-Item -Force -ErrorAction SilentlyContinue
  $ov = Get-ProjectOverride
  if ($ov -eq 'off' -or $ov -eq 'manual') { exit 0 }
  if ((Get-RcMode) -ne 'auto') { exit 0 }
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
    # Marker stores the .touched ticks captured at nudge time (parity with the
    # Node hook). Unknown/legacy content -> 0 so the batch re-nudges, never swallowed.
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
  $smellText = ''
  if ([System.IO.File]::Exists("$base.smells")) {
    $sm = [System.IO.File]::ReadAllLines("$base.smells") | Where-Object { $_ } | Sort-Object -Unique
    if ($sm) { $smellText = "`nTripwires flagged at edit time:`n" + ($sm -join "`n") }
  }
  # Acknowledgement marker — stores the .touched ticks captured at nudge time.
  [System.IO.File]::WriteAllText($scanned, [string]$touchedTicks)
  $list = ($files | ForEach-Object { "  - $_" }) -join "`n"
  $reason = "Code-health auto-check (session end): code files were edited this session. Before stopping, invoke the rot-canary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:`n$list$smellText`n`nThe skill has the full procedure. Report CONFIRMED findings only as a severity table; if nothing material, say so in one line. If findings exist and the user is present, finish by offering the fix menu via your question tool - never fix without a chosen option. (To disable this auto-check: create ~/.claude/.rot-canary-off)"
  $out = @{ decision = 'block'; reason = $reason } | ConvertTo-Json -Compress
  Write-Output $out
  exit 0
} catch { exit 0 }
