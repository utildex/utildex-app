# Self-hosted CheerpX runtime module

Place the LeaningTech CheerpX ESM runtime module at this exact path:

- `/assets/simudex/debian/cheerpx/cx.esm.js`

The sync command also mirrors CheerpX companion runtime files beside the module
and under `root/`, because different CheerpX loaders resolve those files from
different base URLs.

This repository intentionally does not commit the vendor runtime binary. The
runtime loader in Simudex is configured to require this same-origin module for
local-only mode.

Use this command to download/update the file and required companion runtime
files from the installed `@leaningtech/cheerpx` version:

- `npm run prepare:simudex-cheerpx`
