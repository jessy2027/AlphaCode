$target = "src\vs\workbench\contrib\alphacode"
$extensions = @("*.ts","*.js","*.json","*.css","*.html")

Write-Host ""
Write-Host "📊 Calcul du nombre total de lignes dans '$target'..."
Write-Host ""

$total = 0
$files = Get-ChildItem -Recurse $target -Include $extensions -File | Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\test\\"
}

foreach ($file in $files) {
    try {
        $count = (Get-Content $file -ErrorAction Stop | Measure-Object -Line).Lines
        $total += $count
    } catch {
        Write-Host "⚠️  Erreur sur $($file.FullName)"
    }
}

Write-Host ""
Write-Host "=============================================="
Write-Host "✅ Nombre total de lignes : $total"
Write-Host "=============================================="
