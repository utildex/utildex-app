# RepoLore Tools

RepoLore tools are small helper scripts.

They are not the core of RepoLore. The core is the static knowledge base and the method.

The tools exist to make RepoLore easier for agents and developers to use.

## Available Alpha Tools

```text
_repolore/tools/
  tools.md

  sync-tree/
    sync-tree.ps1
    sync-tree.zsh

  sync-sparse-tree/
    sync-sparse-tree.ps1
    sync-sparse-tree.zsh

  path/
    path.ps1
    path.zsh

  context/
    context.ps1
    context.zsh

  sparse-tree/
    sparse-tree.ps1
    sparse-tree.zsh
```

Each tool has a PowerShell (`.ps1`) and zsh (`.zsh`) variant. They are functionally equivalent; use whichever your shell supports.

## Core Rule

Write knowledge only to:

```text
_repolore/tree/
```

Do not manually edit:

```text
_repolore/sparse-tree/
```

The sparse tree is generated from the full tree.

## Tool: sync-tree

Synchronizes `_repolore/tree/` with the repository structure.

It creates missing RepoLore nodes for **directories only** (not individual files).

Each directory gets a `.md` node file inside its mirrored directory, named after the directory:

```text
src/
→ _repolore/tree/src/src.md

src/apps/
→ _repolore/tree/src/apps/apps.md
```

It does not overwrite existing knowledge.

It does not delete existing knowledge.

Usage:

```powershell
pwsh _repolore/tools/sync-tree/sync-tree.ps1
```

```zsh
zsh _repolore/tools/sync-tree/sync-tree.zsh
```

## Tool: sync-sparse-tree

Regenerates `_repolore/sparse-tree/` from `_repolore/tree/`.

Only non-empty knowledge nodes are copied.

Usage:

```powershell
pwsh _repolore/tools/sync-sparse-tree/sync-sparse-tree.ps1
```

```zsh
zsh _repolore/tools/sync-sparse-tree/sync-sparse-tree.zsh
```

Run this after changing `_repolore/tree/`.

## Tool: path

Returns the RepoLore files that should be read for a repository path.

It returns paths, not contents.

Usage:

```powershell
pwsh _repolore/tools/path/path.ps1 -TargetPath "src/services/payment/stripe.ts"
```

```zsh
zsh _repolore/tools/path/path.zsh "src/services/payment/stripe.ts"
```

With --include-method:

```zsh
zsh _repolore/tools/path/path.zsh "src/services/payment/stripe.ts" --include-method
```

## Tool: context

Reads the relevant RepoLore files for a repository path and prints a combined context.

It skips empty nodes.

It stops before exceeding the token budget.

Usage:

```powershell
pwsh _repolore/tools/context/context.ps1 -TargetPath "src/services/payment/stripe.ts" -BudgetTokens 8000
```

```zsh
zsh _repolore/tools/context/context.zsh "src/services/payment/stripe.ts" --budget-tokens 8000
```

## Tool: sparse-tree

Displays the non-empty RepoLore knowledge tree.

Usage:

```powershell
pwsh _repolore/tools/sparse-tree/sparse-tree.ps1
```

```zsh
zsh _repolore/tools/sparse-tree/sparse-tree.zsh
```

To display from a specific point:

```powershell
pwsh _repolore/tools/sparse-tree/sparse-tree.ps1 -StartPath "src/services"
```

```zsh
zsh _repolore/tools/sparse-tree/sparse-tree.zsh --start-path "src/services"
```

## Token Estimate

The alpha scripts estimate tokens approximately as:

```text
1 token ≈ 4 characters
```

This is intentionally simple. It is good enough for early agent usage.

## Design Principle

The tools should stay simple, deterministic, local, and easy to inspect.

They should help agents navigate RepoLore, not reason on behalf of agents.
