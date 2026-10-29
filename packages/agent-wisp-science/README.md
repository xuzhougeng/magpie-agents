# Wisp Science Agent for Magpie

Package: `@hoptoper/magpie-agent-wisp-science`. This is an Agent plugin; provider authentication stays in Magpie. No `plugin login` is needed for this package.

Requires a Wisp Science build that reads `~/.config/wisp-science/magpie.json` (see the repository README); older released builds ignore this file.

Install:

```sh
magpie plugin add @hoptoper/magpie-agent-wisp-science
```

Magpie detects Wisp Science by the `wisp-science` command on PATH, or by `~/.config/wisp-science/magpie.json` once connected. The plugin creates no files. Magpie's plugin API cannot yet declare a desktop app's install location ([yetone/magpie#4206](https://github.com/yetone/magpie/issues/4206)), so with only the desktop app installed, connect once from the CLI as shown below; the Agent page lists Wisp Science after that. `0.1.0-alpha.2` created an empty `~/.config/wisp-science` folder on load; later versions no longer use it for detection, and you can remove it if it is unused.

For local development, from the repository root:

```sh
magpie plugin add ./packages/agent-wisp-science
magpie wisp-science magpie/<provider>/<model>
magpie wisp-science default
```

The plugin writes `baseURL`, `apiKey`, `model`, and a `modelInfo` snapshot (ID, context capacity, output limit, supported reasoning efforts; only values Magpie knows) to `~/.config/wisp-science/magpie.json`. The same home-relative path is used on macOS, Linux, and Windows (`%USERPROFILE%/.config/wisp-science/magpie.json`); `XDG_CONFIG_HOME` and the app's ordinary settings directory do not relocate this integration file. Magpie restores the previous values on disconnect and preserves unrelated keys. A new file may remain as `{}` after disconnect; readers must treat that as inactive.

Restart Wisp Science after connecting, changing models, or disconnecting. 接入、切换模型或断开后请重启 Wisp Science。

With a matching Wisp Science build, `modelInfo` supplies the context capacity, the output limit, and the reasoning levels offered in the app. Reasoning effort is set inside Wisp Science per conversation, from the composer's effort menu; the default is medium, then high, then the first listed level, and an unsupported choice falls back to that default. Unknown levels leave the provider default. The snapshot is used only when its `id` matches `model`. Restart Wisp Science after switching models.

Magpie's Library also writes into Wisp Science's own user files:
- shared instructions go into `~/.wisp/AGENTS.md`, as a marked block;
- MCP servers go into `~/.wisp/mcp.json`, in Claude's `mcpServers` format;
- skills go into `~/.wisp/skills`.

Whatever the user wrote in these files is kept. Wisp Science reads the first two, and skill symlinks, only in builds with user-level config support. On older builds, run `magpie library skill how copy wisp-science` so skills arrive as copies. Those builds also name each conversation to Magpie's gateway, so Magpie's Sessions page lists them, read-only, from the gateway's records.

Full contract and development instructions: [magpie-agents](https://github.com/xuzhougeng/magpie-agents).
