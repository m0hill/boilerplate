import type { Context, MiddlewareHandler } from "hono"
import {
  createLogger,
  getField,
  getStringField,
  statusFromError,
  type CreateLoggerOptions,
  type Logger,
} from "./log.js"

const noopLogger: Logger = {
  set() {},
  error() {},
  info() {},
  warn() {},
  emit() {
    return null
  },
  getContext() {
    return {}
  },
}

export type LoggerVariables = {
  log: Logger
}

type LoggerEnv = {
  Variables: LoggerVariables
}

export interface LoggerOptions {
  include?: readonly string[]
  exclude?: readonly string[]
  headers?: readonly string[]
  requestIdHeader?: string
  cf?: boolean
  pretty?: boolean
}

function matchesPrefix(path: string, prefixes: readonly string[] | undefined): boolean {
  return prefixes?.some((prefix) => path.startsWith(prefix)) ?? false
}

function shouldLog(path: string, options: LoggerOptions): boolean {
  if (matchesPrefix(path, options.exclude)) return false
  if (!options.include || options.include.length === 0) return true
  return matchesPrefix(path, options.include)
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined
}

function requestIdFor(request: Request, headerName: string): string {
  return (
    nonEmpty(request.headers.get(headerName)) ??
    nonEmpty(request.headers.get("cf-ray")) ??
    crypto.randomUUID()
  )
}

function pickCfContext(request: Request): Record<string, unknown> | undefined {
  const cf = getField(request, "cf")
  const out: Record<string, unknown> = {}

  for (const key of ["colo", "country"] as const) {
    const value = getStringField(cf, key)
    if (value !== undefined) out[key] = value
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function collectHeaders(
  headers: Headers,
  include: readonly string[] | undefined,
): Record<string, string> | undefined {
  if (!include || include.length === 0) return undefined

  const out: Record<string, string> = {}
  for (const name of include) {
    const value = nonEmpty(headers.get(name))
    if (value !== undefined) out[name.toLowerCase()] = value
  }

  return Object.keys(out).length > 0 ? out : undefined
}

function isLocalRequest(c: Context): boolean {
  const hostname = new URL(c.req.url).hostname
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
}

function createLoggerOptions(c: Context, pretty: boolean | undefined): CreateLoggerOptions {
  const options: CreateLoggerOptions = {}
  const environment = getStringField(c.env, "NODE_ENV")
  if (environment !== undefined) options.environment = environment

  if (pretty !== undefined) options.pretty = pretty
  else if (isLocalRequest(c)) options.pretty = true

  return options
}

function shouldDeferUntilBodyCloses(response: Response): boolean {
  if (!response.body) return false
  return response.headers.get("content-type")?.includes("text/event-stream") ?? false
}

function withBodyCompletion(response: Response, onDone: (error?: unknown) => void): Response {
  const body = response.body
  if (!body) {
    onDone()
    return response
  }

  const reader = body.getReader()
  let done = false
  const finish = (error?: unknown): void => {
    if (done) return
    done = true
    onDone(error)
  }

  const wrapped = new ReadableStream({
    async pull(controller) {
      try {
        const chunk = await reader.read()
        if (chunk.done) {
          finish()
          controller.close()
          return
        }
        controller.enqueue(chunk.value)
      } catch (error) {
        finish(error)
        controller.error(error)
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason)
      } finally {
        finish()
      }
    },
  })

  return new Response(wrapped, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

export function logger<E extends LoggerEnv = LoggerEnv>(
  options: LoggerOptions = {},
): MiddlewareHandler<E> {
  const requestIdHeader = options.requestIdHeader ?? "x-request-id"
  const includeCf = options.cf ?? true

  return async (c, next) => {
    const path = c.req.path
    if (!shouldLog(path, options)) {
      c.set("log", noopLogger)
      await next()
      return
    }

    const request = c.req.raw
    const requestId = requestIdFor(request, requestIdHeader)
    const logContext: Record<string, unknown> = {
      method: c.req.method,
      path,
      requestId,
    }

    const cfRay = nonEmpty(request.headers.get("cf-ray"))
    if (cfRay !== undefined) logContext.cfRay = cfRay

    if (includeCf) {
      const cf = pickCfContext(request)
      if (cf !== undefined) logContext.cf = cf
    }

    const requestHeaders = collectHeaders(request.headers, options.headers)
    if (requestHeaders !== undefined) logContext.requestHeaders = requestHeaders

    const log = createLogger(logContext, createLoggerOptions(c, options.pretty))
    c.set("log", log)
    c.header("x-request-id", requestId)

    try {
      await next()
      const status = c.res.status
      const finish = (streamError?: unknown): void => {
        if (streamError !== undefined) log.error(streamError)
        else if (c.error) log.error(c.error)
        log.emit({ status })
      }

      if (shouldDeferUntilBodyCloses(c.res)) {
        c.res = withBodyCompletion(c.res, finish)
        return
      }

      finish()
    } catch (error) {
      const status = statusFromError(error)
      log.error(error)
      log.emit({ status })
      throw error
    }
  }
}
