param(
    [string]$StartPath = ".",

    [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path $RepoRoot).Path
$SparseRoot = Join-Path $RepoRoot "_repolore/sparse-tree"

function Convert-ToRepoRelativePath {
    param([string]$Path)

    $normalized = $Path.Trim().Trim('"').Trim("'")

    if ($normalized -eq "." -or $normalized -eq "") {
        return ""
    }

    $normalized = $normalized -replace '^[.][\\/]', ''
    $normalized = $normalized.TrimEnd('\', '/')

    return $normalized
}

function Estimate-Tokens {
    param([string]$Text)

    if ($null -eq $Text) {
        return 0
    }

    return [Math]::Ceiling($Text.Length / 4)
}

function Get-FileTokens {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return 0
    }

    $content = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
    return Estimate-Tokens $content
}

function Get-DirectoryTokens {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return 0
    }

    $total = 0

    Get-ChildItem -LiteralPath $Path -Recurse -File -Filter "*.md" | ForEach-Object {
        $total += Get-FileTokens -Path $_.FullName
    }

    return $total
}

function Show-SparseTree {
    param(
        [string]$Path,
        [string]$Prefix = ""
    )

    $items = Get-ChildItem -LiteralPath $Path -Force | Sort-Object @{ Expression = { -not $_.PSIsContainer } }, Name

    foreach ($item in $items) {
        if ($item.PSIsContainer) {
            $tokens = Get-DirectoryTokens -Path $item.FullName
            Write-Output "$Prefix$($item.Name)/  [$tokens tokens]"
            Show-SparseTree -Path $item.FullName -Prefix "$Prefix  "
        }
        else {
            $tokens = Get-FileTokens -Path $item.FullName
            Write-Output "$Prefix$($item.Name)  [$tokens tokens]"
        }
    }
}

if (-not (Test-Path -LiteralPath $SparseRoot)) {
    throw "Sparse tree does not exist. Run sync-sparse-tree first."
}

$relativeStart = Convert-ToRepoRelativePath $StartPath

if ([string]::IsNullOrWhiteSpace($relativeStart)) {
    $startFull = $SparseRoot
}
else {
    $startFull = Join-Path $SparseRoot $relativeStart
}

if (-not (Test-Path -LiteralPath $startFull)) {
    Write-Output "No non-empty RepoLore knowledge found under: $StartPath"
    exit 0
}

Write-Output "RepoLore sparse tree: $StartPath"
Write-Output ""

Show-SparseTree -Path $startFull
