# dsh-proxy-plugin

> [English](README.md) | 中文

> 本插件属于 [dsh-plugins](https://github.com/DoiiarX/dsh-plugins) 合集，完整的自研插件索引见该仓库。

提供网络代理能力的持久化 DeepSeek Harness 插件包。

## 提供的功能

- **`proxyFetch` 服务**（`ctx.provide`）— 其他插件可通过
  `ctx.get('proxyFetch')` 可选地消费它。该服务暴露 `fetch(url, opts)`、
  `getProxy()`、`setProxy(url)` 和 `test(target, timeoutMs)`。
- **`proxy_set`** 工具 — 设置或清除代理 URL（例如
  `socks5h://127.0.0.1:10808`）；传空字符串则清除代理。
- **`proxy_status`** 工具 — 显示当前代理配置。
- **`proxy_test`** 工具 — 通过已配置的代理（或直连）测试到目标站点的连通性，
  返回 HTTP 状态码与耗时。

## 设计说明

- 作为真实的宿主组合行运行（而非动态插件包），因此拥有完整的
  Node API。当配置了代理时，它通过 `node:child_process` 直接调用
  `curl.exe -x <proxy>` — TLS 在代理隧道内完成，避免了 curl 经由 harness shell
  服务受限环境运行时出现的 schannel 凭据失败。未配置代理时使用原生 `fetch`。
- 消费者使用 `ctx.get('proxyFetch')` 并处理 `undefined`；代理插件
  从不依赖任何消费者的存在。
