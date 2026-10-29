# Wisp Science Agent for Magpie

Package: `@hoptoper/magpie-agent-wisp-science`. This is an Agent plugin; provider authentication stays in Magpie. No `plugin login` is needed for this package.

**Prerelease.** Requires the Wisp Science source changes described in the repository README; older released builds do not read this file.

Install the alpha package:

```sh
magpie plugin add @hoptoper/magpie-agent-wisp-science@alpha
```

For local development, from the repository root:

```sh
magpie plugin add ./packages/agent-wisp-science
magpie wisp-science magpie/<provider>/<model>
magpie wisp-science default
```

The plugin writes `baseURL`, `apiKey`, and `model` to `~/.config/wisp-science/magpie.json`. The same home-relative path is used on macOS, Linux, and Windows (`%USERPROFILE%/.config/wisp-science/magpie.json`); `XDG_CONFIG_HOME` and the app's ordinary settings directory do not relocate this integration file. Magpie restores the previous values on disconnect and preserves unrelated keys. A new file may remain as `{}` after disconnect; readers must treat that as inactive.

Restart Wisp Science after connecting, changing models, or disconnecting. 接入、切换模型或断开后请重启 Wisp Science。

Full contract and development instructions: [magpie-agents](https://github.com/xuzhougeng/magpie-agents).
