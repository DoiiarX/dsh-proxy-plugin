/**
 * Proxy provider plugin (persistent bundle, host composition row).
 *
 * Publishes the `proxyFetch` service so other plugins (e.g. the weather
 * plugin) can optionally consume it via ctx.get('proxyFetch'); if no consumer
 * needs it, it is simply unused. Also registers three model-visible tools:
 * proxy_set / proxy_status / proxy_test.
 *
 * Runs in the real Node process (not the dynamic-package sandbox), so it can
 * use node:child_process execFile to invoke curl.exe directly. That avoids the
 * schannel credential failures seen when curl runs through the harness shell
 * service's restricted environment.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { defineTool } from '@deepseek-ai/dsh-tools'

const execFileAsync = promisify(execFile)
const DEFAULT_PROXY = 'socks5h://127.0.0.1:10808'

function positiveNumber(name, value, fallback, maximum = Number.POSITIVE_INFINITY) {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new Error(`invalid ${name}: expected a positive number, got ${JSON.stringify(resolved)}`)
  }
  return Math.min(resolved, maximum)
}

/** Run curl.exe with args, returning stdout. Throws on non-zero exit. */
async function runCurl(args, timeoutMs = 30000) {
  const { stdout, stderr } = await execFileAsync('curl.exe', args, {
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  })
  return { stdout, stderr }
}

/**
 * Fetch a URL. When a proxy is configured, TLS happens inside the proxy
 * tunnel, which avoids the local schannel credential issue entirely.
 */
async function fetchViaProxy(url, opts = {}, proxyUrl) {
  const timeoutMs = opts.timeoutMs || 30000
  const secs = Math.max(5, Math.floor(timeoutMs / 1000))
  if (proxyUrl) {
    const { stdout, stderr } = await runCurl(['-sS', '--max-time', String(secs), '-x', proxyUrl, url], timeoutMs)
    return { ok: true, text: stdout, via: 'proxy', stderr }
  }
  // No proxy: prefer native fetch (host process has full Node, TLS works).
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status}`)
    }
    return { ok: true, text: await response.text(), via: 'direct' }
  } finally {
    clearTimeout(timer)
  }
}

/** Test connectivity to a target through the configured proxy (or direct). */
async function testProxy(target, timeoutMs, proxyUrl) {
  const url = target || 'https://www.google.com'
  const secs = Math.max(5, Math.floor((timeoutMs || 30000) / 1000))
  const start = Date.now()
  try {
    const args = ['-sS', '-o', 'NUL', '-w', '%{http_code}|%{time_total}', '--max-time', String(secs)]
    if (proxyUrl) args.push('-x', proxyUrl)
    args.push(url)
    const { stdout } = await runCurl(args, timeoutMs || 30000)
    const parts = (stdout || '').trim().split('|')
    return {
      ok: true,
      proxy: proxyUrl || null,
      target: url,
      statusCode: parts[0] ? Number(parts[0]) : null,
      timeSec: parts[1] ? Number(parts[1]) : null,
      elapsedMs: Date.now() - start,
    }
  } catch (error) {
    return {
      ok: false,
      proxy: proxyUrl || null,
      target: url,
      elapsedMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const objectOutput = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
}

export function applyProxy(ctx, config = {}, report = () => {}) {
  // Proxy state lives in this plugin's fiber; setProxy updates it.
  let proxyUrl = config.defaultProxy ?? DEFAULT_PROXY

  // Publish the capability. Other plugins consume via ctx.get('proxyFetch');
  // absence of a consumer never affects this plugin. The returned disposer is
  // owned by this fiber and unwinds automatically when the plugin stops.
  const service = {
    fetch: (url, opts = {}) => fetchViaProxy(url, opts, proxyUrl),
    getProxy: () => (proxyUrl ? proxyUrl : undefined),
    setProxy: (url) => { proxyUrl = String((url == null) ? '' : url).trim() },
    test: (target, timeoutMs) => testProxy(target, timeoutMs, proxyUrl),
  }
  ctx.provide('proxyFetch', service)

  const registered = []
  const failed = []

  try {
    ctx.tools.register(defineTool({
      name: 'proxy_set',
      description: '设置或清除网络代理地址（如 socks5h://127.0.0.1:10808 或 http://127.0.0.1:7890）。传空字符串清除代理。',
      parameters: {
        url: { type: 'string', description: '代理 URL，例如 socks5h://127.0.0.1:10808；空字符串表示清除' },
      },
      output: objectOutput,
      async execute(args) {
        const url = String((args && args.url) || '').trim()
        proxyUrl = url
        return { ok: true, proxy: proxyUrl || null }
      },
    }))
    registered.push('proxy_set')
  } catch (error) {
    failed.push('proxy_set')
    report('proxy_set', error)
  }

  try {
    ctx.tools.register(defineTool({
      name: 'proxy_status',
      description: '查看当前代理配置与底层能力是否可用。',
      parameters: {},
      output: objectOutput,
      async execute() {
        return { ok: true, proxy: proxyUrl || null }
      },
    }))
    registered.push('proxy_status')
  } catch (error) {
    failed.push('proxy_status')
    report('proxy_status', error)
  }

  try {
    ctx.tools.register(defineTool({
      name: 'proxy_test',
      description: '测试当前代理（或直连）到目标站点的连通性，返回 HTTP 状态码与耗时。',
      parameters: {
        target: { type: 'string', description: '测试目标 URL，缺省 https://www.google.com' },
      },
      output: objectOutput,
      async execute(args) {
        const target = args && args.target ? String(args.target) : undefined
        return testProxy(target, 30000, proxyUrl)
      },
    }))
    registered.push('proxy_test')
  } catch (error) {
    failed.push('proxy_test')
    report('proxy_test', error)
  }

  return { registered, failed, service }
}
