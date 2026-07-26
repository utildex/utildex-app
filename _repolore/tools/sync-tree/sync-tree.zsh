#!/usr/bin/env zsh
# sync-tree.zsh — Synchronize _repolore/tree/ with the repository structure.
# Creates missing RepoLore nodes for folders only (not individual files).
# Does not overwrite existing knowledge. Does not delete existing knowledge.
#
# Usage:
#   zsh sync-tree.zsh [repo-root]

set -e

# ── Configuration ───────────────────────────────────────────────────────────

REPO_ROOT="${1:-$PWD}"
REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"

EXCLUDE_DIRS=(
    "_repolore"
    ".git"
    "node_modules"
    "bin"
    "obj"
    "dist"
    "build"
    ".next"
    ".nuxt"
    "coverage"
    ".vs"
    ".idea"
)

LOREROOT="$REPO_ROOT/_repolore"
TREEROOT="$LOREROOT/tree"
EMPTY_MARKER="<!-- repolore:empty -->"

# ── Helpers ─────────────────────────────────────────────────────────────────

# Check if a path segment is in the exclusion list
is_excluded() {
    local relpath="$1"
    [[ -z "$relpath" ]] && return 1

    local IFS='/'
    local -a segments=(${relpath})
    for seg in "${segments[@]}"; do
        for excl in "${EXCLUDE_DIRS[@]}"; do
            [[ "$seg" == "$excl" ]] && return 0
        done
    done
    return 1
}

# Create an empty lore marker file if it doesn't exist
new_empty_lore_file() {
    local path="$1"
    if [[ ! -f "$path" ]]; then
        /bin/mkdir -p "${path:h}"   # :h = head (dirname) in zsh
        printf '%s\n' "$EMPTY_MARKER" > "$path"
    fi
}

# ── Main ────────────────────────────────────────────────────────────────────

/bin/mkdir -p "$TREEROOT"

typeset -i created_dirs=0
typeset -i created_files=0

# Build the find exclusion args
find_exclude=()
for excl in "${EXCLUDE_DIRS[@]}"; do
    find_exclude+=(-name "$excl" -prune -o)
done

# Collect all directories into a temp file to avoid subshell issues in pipelines
tmpfile="$(/usr/bin/mktemp)"
trap '/bin/rm -f "$tmpfile"' EXIT

(
    cd "$REPO_ROOT"
    /usr/bin/find . \( "${find_exclude[@]}" -false \) -o -type d -print 2>/dev/null
) | /usr/bin/tail -n +2 > "$tmpfile"

while IFS= read -r entry; do
    # Remove leading ./
    entry="${entry#./}"

    # Belt + suspenders: skip excluded paths
    if is_excluded "$entry"; then
        continue
    fi

    # ── Directory ──────────────────────────────────────────────────────
    mirror_dir="$TREEROOT/$entry"
    if [[ ! -d "$mirror_dir" ]]; then
        /bin/mkdir -p "$mirror_dir"
        (( created_dirs++ )) || true
    fi

    # Create DirName.md for this directory
    dirname="${entry:t}"   # :t = tail (basename) in zsh
    node_file="$mirror_dir/${dirname}.md"
    if [[ ! -f "$node_file" ]]; then
        new_empty_lore_file "$node_file"
        (( created_files++ )) || true
    fi
done < "$tmpfile"

echo "RepoLore tree synchronized."
echo "Tree root: $TREEROOT"
echo "Created directories: $created_dirs"
echo "Created lore files: $created_files"
