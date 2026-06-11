# CoalMine pre-commit hook (Windows PowerShell)
# Exit on failure to prevent commit

$testFile = Join-Path $PSScriptRoot "..\scripts\lib\render.test.mjs"
if (Test-Path $testFile) {
  node --test $testFile
  if ($LASTEXITCODE -ne 0) {
    Write-Error "CoalMine unit tests failed. Commit aborted."
    exit 1
  }
}
$verifyScript = Join-Path $PSScriptRoot "..\scripts\verify.mjs"
if (Test-Path $verifyScript) {
  node $verifyScript
  if ($LASTEXITCODE -ne 0) {
    Write-Error "CoalMine verification failed. Commit aborted."
    exit 1
  }
}
exit 0
