#!/usr/bin/env zsh
# sparse-tree.zsh — Display the non-empty RepoLore knowledge tree.
#
# Usage:
#   zsh sparse-tree.zsh [--start-path <path>] [--repo-root <dir>]

set -e

# ── Argument Parsing ────────────────────────────────────────────────────────

START_PATH="."
REPO_ROOT="${PWD}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo-root)
            REPO_ROOT="$2"
            shift 2
            ;;
        --start-path)
            START_PATH="$2"
            shift 2
            ;;
        -*)
            echo "Unknown flag: $1" >&2
            exit 1
            ;;
        *)
            # Positional: treat first non-flag as start-path
            START_PATH="$1"
            shift
            ;;
    esac
done

REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"
SPARSEROOT="$REPO_ROOT/_repolore/sparse-tree"

# ── Helpers ─────────────────────────────────────────────────────────────────

estimate_tokens() {
    local text="$1"
    local len="${#text}"
    echo $(( (len + 3) / 4 ))
}

file_tokens() {
    local path="$1"
    if [[ ! -f "$path" ]]; then
        echo 0
        return
    fi
    local content
    content="$(<"$path")"
    estimate_tokens "$content"
}

dir_tokens() {
    local path="$1"
    if [[ ! -d "$path" ]]; then
        echo 0
        return
    fi
    local total=0
    while IFS= read -r -d '' f; do
        local t
        t=$(file_tokens "$f")
        total=$(( total + t ))
    done < <(/usr/bin/find "$path" -type f -name '*.md' -print0 2>/dev/null)
    echo $total
}

show_tree() {
    local path="$1"
    local prefix="${2:-}"

    # Gather entries: directories first (sorted), then files (sorted)
    local entries=()
    if [[ -d "$path" ]]; then
        for entry in "$path"/*(DN); do
            entries+=("$entry")
        done
    fi

    # Sort: directories before files, then by name
    # We'll do two passes
    local dirs=()
    local files=()
    for entry in "${entries[@]}"; do
        if [[ -d "$entry" ]]; then
            dirs+=("$entry")
        elif [[ -f "$entry" ]]; then
            files+=("$entry")
        fi
    done

    # Sort arrays
    dirs=(${(o)dirs})
    files=(${(o)files})

    local all_sorted=("${dirs[@]}" "${files[@]}")
    local total=${#all_sorted[@]}
    local idx=0

    for entry in "${all_sorted[@]}"; do
        (( idx++ ))
        local name="${entry##*/}"
        local is_last=$(( idx == total ))

        local branch="├── "
        local child_prefix="$prefix│   "
        if (( is_last )); then
            branch="└── "
            child_prefix="$prefix    "
        fi

        if [[ -d "$entry" ]]; then
            local tokens
            tokens=$(dir_tokens "$entry")
            echo "${prefix}${branch}${name}/  [$tokens tokens]"
            show_tree "$entry" "$child_prefix"
        else
            local tokens
            tokens=$(file_tokens "$entry")
            echo "${prefix}${branch}${name}  [$tokens tokens]"
        fi
    done
}

# ── Main ────────────────────────────────────────────────────────────────────

if [[ ! -d "$SPARSEROOT" ]]; then
    echo "Sparse tree does not exist. Run sync-sparse-tree first." >&2
    exit 1
fi

# Normalize start path
relative_start="${START_PATH#\"}"
relative_start="${relative_start%\"}"
relative_start="${relative_start#\'}"
relative_start="${relative_start%\'}"
relative_start="${relative_start#./}"
relative_start="${relative_start%/}"

if [[ -z "$relative_start" || "$relative_start" == "." ]]; then
    start_full="$SPARSEROOT"
else
    start_full="$SPARSEROOT/$relative_start"
fi

if [[ ! -e "$start_full" ]]; then
    echo "No non-empty RepoLore knowledge found under: $START_PATH"
    exit 0
fi

echo "RepoLore sparse tree: $START_PATH"
echo ""

show_tree "$start_full"
