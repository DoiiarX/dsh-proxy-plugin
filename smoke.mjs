/**
 * Smoke test: load each implementation with a minimal mock ctx and verify the
 * apply* functions register tools and services without throwing.
 */
import { applyProxy } from './implementation.js'

const registered = []
const tools = {
  register(tool) {
    registered.push(tool.name)
    return () => {}
  },
}
const mockCtx = {
  tools,
  get(name) {
    if (name === 'tools') return tools
    if (name === 'fs') return undefined
    return undefined
  },
  provide(name, value) {
    console.log(`[mock] provided service: ${name} (${typeof value})`)
    return () => {}
  },
}

const result = applyProxy(mockCtx, {}, (scope, err) => {
  console.error(`[report] ${scope}: ${err.message}`)
})
console.log('registered:', result.registered)
console.log('failed:', result.failed)
if (result.registered.length !== 3 || result.failed.length !== 0) {
  console.error('SMOKE FAIL')
  process.exit(1)
}
console.log('SMOKE OK')
