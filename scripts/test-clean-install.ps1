$cleanDir = "C:\Users\Marwan\.gemini\antigravity-ide\brain\472916b6-e53f-4cda-821d-5a98acd7b374\scratch\clean-test"
if (Test-Path $cleanDir) {
    Remove-Item $cleanDir -Recurse -Force
}
New-Item -ItemType Directory -Path $cleanDir -Force | Out-Null
Expand-Archive -Path "C:\Users\Marwan\.gemini\antigravity-ide\brain\472916b6-e53f-4cda-821d-5a98acd7b374\bookflow-phase1-source.zip" -DestinationPath $cleanDir

Write-Host "Verifying no node_modules exists before clean install..."
$existingModules = Test-Path "$cleanDir\node_modules"
Write-Host "node_modules exists: $existingModules"

Set-Location $cleanDir
Write-Host "Executing: pnpm install --frozen-lockfile in $cleanDir"
pnpm install --frozen-lockfile

Write-Host "Clean install completed successfully."
