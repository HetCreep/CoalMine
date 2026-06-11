# Code-Health Tier 2 (Stop)
# At a natural stop, if code was edited this session, nudge the agent to run /rotcanary QUICK
# on the touched files. Loop-guarded (stop_hook_active), one-shot per edit-batch, kill-switchable.
$ErrorActionPreference = 'SilentlyContinue'
function Get-RcMode {
  # ~/.claude/.rotcanary-mode = auto|manual|off (absent = auto). .rotcanary-off = off (back-compat).
  $dir = Join-Path $env:USERPROFILE '.claude'
  if (Test-Path (Join-Path $dir '.rotcanary-off')) { return 'off' }
  $f = Join-Path $dir '.rotcanary-mode'
  if (Test-Path $f) { $v = ([System.IO.File]::ReadAllText($f)).Trim().ToLower(); if ('auto','manual','off' -contains $v) { return $v } }
  return 'auto'
}
try {
  # Phoenix #1 (zero garbage): sweep rotcanary-* temp files older than 7 days
  # left behind by sessions that never reached a second stop (crash/kill).
  Get-ChildItem (Join-Path $env:TEMP 'rotcanary-*') -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTimeUtc -lt [DateTime]::UtcNow.AddDays(-7) } |
    Remove-Item -Force -ErrorAction SilentlyContinue
  if ((Get-RcMode) -ne 'auto') { exit 0 }
  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { exit 0 }
  $in = $raw | ConvertFrom-Json
  if ($in.stop_hook_active) { exit 0 }
  $sid = $in.session_id; if (-not $sid) { exit 0 }
  $base = Join-Path $env:TEMP "rotcanary-$sid"
  $touched = "$base.touched"
  if (-not [System.IO.File]::Exists($touched)) { exit 0 }
  $scanned = "$base.scanned"
  if ([System.IO.File]::Exists($scanned)) {
    if ([System.IO.File]::GetLastWriteTimeUtc($touched) -le [System.IO.File]::GetLastWriteTimeUtc($scanned)) {
      # Batch already acknowledged on a previous stop — state no longer needed.
      foreach ($f in @($touched, "$base.smells", $scanned)) { Remove-Item $f -Force -ErrorAction SilentlyContinue }
      exit 0
    }
  }
  $files = [System.IO.File]::ReadAllLines($touched) | Where-Object { $_ } | Sort-Object -Unique
  if (-not $files) { exit 0 }
  $smellText = ''
  if ([System.IO.File]::Exists("$base.smells")) {
    $sm = [System.IO.File]::ReadAllLines("$base.smells") | Where-Object { $_ } | Sort-Object -Unique
    if ($sm) { $smellText = "`nTripwires flagged at edit time:`n" + ($sm -join "`n") }
  }
  [System.IO.File]::WriteAllText($scanned, [string]([DateTime]::UtcNow.Ticks))
  $list = ($files | ForEach-Object { "  - $_" }) -join "`n"
  $reason = "Code-health auto-check (session end): code files were edited this session. Before stopping, invoke the rotcanary skill at DEPTH=QUICK with SCOPE = these touched files + their direct callers:`n$list$smellText`n`nThe skill has the full procedure. Report CONFIRMED findings only as a severity table; if nothing material, say so in one line. Do not fix unless asked. (To disable this auto-check: create ~/.claude/.rotcanary-off)"
  $out = @{ decision = 'block'; reason = $reason } | ConvertTo-Json -Compress
  Write-Output $out
  exit 0
} catch { exit 0 }
