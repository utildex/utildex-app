#!/usr/bin/env zsh
# sync-sparse-tree.zsh — Regenerate _repolore/sparse-tree/ from _repolore/tree/.
# Only non-empty knowledge nodes are copied.
# Run this after changing _repolore/tree/.
#
# Usage:
#   zsh sync-sparse-tree.zsh [repo-root]

set -e

# ── Configuration ───────────────────────────────────────────────────────────

REPO_ROOT="${1:-$PWD}"
REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"

LOREROOT="$REPO_ROOT/_repolore"
TREEROOT="$LOREROOT/tree"
SPARSEROOT="$LOREROOT/sparse-tree"
EMPTY_MARKER="<!-- repolore:empty -->"

# ── Helpers ─────────────────────────────────────────────────────────────────

is_non_empty_lore() {
    local path="$1"

    [[ ! -f "$path" ]] && return 1

    local content
    content="$(<"$path")"

    local trimmed="${content##[[:space:]]}"
    trimmed="${trimmed%%[[:space:]]}"

    [[ -z "$trimmed" ]]   && return 1
    [[ "$trimmed" == "$EMPTY_MARKER" ]] && return 1

    return 0
}

# ── Main ────────────────────────────────────────────────────────────────────

if [[ ! -d "$TREEROOT" ]]; then
    echo "RepoLore tree does not exist: $TREEROOT" >&2
    exit 1
fi

# Wipe and recreate sparse root
if [[ -d "$SPARSEROOT" ]]; then
    /bin/rm -rf "$SPARSEROOT"
fi
/bin/mkdir -p "$SPARSEROOT"

# Collect non-empty lore files into a temp file to avoid subshell counter issues
tmpfile="$(/usr/bin/mktemp)"
trap '/bin/rm -f "$tmpfile"' EXIT

/usr/bin/find "$TREEROOT" -type f -name '*.md' -print0 > "$tmpfile"

typeset -i copied=0

while IFS= read -r -d '' lorefile; do
    if is_non_empty_lore "$lorefile"; then
        # Compute relative path from TREEROOT
        rel="${lorefile#$TREEROOT/}"
        dest="$SPARSEROOT/$rel"
        destdir="${dest:h}"   # :h = head (dirname) in zsh

        /bin/mkdir -p "$destdir"
        /bin/cp "$lorefile" "$dest"

        (( copied++ )) || true
    fi
done < "$tmpfile"

echo "RepoLore sparse tree regenerated."
echo "Sparse root: $SPARSEROOT"
echo "Non-empty lore files copied: $copied"
