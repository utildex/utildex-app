import { mkdirSync, writeFileSync } from 'node:fs';

const HEADLESS_TYPES_DIR = 'dist-headless/types/headless';
const HEADLESS_TYPES_ENTRY = `${HEADLESS_TYPES_DIR}/index.d.ts`;

mkdirSync(HEADLESS_TYPES_DIR, { recursive: true });
writeFileSync(HEADLESS_TYPES_ENTRY, "export * from '../src/headless/index';\n");
