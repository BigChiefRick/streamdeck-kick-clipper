$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$extensionRoot = (Resolve-Path (Join-Path $projectRoot 'companion-extension')).Path
$distRoot = Join-Path $projectRoot 'dist'
$archivePath = Join-Path $distRoot 'kick-clip-creator-companion.zip'

if (-not $extensionRoot.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Companion extension resolved outside the project root.'
}

New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
}

Compress-Archive -Path (Join-Path $extensionRoot '*') -DestinationPath $archivePath -CompressionLevel Optimal
Write-Output "Packed $archivePath"
