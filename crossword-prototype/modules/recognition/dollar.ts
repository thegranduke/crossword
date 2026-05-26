/**
 * Stroke-based letter recognizer adapted from the $1 Unistroke Recognizer.
 * Key differences from the original: no rotation normalization, uniform scaling.
 * This preserves orientation (vital for distinguishing N vs Z, U vs C, etc.).
 *
 * Reference: Wobbrock et al. "The $1 Unistroke Recognizer" (2007)
 */

export type Point = { x: number; y: number };

export type Template = {
  name: string;
  points: Point[];
};

export type RecognitionResult = {
  name: string;
  score: number;
  /** Which recognizer produced this result (web: tflite vs dollar fallback). */
  backend?: 'tflite' | 'dollar';
};

const NUM_POINTS = 64;
const SQUARE_SIZE = 250;
// Diagonal of the bounding square — used to normalize the score to [0, 1]
const HALF_DIAGONAL = Math.sqrt(2 * SQUARE_SIZE * SQUARE_SIZE) / 2;

function dist(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function pathLen(points: Point[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += dist(points[i - 1], points[i]);
  return d;
}

/**
 * Resample points to n evenly-spaced points along the path.
 */
function resample(points: Point[], n: number): Point[] {
  const interval = pathLen(points) / (n - 1);
  if (interval === 0) return Array<Point>(n).fill({ ...points[0] });

  let D = 0;
  const result: Point[] = [{ ...points[0] }];
  let buf = [...points];

  for (let i = 1; i < buf.length; i++) {
    const d = dist(buf[i - 1], buf[i]);
    if (D + d >= interval) {
      const t = (interval - D) / d;
      const q: Point = {
        x: buf[i - 1].x + t * (buf[i].x - buf[i - 1].x),
        y: buf[i - 1].y + t * (buf[i].y - buf[i - 1].y),
      };
      result.push(q);
      buf = [q, ...buf.slice(i)];
      i = 0;
      D = 0;
    } else {
      D += d;
    }
  }

  while (result.length < n) result.push({ ...buf[buf.length - 1] });
  return result.slice(0, n);
}

function centroid(points: Point[]): Point {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}

/**
 * Uniform scale: largest dimension becomes `size`, aspect ratio preserved.
 * Better than non-uniform for letters (I stays thin, O stays round).
 */
function scaleTo(points: Point[], size: number): Point[] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const maxDim = Math.max(maxX - minX, maxY - minY, 1);
  const scale = size / maxDim;
  return points.map((p) => ({ x: p.x * scale, y: p.y * scale }));
}

function translateTo(points: Point[], target: Point): Point[] {
  const c = centroid(points);
  return points.map((p) => ({ x: p.x + target.x - c.x, y: p.y + target.y - c.y }));
}

function avgPathDist(a: Point[], b: Point[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += dist(a[i], b[i]);
  return d / a.length;
}

/**
 * Normalize raw points: resample → scale (uniform) → center at origin.
 * No rotation step — orientation is meaningful for letters.
 */
export function normalizePoints(points: Point[]): Point[] {
  let pts = resample(points, NUM_POINTS);
  pts = scaleTo(pts, SQUARE_SIZE);
  pts = translateTo(pts, { x: 0, y: 0 });
  return pts;
}

/**
 * Pre-process raw templates once so recognition is fast at runtime.
 */
export function buildTemplates(
  raw: Template[],
): Array<{ name: string; points: Point[] }> {
  return raw.map((t) => ({ name: t.name, points: normalizePoints(t.points) }));
}

/**
 * Recognize a stroke against pre-processed templates.
 * Returns the best matching letter name and a confidence score in [0, 1].
 */
export function recognize(
  rawPoints: Point[],
  processedTemplates: Array<{ name: string; points: Point[] }>,
): RecognitionResult {
  if (rawPoints.length < 4) return { name: '?', score: 0 };

  const pts = normalizePoints(rawPoints);

  let best = Infinity;
  let bestName = '?';

  for (const t of processedTemplates) {
    const d = avgPathDist(pts, t.points);
    if (d < best) {
      best = d;
      bestName = t.name;
    }
  }

  return {
    name: bestName,
    score: Math.max(0, Math.min(1, 1 - best / HALF_DIAGONAL)),
  };
}
