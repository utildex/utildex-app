param(
    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path $RepoRoot).Path
$RepoLoreRoot = Join-Path $RepoRoot "_repolore"
$TreeRoot = Join-Path $RepoLoreRoot "tree"
$SparseRoot = Join-Path $RepoLoreRoot "sparse-tree"
$EmptyMarker = "<!-- repolore:empty -->"

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $full = [System.IO.Path]::GetFullPath($FullPath)

    $baseUri = [System.Uri]$base
    $fullUri = [System.Uri]$full

    $relative = $baseUri.MakeRelativeUri($fullUri).ToString()
    return [System.Uri]::UnescapeDataString($relative).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Test-IsNonEmptyLore {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }

    $content = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue

    if ($null -eq $content) {
        return $false
    }

    $trimmed = $content.Trim()

    if ($trimmed -eq "") {
        return $false
    }

    if ($trimmed -eq $EmptyMarker) {
        return $false
    }

    return $true
}

if (-not (Test-Path -LiteralPath $TreeRoot)) {
    throw "RepoLore tree does not exist: $TreeRoot"
}

if (Test-Path -LiteralPath $SparseRoot) {
    Remove-Item -LiteralPath $SparseRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $SparseRoot | Out-Null

$copied = 0

Get-ChildItem -LiteralPath $TreeRoot -Recurse -File -Filter "*.md" | ForEach-Object {
    if (Test-IsNonEmptyLore -Path $_.FullName) {
        $relative = Get-RelativePath -BasePath $TreeRoot -FullPath $_.FullName
        $destination = Join-Path $SparseRoot $relative
        $destinationDir = Split-Path $destination -Parent

        New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $destination -Force

        $copied++
    }
}

Write-Output "RepoLore sparse tree regenerated."
Write-Output "Sparse root: $SparseRoot"
Write-Output "Non-empty lore files copied: $copied"
