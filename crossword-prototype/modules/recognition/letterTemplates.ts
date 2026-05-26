/**
 * Single-stroke letter templates for A–Z uppercase.
 *
 * Each letter is traced as one continuous stroke in a 0–100 coordinate space.
 * Waypoints are linearly interpolated at `DENSITY` points per segment so
 * the $1 resample step has enough resolution to work with.
 *
 * Drawing instructions (shown to the user):
 *   A  – bottom-left → peak → bottom-right → left crossbar → right crossbar
 *   B  – top-left → down → back up → top bump arc → middle → bottom bump arc
 *   C  – top-right arc → left → bottom-right arc
 *   D  – top-left → down → arc right and back to top
 *   E  – top-right → top-left → down → bottom-right → back → crossbar
 *   F  – top-right → top-left → down → crossbar
 *   G  – like C → continue with horizontal into the middle
 *   H  – left-down → up to crossbar → right → down
 *   I  – top serifs → vertical → bottom serifs
 *   J  – top → down → hook left at bottom
 *   K  – left vertical → diagonal up-right → diagonal down-right
 *   L  – top → down → right
 *   M  – bottom-left → up → valley → up → bottom-right
 *   N  – bottom-left → top-left → bottom-right → top-right
 *   O  – clockwise oval from top
 *   P  – left vertical → top bump arc
 *   Q  – like O → tail stroke
 *   R  – like P → diagonal leg
 *   S  – top-right arc → left → center → right → bottom-left arc
 *   T  – horizontal → vertical
 *   U  – top-left → down → arc bottom → up-right
 *   V  – top-left → bottom-center → top-right
 *   W  – top-left → valley → peak → valley → top-right
 *   X  – top-left → bottom-right → back through center → top-right → bottom-left
 *   Y  – top-left → center → top-right → back to center → down
 *   Z  – top-left → top-right → bottom-left → bottom-right
 */

import { buildTemplates, type Template } from './dollar';

type Waypoints = [number, number][];

const DENSITY = 10; // points interpolated per segment

function pts(waypoints: Waypoints): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [x1, y1] = waypoints[i];
    const [x2, y2] = waypoints[i + 1];
    for (let j = 0; j < DENSITY; j++) {
      const t = j / DENSITY;
      result.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
  }
  const [lx, ly] = waypoints[waypoints.length - 1];
  result.push({ x: lx, y: ly });
  return result;
}

const RAW_TEMPLATES: Template[] = [
  // ── A ──────────────────────────────────────────────────────────────────────
  {
    name: 'A',
    points: pts([[0, 100], [50, 0], [100, 100], [62, 60], [38, 60]]),
  },

  // ── B ──────────────────────────────────────────────────────────────────────
  {
    name: 'B',
    points: pts([
      [0, 0], [0, 100],
      [0, 50], [65, 35], [80, 20], [65, 0], [0, 0],  // top bump
      [0, 50], [70, 60], [85, 75], [70, 100], [0, 100], // bottom bump
    ]),
  },

  // ── C ──────────────────────────────────────────────────────────────────────
  {
    name: 'C',
    points: pts([
      [92, 18], [78, 6], [55, 0], [32, 5],
      [12, 22], [2, 45], [0, 55],
      [10, 78], [28, 94], [55, 100], [78, 96], [92, 82],
    ]),
  },

  // ── D ──────────────────────────────────────────────────────────────────────
  {
    name: 'D',
    points: pts([
      [0, 0], [0, 100],
      [35, 100], [65, 88], [88, 70], [100, 50],
      [88, 30], [65, 12], [35, 0], [0, 0],
    ]),
  },

  // ── E ──────────────────────────────────────────────────────────────────────
  {
    name: 'E',
    points: pts([
      [88, 0], [0, 0],
      [0, 50], [60, 50],
      [0, 50],
      [0, 100], [88, 100],
    ]),
  },

  // ── F ──────────────────────────────────────────────────────────────────────
  {
    name: 'F',
    points: pts([
      [88, 0], [0, 0],
      [0, 50], [65, 50],
      [0, 50],
      [0, 100],
    ]),
  },

  // ── G ──────────────────────────────────────────────────────────────────────
  {
    name: 'G',
    points: pts([
      [92, 18], [78, 6], [55, 0], [32, 5],
      [12, 22], [2, 45], [0, 55],
      [10, 78], [28, 94], [55, 100], [78, 96], [92, 82],
      [100, 65], [100, 50], [58, 50],
    ]),
  },

  // ── H ──────────────────────────────────────────────────────────────────────
  {
    name: 'H',
    points: pts([
      [0, 0], [0, 100],
      [0, 50], [100, 50],
      [100, 0], [100, 100],
    ]),
  },

  // ── I ──────────────────────────────────────────────────────────────────────
  {
    name: 'I',
    points: pts([
      [18, 0], [82, 0],
      [50, 0], [50, 100],
      [18, 100], [82, 100],
    ]),
  },

  // ── J ──────────────────────────────────────────────────────────────────────
  {
    name: 'J',
    points: pts([
      [65, 0], [65, 80],
      [55, 96], [38, 100], [20, 94], [10, 80],
    ]),
  },

  // ── K ──────────────────────────────────────────────────────────────────────
  {
    name: 'K',
    points: pts([
      [0, 0], [0, 100],
      [0, 50], [95, 0],
      [0, 50], [95, 100],
    ]),
  },

  // ── L ──────────────────────────────────────────────────────────────────────
  {
    name: 'L',
    points: pts([[0, 0], [0, 100], [88, 100]]),
  },

  // ── M ──────────────────────────────────────────────────────────────────────
  {
    name: 'M',
    points: pts([[0, 100], [0, 0], [50, 62], [100, 0], [100, 100]]),
  },

  // ── N ──────────────────────────────────────────────────────────────────────
  {
    name: 'N',
    points: pts([[0, 100], [0, 0], [100, 100], [100, 0]]),
  },

  // ── O ──────────────────────────────────────────────────────────────────────
  {
    name: 'O',
    points: pts([
      [50, 0], [82, 8], [96, 30], [100, 50],
      [96, 70], [82, 92], [50, 100],
      [18, 92], [4, 70], [0, 50],
      [4, 30], [18, 8], [50, 0],
    ]),
  },

  // ── P ──────────────────────────────────────────────────────────────────────
  {
    name: 'P',
    points: pts([
      [0, 100], [0, 0],
      [62, 0], [92, 18], [62, 48], [0, 48],
    ]),
  },

  // ── Q ──────────────────────────────────────────────────────────────────────
  {
    name: 'Q',
    points: pts([
      [50, 0], [82, 8], [96, 30], [100, 50],
      [96, 70], [82, 92], [50, 100],
      [18, 92], [4, 70], [0, 50],
      [4, 30], [18, 8], [50, 0],
      [68, 68], [92, 92],
    ]),
  },

  // ── R ──────────────────────────────────────────────────────────────────────
  {
    name: 'R',
    points: pts([
      [0, 100], [0, 0],
      [62, 0], [92, 18], [62, 48], [0, 48],
      [100, 100],
    ]),
  },

  // ── S ──────────────────────────────────────────────────────────────────────
  {
    name: 'S',
    points: pts([
      [90, 18], [70, 5], [42, 0],
      [16, 6], [5, 22], [22, 42],
      [55, 52], [82, 62],
      [95, 78], [82, 95], [52, 100],
      [20, 96], [8, 82],
    ]),
  },

  // ── T ──────────────────────────────────────────────────────────────────────
  {
    name: 'T',
    points: pts([[0, 0], [100, 0], [50, 0], [50, 100]]),
  },

  // ── U ──────────────────────────────────────────────────────────────────────
  {
    name: 'U',
    points: pts([
      [0, 0], [0, 78],
      [8, 94], [28, 100], [50, 100], [72, 100],
      [92, 94], [100, 78], [100, 0],
    ]),
  },

  // ── V ──────────────────────────────────────────────────────────────────────
  {
    name: 'V',
    points: pts([[0, 0], [50, 100], [100, 0]]),
  },

  // ── W ──────────────────────────────────────────────────────────────────────
  {
    name: 'W',
    points: pts([[0, 0], [22, 100], [50, 48], [78, 100], [100, 0]]),
  },

  // ── X ──────────────────────────────────────────────────────────────────────
  {
    name: 'X',
    points: pts([[0, 0], [100, 100], [50, 50], [100, 0], [0, 100]]),
  },

  // ── Y ──────────────────────────────────────────────────────────────────────
  {
    name: 'Y',
    points: pts([[0, 0], [50, 52], [100, 0], [50, 52], [50, 100]]),
  },

  // ── Z ──────────────────────────────────────────────────────────────────────
  {
    name: 'Z',
    points: pts([[0, 0], [100, 0], [0, 100], [100, 100]]),
  },
];

/**
 * Pre-processed templates — normalised once at module load.
 * Import this (not RAW_TEMPLATES) for recognition.
 */
export const LETTER_TEMPLATES = buildTemplates(RAW_TEMPLATES);
