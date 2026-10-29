# Magpie Agents

为 [WispTerm](https://github.com/xuzhougeng/wispterm)、[Wisp Science](https://github.com/xuzhougeng/wisp-science) 和 [CiteBox](https://github.com/xuzhougeng/citebox) 提供独立的 Magpie Agent 插件。三个应用的主程序仍在各自仓库维护。

当前预发布版本为 `0.1.0-alpha.2`，npm 作用域为 `@hoptoper`，GitHub 仓库为 `xuzhougeng/magpie-agents`。**应用需要包含 `magpie.json` 读取代码的新构建**；仅安装插件不能让旧版应用自动支持接入。

| 应用 | 包 | 接入、切换、断开后生效时间 |
| --- | --- | --- |
| WispTerm | `@hoptoper/magpie-agent-wispterm` | 重启应用 |
| Wisp Science | `@hoptoper/magpie-agent-wisp-science` | 重启应用或 CLI 进程 |
| CiteBox | `@hoptoper/magpie-agent-citebox` | 下一次 AI 操作 |

## 安装与使用

先在 Magpie 配置模型供应商，再按需安装插件。**从 `0.1.0-alpha.2` 起，安装并加载插件会自动创建对应的空接入目录，无需手动执行 `mkdir`。** 初始化不会创建 `magpie.json`、选择模型或覆盖已有设置。

```sh
magpie plugin add @hoptoper/magpie-agent-wispterm@alpha
magpie plugin add @hoptoper/magpie-agent-wisp-science@alpha
magpie plugin add @hoptoper/magpie-agent-citebox@alpha
```

也可以从本地源码安装：

```sh
magpie plugin add /absolute/path/to/magpie-agents/packages/agent-wispterm
magpie plugin add /absolute/path/to/magpie-agents/packages/agent-wisp-science
magpie plugin add /absolute/path/to/magpie-agents/packages/agent-citebox
```

安装后，点击 Magpie 顶栏的“重新检测本机的 Agent”；如果已有其他 Agent 接入，展开“显示其余”即可在“未设置”列表看到新 Agent。可以在 Magpie 选择模型，或使用 CLI（将 `provider/model` 替换成已配置的模型）：

```sh
magpie wispterm magpie/provider/model
magpie wisp-science magpie/provider/model
magpie citebox magpie/provider/model
```

保持 Magpie 网关运行。断开某个应用时执行一次，例如 `magpie wispterm default`。WispTerm 和 Wisp Science 随后需要重启。

排查“插件已安装但 Agent 不显示”时，用 `magpie ls` 检查已检测到的 Agent。`magpie agents` 包含 `not detected` 的条目，仅有名称不能证明页面会显示；请先升级到 `0.1.0-alpha.2` 或更新版本，再点击重新检测。旧版 `alpha.1` 不会自动初始化目录。

这些包注册 Agent，并在插件加载时初始化各自的接入目录，不负责供应商登录。供应商认证由 Magpie 的 Provider 管理。

## 配置约定

每个应用只读取 `~/.config/<agent-id>/magpie.json`，字段为 `baseURL`、`apiKey` 和 `model`。Windows 使用 `%USERPROFILE%\.config\<agent-id>\magpie.json`。该路径固定，不受 `XDG_CONFIG_HOME` 或应用原生配置目录影响。

Magpie 负责写入三个字段和恢复它们的原值；应用在运行时使用该配置，并保留原有个人设置。缺失、空对象或不合法的文件表示没有外部覆盖。详见[配置协议](docs/configuration.md)。

WispTerm 的[视觉修复（PR #697）](https://github.com/xuzhougeng/wispterm/pull/697)在应用读取端：包含该修复的构建默认允许图片输入，`magpie.json` 中的可选 `vision` 开关可显式控制，插件会保留它。旧构建硬编码关闭视觉，单独更新插件无法解决。修改后重启应用并新建会话，具体说明见[图片输入配置](docs/configuration.md#wispterm-图片输入)。

## 开发与验证

开发检查需要 Node.js 22 或更新版本。`agent.js` 在 Magpie 的 moejs 中运行；`setup.mjs` 在 Magpie 管理的 Bun 插件进程中使用文件系统 API，只负责创建空接入目录。三个包均无第三方依赖，不使用会被 Magpie 跳过的 npm 安装脚本。

```sh
npm run check
npm test
npm run pack
MAGPIE_BIN=/absolute/path/to/magpie npm run test:integration
```

集成测试使用独立 HOME、随机本地端口、虚拟 Provider 和假密钥。它安装三个打包产物，启动官方 Magpie 网关，验证请求路由、模型切换和原值恢复。可进一步启用三个应用自身的 HTTP 客户端探针，命令与结果见[验证记录](docs/verification.md)。

## 独立发布

每个子包独立维护版本。`npm run pack` 的产物位于 `artifacts/`。发布脚本默认仅预演：

```sh
npm run release -- agent-wispterm
# 确认要公开发布时才加 --publish：
npm run release -- agent-wispterm --publish
```

当前包使用 `alpha` 标签，安装时显式使用 `@alpha`，或固定为 `@0.1.0-alpha.2`。

`registry.json` 的三个 `kind: "agent"` 条目已通过 [社区 PR #479](https://github.com/magpie-community/plugins/pull/479) 提交，等待社区审核合并；合并并刷新 registry 后才会出现在插件搜索中。目前可使用上面的 npm 包名直接安装。仓库的 `magpie-plugin` topic 不能代替三个子包的独立登记。

插件 API 依据 [Magpie Agent 插件文档](https://usemagpie.ai/docs/plugins#agent-plugins)。版本兼容性和已发现的上游问题见验证记录。
