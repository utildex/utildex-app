export const RUNTIME_RESOURCES = {
  workers: {
    pdfjs: 'assets/pdfjs/pdf.worker.min.mjs',
  },
} as const;

export type WorkerResourceKey = keyof typeof RUNTIME_RESOURCES.workers;

const RUNTIME_WORKER_FACTORIES = {
  gifEncoder: () =>
    new Worker(new URL('./workers/gif/gif-encoder.worker', import.meta.url), {
      type: 'module',
    }),
} as const;

export type RuntimeWorkerFactoryKey = keyof typeof RUNTIME_WORKER_FACTORIES;

export function getWorkerResource(key: WorkerResourceKey): string {
  return RUNTIME_RESOURCES.workers[key];
}

export function createRuntimeWorker(key: RuntimeWorkerFactoryKey): Worker {
  return RUNTIME_WORKER_FACTORIES[key]();
}
