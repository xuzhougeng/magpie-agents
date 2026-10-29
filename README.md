# Magpie Agents

为 [WispTerm](https://github.com/xuzhougeng/wispterm)、[Wisp Science](https://github.com/xuzhougeng/wisp-science) 和 [CiteBox](https://github.com/xuzhougeng/citebox) 提供独立的 Magpie Agent 插件。三个应用的主程序仍在各自仓库维护。

已发布的 npm 版本：WispTerm 为 `0.1.0-alpha.3`，CiteBox 和 Wisp Science 为 `0.1.0-alpha.2`。仓库源码是尚未发布的下一版（WispTerm `0.1.0-alpha.4`，CiteBox 和 Wisp Science `0.1.0-alpha.3`），改为检测应用本身，见[检测](#检测)。npm 作用域为 `@hoptoper`，GitHub 仓库为 `xuzhougeng/magpie-agents`。**应用需要包含 `magpie.json` 读取代码的新构建**；仅安装插件不能让旧版应用自动支持接入。

| 应用 | 包 | 接入、切换、断开后生效时间 |
| --- | --- | --- |
| WispTerm | `@hoptoper/magpie-agent-wispterm` | 重启应用 |
| Wisp Science | `@hoptoper/magpie-agent-wisp-science` | 重启应用或 CLI 进程 |
| CiteBox | `@hoptoper/magpie-agent-citebox` | 下一次 AI 操作 |

## 安装与使用

先在 Magpie 配置模型供应商，再按需安装插件。插件不会在本机创建任何文件。

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

安装后，点击 Magpie 顶栏的“重新检测本机的 Agent”。已检测到的应用会出现在 Agent 页；如果已有其他 Agent 接入，展开“显示其余”即可在“未设置”列表中找到它。可以在 Magpie 选择模型，也可以使用 CLI（将 `provider/model` 替换成已配置的模型）：

```sh
magpie wispterm magpie/provider/model
magpie wisp-science magpie/provider/model
magpie citebox magpie/provider/model
```

保持 Magpie 网关运行。断开某个应用时执行一次，例如 `magpie wispterm default`。WispTerm 和 Wisp Science 随后需要重启。

### 检测

Magpie 用两种方式判断应用是否已安装：PATH 中有应用自己的命令（`wispterm`、`wisp-science`、`citebox`），或者接入后已经存在 `magpie.json`。插件不会为了被检测到而创建目录或文件。

Magpie 的插件 API 目前不能声明 `/Applications/WispTerm.app` 或 Windows 安装目录这类桌面安装位置，已向上游提交 [yetone/magpie#4206](https://github.com/yetone/magpie/issues/4206)。在此之前，如果只安装了桌面版、PATH 中没有对应命令，Agent 页不会列出该应用。这时先用上面的 CLI 接入一次，之后就能在 Agent 页切换模型和断开。

排查“插件已安装但 Agent 不显示”时，用 `magpie ls` 查看已检测到的 Agent。`magpie agents` 也会列出 `not detected` 的条目，所以出现名称不代表页面会显示。`alpha.2`（WispTerm 包括 `alpha.3`）会在加载时创建空的 `~/.config/<agent-id>` 目录；新版本不再以它作为检测依据，不用时可以手动删除。

这些包只注册 Agent：加载时不运行任何代码，也不负责供应商登录。供应商认证由 Magpie 的 Provider 管理。

## 配置约定

每个应用只读取 `~/.config/<agent-id>/magpie.json`，字段为 `baseURL`、`apiKey` 和 `model`。Windows 使用 `%USERPROFILE%\.config\<agent-id>\magpie.json`。该路径固定，不受 `XDG_CONFIG_HOME` 或应用原生配置目录影响。

Magpie 负责写入连接字段和恢复它们的原值；WispTerm `alpha.3` 另外写入 `modelInfo`，同步上下文容量、输出上限和推理档位。应用在运行时使用该配置，并保留原有个人设置。缺失、空对象或不合法的文件表示没有外部覆盖。详见[配置协议](docs/configuration.md)。

WispTerm 的[视觉修复（PR #697）](https://github.com/xuzhougeng/wispterm/pull/697)在应用读取端：包含该修复的构建默认允许图片输入，`magpie.json` 中的可选 `vision` 开关可显式控制，插件会保留它。旧构建硬编码关闭视觉，单独更新插件无法解决。修改后重启应用并新建会话，具体说明见[图片输入配置](docs/configuration.md#wispterm-图片输入)。

WispTerm 的[模型参数修复（PR #698）](https://github.com/xuzhougeng/wispterm/pull/698)配合插件 `alpha.3`，读取模型容量及用户的推理强度、输出限制等选项。上下文容量和最大输出 Token 分别显示；已有会话保留原快照，更新后请重启并新建会话。详见[模型参数配置](docs/configuration.md#wispterm-模型参数alpha3)。

## 开发与验证

开发检查需要 Node.js 22 或更新版本。`agent.js` 在 Magpie 的 moejs 中运行，是每个包唯一的代码文件。三个包均无第三方依赖，没有加载入口，也没有 npm 安装脚本。

```sh
npm run check
npm test
npm run pack
MAGPIE_BIN=/absolute/path/to/magpie npm run test:integration
```

集成测试使用独立 HOME、随机本地端口、虚拟 Provider 和假密钥。它安装三个打包产物，确认安装不创建文件，并确认 Agent 只在 PATH 中有应用命令或已接入时才被检测到；随后启动官方 Magpie 网关，验证请求路由、模型切换和原值恢复。可进一步启用三个应用自身的 HTTP 客户端探针，命令与结果见[验证记录](docs/verification.md)。

## 独立发布

每个子包独立维护版本。`npm run pack` 的产物位于 `artifacts/`。发布脚本默认仅预演：

```sh
npm run release -- agent-wispterm
# 确认要公开发布时才加 --publish：
npm run release -- agent-wispterm --publish
```

当前包使用 `alpha` 标签，安装时显式使用 `@alpha`，或固定为对应应用的已发布版本。

`registry.json` 的三个 `kind: "agent"` 条目已通过 [社区 PR #479](https://github.com/magpie-community/plugins/pull/479) 提交。维护者的审核要求是：npm 上有修复后的版本；Wisp Science 和 CiteBox 先发布包含读取代码的正式版；检测应用本身而不是创建目录。检测部分已在本仓库完成，声明桌面安装位置的能力等待 [yetone/magpie#4206](https://github.com/yetone/magpie/issues/4206)。PR 合并并刷新 registry 后，这些插件才会出现在插件搜索中。目前可使用上面的 npm 包名直接安装。仓库的 `magpie-plugin` topic 不能代替三个子包的独立登记。

插件 API 依据 [Magpie Agent 插件文档](https://usemagpie.ai/docs/plugins#agent-plugins)。版本兼容性和已发现的上游问题见验证记录。
