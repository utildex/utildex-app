# Tool Spaces Platform

Tool Spaces group tools into task-oriented collections that are used by the UI and by headless/MCP discovery flows.

## Scope

This document covers:

- Architecture: source of truth, resolution, and validation.
- UI: discovery and navigation behavior.
- MCP/Headless: space-first discovery and issue reporting.

## Architecture

### Source of truth

- Space definitions are registered in `src/data/tool-space-registry.ts`.
- Each space is defined in `src/data/tool-spaces/<space-id>/space.contract.ts`.
- A space contains groups; groups contain ordered `toolIds`.

### Resolution and validation

- Structural validation: `src/core/tool-space.ts` (`validateToolSpaceDefinitions`).
- Runtime resolution and selection helpers: `src/core/tool-space-resolver.ts`.
- Angular orchestration (signals + persistence): `src/services/tool-spaces.service.ts`.

### Invariants

- Space IDs and group IDs must be stable and unique.
- Tool IDs must match contract IDs from the tool registry.
- Group order and tool order are intentional and should be treated as UX/API ordering.

## UI

### Pages

- Spaces catalog page: `src/pages/tool-spaces/tool-spaces.component.ts`.
- Space host page: `src/pages/tool-space-host/tool-space-host.component.ts`.

### Behavior

- The catalog shows resolved spaces and basic counts (groups/tools).
- The host shows groups in a sidebar and lazy-loads the selected tool.
- Selection state is persisted by `ToolSpacesService` to keep the user on their last tool per space.

## MCP and Headless

### Headless APIs

- `listHeadlessSpaces(options)`
- `getHeadlessSpace(spaceId, options)`
- `listHeadlessToolsInSpace(spaceId, options)`
- `listHeadlessSpaceIssues(options)`

These are exported from `src/headless/index.ts` and are intended for MCP server discovery flows.

### Discovery model

Recommended MCP flow:

1. List spaces.
2. List tools in the selected space.
3. Call a tool by ID.

This avoids exposing the full tool catalog at once and keeps context usage bounded.

### Compatibility filtering

- `mcpCompatibleOnly` filters out tools marked as non-MCP-compatible.
- Filtered-out tool references can produce issues such as:
  - `unknown-tool-id`
  - `empty-group-after-resolution`

Issue reporting is diagnostic by default and should be handled by server policy.

## Contribution Checklist

When adding or editing spaces:

1. Update or add `space.contract.ts` under `src/data/tool-spaces/`.
2. Register the space in `src/data/tool-space-registry.ts`.
3. Confirm all referenced `toolIds` exist and are spelled exactly as registered.
4. Run `npm run build:headless`.
5. If using MCP compatibility filtering, review `listHeadlessSpaceIssues` output for regressions.

## Design Rules

- Keep group names task-oriented, not implementation-oriented.
- Keep groups compact; avoid oversized catch-all groups.
- Prefer deterministic order over alphabetic order when the flow is intentional.
- Do not put Angular-specific logic into headless; keep shared logic in `src/core/tool-space-resolver.ts`.
