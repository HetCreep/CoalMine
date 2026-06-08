# CoalMine pre-push hook (Windows PowerShell)
# Exit on failure to prevent push

$verifyScript = Join-Path $PSScriptRoot "..\scripts\verify.mjs"
if (Test-Path $verifyScript) {
  node $verifyScript
  if ($LASTEXITCODE -ne 0) {
    Write-Error "CoalMine verification failed. Push aborted."
    exit 1
  }
}
exit 0
