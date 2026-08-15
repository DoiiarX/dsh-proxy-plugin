# dsh-proxy-plugin

> 本插件属于 [dsh-plugins](https://github.com/DoiiarX/dsh-plugins) 合集，完整的自研插件索引见该仓库。

Persistent DeepSeek Harness bundle that provides network proxy capability.

## What it provides

- **`proxyFetch` service** (`ctx.provide`) — other plugins may optionally consume
  it via `ctx.get('proxyFetch')`. The service exposes `fetch(url, opts)`,
  `getProxy()`, `setProxy(url)`, and `test(target, timeoutMs)`.
- **`proxy_set`** tool — set or clear the proxy URL (e.g.
  `socks5h://127.0.0.1:10808`); empty string clears it.
- **`proxy_status`** tool — show the current proxy configuration.
- **`proxy_test`** tool — test connectivity to a target through the configured
  proxy (or direct), returning HTTP status code and timing.

## Design notes

- Runs as a real host-composition row (not a dynamic package), so it has full
  Node APIs. When a proxy is configured, it calls `curl.exe -x <proxy>` directly
  via `node:child_process` — TLS happens inside the proxy tunnel, avoiding the
  schannel credential failures seen when curl runs through the harness shell
  service's restricted environment. Without a proxy it uses native `fetch`.
- Consumers use `ctx.get('proxyFetch')` and handle `undefined`; the proxy plugin
  never depends on any consumer existing.
