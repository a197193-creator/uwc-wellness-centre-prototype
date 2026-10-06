$ErrorActionPreference = 'Stop'
$uwcRoot = $PSScriptRoot
$uwcPublish = Join-Path $uwcRoot 'dist'
$uwcPublishAssets = Join-Path $uwcPublish 'assets'
New-Item -ItemType Directory -Path $uwcPublishAssets -Force | Out-Null
$uwcFiles = @('index.html', 'styles.css', 'enhancements.css', 'readability.css', 'app.js', 'catalogue.js', 'icons.js', 'pdf.js', 'demo.css', 'demo-config.js', 'appointment-rules.js', 'track.js', 'admin-data.js', 'admin.js')
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
foreach ($uwcPage in @('track', 'admin')) {
    $uwcPageSource = Join-Path $uwcRoot "$uwcPage/index.html"
    $uwcPageDestination = Join-Path $uwcPublish $uwcPage
    New-Item -ItemType Directory -Path $uwcPageDestination -Force | Out-Null
    Copy-Item -LiteralPath $uwcPageSource -Destination (Join-Path $uwcPageDestination 'index.html') -Force
}
New-Item -ItemType Directory -Path (Join-Path $uwcRoot 'vendor') -Force | Out-Null
if (Test-Path -LiteralPath (Join-Path $uwcRoot 'node_modules/@supabase/supabase-js/dist/umd/supabase.js')) {
    Copy-Item -LiteralPath (Join-Path $uwcRoot 'node_modules/@supabase/supabase-js/dist/umd/supabase.js') -Destination (Join-Path $uwcRoot 'vendor/supabase.js') -Force
    Copy-Item -LiteralPath (Join-Path $uwcRoot 'node_modules/@supabase/supabase-js/LICENSE') -Destination (Join-Path $uwcRoot 'vendor/SUPABASE-LICENSE') -Force
}
if (-not (Test-Path -LiteralPath (Join-Path $uwcRoot 'vendor/supabase.js'))) { throw 'Run npm ci to install the pinned staff client before building.' }
New-Item -ItemType Directory -Path (Join-Path $uwcPublish 'vendor') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $uwcRoot 'vendor/supabase.js') -Destination (Join-Path $uwcPublish 'vendor/supabase.js') -Force
Copy-Item -LiteralPath (Join-Path $uwcRoot 'vendor/SUPABASE-LICENSE') -Destination (Join-Path $uwcPublish 'vendor/SUPABASE-LICENSE') -Force
Write-Output "Prepared $($uwcFiles.Count) website files and $($uwcAssetPaths.Count) referenced assets in $uwcPublish"
