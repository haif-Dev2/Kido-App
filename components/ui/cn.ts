/**
 * Tiny class name joiner — filters falsy values.
 * (Kept small; swap for `clsx` + `tailwind-merge` if needed.)
 */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(' ');
}
