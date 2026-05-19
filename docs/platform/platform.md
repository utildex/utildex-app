# Platform Documentation

This page is the entry point for platform-level documentation.

## Table of Contents

- [Multi-App Repository](multi-app/README.md)
- [Dual-App Build Split](dual-app-split/README.md)
- [Synedex Platform](synedex/README.md)
- [Simudex Platform](simudex/README.md)
- [GIF Export Platform](gif-export/README.md)
- [Pretty Plotting Platform](pretty-plotting/README.md)
- [Tool Spaces Platform](tool-spaces/README.md)

## Reading Guide

| Document                                              | What it covers                                                                                                                                                      | Read this when                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [Multi-App Repository](multi-app/README.md)           | The current N-app architecture: app catalog, runtime capabilities, generic app commands, validation guardrails, storage namespacing, and the app-addition workflow. | You are adding an app, editing app catalog fields, changing shared runtime feature checks, or touching build/deploy wiring.    |
| [Dual-App Build Split](dual-app-split/README.md)      | Historical detail on how the original Utildex/Synedex split was implemented with file replacements.                                                                 | You are debugging older split assumptions or comparing the current multi-app catalog to the original dual-app model.           |
| [Synedex Platform](synedex/README.md)                 | Everything specific to Synedex: directory structure, game contract/kernel/registry wiring, routes, what Synedex does and does not have relative to Utildex.         | You are adding a new game, debugging a Synedex-only issue, or onboarding to the Synedex side of the codebase.                  |
| [Simudex Platform](simudex/README.md)                 | The Simudex skeleton app: bundle boundary, routes, registries, content root, and what remains before real simulations are added.                                    | You are turning the Simudex shell into a working simulations library or adding the first simulation module.                    |
| [GIF Export Platform](gif-export/README.md)           | Shared GIF rendering and encoding pipeline, quality profiles, and integration path through the worker runtime.                                                      | You are adding GIF export to a tool, debugging GIF artifacts, or deciding between profile defaults and custom encoder options. |
| [Pretty Plotting Platform](pretty-plotting/README.md) | Reusable plotting core (config contracts, presets, modifiers, renderer lifecycle, and export hooks).                                                                | You are building or extending a 2D plotting tool and need a fast bootstrap for render/update/export flows.                     |
| [Tool Spaces Platform](tool-spaces/README.md)         | Space definitions, runtime resolution, UI routing, and headless/MCP discovery flow.                                                                                 | You are creating or editing spaces/groups, wiring tool IDs, or validating MCP-oriented discovery behavior.                     |

## Folder Structure

Use the following structure for platform features:

- `docs/platform/<feature>/README.md`
- `docs/platform/<feature>/screenshots/`

This keeps narrative docs and future visual assets together.
