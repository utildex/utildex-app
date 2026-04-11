[![CI](https://github.com/R-Elias/utildex-angular/actions/workflows/ci.yml/badge.svg)](https://github.com/R-Elias/utildex-angular/actions/workflows/ci.yml)

License: Apache 2.0 with Commons Clause (sale of the software is prohibited).

Utildex is an offline-friendly, privacy-first tools platform that brings practical tools, customizable widgets into one fast web app. It is designed to be self-hostable, modular, and easy to extend, so you can build a personal productivity workspace without depending on external services.

## Contents
- [Screenshots](#screenshots)
- [Self-host (Docker Compose)](#self-host-docker-compose)
- [Headless Build](#headless-build)


## Screenshots

### 1) Welcome Page (Main Page)

![Utildex Welcome Page](./docs/screenshots/welcome-page.png)
### 2) Dashboard (Widgets)
The dashboard is a fully customizable grid-based workspace in which you can setup tool widgets and fillers (notes, images...). Widgets and fillers are tiles of dimension n x n with 1 <= n <= 3.

![Utildex Dashboard with Widgets](./docs/screenshots/dashboard-widgets.png)

### 3) All Tools (Tool Discovery)

![Utildex All Tools Page](./docs/screenshots/all-tools.png)

### 4) Settings (General + Local Data)
The settings allow the users to control the app's behaviour and local data, whether it is language (4 available for now), accent colour, font family, factory resetting the app...

![Utildex Settings - General](./docs/screenshots/settings-general.png)
![Utildex Settings - Local Data](./docs/screenshots/settings-local-data.png)

### 5) Tool example (QR Code Studio)

![Utildex Featured Tool](./docs/screenshots/showcase-tool.png)

## Self-host (Docker Compose)

`docker compose up --build`

Then open `http://localhost:9526`.

Optional overrides:
`PORT=9384 docker compose up --build`
`APP_BASE_URL=https://your-domain.tld docker compose up --build`

## Headless Build

Build a non-UI headless API bundle:

`npm run build:headless`

Output:

`dist-headless/headless/index.js`

Type declarations:

`dist-headless/types/headless/index.d.ts`

API exports:

- `listHeadlessTools(options)`
- `getHeadlessTool(toolId)`
- `callHeadlessTool(toolId, input, options)`
- `listHeadlessSpaces(options)`
- `getHeadlessSpace(spaceId, options)`
- `listHeadlessToolsInSpace(spaceId, options)`
- `listHeadlessSpaceIssues(options)`

Quick example:

`node -e "import('./dist-headless/headless/index.js').then(async (m)=>{const tools=await m.listHeadlessTools({mcpCompatibleOnly:true});console.log(tools.length);})"`

If this package is installed or linked into another Node project, consumers can import it with:

```ts
import { listHeadlessTools, callHeadlessTool } from 'utildex/headless';

const tools = await listHeadlessTools({ mcpCompatibleOnly: true });
const result = await callHeadlessTool('base64-encoder-decoder', {
	mode: 'encode',
	input: 'hello',
});

console.log(tools.length, result);
```
