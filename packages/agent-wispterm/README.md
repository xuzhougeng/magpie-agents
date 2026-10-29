# WispTerm Agent for Magpie

Package: `@hoptoper/magpie-agent-wispterm`. This is an Agent plugin; provider authentication stays in Magpie. No `plugin login` is needed for this package.

**Prerelease.** Requires the WispTerm source changes described in the repository README; older released builds do not read this file.

Install the alpha package:

```sh
magpie plugin add @hoptoper/magpie-agent-wispterm@alpha
```

Version `0.1.0-alpha.2` and later automatically creates `~/.config/wispterm` when Magpie loads the installed plugin. No manual directory creation or provider login is required. Initialization leaves existing files and directory permissions untouched and does not create `magpie.json` or select a model. Refresh the Agent list after installation if it is already open.

For local development, from the repository root:

```sh
magpie plugin add ./packages/agent-wispterm
magpie wispterm magpie/<provider>/<model>
magpie wispterm default
```

The plugin writes `baseURL`, `apiKey`, and `model` to `~/.config/wispterm/magpie.json`. The same home-relative path is used on macOS, Linux, and Windows (`%USERPROFILE%/.config/wispterm/magpie.json`); `XDG_CONFIG_HOME` and the app's ordinary settings directory do not relocate this integration file. Magpie restores the previous values on disconnect and preserves unrelated keys. A new file may remain as `{}` after disconnect; readers must treat that as inactive.

Restart WispTerm after connecting, changing models, or disconnecting. 接入、切换模型或断开后请重启 WispTerm。

WispTerm builds with the Magpie vision fix allow image attachment by default. To disable it, add `"vision": false` to the existing `magpie.json` object; `true` enables it. This user-owned field is preserved by the plugin. Restart WispTerm and create a new session after changing it. Choose an image-capable model in Magpie for image requests. Older WispTerm builds hard-code vision off and ignore this field, so updating only the plugin cannot fix those builds. Native `config` and `ai_profiles` do not override the managed Magpie profile.

Full contract and development instructions: [magpie-agents](https://github.com/xuzhougeng/magpie-agents).
