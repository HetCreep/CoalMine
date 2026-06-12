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
  if ((Get-ProjectOverride) -eq 'off') { exit 0 }
  if ((Get-RcMode) -eq 'off') { exit 0 }
  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { exit 0 }
  $in = $raw | ConvertFrom-Json
  $f = $in.tool_input.file_path
  if (-not $f) { exit 0 }
  $ext = [System.IO.Path]::GetExtension($f).ToLower()
  $codeExt = @('.cs','.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.rs','.go','.java','.kt','.kts','.cpp','.cc','.cxx','.c','.h','.hpp','.rb','.php','.swift','.dart','.fs','.vb','.scala','.m','.mm')
  if ($codeExt -notcontains $ext) { exit 0 }
  $sid = $in.session_id; if (-not $sid) { exit 0 }
  $base = Join-Path $env:TEMP "rot-canary-$sid"
  $touched = "$base.touched"
  $existing = @(); if ([System.IO.File]::Exists($touched)) { $existing = [System.IO.File]::ReadAllLines($touched) }
  if ($existing -notcontains $f) { [System.IO.File]::AppendAllText($touched, "$f`r`n") }
  if ([System.IO.File]::Exists($f)) {
    # Skip very large files to stay inside the latency budget (Phoenix #3).
    if ((Get-Item $f).Length -gt 1MB) { exit 0 }
    $lines = [System.IO.File]::ReadAllLines($f)
    $n = $lines.Length
    $smells = @()
    foreach ($ln in $lines) { if ($ln -match '^(<<<<<<< |>>>>>>> |=======$)') { $smells += 'merge-conflict markers'; break } }
    if ($n -gt 800) { $smells += "file >800 lines ($n)" }
    if ($smells.Count) { [System.IO.File]::AppendAllText("$base.smells", ('{0}: {1}' -f $f, ($smells -join '; ')) + "`r`n") }
  }
} catch {}
exit 0
