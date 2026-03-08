export const RUNTIME_RESOURCES = {
  workers: {
    pdfjs: 'assets/pdfjs/pdf.worker.min.mjs',
  },
} as const;

export type WorkerResourceKey = keyof typeof RUNTIME_RESOURCES.workers;

export function getWorkerResource(key: WorkerResourceKey): string {
  return RUNTIME_RESOURCES.workers[key];
}
