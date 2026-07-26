# RepoLore Method

RepoLore is a static knowledge base for this repository.

It exists to give humans and coding agents the operational memory they do not automatically have: the context, assumptions, structure, decisions, and maintenance knowledge needed to work on the repository efficiently.

RepoLore does not act. Agents and developers act. RepoLore informs them.

## 1. Purpose

RepoLore is not ordinary documentation.

Documentation usually explains what the project does. RepoLore explains what a future maintainer or coding agent should know before changing the project.

RepoLore should reduce:

* unnecessary source-code exploration;
* repeated rediscovery of the same context;
* token waste in agentic development;
* incorrect changes caused by missing architectural context;
* loss of knowledge between sessions, agents, and developers.

The core question for every RepoLore file is:

> What should a competent maintainer or coding agent know before changing this area?

## 2. Source of Truth

The code is always the source of truth.

If RepoLore conflicts with the code, trust the code and update RepoLore.

If RepoLore is missing, incomplete, or stale, improve it only where doing so is useful for future work.

Do not invent certainty. If something is inferred but not confirmed, say so explicitly.

## 3. RepoLore Structure

RepoLore lives in `_repolore/`.

The minimum structure is:

```text
_repolore/
  method.md
  root.md
  tree/
  sparse-tree/
  tools/
```

`method.md` defines this method.

`root.md` is the root of the knowledge base. It describes the repository as a whole and explains where agents should start depending on what they want to do.

`tree/` is the complete structural mirror of the repository.

`sparse-tree/` is a generated read-optimized view containing only non-empty knowledge nodes.

`tools/` describes and contains simple helper tools for maintaining and reading RepoLore.

## 4. Root File

`_repolore/root.md` is not the root of the repository tree.

It is the root of the RepoLore knowledge base.

It should explain:

* what this repository is;
* its main purpose;
* its major areas;
* how the repository is organized;
* where to start for common kinds of work;
* where important RepoLore knowledge currently exists;
* known uncertainty or missing knowledge.

`root.md` should act as a task-oriented map.

Prefer:

```text
If you work on X, start with Y.
If you investigate Z, read A and B.
```

Avoid:

```text
This folder contains files.
```

unless that information is useful for future work.

## 5. Complete Tree Mirror

`_repolore/tree/` mirrors the repository’s file and directory structure.

The mirror is structurally complete but knowledge-sparse.

This means:

* repository paths have corresponding RepoLore nodes;
* most nodes may be empty or minimal;
* only useful levels contain real knowledge;
* knowledge should live at the level where it helps future work.

Structural completeness does not imply documentation completeness.

## 6. Tree Naming Convention

For a repository directory, the corresponding RepoLore file lives inside the mirrored directory and has the same name as that directory.

Example:

```text
repo:
  API/
    Controllers/
      UserController.cs
```

RepoLore mirror:

```text
_repolore/
  tree/
    API/
      API.md
      Controllers/
        Controllers.md
        UserController.cs.md
```

So:

```text
API/
→ _repolore/tree/API/API.md
```

and:

```text
API/Controllers/
→ _repolore/tree/API/Controllers/Controllers.md
```

For repository files, append `.md` to the original filename:

```text
API/Controllers/UserController.cs
→ _repolore/tree/API/Controllers/UserController.cs.md
```

## 7. Sparse Tree

`_repolore/sparse-tree/` is a generated view of `_repolore/tree/`.

It contains only RepoLore nodes that contain useful knowledge.

Agents should prefer reading `sparse-tree/` when they need to discover where knowledge exists.

Agents must not manually edit `_repolore/sparse-tree/`.

All human or agent-authored knowledge must be written to `_repolore/tree/`.

The sparse tree can always be deleted and regenerated from `_repolore/tree/`.

## 8. Empty Nodes

An empty RepoLore node is allowed.

It means:

> This path exists structurally, but no useful operational knowledge has been recorded here yet.

A node may be physically empty or contain only:

```text
<!-- repolore:empty -->
```

Do not fill empty nodes just to make the tree look complete.

Fill a node only when the knowledge would help future agents or maintainers.

## 9. Reading Before Work

Before modifying or deeply analyzing an area, read RepoLore first.

For a target path, read:

1. `_repolore/method.md`
2. `_repolore/root.md`
3. the non-empty RepoLore nodes along the path to the target
4. any related RepoLore files mentioned by those nodes

Only then inspect the source files needed for the task.

Do not begin by loading broad unrelated parts of the repository. RepoLore exists to avoid that.

When tools are available, prefer using:

```text
path
context
sparse-tree
```

instead of manually opening many files.

## 10. Writing After Work

Update RepoLore when a change affects operational memory.

A RepoLore update is required when a change affects:

* behavior;
* architecture;
* responsibilities of a file, folder, module, service, package, or subsystem;
* public or internal APIs;
* dependencies;
* configuration with behavioral impact;
* data model or schema;
* important file or folder paths;
* conventions;
* assumptions future maintainers need to know;
* interactions between areas;
* non-obvious bug fixes;
* important tradeoffs or design decisions.

A RepoLore update is usually not required for:

* formatting;
* typo fixes;
* mechanical cleanup;
* obvious local implementation changes;
* changes that do not affect future maintenance;
* temporary edits that are not intended to persist.

When unsure, add a short useful note rather than leaving future agents without context.

## 11. Where to Write Knowledge

Write knowledge at the level where it is most useful.

Use higher-level files for broad context:

```text
_repolore/root.md
_repolore/tree/src/src.md
_repolore/tree/apps/apps.md
```

Use mid-level files for subsystems, packages, services, domains, or important folders:

```text
_repolore/tree/src/services/services.md
_repolore/tree/packages/auth/auth.md
```

Use file-level knowledge only when a specific file contains non-obvious behavior, important constraints, or unusual implementation details.

Do not create rich file-level knowledge by default.

## 12. What to Write

Good RepoLore content includes:

* purpose of the area;
* responsibilities;
* important files and why they matter;
* local conventions;
* invariants;
* important dependencies;
* assumptions;
* non-obvious behavior;
* common pitfalls;
* change notes;
* related areas to inspect when modifying this area.

Bad RepoLore content includes:

* paraphrases of obvious code;
* exhaustive summaries of every file;
* large copied code snippets;
* generic documentation;
* stale speculation;
* notes that do not help future development.

Prefer concise operational knowledge.

## 13. Tools

RepoLore tools are simple helper scripts.

They do not replace agent reasoning.

They exist to make RepoLore easier to create, navigate, synchronize, and read.

The alpha tools are described in:

```text
_repolore/tools/tools.md
```

The most important tools are:

```text
sync-tree
sync-sparse-tree
path
context
sparse-tree
```

Agents may run these tools through PowerShell or reimplement equivalent terminal commands when needed.

## 14. Tool Invariants

Agents write knowledge only to:

```text
_repolore/tree/
```

Agents do not manually edit:

```text
_repolore/sparse-tree/
```

After modifying `_repolore/tree/`, agents should regenerate `_repolore/sparse-tree/`.

The sparse tree is a disposable cache.

The complete tree is the editable knowledge mirror.

## 15. Existing Large Repositories

When initializing RepoLore in an existing large repository, do not try to document everything.

Use this approach:

1. create the RepoLore structure;
2. create a complete structural mirror under `_repolore/tree/`;
3. generate a useful but imperfect `root.md`;
4. identify major areas from existing docs, configs, folders, manifests, and naming conventions;
5. add knowledge only for high-value areas;
6. generate `_repolore/sparse-tree/`;
7. let RepoLore improve over time as real work touches the code.

The correct adoption model is:

```text
complete structure, sparse knowledge, continuous enrichment
```

Do not ask every owner to document everything from scratch.

When a future change touches an area, improve the relevant RepoLore nodes as part of the change.

## 16. Initialization Behavior

When RepoLore is first added to a repository:

1. read existing README, docs, manifests, workspace files, build files, and top-level folders;
2. create `_repolore/root.md`;
3. create or update the structural mirror under `_repolore/tree/`;
4. add knowledge only where it is immediately useful;
5. generate `_repolore/sparse-tree/`;
6. mark uncertainty explicitly;
7. avoid pretending the repository is fully understood.

The first version of RepoLore should be useful, not complete.

## 17. Principle

Maintain RepoLore as the repository’s operational memory.

It should emulate the knowledge a competent developer would carry about their scope: what matters, what is connected, what is risky, what is conventional, and what future agents should not have to rediscover.
