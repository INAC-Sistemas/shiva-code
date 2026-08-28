import { WINDOWS_TITLEBAR_HEIGHT } from '../shared/desktop-menu'

export function shouldLoadHarnessUrl(currentUrl: string, targetUrl: string): boolean {
  if (currentUrl === '' || currentUrl === 'about:blank') return true

  try {
    return new URL(currentUrl).origin !== new URL(targetUrl).origin
  } catch {
    return true
  }
}

export function desktopHarnessUrl(url: string, platform: NodeJS.Platform): string {
  if (platform !== 'win32') return url

  try {
    const parsed = new URL(url)
    parsed.searchParams.set('dsh-desktop-mode', 'advanced')
    parsed.searchParams.set('dsh-desktop-platform', platform)
    parsed.searchParams.set('dsh-desktop-titlebar-inset', String(WINDOWS_TITLEBAR_HEIGHT))
    return parsed.toString()
  } catch {
    return url
  }
}

export function isAbortedNavigationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false

  const navigationError = error as { code?: unknown; errno?: unknown; message?: unknown }
  if (navigationError.code === 'ERR_ABORTED' || navigationError.errno === -3) return true

  return (
    typeof navigationError.message === 'string' &&
    /(?:^|\s)ERR_ABORTED\s*\(-3\)(?:\s|$)/.test(navigationError.message)
  )
}
