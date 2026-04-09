/** Capitalize only the first letter of a string. */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Pad a number to always show at least two digits (e.g. 1 → "01"). */
export function padNumber(n: number): string {
  return n.toString().padStart(2, '0');
}
