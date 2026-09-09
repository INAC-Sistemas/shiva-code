/**
 * Normalisation for assertions that pin a fragment of the static pages'
 * inline script.
 *
 * `build/*.html` are formatted by an editor, and quote style and line wrapping
 * are not part of what those pages do. The branding pass reformatted
 * `splash.html`, `plugin-recovery.html` and `safe-mode.html` in one commit, and
 * every pinned fragment broke at once while no page behaved differently — the
 * failure said `expected … to contain 'dataset.theme = splashTheme === \'dark\''`
 * about a file that still assigns exactly that, across two lines and in double
 * quotes.
 *
 * Text a person reads on the page keeps its own literal assertions; this covers
 * only the code fragments, where the pin is about the mechanism and the
 * formatting is noise.
 * @param html - the page source as read from disk.
 * @returns the source with one quote style and collapsed whitespace.
 */
export function normalizeHtmlSource(html: string): string {
  return html.replace(/'/g, '"').replace(/\s+/g, ' ')
}

/**
 * The same normalisation applied to an expected fragment.
 *
 * Expectations are written the way the file reads today; passing them through
 * the same function is what keeps a later reformat from turning a passing test
 * into a puzzle.
 * @param fragment - the fragment to look for.
 * @returns the fragment in the normalised form.
 */
export function normalizedFragment(fragment: string): string {
  return normalizeHtmlSource(fragment)
}
