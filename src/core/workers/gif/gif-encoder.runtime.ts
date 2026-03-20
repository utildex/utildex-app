import { createRuntimeWorker } from '../../runtime-resources';
import type {
  RuntimeGifEncodeOptions,
  RuntimeGifEncodeResult,
  RuntimeGifFrameInput,
  RuntimeGifEncodeWorkerRequest,
  RuntimeGifEncodeWorkerResponse,
} from './gif-encoder.contract';

let requestId = 0;

export async function encodeGifWithRuntimeWorker(
  frames: RuntimeGifFrameInput[],
  options: RuntimeGifEncodeOptions = {},
): Promise<RuntimeGifEncodeResult> {
  if (!frames.length) {
    throw new Error('GIF export requires at least one frame.');
  }

  const worker = createRuntimeWorker('gifEncoder');

  const id = `gif-${++requestId}`;
  const transferables: ArrayBuffer[] = [];
  const payloadFrames = frames.map((frame) => {
    const cloned = new Uint8Array(frame.rgba.length);
    cloned.set(frame.rgba);
    transferables.push(cloned.buffer);

    return {
      rgba: cloned.buffer,
      width: frame.width,
      height: frame.height,
      delayMs: frame.delayMs,
    };
  });

  const request: RuntimeGifEncodeWorkerRequest = {
    id,
    action: 'encode',
    frames: payloadFrames,
    options,
  };

  return new Promise<RuntimeGifEncodeResult>((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.terminate();
    };

    const onError = (error: ErrorEvent) => {
      cleanup();
      reject(error.error ?? new Error(error.message || 'GIF worker failed.'));
    };

    const onMessage = ({ data }: MessageEvent<RuntimeGifEncodeWorkerResponse>) => {
      if (data.id !== id) {
        return;
      }

      cleanup();
      if (!data.ok) {
        reject(new Error(data.error));
        return;
      }

      resolve({
        bytes: new Uint8Array(data.bytes),
        frameCount: data.frameCount,
        width: data.width,
        height: data.height,
        durationMs: data.durationMs,
      });
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage(request, transferables);
  });
}
