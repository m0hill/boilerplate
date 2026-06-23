export type LogLevel = "info" | "warn" | "error"

export interface ServiceContext {
  service: string
  environment: string
  version?: string
  region?: string
}

export interface WideEvent extends Record<string, unknown>, ServiceContext {
  timestamp: string
  level: LogLevel
  duration: string
  durationMs: number
}

export interface SampleKeepRule {
  status?: number
  durationMs?: number
  level?: LogLevel
}

export interface SampleConfig {
  rate?: number
  keep?: readonly SampleKeepRule[]
}

export interface RedactConfig {
  keys?: readonly string[]
}

export interface LogConfig {
  service?: string
  environment?: string
  version?: string
  region?: string
  pretty?: boolean
  silent?: boolean
  sample?: SampleConfig
  redact?: boolean | RedactConfig
}

export interface RequestLogEntry {
  level: "info" | "warn"
  message: string
}

export interface Logger {
  set: (data: Record<string, unknown>) => void
  error: (error: unknown, context?: Record<string, unknown>) => void
  info: (message: string, context?: Record<string, unknown>) => void
  warn: (message: string, context?: Record<string, unknown>) => void
  emit: (overrides?: Record<string, unknown>) => WideEvent | null
  getContext: () => Record<string, unknown>
}

export interface CreateLoggerOptions {
  environment?: string
  pretty?: boolean
  now?: () => Date
  clock?: () => number
  random?: () => number
}

interface ResolvedRedactConfig {
  keys: readonly string[]
}

interface PrettyEntry {
  key: string
  value: string
  children?: readonly string[]
}

const colors = {
  reset: "\x1B[0m",
  dim: "\x1B[2m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  cyan: "\x1B[36m",
} as const

const redacted = "[REDACTED]"

const defaultSensitiveKeyPattern =
  /authorization|cookie|password|passwd|secret|token|api[-_]?key|credential/i

const severity: Record<LogLevel, number> = {
  info: 1,
  warn: 2,
  error: 3,
}

const baseEventKeys = new Set([
  "timestamp",
  "level",
  "service",
  "environment",
  "version",
  "region",
  "duration",
  "durationMs",
])

const prettyHeaderKeys = new Set([
  "timestamp",
  "level",
  "service",
  "environment",
  "version",
  "region",
  "method",
  "path",
  "status",
  "duration",
  "durationMs",
])

function defaultEnvironment(): string {
  return isWorkers() ? "production" : "development"
}

function resolveService(config: LogConfig): ServiceContext {
  const service: ServiceContext = {
    service: config.service ?? "app",
    environment: config.environment ?? defaultEnvironment(),
  }
  if (config.version !== undefined) service.version = config.version
  if (config.region !== undefined) service.region = config.region
  return service
}

let globalService: ServiceContext = resolveService({})
let globalPretty: boolean | undefined
let globalSilent = defaultSilent()
let globalSample: SampleConfig = {}
let globalRedact: ResolvedRedactConfig | undefined = resolveRedactConfig(true)

export function initLog(config: LogConfig = {}): void {
  globalService = resolveService(config)
  globalPretty = config.pretty
  globalSilent = config.silent ?? defaultSilent()
  globalSample = config.sample ?? {}
  globalRedact = resolveRedactConfig(config.redact ?? true)
}

function defaultSilent(): boolean {
  return runtimeEnv("NODE_ENV") === "test" || runtimeEnv("VITEST") === "true"
}

function runtimeEnv(name: string): string | undefined {
  const processValue = getField(globalThis, "process")
  const envValue = getField(processValue, "env")
  const value = getField(envValue, name)
  return typeof value === "string" ? value : undefined
}

function isWorkers(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"
}

export function getField(source: unknown, key: string): unknown {
  if (source === null || typeof source !== "object") return undefined
  return Reflect.get(source, key)
}

export function getStringField(source: unknown, key: string): string | undefined {
  const value = getField(source, key)
  return typeof value === "string" ? value : undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function mergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue

    const existing = target[key]
    if (isPlainObject(existing) && isPlainObject(value)) {
      mergeInto(existing, value)
      continue
    }

    if (Array.isArray(existing) && Array.isArray(value)) {
      target[key] = [...existing, ...value]
      continue
    }

    target[key] = value
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)}s`
  return `${(ms / 1000).toFixed(1)}s`
}

function normalizedStatus(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined
  if (!Number.isInteger(value) || value < 100 || value > 599) return undefined
  return value
}

export function statusFromError(error: unknown): number {
  const status = normalizedStatus(getField(error, "status"))
  if (status !== undefined) return status

  const statusCode = normalizedStatus(getField(error, "statusCode"))
  if (statusCode !== undefined) return statusCode

  return 500
}

function shouldKeep(
  level: LogLevel,
  status: number | undefined,
  durationMs: number,
  random: () => number,
): boolean {
  for (const rule of globalSample.keep ?? []) {
    if (rule.status !== undefined && status !== undefined && status >= rule.status) return true
    if (rule.durationMs !== undefined && durationMs >= rule.durationMs) return true
    if (rule.level !== undefined && severity[level] >= severity[rule.level]) return true
  }

  const rate = globalSample.rate ?? 1
  if (rate >= 1) return true
  if (rate <= 0) return false
  return random() < rate
}

function resolveRedactConfig(config: boolean | RedactConfig): ResolvedRedactConfig | undefined {
  if (config === false) return undefined
  if (config === true) return { keys: [] }
  return { keys: config.keys ?? [] }
}

function isSensitiveKey(key: string, config: ResolvedRedactConfig): boolean {
  if (defaultSensitiveKeyPattern.test(key)) return true

  const lowerKey = key.toLowerCase()
  return config.keys.some((fragment) => lowerKey.includes(fragment.toLowerCase()))
}

function sanitizeValue(
  key: string,
  value: unknown,
  redact: ResolvedRedactConfig | undefined,
  seen: WeakSet<object>,
): unknown {
  if (redact && isSensitiveKey(key, redact)) return redacted
  if (typeof value === "bigint") return value.toString()

  if (Array.isArray(value)) {
    if (seen.has(value)) return "[Circular]"
    seen.add(value)
    const sanitized = value.map((item) => sanitizeValue("", item, redact, seen))
    seen.delete(value)
    return sanitized
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) return "[Circular]"
    seen.add(value)

    const sanitized: Record<string, unknown> = {}
    for (const [childKey, childValue] of Object.entries(value)) {
      sanitized[childKey] = sanitizeValue(childKey, childValue, redact, seen)
    }

    seen.delete(value)
    return sanitized
  }

  return value
}

function sanitizeEvent(event: WideEvent): WideEvent {
  const sanitized: WideEvent = {
    timestamp: event.timestamp,
    level: event.level,
    service: event.service,
    environment: event.environment,
    duration: event.duration,
    durationMs: event.durationMs,
  }
  if (event.version !== undefined) sanitized.version = event.version
  if (event.region !== undefined) sanitized.region = event.region

  const seen = new WeakSet<object>()
  for (const [key, value] of Object.entries(event)) {
    if (baseEventKeys.has(key)) continue
    sanitized[key] = sanitizeValue(key, value, globalRedact, seen)
  }

  return sanitized
}

function normalizeError(error: unknown): Record<string, unknown> {
  if (typeof error === "string") {
    return { name: "Error", message: error }
  }

  if (error instanceof Error) {
    const normalized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    }
    if (error.stack) normalized.stack = error.stack

    for (const key of ["code", "status", "statusCode"] as const) {
      const value = getField(error, key)
      if (value !== undefined) normalized[key] = value
    }

    const cause = getField(error, "cause")
    if (cause !== undefined) normalized.cause = normalizeError(cause)

    return normalized
  }

  if (error !== null && typeof error === "object") {
    const message = getStringField(error, "message") ?? safeStringify(error)
    const normalized: Record<string, unknown> = { message }
    const name = getStringField(error, "name")
    if (name !== undefined) normalized.name = name

    for (const key of ["code", "status", "statusCode"] as const) {
      const value = getField(error, key)
      if (value !== undefined) normalized[key] = value
    }

    return normalized
  }

  return { message: String(error) }
}

function shouldUseColor(): boolean {
  if (runtimeEnv("NO_COLOR") !== undefined) return false
  if (isWorkers()) return true

  const stdout = getField(getField(globalThis, "process"), "stdout")
  const isTty = getField(stdout, "isTTY")
  return isTty === true
}

function paint(color: string, text: string): string {
  return shouldUseColor() ? `${color}${text}${colors.reset}` : text
}

function levelColor(level: LogLevel): string {
  if (level === "error") return colors.red
  if (level === "warn") return colors.yellow
  return colors.green
}

function statusColor(status: number): string {
  if (status >= 500) return colors.red
  if (status >= 400) return colors.yellow
  return colors.green
}

function safeStringify(value: unknown): string {
  if (typeof value === "bigint") return value.toString()
  try {
    const serialized = JSON.stringify(value)
    return serialized ?? String(value)
  } catch {
    return "[Unserializable]"
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value)
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value)
  }
  if (!isPlainObject(value)) return safeStringify(value)

  const parts: string[] = []
  for (const [key, childValue] of Object.entries(value)) {
    if (childValue === undefined || childValue === null) continue
    const rendered =
      isPlainObject(childValue) || Array.isArray(childValue)
        ? safeStringify(childValue)
        : formatValue(childValue)
    parts.push(`${key}=${rendered}`)
  }
  return parts.join(" ")
}

function errorEntry(error: unknown): PrettyEntry {
  if (!isPlainObject(error)) return { key: "error", value: formatValue(error) }

  const name = typeof error.name === "string" ? error.name : "Error"
  const message = typeof error.message === "string" ? error.message : formatValue(error)
  const value = name === "Error" ? message : `${name}: ${message}`
  const children: string[] = []

  for (const key of ["code", "status", "statusCode"] as const) {
    const childValue = error[key]
    if (childValue !== undefined) children.push(`${key}: ${formatValue(childValue)}`)
  }

  if (typeof error.stack === "string") {
    for (const line of error.stack.split("\n").slice(1, 4)) {
      const trimmed = line.trim()
      if (trimmed.length > 0) children.push(trimmed)
    }
  }

  return children.length > 0 ? { key: "error", value, children } : { key: "error", value }
}

function prettyEntries(event: WideEvent): PrettyEntry[] {
  const entries: PrettyEntry[] = []
  if (event.error !== undefined) entries.push(errorEntry(event.error))

  for (const [key, value] of Object.entries(event)) {
    if (value === undefined || key === "error" || prettyHeaderKeys.has(key)) continue
    entries.push({ key, value: formatValue(value) })
  }

  return entries
}

function prettyPrint(event: WideEvent): void {
  const method = typeof event.method === "string" ? event.method : undefined
  const path = typeof event.path === "string" ? event.path : undefined
  const status = normalizedStatus(event.status)

  const parts = [
    paint(levelColor(event.level), event.level.toUpperCase()),
    paint(colors.cyan, `[${event.service}]`),
  ]
  if (method && path) parts.push(`${method} ${path}`)
  if (status !== undefined) parts.push(paint(statusColor(status), String(status)))
  parts.push(paint(colors.dim, `in ${event.duration}`))

  const lines = [parts.join(" ")]
  const entries = prettyEntries(event)

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    if (!entry) continue

    const hasChildren = entry.children !== undefined && entry.children.length > 0
    const isLast = index === entries.length - 1 && !hasChildren
    const prefix = isLast ? "└─" : "├─"
    const value = entry.value.length > 0 ? ` ${entry.value}` : ""
    lines.push(`  ${paint(colors.dim, prefix)} ${paint(colors.cyan, `${entry.key}:`)}${value}`)

    if (!hasChildren || !entry.children) continue

    const connector = index === entries.length - 1 ? " " : "│"
    for (let childIndex = 0; childIndex < entry.children.length; childIndex += 1) {
      const child = entry.children[childIndex]
      if (child === undefined) continue
      const childPrefix = childIndex === entry.children.length - 1 ? "└─" : "├─"
      lines.push(`  ${paint(colors.dim, `${connector}  ${childPrefix}`)} ${child}`)
    }
  }

  console.log(lines.join("\n"))
}

function consoleMethod(level: LogLevel): "info" | "warn" | "error" {
  if (level === "warn") return "warn"
  if (level === "error") return "error"
  return "info"
}

function shouldPretty(event: WideEvent, override: boolean | undefined): boolean {
  return override ?? globalPretty ?? (!isWorkers() && event.environment !== "production")
}

function writeEvent(event: WideEvent, pretty: boolean | undefined): void {
  if (!globalSilent) {
    if (shouldPretty(event, pretty)) {
      prettyPrint(event)
    } else {
      console[consoleMethod(event.level)](event)
    }
  }
}

function snapshotContext(
  context: Record<string, unknown>,
  logEntries: readonly RequestLogEntry[],
): Record<string, unknown> {
  const snapshot = { ...context }
  if (logEntries.length === 0) return snapshot

  const existingLogs = snapshot.logs
  snapshot.logs = Array.isArray(existingLogs) ? [...existingLogs, ...logEntries] : [...logEntries]
  return snapshot
}

function internalWarning(message: string): void {
  if (!globalSilent) console.warn(message)
}

export function createLogger(
  initialContext: Record<string, unknown> = {},
  options: CreateLoggerOptions = {},
): Logger {
  const now = options.now ?? (() => new Date())
  const clock = options.clock ?? Date.now
  const random = options.random ?? Math.random
  const start = clock()
  const context: Record<string, unknown> = { ...initialContext }
  const logEntries: RequestLogEntry[] = []
  let emitted = false
  let hasError = false
  let hasWarn = false

  const sealed = (method: string): boolean => {
    if (emitted) internalWarning(`[log] ${method} called after emit — dropped.`)
    return emitted
  }

  const addLog = (
    level: RequestLogEntry["level"],
    message: string,
    extraContext: Record<string, unknown> | undefined,
  ): void => {
    logEntries.push({ level, message })
    if (extraContext) mergeInto(context, extraContext)
  }

  return {
    set(data) {
      if (sealed("set()")) return
      mergeInto(context, data)
    },
    error(error, errorContext) {
      if (sealed("error()")) return
      hasError = true
      if (errorContext) mergeInto(context, errorContext)

      const normalized = normalizeError(error)
      if (isPlainObject(context.error)) mergeInto(context.error, normalized)
      else context.error = normalized
    },
    info(message, infoContext) {
      if (sealed("info()")) return
      addLog("info", message, infoContext)
    },
    warn(message, warnContext) {
      if (sealed("warn()")) return
      hasWarn = true
      addLog("warn", message, warnContext)
    },
    emit(overrides) {
      if (sealed("emit()")) return null
      emitted = true
      if (overrides) mergeInto(context, overrides)

      const durationMs = Math.max(0, Math.round(clock() - start))
      const level: LogLevel = hasError ? "error" : hasWarn ? "warn" : "info"
      const eventContext = snapshotContext(context, logEntries)
      const status = normalizedStatus(eventContext.status)

      if (!shouldKeep(level, status, durationMs, random)) return null

      const service: ServiceContext =
        options.environment !== undefined
          ? { ...globalService, environment: options.environment }
          : globalService
      const rawEvent: WideEvent = {
        ...service,
        ...eventContext,
        timestamp: now().toISOString(),
        level,
        duration: formatDuration(durationMs),
        durationMs,
      }
      const event = sanitizeEvent(rawEvent)
      writeEvent(event, options.pretty)
      return event
    },
    getContext() {
      return snapshotContext(context, logEntries)
    },
  }
}
