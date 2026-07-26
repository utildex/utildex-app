#!/usr/bin/env zsh
# path.zsh — Return the RepoLore files that should be read for a repository path.
# Returns paths to directory nodes only (not file-level nodes).
#
# Usage:
#   zsh path.zsh <target-path> [--repo-root <dir>] [--include-method]

set -e

# ── Argument Parsing ────────────────────────────────────────────────────────

TARGET_PATH=""
REPO_ROOT="${PWD}"
INCLUDE_METHOD=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo-root)
            REPO_ROOT="$2"
            shift 2
            ;;
        --include-method)
            INCLUDE_METHOD=1
            shift
            ;;
        -*)
            echo "Unknown flag: $1" >&2
            exit 1
            ;;
        *)
            TARGET_PATH="$1"
            shift
            ;;
    esac
done

if [[ -z "$TARGET_PATH" ]]; then
    echo "Usage: path.zsh <target-path> [--repo-root <dir>] [--include-method]" >&2
    exit 1
fi

REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"
LOREROOT="$REPO_ROOT/_repolore"
TREEROOT="$LOREROOT/tree"

# ── Normalization ───────────────────────────────────────────────────────────

# Strip surrounding quotes, leading ./, trailing slashes
normalized="${TARGET_PATH#\"}"
normalized="${normalized%\"}"
normalized="${normalized#\'}"
normalized="${normalized%\'}"
normalized="${normalized#./}"
normalized="${normalized%/}"

# Determine if target is a directory
target_full="$REPO_ROOT/$normalized"
is_dir=0

if [[ -d "$target_full" ]]; then
    is_dir=1
elif [[ "$TARGET_PATH" == */ ]]; then
    is_dir=1
fi

# ── Build directory segments ────────────────────────────────────────────────

# Split normalized path into segments
IFS='/' read -rA segments <<< "$normalized"
# Filter empty segments
segments=("${segments[@]:#}")

# If the target is a file, drop the last segment (it's not a directory node)
if (( ! is_dir )) && (( ${#segments[@]} > 0 )); then
    segments=("${segments[@]:0:${#segments[@]}-1}")
fi

# ── Collect paths ───────────────────────────────────────────────────────────

result_paths=()

if (( INCLUDE_METHOD )); then
    result_paths+=("$LOREROOT/method.md")
fi

result_paths+=("$LOREROOT/root.md")

# Build paths for each directory segment
current_parts=()
for seg in "${segments[@]}"; do
    current_parts+=("$seg")
    dir_rel="${(j:/:)current_parts}"
    node_file="$TREEROOT/$dir_rel/${seg}.md"
    result_paths+=("$node_file")
done

# ── Output ──────────────────────────────────────────────────────────────────

for p in "${result_paths[@]}"; do
    rel="${p#$REPO_ROOT/}"
    if [[ -e "$p" ]]; then
        echo "$rel"
    else
        echo "$rel [missing]"
    fi
done
