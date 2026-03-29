/** Semantic version from package.json at build time */
export const APP_VERSION: string = __APP_VERSION__

/** UTC ISO time when this bundle was built (or dev server started) */
export const APP_BUILD_TIME: string = __APP_BUILD_TIME__

export function formatBuildTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
