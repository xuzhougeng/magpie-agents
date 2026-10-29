# CiteBox Agent for Magpie

Package: `@xuzhougeng/magpie-agent-citebox`. This is an Agent plugin; provider authentication stays in Magpie. No `plugin login` is needed for this package.

**Prerelease.** Requires the CiteBox source changes described in the repository README; older released builds do not read this file.

Install the alpha package:

```sh
magpie plugin add @xuzhougeng/magpie-agent-citebox@alpha
```

For local development, from the repository root:

```sh
magpie plugin add ./packages/agent-citebox
magpie citebox magpie/<provider>/<model>
magpie citebox default
```

The plugin writes `baseURL`, `apiKey`, and `model` to `~/.config/citebox/magpie.json`. The same home-relative path is used on macOS, Linux, and Windows (`%USERPROFILE%/.config/citebox/magpie.json`); `XDG_CONFIG_HOME` and the app's ordinary settings directory do not relocate this integration file. Magpie restores the previous values on disconnect and preserves unrelated keys. A new file may remain as `{}` after disconnect; readers must treat that as inactive.

CiteBox reads changes before the next operation. CiteBox 会在下一次操作时读取连接、模型切换或断开。

Full contract and development instructions: [magpie-agents](https://github.com/xuzhougeng/magpie-agents).
