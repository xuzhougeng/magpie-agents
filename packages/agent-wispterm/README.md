# WispTerm Agent for Magpie

Package: `@hoptoper/magpie-agent-wispterm`. This is an Agent plugin; provider authentication stays in Magpie. No `plugin login` is needed for this package.

**Prerelease.** Requires the WispTerm source changes described in the repository README; older released builds do not read this file.

Install the alpha package:

```sh
magpie plugin add @hoptoper/magpie-agent-wispterm@alpha
```

Magpie detects WispTerm by the `wispterm` command on PATH, or by `~/.config/wispterm/magpie.json` once connected. The plugin creates no files. Magpie's plugin API cannot yet declare a desktop app's install location ([yetone/magpie#4206](https://github.com/yetone/magpie/issues/4206)), so with only the desktop app installed, connect once from the CLI as shown below; the Agent page lists WispTerm after that. `0.1.0-alpha.2` and `0.1.0-alpha.3` created an empty `~/.config/wispterm` folder on load; later versions no longer use it for detection, and you can remove it if it is unused.

For local development, from the repository root:

```sh
magpie plugin add ./packages/agent-wispterm
magpie wispterm magpie/<provider>/<model>
magpie wispterm default
```

From `0.1.0-alpha.3`, the plugin writes `baseURL`, `apiKey`, `model`, and a `modelInfo` snapshot (ID, context capacity, output limit, supported reasoning efforts) to `~/.config/wispterm/magpie.json`. The same home-relative path is used on macOS, Linux, and Windows (`%USERPROFILE%/.config/wispterm/magpie.json`); `XDG_CONFIG_HOME` and the app's ordinary settings directory do not relocate this integration file. Magpie restores the previous values on disconnect and preserves unrelated keys. A new file may remain as `{}` after disconnect; readers must treat that as inactive.

Restart WispTerm after connecting, changing models, or disconnecting. 接入、切换模型或断开后请重启 WispTerm。

WispTerm builds with the Magpie vision fix allow image attachment by default. To disable it, add `"vision": false` to the existing `magpie.json` object; `true` enables it. This user-owned field is preserved by the plugin. Restart WispTerm and create a new session after changing it. Choose an image-capable model in Magpie for image requests. Older WispTerm builds hard-code vision off and ignore this field, so updating only the plugin cannot fix those builds. Native `config` and `ai_profiles` do not override the managed Magpie profile.

Full contract and development instructions: [magpie-agents](https://github.com/xuzhougeng/magpie-agents).


With the matching WispTerm build, `modelInfo` supplies defaults for reasoning and output limits and displays the model's context capacity. User-owned `thinking`, `reasoningEffort`, `maxTokens`, `protocol`, `stream`, `agent`, `systemPrompt`, and `vision` fields are preserved. For example, `"reasoningEffort": "high", "maxTokens": 32768` requests a supported high reasoning level and caps generated output. Unknown reasoning defaults to `auto`; unknown output defaults to 8192; unknown context is shown as unknown. `protocol` can be `chat_completions` or `responses` through Magpie's gateway. Context is model capacity, not an output-token setting, and this does not add automatic conversation compaction. Restart WispTerm and create a new session after changing options.
