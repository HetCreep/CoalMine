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

function Load-CoalmineConfig {
  $p = Join-Path (Find-GitRoot) '.coalmine.json'
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
# </coalmine-shared: ps-config>

try {
  $cfg = Load-CoalmineConfig
  if ($cfg) {
    $disabled = if ($null -ne $cfg.disabledCanaries) { $cfg.disabledCanaries } else { $cfg.disable } # legacy key honored
    if ($disabled -contains 'rot-canary' -or $disabled -contains 'all') { exit 0 }
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
