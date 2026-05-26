/**
 * Web letter recognition:
 *  1. TensorFlow.js LayersModel (model.json) — works with modern TF/Keras exports
 *  2. TFLite (.tflite) — often FAILS on web: tfjs-tflite WASM is too old for TF 2.17+ models
 *  3. $1 Unistroke fallback
 */

import type { Point, RecognitionResult } from './dollar';
import { recognize } from './dollar';
import { LETTER_TEMPLATES } from './letterTemplates';
import {
  RASTER_CANVAS_SIZE,
  RASTER_LINE_WIDTH,
  normalizeStrokesToSquare,
} from './preprocessStrokes';

const MODEL_SIZE = 28;
const INK_PAD = 4;
const INK_THRESHOLD = 48;

type TFLiteModel = import('@tensorflow/tfjs-tflite/dist/tflite_model').TFLiteModel;
type LayersModel = import('@tensorflow/tfjs').LayersModel;

export type TfliteModelStatus = 'idle' | 'loading' | 'ready' | 'failed';
export type WebMlBackend = 'tfjs' | 'tflite' | 'dollar';

let tf: typeof import('@tensorflow/tfjs') | undefined;
let modelStatus: TfliteModelStatus = 'idle';
let loadError: string | null = null;
let activeBackend: WebMlBackend | null = null;

let tfjsModel: LayersModel | null | 'failed' = null;
let tfliteModel: TFLiteModel | null | 'failed' = null;
let wasmConfigured = false;
let loadTFLiteModelFn:
  | typeof import('@tensorflow/tfjs-tflite/dist/tflite_model').loadTFLiteModel
  | undefined;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function wasmBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/tfjs-wasm/`;
  }
  return '/tfjs-wasm/';
}

function tfjsModelUrls(): string[] {
  const urls: string[] = [];
  const fromEnv = process.env.EXPO_PUBLIC_TFJS_MODEL_URL;
  if (fromEnv) urls.push(fromEnv);
  if (typeof window !== 'undefined' && window.location?.origin) {
    urls.push(`${window.location.origin}/models/character_classifier/model.json`);
  }
  return urls;
}

export function getTfliteModelStatus(): TfliteModelStatus {
  return modelStatus;
}

export function getTfliteLoadError(): string | null {
  return loadError;
}

export function getWebMlBackend(): WebMlBackend | null {
  return activeBackend;
}

export async function preloadTfliteModel(): Promise<TfliteModelStatus> {
  if (!isBrowser() || process.env.EXPO_PUBLIC_TFLITE_WEB === '0') {
    return 'failed';
  }
  try {
    await ensureMlModel();
    return modelStatus;
  } catch {
    return 'failed';
  }
}

function dollarFallback(strokes: Point[][]): RecognitionResult {
  const r = recognize(strokes.flat(), LETTER_TEMPLATES);
  return { ...r, backend: 'dollar' };
}

async function ensureTf(): Promise<typeof import('@tensorflow/tfjs')> {
  if (!tf) tf = await import('@tensorflow/tfjs');
  await tf.ready();
  return tf;
}

async function tryLoadTfjsModel(): Promise<LayersModel | null> {
  if (tfjsModel === 'failed') return null;
  if (tfjsModel) return tfjsModel;

  const tfModule = await ensureTf();
  const urls = tfjsModelUrls();
  let lastErr: unknown;

  for (const url of urls) {
    try {
      const model = await tfModule.loadLayersModel(url);
      tfjsModel = model;
      console.info('[mlRecognize.web] TF.js model loaded from', url);
      return model;
    } catch (e) {
      lastErr = e;
      console.warn('[mlRecognize.web] TF.js load failed:', url, e);
    }
  }

  tfjsModel = 'failed';
  if (urls.length > 0) {
    console.warn('[mlRecognize.web] No TF.js model at public/models/character_classifier/model.json', lastErr);
  }
  return null;
}

async function ensureTfliteRuntime(): Promise<void> {
  if (loadTFLiteModelFn && wasmConfigured) return;

  if (!wasmConfigured) {
    wasmConfigured = true;
    const { setWasmPath } = await import(
      '@tensorflow/tfjs-tflite/dist/tflite_task_library_client/common.js'
    );
    setWasmPath(wasmBaseUrl());
  }

  const tfliteMod = await import('@tensorflow/tfjs-tflite/dist/tflite_model.js');
  loadTFLiteModelFn = tfliteMod.loadTFLiteModel;
}

async function tryLoadTfliteModel(): Promise<TFLiteModel | null> {
  if (tfliteModel === 'failed') return null;
  if (tfliteModel) return tfliteModel;

  await ensureTfliteRuntime();
  await ensureTf();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bundled = require('@/assets/models/character_classifier.tflite') as number;
  const sources: Array<string | number> = [bundled];
  const fromEnv = process.env.EXPO_PUBLIC_TFLITE_MODEL_URL;
  if (fromEnv) sources.push(fromEnv);
  else if (typeof window !== 'undefined' && window.location?.origin) {
    sources.push(`${window.location.origin}/character_classifier.tflite`);
  }

  let lastErr: unknown;

  for (const src of sources) {
    try {
      let resolved: string | ArrayBuffer = src;
      if (typeof src === 'number') {
        const { Asset } = await import('expo-asset');
        const asset = Asset.fromModule(src);
        await asset.downloadAsync();
        resolved = asset.localUri ?? asset.uri;
      }
      const model = await loadTFLiteModelFn!(resolved as string | ArrayBuffer);
      tfliteModel = model;
      console.info('[mlRecognize.web] TFLite loaded from', resolved);
      return model;
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('FULLY_CONNECTED') || msg.includes("Didn't find op")) {
        loadError =
          'TFLite WASM is too old for this model (TF 2.17+). Export TF.js format — see scripts/export_model_for_web.py';
      }
      console.warn('[mlRecognize.web] TFLite load failed:', src, e);
    }
  }

  tfliteModel = 'failed';
  if (!loadError && lastErr) {
    loadError = lastErr instanceof Error ? lastErr.message : String(lastErr);
  }
  return null;
}

async function ensureMlModel(): Promise<void> {
  modelStatus = 'loading';
  loadError = null;

  const tfjs = await tryLoadTfjsModel();
  if (tfjs) {
    activeBackend = 'tfjs';
    modelStatus = 'ready';
    return;
  }

  const tflite = await tryLoadTfliteModel();
  if (tflite) {
    activeBackend = 'tflite';
    modelStatus = 'ready';
    return;
  }

  activeBackend = null;
  modelStatus = 'failed';
  if (!loadError) {
    loadError =
      'No ML model loaded. Add public/models/character_classifier/model.json (run scripts/export_model_for_web.py in Colab).';
  }
  throw new Error(loadError);
}

function rasterizeStrokes(strokes: Point[][], invert: boolean): HTMLCanvasElement {
  const size = RASTER_CANVAS_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  if (invert) {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
  } else {
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
  }
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = RASTER_LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }

  return canvas;
}

function strokesToModelCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const img = source.getContext('2d')!.getImageData(0, 0, w, h);
  const d = img.data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum > INK_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    const out = document.createElement('canvas');
    out.width = MODEL_SIZE;
    out.height = MODEL_SIZE;
    out.getContext('2d')!.fillRect(0, 0, MODEL_SIZE, MODEL_SIZE);
    return out;
  }

  minX = Math.max(0, minX - INK_PAD);
  minY = Math.max(0, minY - INK_PAD);
  maxX = Math.min(w - 1, maxX + INK_PAD);
  maxY = Math.min(h - 1, maxY + INK_PAD);

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const side = Math.max(cw, ch);

  const square = document.createElement('canvas');
  square.width = side;
  square.height = side;
  const sq = square.getContext('2d')!;
  sq.fillStyle = '#000000';
  sq.fillRect(0, 0, side, side);
  const ox = Math.floor((side - cw) / 2);
  const oy = Math.floor((side - ch) / 2);
  sq.drawImage(source, minX, minY, cw, ch, ox, oy, cw, ch);

  const out = document.createElement('canvas');
  out.width = MODEL_SIZE;
  out.height = MODEL_SIZE;
  const o = out.getContext('2d')!;
  o.imageSmoothingEnabled = true;
  o.imageSmoothingQuality = 'high';
  o.drawImage(square, 0, 0, side, side, 0, 0, MODEL_SIZE, MODEL_SIZE);
  return out;
}

function toProbabilities(logits: Float32Array): Float32Array {
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    sum += logits[i];
    if (logits[i] < min) min = logits[i];
    if (logits[i] > max) max = logits[i];
  }
  if (sum > 0.95 && sum < 1.05 && min >= 0 && max <= 1) {
    return logits;
  }

  const out = new Float32Array(logits.length);
  let maxLogit = -Infinity;
  for (let i = 0; i < logits.length; i++) if (logits[i] > maxLogit) maxLogit = logits[i];
  let denom = 0;
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(logits[i] - maxLogit);
    denom += out[i];
  }
  for (let i = 0; i < logits.length; i++) out[i] /= denom || 1;
  return out;
}

function classIndexToLetter(index: number, numClasses: number): string {
  const offset = Number(process.env.EXPO_PUBLIC_TFLITE_CLASS_OFFSET ?? 65);
  if (numClasses === 26) return String.fromCharCode(offset + index);
  if (numClasses === 36) {
    if (index < 10) return String.fromCharCode(48 + index);
    return String.fromCharCode(55 + index);
  }
  if (numClasses === 62) {
    if (index < 10) return String.fromCharCode(48 + index);
    if (index < 36) return String.fromCharCode(55 + index);
    return String.fromCharCode(61 + index);
  }
  return String.fromCharCode(offset + index);
}

function buildInputTensor(
  modelCanvas: HTMLCanvasElement,
  inputShape: readonly number[] | undefined,
): import('@tensorflow/tfjs').Tensor {
  let t = tf!.browser.fromPixels(modelCanvas, 1).toFloat().div(255);
  const shape = inputShape ?? [null, MODEL_SIZE, MODEL_SIZE, 1];
  const isNchw =
    shape.length === 4 &&
    shape[1] === 1 &&
    shape[2] === MODEL_SIZE &&
    shape[3] === MODEL_SIZE;
  if (isNchw) {
    return t.reshape([MODEL_SIZE, MODEL_SIZE]).expandDims(0).expandDims(0);
  }
  return t.expandDims(0);
}

function predictFromTensor(output: import('@tensorflow/tfjs').Tensor | import('@tensorflow/tfjs').Tensor[]): RecognitionResult {
  let outTensor: import('@tensorflow/tfjs').Tensor;
  if (output instanceof tf!.Tensor) {
    outTensor = output;
  } else if (Array.isArray(output)) {
    outTensor = output[0];
  } else {
    throw new Error('Unexpected model output');
  }

  const flatOut = tf!.squeeze(outTensor);
  const data = flatOut.dataSync() as Float32Array;
  flatOut.dispose();
  if (outTensor !== flatOut) outTensor.dispose();

  const probs = toProbabilities(data);
  let bestI = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestI]) bestI = i;
  }

  const backend: WebMlBackend = activeBackend === 'tfjs' ? 'tfjs' : 'tflite';
  return {
    name: classIndexToLetter(bestI, probs.length),
    score: probs[bestI],
    backend,
  };
}

async function predictTfjs(modelCanvas: HTMLCanvasElement): Promise<RecognitionResult> {
  const model = tfjsModel;
  if (!model || model === 'failed') throw new Error('TF.js model not loaded');

  const inputShape = model.inputs[0]?.shape;
  const inputTensor = buildInputTensor(modelCanvas, inputShape ?? undefined);

  try {
    const output = model.predict(inputTensor) as import('@tensorflow/tfjs').Tensor | import('@tensorflow/tfjs').Tensor[];
    return predictFromTensor(output);
  } finally {
    inputTensor.dispose();
  }
}

async function predictTflite(modelCanvas: HTMLCanvasElement): Promise<RecognitionResult> {
  const model = tfliteModel;
  if (!model || model === 'failed') throw new Error('TFLite model not loaded');

  const inputShape = model.inputs[0]?.shape ?? [1, MODEL_SIZE, MODEL_SIZE, 1];
  const inputTensor = buildInputTensor(modelCanvas, inputShape);

  try {
    const raw = (model as unknown as { predict: (inp: import('@tensorflow/tfjs').Tensor) => import('@tensorflow/tfjs').Tensor | import('@tensorflow/tfjs').Tensor[] }).predict(
      inputTensor,
    );
    return predictFromTensor(raw);
  } finally {
    inputTensor.dispose();
  }
}

export async function recognizeLetter(
  strokes: Point[][],
  _canvasWidth: number,
  _canvasHeight: number,
): Promise<RecognitionResult> {
  if (!isBrowser()) return dollarFallback(strokes);
  if (process.env.EXPO_PUBLIC_TFLITE_WEB === '0') return dollarFallback(strokes);

  const flat = strokes.flat();
  if (flat.length < 5) return { name: '?', score: 0, backend: 'dollar' };

  const invert = process.env.EXPO_PUBLIC_TFLITE_INVERT === '1';

  try {
    await ensureMlModel();

    const normalized = normalizeStrokesToSquare(strokes);
    const raster = rasterizeStrokes(normalized, invert);
    const modelCanvas = strokesToModelCanvas(raster);

    const result =
      activeBackend === 'tfjs'
        ? await predictTfjs(modelCanvas)
        : await predictTflite(modelCanvas);

    if (__DEV__) {
      console.info('[mlRecognize.web]', activeBackend, result);
    }

    return result;
  } catch (e) {
    console.warn('[mlRecognize.web] ML failed, $1 fallback:', e);
    return dollarFallback(strokes);
  }
}
