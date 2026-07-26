param(
    [Parameter(Mandatory = $true)]
    [string]$TargetPath,

    [int]$BudgetTokens = 8000,

    [string]$RepoRoot = (Get-Location).Path,

    [switch]$IncludeMethod
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path $RepoRoot).Path
$RepoLoreRoot = Join-Path $RepoRoot "_repolore"
$TreeRoot = Join-Path $RepoLoreRoot "tree"
$EmptyMarker = "<!-- repolore:empty -->"

function Convert-ToRepoRelativePath {
    param([string]$Path)

    $normalized = $Path.Trim().Trim('"').Trim("'")
    $normalized = $normalized -replace '^[.][\\/]', ''
    $normalized = $normalized.TrimEnd('\', '/')

    return $normalized
}

function Join-Relative {
    param([string[]]$Parts)

    $clean = $Parts | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    if ($clean.Count -eq 0) {
        return ""
    }

    return [System.IO.Path]::Combine($clean)
}

function Get-RelativeDisplayPath {
    param([string]$FullPath)

    $base = [System.IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $full = [System.IO.Path]::GetFullPath($FullPath)

    $baseUri = [System.Uri]$base
    $fullUri = [System.Uri]$full

    $relative = $baseUri.MakeRelativeUri($fullUri).ToString()
    return [System.Uri]::UnescapeDataString($relative).Replace('\', '/')
}

function Estimate-Tokens {
    param([string]$Text)

    if ($null -eq $Text) {
        return 0
    }

    return [Math]::Ceiling($Text.Length / 4)
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

function Get-LorePath {
    param([string]$TargetPath)

    $targetRelative = Convert-ToRepoRelativePath $TargetPath
    $targetFull = Join-Path $RepoRoot $targetRelative

    $isExistingDirectory = Test-Path -LiteralPath $targetFull -PathType Container
    $isExistingFile = Test-Path -LiteralPath $targetFull -PathType Leaf

    if (-not $isExistingDirectory -and -not $isExistingFile) {
        $isExistingDirectory = $TargetPath.EndsWith("/") -or $TargetPath.EndsWith("\")
    }

    $segments = $targetRelative -split '[\\/]' | Where-Object { $_ -ne "" }

    $paths = New-Object System.Collections.Generic.List[string]

    if ($IncludeMethod) {
        $paths.Add((Join-Path $RepoLoreRoot "method.md"))
    }

    $paths.Add((Join-Path $RepoLoreRoot "root.md"))

    if ($segments.Count -eq 0) {
        return $paths
    }

    if ($isExistingDirectory) {
        $directorySegments = $segments
        $fileSegment = $null
    }
    else {
        if ($segments.Count -eq 1) {
            $directorySegments = @()
            $fileSegment = $segments[0]
        }
        else {
            $directorySegments = $segments[0..($segments.Count - 2)]
            $fileSegment = $segments[-1]
        }
    }

    $currentParts = @()

    foreach ($segment in $directorySegments) {
        $currentParts += $segment
        $dirRelative = Join-Relative $currentParts
        $nodeFile = Join-Path (Join-Path $TreeRoot $dirRelative) "$segment.md"
        $paths.Add($nodeFile)
    }

    if ($null -ne $fileSegment) {
        $parentRelative = Join-Relative $directorySegments

        if ([string]::IsNullOrWhiteSpace($parentRelative)) {
            $nodeFile = Join-Path $TreeRoot "$fileSegment.md"
        }
        else {
            $nodeFile = Join-Path (Join-Path $TreeRoot $parentRelative) "$fileSegment.md"
        }

        $paths.Add($nodeFile)
    }

    return $paths
}

$usedTokens = 0
$included = 0

Write-Output "# RepoLore Context"
Write-Output ""
Write-Output "Target path: $TargetPath"
Write-Output "Budget tokens: $BudgetTokens"
Write-Output ""

$loreFiles = Get-LorePath -TargetPath $TargetPath

foreach ($file in $loreFiles) {
    if (-not (Test-IsNonEmptyLore -Path $file)) {
        continue
    }

    $content = Get-Content -LiteralPath $file -Raw
    $displayPath = Get-RelativeDisplayPath $file
    $tokens = Estimate-Tokens $content
    $headerTokens = Estimate-Tokens $displayPath
    $totalIfIncluded = $usedTokens + $tokens + $headerTokens + 20

    if ($totalIfIncluded -gt $BudgetTokens) {
        Write-Output ""
        Write-Output "---"
        Write-Output "Stopped before reading $displayPath because the token budget would be exceeded."
        Write-Output "Used tokens estimate: $usedTokens"
        break
    }

    Write-Output ""
    Write-Output "---"
    Write-Output "## $displayPath"
    Write-Output ""
    Write-Output $content.Trim()
    Write-Output ""

    $usedTokens = $totalIfIncluded
    $included++
}

Write-Output ""
Write-Output "---"
Write-Output "Included files: $included"
Write-Output "Used tokens estimate: $usedTokens"
