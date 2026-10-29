# CiteBox Agent for Magpie

Package: `@hoptoper/magpie-agent-citebox`. This is an Agent plugin; provider authentication stays in Magpie. No `plugin login` is needed for this package.

**Prerelease.** Requires the CiteBox source changes described in the repository README; older released builds do not read this file.

Install the alpha package:

```sh
magpie plugin add @hoptoper/magpie-agent-citebox@alpha
```

Magpie detects CiteBox by the `citebox` command on PATH, or by `~/.config/citebox/magpie.json` once connected. The plugin creates no files. Magpie's plugin API cannot yet declare a desktop app's install location ([yetone/magpie#4206](https://github.com/yetone/magpie/issues/4206)), so with only the desktop app installed, connect once from the CLI as shown below; the Agent page lists CiteBox after that. `0.1.0-alpha.2` created an empty `~/.config/citebox` folder on load; later versions no longer use it for detection, and you can remove it if it is unused.

For local development, from the repository root:

```sh
magpie plugin add ./packages/agent-citebox
magpie citebox magpie/<provider>/<model>
magpie citebox default
```

The plugin writes `baseURL`, `apiKey`, `model`, and a `modelInfo` snapshot (ID, context capacity, output limit, supported reasoning efforts; only values Magpie knows) to `~/.config/citebox/magpie.json`. The same home-relative path is used on macOS, Linux, and Windows (`%USERPROFILE%/.config/citebox/magpie.json`); `XDG_CONFIG_HOME` and the app's ordinary settings directory do not relocate this integration file. Magpie restores the previous values on disconnect and preserves unrelated keys. A new file may remain as `{}` after disconnect; readers must treat that as inactive.

CiteBox reads changes before the next operation. CiteBox 会在下一次操作时读取连接、模型切换或断开。

With a matching CiteBox build, `modelInfo` supplies the output limit and the reasoning levels offered in the app. Reasoning effort is set inside CiteBox, in the Magpie panel under Settings → Model Configuration; the choice is stored apart from your personal model settings and takes effect on the next operation. The default is medium, then high, then the first listed level, and a choice the current model does not support falls back to that default. Unknown levels leave the provider default. The snapshot is used only when its `id` matches `model`.

Full contract and development instructions: [magpie-agents](https://github.com/xuzhougeng/magpie-agents).
