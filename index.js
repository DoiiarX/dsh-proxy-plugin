/** Failure-isolating Loader entry for the proxy provider plugin. */
export const name = 'dsh-proxy-supervisor'
export const inject = ['tools', 'settings']
const SETTINGS_NS = 'local-proxy'

function diagnostic(scope, error) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return `[dsh-proxy] ${scope} unavailable: ${detail}`
}
function report(ctx, scope, error) {
  const message = diagnostic(scope, error)
  const logger = ctx.root?.logger?.('dsh-proxy')
  if (logger?.error) logger.error('%s', message)
  console.error(message)
}
export async function applyIsolated(ctx, config = {}, importer = () => import('./implementation.js')) {
  try {
    const implementation = await importer()
    return implementation.applyProxy(ctx, config, (scope, error) => { report(ctx, scope, error) })
  } catch (error) {
    report(ctx, 'implementation', error)
    return undefined
  }
}
export async function apply(ctx, config = {}) {
  try {
    // `schemastery` is a CommonJS-style module: under ESM interop the usable
    // entry is the `default` export (Schema.object etc.); destructuring
    // `{ Schema }` yields undefined and every schema build fails.
    const { default: Schema } = await import('schemastery')
    const base = { defaultProxy: config.defaultProxy ?? 'socks5h://127.0.0.1:10808' }
    const scope = ctx.settings.register(SETTINGS_NS, Schema.object({
      defaultProxy: Schema.string().default(base.defaultProxy),
    }), { base })
    const result = await applyIsolated(ctx, { ...config, defaultProxy: scope.get().defaultProxy })
    // Cordis collects the apply() return value as the fiber disposer: return
    // the settings watcher's own disposer so the watch dies with the plugin.
    if (result?.service !== undefined) {
      return scope.watch((next) => { result.service.setProxy(next.defaultProxy) })
    }
    return undefined
  } catch (error) {
    report(ctx, 'settings', error)
    await applyIsolated(ctx, config)
    return undefined
  }
}
