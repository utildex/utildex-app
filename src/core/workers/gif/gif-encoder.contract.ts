export interface RuntimeGifFrameInput {
  rgba: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  delayMs?: number;
}

export interface RuntimeGifEncodeOptions {
  repeat?: number;
  maxColors?: number;
  quantizeFormat?: 'rgb565' | 'rgb444';
}

export interface RuntimeGifEncodeResult {
  bytes: Uint8Array;
  frameCount: number;
  width: number;
  height: number;
  durationMs: number;
}

export interface RuntimeGifEncodeWorkerFrame {
  rgba: ArrayBuffer;
  width: number;
  height: number;
  delayMs?: number;
}

export interface RuntimeGifEncodeWorkerRequest {
  id: string;
  action: 'encode';
  frames: RuntimeGifEncodeWorkerFrame[];
  options?: RuntimeGifEncodeOptions;
}

export interface RuntimeGifEncodeWorkerSuccess {
  id: string;
  ok: true;
  bytes: ArrayBuffer;
  frameCount: number;
  width: number;
  height: number;
  durationMs: number;
}

export interface RuntimeGifEncodeWorkerFailure {
  id: string;
  ok: false;
  error: string;
}

export type RuntimeGifEncodeWorkerResponse =
  | RuntimeGifEncodeWorkerSuccess
  | RuntimeGifEncodeWorkerFailure;
