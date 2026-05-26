/**
 * Native (iOS / Android) letter recognition — $1 Unistroke only.
 * TensorFlow.js + TFLite are not bundled here (see mlRecognize.web.ts).
 */

import type { Point, RecognitionResult } from './dollar';
import { recognize } from './dollar';
import { LETTER_TEMPLATES } from './letterTemplates';

/**
 * @param strokes Separate pen-down segments (order preserved; flattened for $1).
 */
export async function recognizeLetter(
  strokes: Point[][],
  _canvasWidth: number,
  _canvasHeight: number,
): Promise<RecognitionResult> {
  const flat = strokes.flat();
  const r = recognize(flat, LETTER_TEMPLATES);
  return { ...r, backend: 'dollar' };
}

export async function preloadTfliteModel(): Promise<'failed'> {
  return 'failed';
}

export function getTfliteModelStatus(): 'failed' {
  return 'failed';
}

export function getTfliteLoadError(): null {
  return null;
}

export function getWebMlBackend(): null {
  return null;
}
