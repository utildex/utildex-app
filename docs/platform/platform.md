# Platform Documentation

This page is the entry point for platform-level documentation.

## Table of Contents

- [GIF Export Platform](gif-export/README.md)
- [Pretty Plotting Platform](pretty-plotting/README.md)

## Reading Guide

| Document | What it covers | Read this when |
|---|---|---|
| [GIF Export Platform](gif-export/README.md) | Shared GIF rendering and encoding pipeline, quality profiles, and integration path through the worker runtime. | You are adding GIF export to a tool, debugging GIF artifacts, or deciding between profile defaults and custom encoder options. |
| [Pretty Plotting Platform](pretty-plotting/README.md) | Reusable plotting core (config contracts, presets, modifiers, renderer lifecycle, and export hooks). | You are building or extending a 2D plotting tool and need a fast bootstrap for render/update/export flows. |

## Folder Structure

Use the following structure for platform features:

- `docs/platform/<feature>/README.md`
- `docs/platform/<feature>/screenshots/`

This keeps narrative docs and future visual assets together.
