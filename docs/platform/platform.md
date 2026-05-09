# Platform Documentation

This page is the entry point for platform-level documentation.

## Table of Contents

- [Dual-App Build Split](dual-app-split/README.md)
- [Synedex Platform](synedex/README.md)
- [GIF Export Platform](gif-export/README.md)
- [Pretty Plotting Platform](pretty-plotting/README.md)
- [Tool Spaces Platform](tool-spaces/README.md)

## Reading Guide

| Document | What it covers | Read this when |
|---|---|---|
| [Dual-App Build Split](dual-app-split/README.md) | How a single codebase produces two independent apps (Utildex and Synedex). Entry points, file replacements, APP_CONFIG identity layer, storage namespacing, and invariants. | You are modifying any shared file, adding a new file replacement, touching storage keys, or trying to understand why `APP_CONFIG.appId` matters. |
| [Synedex Platform](synedex/README.md) | Everything specific to Synedex: directory structure, game contract/kernel/registry wiring, routes, what Synedex does and does not have relative to Utildex. | You are adding a new game, debugging a Synedex-only issue, or onboarding to the Synedex side of the codebase. |
| [GIF Export Platform](gif-export/README.md) | Shared GIF rendering and encoding pipeline, quality profiles, and integration path through the worker runtime. | You are adding GIF export to a tool, debugging GIF artifacts, or deciding between profile defaults and custom encoder options. |
| [Pretty Plotting Platform](pretty-plotting/README.md) | Reusable plotting core (config contracts, presets, modifiers, renderer lifecycle, and export hooks). | You are building or extending a 2D plotting tool and need a fast bootstrap for render/update/export flows. |
| [Tool Spaces Platform](tool-spaces/README.md) | Space definitions, runtime resolution, UI routing, and headless/MCP discovery flow. | You are creating or editing spaces/groups, wiring tool IDs, or validating MCP-oriented discovery behavior. |

## Folder Structure

Use the following structure for platform features:

- `docs/platform/<feature>/README.md`
- `docs/platform/<feature>/screenshots/`

This keeps narrative docs and future visual assets together.
