window.__ModuleLoader__.load({
  id: "@local/dsh-proxy-plugin",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");
    const inject = ["slots", "settingsScope", "connection", "remote"];
    const h = React.createElement;
    function ProxySettings({ scope }) {
      const snapshot = React.useSyncExternalStore((fn) => scope.subscribe(fn), () => scope.getSnapshot());
      const value = snapshot.value;
      if (snapshot.status !== "ready" || value === undefined) return h("div", null, h("h2", null, "Proxy"), h("p", null, "正在读取配置…"));
      return h("div", { style: { display: "grid", gap: "18px", color: "var(--dsw-alias-label-primary)" } },
        h("div", null, h("h2", { style: { margin: "0 0 6px" } }, "Proxy"), h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)" } }, "配置共享 proxyFetch 服务的默认代理。保存后立即生效。")),
        h("label", { "data-settings-item": "defaultProxy", style: { display: "grid", gap: "8px", padding: "18px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "14px", background: "var(--dsw-alias-bg-layer-1)" } },
          h("strong", null, "默认代理 URL"),
          h("small", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "留空表示直连；支持 socks5h:// 和 http://。"),
          h("input", { value: value.defaultProxy, disabled: !snapshot.writable, placeholder: "socks5h://127.0.0.1:10808", style: { height: "38px", padding: "0 11px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "10px", color: "var(--dsw-alias-label-primary)", background: "var(--dsw-specific-input-major)", font: "inherit" }, onChange: (event) => { void scope.set("defaultProxy", event.target.value); } })
        )
      );
    }
    function apply(ctx) {
      const scope = ctx.settingsScope.bind({ namespace: "local-proxy" });
      ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "local-proxy", order: 120, label: "Proxy", inject: () => ({ scope }) }, ProxySettings));
      const search = (globalThis.__DSH_SETTINGS_SEARCH__ ??= {
        sections: new Map(),
        register(sectionId, spec) {
          this.sections.set(sectionId, spec)
          return () => { this.sections.delete(sectionId) }
        },
      });
      search.register("local-proxy", {
        label: "Proxy",
        keywords: "代理 proxy 网络 默认代理",
        items: [
          { id: "defaultProxy", label: "默认代理 URL", desc: "共享 proxyFetch 服务的默认代理，支持 socks5h:// 和 http://", keywords: "proxy 代理 网络 socks5 http" },
        ],
      });
    }
    module.exports.inject = inject;
    module.exports.apply = apply;
    return module.exports;
  }
});
