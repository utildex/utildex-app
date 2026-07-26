param(
    [Parameter(Mandatory = $true)]
    [string]$TargetPath,

    [string]$RepoRoot = (Get-Location).Path,

    [switch]$IncludeMethod
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path $RepoRoot).Path
$RepoLoreRoot = Join-Path $RepoRoot "_repolore"
$TreeRoot = Join-Path $RepoLoreRoot "tree"

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

$targetRelative = Convert-ToRepoRelativePath $TargetPath
$targetFull = Join-Path $RepoRoot $targetRelative

$isExistingDirectory = Test-Path -LiteralPath $targetFull -PathType Container
$isExistingFile = Test-Path -LiteralPath $targetFull -PathType Leaf

if (-not $isExistingDirectory -and -not $isExistingFile) {
    $isExistingDirectory = $TargetPath.EndsWith("/") -or $TargetPath.EndsWith("\")
}

$segments = $targetRelative -split '[\\/]' | Where-Object { $_ -ne "" }

$result = New-Object System.Collections.Generic.List[string]

if ($IncludeMethod) {
    $method = Join-Path $RepoLoreRoot "method.md"
    $result.Add($method)
}

$root = Join-Path $RepoLoreRoot "root.md"
$result.Add($root)

if ($segments.Count -eq 0) {
    $result | ForEach-Object {
        $display = Get-RelativeDisplayPath $_
        if (Test-Path -LiteralPath $_) {
            Write-Output $display
        }
        else {
            Write-Output "$display [missing]"
        }
    }
    exit 0
}

if ($isExistingDirectory) {
    $directorySegments = $segments
    $fileSegment = $null
}
else {
    $directorySegments = $segments[0..($segments.Count - 2)]
    $fileSegment = $segments[-1]

    if ($segments.Count -eq 1) {
        $directorySegments = @()
    }
}

$currentParts = @()

foreach ($segment in $directorySegments) {
    $currentParts += $segment
    $dirRelative = Join-Relative $currentParts
    $nodeFile = Join-Path (Join-Path $TreeRoot $dirRelative) "$segment.md"
    $result.Add($nodeFile)
}

if ($null -ne $fileSegment) {
    $parentRelative = Join-Relative $directorySegments

    if ([string]::IsNullOrWhiteSpace($parentRelative)) {
        $nodeFile = Join-Path $TreeRoot "$fileSegment.md"
    }
    else {
        $nodeFile = Join-Path (Join-Path $TreeRoot $parentRelative) "$fileSegment.md"
    }

    $result.Add($nodeFile)
}

$result | ForEach-Object {
    $display = Get-RelativeDisplayPath $_

    if (Test-Path -LiteralPath $_) {
        Write-Output $display
    }
    else {
        Write-Output "$display [missing]"
    }
}
