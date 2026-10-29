# Magpie Agents

为 [WispTerm](https://github.com/xuzhougeng/wispterm)、[Wisp Science](https://github.com/xuzhougeng/wisp-science) 和 [CiteBox](https://github.com/xuzhougeng/citebox) 提供独立的 Magpie Agent 插件。三个应用的主程序仍在各自仓库维护。

当前为 `0.1.0-alpha.1`，已完成本地打包和实际 Magpie 网关验证，**尚未发布 npm 包**。应用需要包含本次 `magpie.json` 读取代码的新构建；仅安装插件不能让旧版应用自动支持接入。

| 应用 | 包 | 接入、切换、断开后生效时间 |
| --- | --- | --- |
| WispTerm | `@xuzhougeng/magpie-agent-wispterm` | 重启应用 |
| Wisp Science | `@xuzhougeng/magpie-agent-wisp-science` | 重启应用或 CLI 进程 |
| CiteBox | `@xuzhougeng/magpie-agent-citebox` | 下一次 AI 操作 |

## 本地使用

先在 Magpie 配置模型供应商，再从本仓库安装所需插件：

```sh
magpie plugin add /absolute/path/to/magpie-agents/packages/agent-wispterm
magpie plugin add /absolute/path/to/magpie-agents/packages/agent-wisp-science
magpie plugin add /absolute/path/to/magpie-agents/packages/agent-citebox
```

安装后，插件会注册相应 Agent。可以在 Magpie 选择模型，或使用 CLI（将 `provider/model` 替换成已配置的模型）：

```sh
magpie wispterm magpie/provider/model
magpie wisp-science magpie/provider/model
magpie citebox magpie/provider/model
```

保持 Magpie 网关运行。断开某个应用时执行一次，例如 `magpie wispterm default`。WispTerm 和 Wisp Science 随后需要重启。首次接入前，如果应用二进制不在 PATH 且连接目录尚不存在，Magpie 可能显示 `not detected`；仍可通过上述 CLI 接入，它会创建配置目录。

这些包只注册 Agent，不负责供应商登录。供应商认证由 Magpie 的 Provider 管理。

## 配置约定

每个应用只读取 `~/.config/<agent-id>/magpie.json`，字段为 `baseURL`、`apiKey` 和 `model`。Windows 使用 `%USERPROFILE%\.config\<agent-id>\magpie.json`。该路径固定，不受 `XDG_CONFIG_HOME` 或应用原生配置目录影响。

Magpie 负责写入三个字段和恢复它们的原值；应用在运行时使用该配置，并保留原有个人设置。缺失、空对象或不合法的文件表示没有外部覆盖。详见[配置协议](docs/configuration.md)。

## 开发与验证

需要 Node.js 22 或更新版本；插件自身不依赖 Node API 或第三方包。

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

当前包使用 `alpha` 标签。发布后才能运行 `magpie plugin add @xuzhougeng/magpie-agent-wispterm@alpha`，其他两个包同理。

`registry.json` 是三个 `kind: "agent"` 条目的草稿。npm 发布后可将条目提交到[社区 registry](https://github.com/magpie-community/plugins)。仓库的 `magpie-plugin` topic 不能代替三个子包的独立登记。

插件 API 依据 [Magpie Agent 插件文档](https://usemagpie.ai/docs/plugins#agent-plugins)。版本兼容性和已发现的上游问题见验证记录。
