# Code-Health Tier 2 (Stop)
# At a natural stop, if code was edited this session, nudge the agent to run /rotcanary QUICK
# on the touched files. Loop-guarded (stop_hook_active), one-shot per edit-batch, kill-switchable.
$ErrorActionPreference = 'SilentlyContinue'
try {
  if ([System.IO.File]::Exists("$env:USERPROFILE\.claude\.rotcanary-off")) { exit 0 }
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
    if ([System.IO.File]::GetLastWriteTimeUtc($touched) -le [System.IO.File]::GetLastWriteTimeUtc($scanned)) { exit 0 }
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
