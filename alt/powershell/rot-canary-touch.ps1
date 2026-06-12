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
  if ($cfg) {
    if ($cfg.disabledCanaries -contains 'rot-canary' -or $cfg.disabledCanaries -contains 'all') { exit 0 }
    if ('off' -eq $cfg.rotCanaryMode) { exit 0 }
  }
  if ((Get-RcMode) -eq 'off') { exit 0 }

  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { exit 0 }
  $in = $raw | ConvertFrom-Json
  $f = $in.tool_input.file_path
  if (-not $f) { exit 0 }

  # watchedExtensions override
  $codeExt = @('.cs','.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.rs','.go','.java','.kt','.kts','.cpp','.cc','.cxx','.c','.h','.hpp','.rb','.php','.swift','.dart','.fs','.vb','.scala','.m','.mm')
  if ($cfg -and $cfg.watchedExtensions -and $cfg.watchedExtensions.Count -gt 0) {
    $codeExt = @(foreach ($x in $cfg.watchedExtensions) { if ($x.StartsWith('.')) { $x.ToLower() } else { '.' + $x.ToLower() } })
  }

  $ext = [System.IO.Path]::GetExtension($f).ToLower()
  if ($codeExt -notcontains $ext) { exit 0 }

  $sid = $in.session_id; if (-not $sid) { exit 0 }
  $base = Join-Path $env:TEMP "rot-canary-$sid"
  $touched = "$base.touched"
  $existing = @(); if ([System.IO.File]::Exists($touched)) { $existing = [System.IO.File]::ReadAllLines($touched) }
  if ($existing -notcontains $f) { [System.IO.File]::AppendAllText($touched, "$f`r`n") }

  if ([System.IO.File]::Exists($f)) {
    # Skip very large files based on tripwireMaxFileSizeKb
    $maxSizeKb = 100
    if ($cfg -and $cfg.tripwireMaxFileSizeKb -ne $null) { $maxSizeKb = $cfg.tripwireMaxFileSizeKb }
    if ((Get-Item $f).Length -gt ($maxSizeKb * 1KB)) { exit 0 }

    $lines = [System.IO.File]::ReadAllLines($f)
    $n = $lines.Length
    $smells = @()
    foreach ($ln in $lines) { if ($ln -match '^(<<<<<<< |>>>>>>> |=======$)') { $smells += 'merge-conflict markers'; break } }

    $maxLines = 800
    if ($cfg -and $cfg.tripwireMaxLines -ne $null) { $maxLines = $cfg.tripwireMaxLines }
    if ($n -gt $maxLines) { $smells += "file >$maxLines lines ($n)" }

    if ($smells.Count) { [System.IO.File]::AppendAllText("$base.smells", ('{0}: {1}' -f $f, ($smells -join '; ')) + "`r`n") }
  }
} catch {}
exit 0
