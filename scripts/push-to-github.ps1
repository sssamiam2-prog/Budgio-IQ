# Run after creating an EMPTY repo on GitHub (no README).
# Usage:
#   .\scripts\push-to-github.ps1 https://github.com/YOUR_USER/YOUR_REPO.git
param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl
)

Set-Location $PSScriptRoot\..
if (-not (Test-Path .git)) {
  Write-Error "Not a git repository."
  exit 1
}

git remote remove origin 2>$null
git remote add origin $RepoUrl
Write-Host "Pushing branch main to origin..."
git push -u origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host "Done. Next: Cloudflare Pages -> Connect to Git -> pick this repo. Root: web, Output: dist"
}
