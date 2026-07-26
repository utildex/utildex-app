param(
    [string]$RepoRoot = (Get-Location).Path,
    [string[]]$ExcludeDirs = @(
        "_repolore",
        ".git",
        "node_modules",
        "bin",
        "obj",
        "dist",
        "build",
        ".next",
        ".nuxt",
        "coverage",
        ".vs",
        ".idea"
    )
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path $RepoRoot).Path
$RepoLoreRoot = Join-Path $RepoRoot "_repolore"
$TreeRoot = Join-Path $RepoLoreRoot "tree"
$EmptyMarker = "<!-- repolore:empty -->"

New-Item -ItemType Directory -Force -Path $TreeRoot | Out-Null

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

function Test-IsExcluded {
    param([string]$RelativePath)

    if ([string]::IsNullOrWhiteSpace($RelativePath)) {
        return $false
    }

    $segments = $RelativePath -split '[\\/]'

    foreach ($segment in $segments) {
        if ($ExcludeDirs -contains $segment) {
            return $true
        }
    }

    return $false
}

function New-EmptyLoreFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType File -Force -Path $Path | Out-Null
        Set-Content -LiteralPath $Path -Value $EmptyMarker -Encoding UTF8
    }
}

$createdDirs = 0
$createdFiles = 0

$items = Get-ChildItem -LiteralPath $RepoRoot -Recurse -Force |
    Where-Object {
        -not ($_.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
    }

foreach ($item in $items) {
    $relativePath = Get-RelativePath -BasePath $RepoRoot -FullPath $item.FullName

    if (Test-IsExcluded $relativePath) {
        continue
    }

    if ($item.PSIsContainer) {
        $mirrorDir = Join-Path $TreeRoot $relativePath
        if (-not (Test-Path -LiteralPath $mirrorDir)) {
            New-Item -ItemType Directory -Force -Path $mirrorDir | Out-Null
            $createdDirs++
        }

        $nodeName = Split-Path $item.FullName -Leaf
        $nodeFile = Join-Path $mirrorDir "$nodeName.md"

        if (-not (Test-Path -LiteralPath $nodeFile)) {
            New-EmptyLoreFile -Path $nodeFile
            $createdFiles++
        }
    }
    else {
        $parent = Split-Path $item.FullName -Parent
        $parentRelative = Get-RelativePath -BasePath $RepoRoot -FullPath $parent

        if (Test-IsExcluded $parentRelative) {
            continue
        }

        if ($parentRelative -eq "." -or [string]::IsNullOrWhiteSpace($parentRelative)) {
            $mirrorDir = $TreeRoot
        }
        else {
            $mirrorDir = Join-Path $TreeRoot $parentRelative
        }

        if (-not (Test-Path -LiteralPath $mirrorDir)) {
            New-Item -ItemType Directory -Force -Path $mirrorDir | Out-Null
            $createdDirs++
        }

        $nodeFile = Join-Path $mirrorDir "$($item.Name).md"

        if (-not (Test-Path -LiteralPath $nodeFile)) {
            New-EmptyLoreFile -Path $nodeFile
            $createdFiles++
        }
    }
}

Write-Output "RepoLore tree synchronized."
Write-Output "Tree root: $TreeRoot"
Write-Output "Created directories: $createdDirs"
Write-Output "Created lore files: $createdFiles"
