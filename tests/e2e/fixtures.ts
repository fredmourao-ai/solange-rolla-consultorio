import {
  expect,
  test as base,
  type ConsoleMessage,
  type Page,
  type Request,
  type Response,
} from '@playwright/test'

export { expect, type Page }

function requestLabel(request: Request) {
  return `${request.method()} ${request.url()}`
}

// Next.js may cancel speculative RSC prefetches when navigation or route state changes.
// Only this exact GET + _rsc + ERR_ABORTED pattern is expected; all other failures remain fatal.
export function isExpectedNextPrefetchAbort(method: string, url: string, errorText: string | undefined) {
  if (method !== 'GET' || errorText !== 'net::ERR_ABORTED') return false
  try { return new URL(url).searchParams.has('_rsc') } catch { return false }
}

export function isExpectedNextActionAbort(method: string, errorText: string | undefined, headers: Record<string, string>) {
  return method === 'POST' && errorText === 'net::ERR_ABORTED'
    && Boolean(headers['next-action']) && headers.accept?.includes('text/x-component') === true
}

export function isExpectedDownloadAbort(method: string, url: string, errorText: string | undefined) {
  if (method !== 'GET' || errorText !== 'net::ERR_ABORTED') return false
  try { const parsed = new URL(url); return parsed.pathname === '/relatorios/exportar' && ['csv', 'xlsx', 'pdf'].includes(parsed.searchParams.get('format') ?? '') } catch { return false }
}

export function isExpectedAuthLogoutAbort(method: string, url: string, errorText: string | undefined) {
  if (method !== 'POST' || errorText !== 'net::ERR_ABORTED') return false
  try { const parsed = new URL(url); return parsed.pathname.endsWith('/auth/v1/logout') && parsed.searchParams.get('scope') === 'local' } catch { return false }
}

export function isExpectedDocumentClientErrorConsole(message: string, url: string, expectedDocumentClientErrors: Set<string>) {
  return /^Failed to load resource: the server responded with a status of 4\d\d /.test(message)
    && Boolean(url) && expectedDocumentClientErrors.has(url)
}

export const test = base.extend({
  page: async ({ page }, providePage) => {
    const failures: string[] = []
    const expectedDocumentClientErrors = new Set<string>()
    const onPageError = (error: Error) => failures.push(`pageerror: ${error.message}`)
    const onRequestFailed = (request: Request) => {
      const errorText = request.failure()?.errorText
      const headers = request.headers()
      if (isExpectedNextPrefetchAbort(request.method(), request.url(), errorText)) return
      if (isExpectedNextActionAbort(request.method(), errorText, headers)) return
      if (isExpectedDownloadAbort(request.method(), request.url(), errorText)) return
      if (isExpectedAuthLogoutAbort(request.method(), request.url(), errorText)) return
      failures.push(`requestfailed: ${requestLabel(request)} ${errorText ?? 'unknown'}`)
    }
    const onConsole = (message: ConsoleMessage) => {
      if (message.type() !== 'error') return
      if (isExpectedDocumentClientErrorConsole(message.text(), message.location().url, expectedDocumentClientErrors)) return
      failures.push(`console.error: ${message.text()}`)
    }
    const onResponse = (response: Response) => {
      const status = response.status()
      if (status >= 400 && status < 500 && response.request().resourceType() === 'document') expectedDocumentClientErrors.add(response.url())
      if (status >= 500) failures.push(`http ${status}: ${requestLabel(response.request())}`)
    }
    page.on('pageerror', onPageError)
    page.on('requestfailed', onRequestFailed)
    page.on('console', onConsole)
    page.on('response', onResponse)
    try {
      await providePage(page)
    } finally {
      page.off('pageerror', onPageError)
      page.off('requestfailed', onRequestFailed)
      page.off('console', onConsole)
      page.off('response', onResponse)
      expect(failures, 'unexpected browser/runtime failures').toEqual([])
    }
  },
})
