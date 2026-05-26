import type { Point } from './dollar';

/** Match typical Colab / EMNIST drawing canvas before resize to 28×28. */
export const RASTER_CANVAS_SIZE = 280;
export const RASTER_LINE_WIDTH = 22;
export const RASTER_MARGIN = 24;

/**
 * Scale and centre stroke paths into a fixed square (independent of UI panel size).
 * Training pipelines use a consistent canvas size; drawing at 400×220 stretches letters.
 */
export function normalizeStrokesToSquare(
  strokes: Point[][],
  targetSize: number = RASTER_CANVAS_SIZE,
  margin: number = RASTER_MARGIN,
): Point[][] {
  const flat = strokes.flat();
  if (flat.length === 0) return strokes;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of flat) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const drawSize = targetSize - 2 * margin;
  const scale = drawSize / Math.max(w, h);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const tcx = targetSize / 2;
  const tcy = targetSize / 2;

  return strokes.map((stroke) =>
    stroke.map((p) => ({
      x: (p.x - cx) * scale + tcx,
      y: (p.y - cy) * scale + tcy,
    })),
  );
}
