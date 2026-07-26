#!/usr/bin/env zsh
# context.zsh — Read relevant RepoLore files for a path and print combined context.
# Skips empty nodes. Stops before exceeding the token budget.
#
# Usage:
#   zsh context.zsh <target-path> [--budget-tokens <n>] [--repo-root <dir>] [--include-method]

set -e

# ── Argument Parsing ────────────────────────────────────────────────────────

TARGET_PATH=""
REPO_ROOT="${PWD}"
BUDGET_TOKENS=8000
INCLUDE_METHOD=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo-root)
            REPO_ROOT="$2"
            shift 2
            ;;
        --budget-tokens)
            BUDGET_TOKENS="$2"
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
    echo "Usage: context.zsh <target-path> [--budget-tokens <n>] [--repo-root <dir>] [--include-method]" >&2
    exit 1
fi

REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"
LOREROOT="$REPO_ROOT/_repolore"
TREEROOT="$LOREROOT/tree"
EMPTY_MARKER="<!-- repolore:empty -->"

# ── Helpers ─────────────────────────────────────────────────────────────────

estimate_tokens() {
    local text="$1"
    # 1 token ≈ 4 characters
    local len="${#text}"
    echo $(( (len + 3) / 4 ))
}

is_non_empty_lore() {
    local path="$1"

    [[ ! -f "$path" ]] && return 1

    local content
    content="$(<"$path")"

    local trimmed="${content##[[:space:]]}"
    trimmed="${trimmed%%[[:space:]]}"

    [[ -z "$trimmed" ]] && return 1
    [[ "$trimmed" == "$EMPTY_MARKER" ]] && return 1

    return 0
}

relpath() {
    local p="$1"
    echo "${p#$REPO_ROOT/}"
}

# ── Build lore file list ────────────────────────────────────────────────────

# Normalize target path
normalized="${TARGET_PATH#\"}"
normalized="${normalized%\"}"
normalized="${normalized#\'}"
normalized="${normalized%\'}"
normalized="${normalized#./}"
normalized="${normalized%/}"

target_full="$REPO_ROOT/$normalized"
is_dir=0

if [[ -d "$target_full" ]]; then
    is_dir=1
elif [[ "$TARGET_PATH" == */ ]]; then
    is_dir=1
fi

IFS='/' read -rA segments <<< "$normalized"
segments=("${segments[@]:#}")

# If the target is a file, drop the last segment (only directory nodes exist)
if (( ! is_dir )) && (( ${#segments[@]} > 0 )); then
    segments=("${segments[@]:0:${#segments[@]}-1}")
fi

lore_files=()

if (( INCLUDE_METHOD )); then
    lore_files+=("$LOREROOT/method.md")
fi

lore_files+=("$LOREROOT/root.md")

current_parts=()
for seg in "${segments[@]}"; do
    current_parts+=("$seg")
    dir_rel="${(j:/:)current_parts}"
    lore_files+=("$TREEROOT/$dir_rel/${seg}.md")
done

# ── Output Context ──────────────────────────────────────────────────────────

typeset -i used_tokens=0
typeset -i included=0

echo "# RepoLore Context"
echo ""
echo "Target path: $TARGET_PATH"
echo "Budget tokens: $BUDGET_TOKENS"

for f in "${lore_files[@]}"; do
    if ! is_non_empty_lore "$f"; then
        continue
    fi

    content="$(<"$f")"
    display="$(relpath "$f")"
    ftokens=$(estimate_tokens "$content")
    htokens=$(estimate_tokens "$display")
    total_if_included=$(( used_tokens + ftokens + htokens + 20 ))

    if (( total_if_included > BUDGET_TOKENS )); then
        echo ""
        echo "---"
        echo "Stopped before reading $display because the token budget would be exceeded."
        echo "Used tokens estimate: $used_tokens"
        break
    fi

    echo ""
    echo "---"
    echo "## $display"
    echo ""
    printf '%s\n' "${content##[[:space:]]}"
    echo ""

    used_tokens=$total_if_included
    (( included++ ))
done

echo ""
echo "---"
echo "Included files: $included"
