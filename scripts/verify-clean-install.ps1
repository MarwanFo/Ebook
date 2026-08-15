$cleanWorkspace = "C:\Users\Marwan\.gemini\antigravity-ide\brain\472916b6-e53f-4cda-821d-5a98acd7b374\scratch\clean-workspace"
if (Test-Path $cleanWorkspace) {
    Remove-Item $cleanWorkspace -Recurse -Force
}
New-Item -ItemType Directory -Path $cleanWorkspace -Force | Out-Null

Expand-Archive -Path "C:\Users\Marwan\.gemini\antigravity-ide\brain\472916b6-e53f-4cda-821d-5a98acd7b374\bookflow-phase1-source.zip" -DestinationPath $cleanWorkspace -Force

Write-Host "Verifying workspace files in $cleanWorkspace"
Get-ChildItem -Path $cleanWorkspace | Select-Object Name

Set-Location $cleanWorkspace

Write-Host "Running pnpm install --frozen-lockfile..."
pnpm install --frozen-lockfile

Write-Host "Running pnpm typecheck..."
pnpm typecheck

Write-Host "Running pnpm build..."
pnpm build

Write-Host "Clean workspace verification complete!"
