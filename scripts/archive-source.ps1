
$destination = "C:\Users\Marwan\.gemini\antigravity-ide\brain\472916b6-e53f-4cda-821d-5a98acd7b374\bookflow-phase1-source.zip"
if (Test-Path $destination) {
    Remove-Item $destination -Force
}

$files = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $_.FullName -notmatch "node_modules" -and
    $_.FullName -notmatch "\\dist\\" -and
    $_.FullName -notmatch "\\dist$" -and
    $_.FullName -notmatch "\\coverage\\" -and
    $_.FullName -notmatch "\\coverage$" -and
    $_.FullName -notmatch "\\\.git\\" -and
    $_.FullName -notmatch "\\\.git$" -and
    $_.Name -ne ".env" -and
    $_.Name -ne ".env.local"
}

Write-Host "Found $($files.Count) source files to archive."
Compress-Archive -Path $files.FullName -DestinationPath $destination -CompressionLevel Optimal
Write-Host "Created archive: $destination"
