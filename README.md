# dsh-proxy-plugin

> [English](README.md) | [中文](README.zh.md)

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

## Installation

复制下面的指令块给你的 DSH agent，它会自动完成安装：

```text
请安装 proxy 插件（@local/dsh-proxy-plugin）：

1. 前置：本机已有 deepseek-harness 源码（本插件 link 依赖其中的 dsh-tools 包，
   位于 <deepseek-harness>/packages/core/tools）。
2. 克隆仓库：
   git clone https://github.com/DoiiarX/dsh-proxy-plugin
   cd dsh-proxy-plugin
3. 安装依赖：pnpm install
   （如果 package.json 里 dsh-tools 的 link 路径与你机器不符，改成你的
   deepseek-harness 实际路径后再装。）
4. 挂进 web profile：编辑 $HOME/.dsh/profiles/web/package.json，
   在 dependencies 加 "@local/dsh-proxy-plugin": "link:<本插件目录绝对路径>"，
   在 dsh.profile.bundles 加 "@local/dsh-proxy-plugin"。
5. 在 profile 目录执行 pnpm install。
6. 暴露设置页：在 <deepseek-harness>/packages/host/apiproxy/src/api-proxy.ts
   的 WEB_SETTINGS_NAMESPACES 数组加 "local-proxy"。
7. 重 build host（pnpm run build:lib:host）并重启 web 进程。
8. 验证：工具列表出现 proxy_set / proxy_status / proxy_test，设置页出现 Proxy 小节。
```

其他插件（如 weather）通过 `ctx.get('proxyFetch')` 可选消费本插件提供的代理
能力；本插件不依赖任何消费者存在。
