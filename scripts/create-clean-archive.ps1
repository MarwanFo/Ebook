$archivePath = "C:\Users\Marwan\.gemini\antigravity-ide\brain\472916b6-e53f-4cda-821d-5a98acd7b374\bookflow-phase1-source.zip"
$stageDir = "C:\Users\Marwan\.gemini\antigravity-ide\brain\472916b6-e53f-4cda-821d-5a98acd7b374\scratch\stage-archive"

if (Test-Path $stageDir) {
    Remove-Item $stageDir -Recurse -Force
}
if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
}

New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

$srcRoot = Get-Location

Get-ChildItem -Path $srcRoot -Recurse -File | Where-Object {
    $_.FullName -notmatch "\\node_modules(\\|$)" -and
    $_.FullName -notmatch "\\dist(\\|$)" -and
    $_.FullName -notmatch "\\coverage(\\|$)" -and
    $_.FullName -notmatch "\\\.git(\\|$)" -and
    $_.FullName -notmatch "\\scratch(\\|$)" -and
    $_.Name -ne ".env" -and
    $_.Name -ne ".env.local"
} | ForEach-Object {
    $relPath = $_.FullName.Substring($srcRoot.Path.Length + 1)
    $destFile = Join-Path $stageDir $relPath
    $destDir = Split-Path $destFile -Parent
    if (!(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -Path $_.FullName -Destination $destFile -Force
}

# Compress the staged directory with exact folder structure
Compress-Archive -Path "$stageDir\*" -DestinationPath $archivePath -CompressionLevel Optimal
Write-Host "Created archive with full directory hierarchy at: $archivePath"
Remove-Item $stageDir -Recurse -Force
