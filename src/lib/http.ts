type FetchInitWithTimeout = RequestInit & {
  timeoutMs?: number
}

const DEFAULT_FETCH_TIMEOUT_MS = 10_000

export async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: FetchInitWithTimeout = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal, ...fetchInit } = init
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const abortFromCaller = () => controller.abort(signal?.reason)

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener('abort', abortFromCaller, { once: true })
    }
  }

  try {
    return await fetch(input, {
      ...fetchInit,
      signal: controller.signal
    })
  } catch (error) {
    if (timedOut) {
      throw new Error(`Fetch timed out after ${timeoutMs}ms`)
    }

    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
