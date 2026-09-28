$ErrorActionPreference = 'Stop'
$uwcRoot = $PSScriptRoot
$uwcPublish = Join-Path $uwcRoot 'dist'
$uwcPublishAssets = Join-Path $uwcPublish 'assets'
New-Item -ItemType Directory -Path $uwcPublishAssets -Force | Out-Null
$uwcFiles = @('index.html', 'styles.css', 'enhancements.css', 'readability.css', 'app.js', 'catalogue.js', 'icons.js', 'pdf.js')
foreach ($uwcFile in $uwcFiles) {
    Copy-Item -LiteralPath (Join-Path $uwcRoot $uwcFile) -Destination (Join-Path $uwcPublish $uwcFile) -Force
}
$uwcHtml = Get-Content -LiteralPath (Join-Path $uwcRoot 'index.html') -Raw
$uwcAssetPaths = [regex]::Matches($uwcHtml, '(?:src|href)="(assets/[^"?#]+)"') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
foreach ($uwcAssetPath in $uwcAssetPaths) {
    $uwcAssetSource = Join-Path $uwcRoot $uwcAssetPath
    if (-not (Test-Path -LiteralPath $uwcAssetSource -PathType Leaf)) { throw "Missing website asset: $uwcAssetPath" }
    Copy-Item -LiteralPath $uwcAssetSource -Destination (Join-Path $uwcPublish $uwcAssetPath) -Force
}
Write-Output "Prepared $($uwcFiles.Count) website files and $($uwcAssetPaths.Count) referenced assets in $uwcPublish"
