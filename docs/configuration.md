# 外部模型配置协议

本协议由三个应用共同采用，并非 Magpie 对所有应用的强制格式。

## 路径与字段

| Agent ID | 相对用户主目录的路径 |
| --- | --- |
| `wispterm` | `.config/wispterm/magpie.json` |
| `wisp-science` | `.config/wisp-science/magpie.json` |
| `citebox` | `.config/citebox/magpie.json` |

Unix 使用 HOME；Windows 使用 USERPROFILE。三个插件的路径与应用保持一致，不跟随 XDG_CONFIG_HOME、APPDATA 或 macOS Application Support。

```json
{
  "baseURL": "http://127.0.0.1:3425/v1",
  "apiKey": "example-gateway-key",
  "model": "provider/model"
}
```

这是格式示例。真实网关地址、端口和密钥取自 Magpie 提供的 `gateway.v1`、`gateway.key`，不在插件中硬编码；`model` 由 Magpie 按 Agent 的 `model: "model"` 声明写入。应用保留模型 ID 原文，使用 OpenAI Chat Completions，并正确拼接 `/chat/completions`。

文件最大 64 KiB，三个字段必须都是非空字符串、每项不超过 8192 字节，无首尾空白和 ASCII 控制字符。baseURL 必须为带主机名的 HTTP(S) URL，不包含内嵌认证、查询参数或片段。未知字段允许保留。格式错误、类型错误、文件不可读、缺失字段或 `{}` 均视为未接入，回退个人配置。

## 所有权与恢复

插件导出纯 `connect` 函数，返回 baseURL 和 apiKey；WispTerm 从 `alpha.3` 起、Wisp Science 从 `alpha.3` 起、CiteBox 从 `0.1.0` 起还返回所选模型的 `modelInfo` 对象。Magpie 自己备份、更新和恢复这些字段及声明的 model 字段。断开会恢复接入前的值；原来不存在的字段恢复为不存在。用户添加的其他字段不受影响。原本没有文件时，断开后允许保留 `{}`。

应用只读这个文件，不把其中的密钥写回原生设置、数据库、同步配置或系统钥匙串。保存个人模型设置不会覆盖此文件。文件本身包含网关访问凭据，不应提交到应用仓库。

若接入前已有完整且合法的 `magpie.json`，断开后恢复它，应用会继续使用恢复后的外部配置。接入前没有合法配置时，断开后回到应用的个人模型配置。

## 应用行为

- WispTerm：在最多 16 个个人配置之外增加一个只读 Magpie 配置，作为新会话默认；同名个人配置仍保留。已有会话保留其模型快照，用户仍可显式选择个人配置。Magpie 配置不写入 `ai_profiles`，也不改写已保存的默认模型名称。接入、切换和断开后重启应用。
- Wisp Science：进程首次读取后固定使用该配置，覆盖内置 HTTP 模型运行时，包括桌面与 CLI。个人模型编辑、凭据和验证仍使用原有配置。接入、切换和断开后重启应用；ACP 外部代理有自己的模型管理方式。
- CiteBox：每次新的 AI 操作读取配置，覆盖文本模型池的运行时端点、模型、密钥、最大输出和思考强度，同时保留模型 ID、场景绑定及提示词。个人设置的读取、保存和验证使用原配置。正在运行的操作保留已有快照，后续操作读取新配置。独立的图像生成等专用服务配置不由此协议管理。

基础协议不包含模型能力声明（三个应用另见下文的 `modelInfo`）。三个应用均以 Chat Completions 连接，图片输入、流式工具调用和供应商特有选项需由实际所选模型支持。

## WispTerm 图片输入

包含视觉修复的 WispTerm 构建默认允许 Magpie 配置附加图片；实际识图能力仍由所选模型决定。可在现有 `magpie.json` 对象中添加 `"vision": false` 关闭，或 `"vision": true` 开启。也接受 `"on"`/`"off"`、`"true"`/`"false"`、`"enabled"`/`"disabled"`；缺省或 null 使用开启的默认值，其他值视为无效配置。

这是用户字段，插件不会写入或覆盖它，切换模型和断开连接时也会保留。修改后重启 WispTerm 并新建会话；已有会话保留原快照。原生 `config` 或 `ai_profiles` 不控制这个只读 Magpie 配置。旧版 WispTerm 在读取代码中将视觉写死为关闭，必须升级应用，单独升级 npm 插件无法改变该行为。


## WispTerm 模型参数（alpha.3）

插件写入 `modelInfo: { id, context, output, efforts }`，只包含 Magpie 确知的模型信息。切换模型会更新该对象；未知值不会伪造为一个固定容量。断开时恢复接入前的对象。WispTerm 只使用 ID 与当前 `model` 匹配的快照，避免手动修改模型后沿用旧能力。

| 用户字段 | 默认值和作用 |
| --- | --- |
| `thinking` | 支持布尔值、enabled/disabled、on/off、true/false、auto。 |
| `reasoningEffort` | 有能力信息时优先 medium、其次 high、再取首个支持档位；未知时 auto，不强制关闭思考。用户可指定模型支持的档位或 auto。 |
| `maxTokens` | 最大输出 Token：采用模型的 output，未知时为 8192；显式正整数覆盖不得突破已知模型输出上限。 |
| `protocol` | chat_completions 或 responses；默认前者。这是 Magpie 网关协议，后端模型由 Magpie 转换。 |
| `stream`、`agent` | 布尔值，默认 true。 |
| `systemPrompt` | 可选系统提示文本。 |

例如，在原对象中添加 `"reasoningEffort": "high", "maxTokens": 32768`。这些字段归用户所有，插件不覆盖。已知模型不支持的显式推理档位会使配置无效，切换模型后需检查兼容性。修改后重启 WispTerm 并新建会话。

界面分别显示“最大输出 Token”和模型上下文容量。上下文来自 `modelInfo.context`，不会作为 `context_window` 请求参数发送，也不会新增自动截断或压缩对话。改变实际容量仍取决于 Magpie 和上游模型。Chat Completions 请求会发送 `max_tokens`，Responses 请求会发送 `max_output_tokens`；原生 Codex 订阅协议继续省略其不支持的该参数。

## Wisp Science 模型参数

Wisp Science 插件同样写入 `modelInfo: { id, context, output, efforts }`，规则与 WispTerm 相同：只写 Magpie 确知的正整数容量和合法档位名，未知值不写，只有 ID 时不写该对象。切换模型会更新它，断开时恢复接入前的值。应用只采用 ID 与当前 `model` 一致的快照；格式不对的 `modelInfo` 被忽略，不会让三项连接字段失效。

| 值 | 来源（依次回退） |
| --- | --- |
| 上下文容量 | `modelInfo.context`、应用内置模型目录（按模型 ID 精确匹配）、128000 |
| 最大输出 Token | `modelInfo.output`、模型目录、8192 |
| 推理档位 | `modelInfo.efforts`、模型目录；都未知时没有可选档位 |

思考强度在 Wisp Science 应用内设置，不使用 `magpie.json` 的用户字段：接入后，输入框旁的思考强度菜单只列出上述档位，选择保存在当前会话上（发送第一条消息前的选择用于新会话），不改写个人模型档案，也不写入网关密钥。默认档位依次取 medium、high、首个档位；会话选择了当前模型不支持的档位时回退到默认，不会让请求失败。没有档位信息时不发送 `reasoning_effort`，使用供应商默认，不强制关闭思考。CLI 的 `WISP_REASONING_EFFORT` 按同样规则生效。

需要包含对应读取逻辑的 Wisp Science 构建；切换模型后仍需重启应用。旧插件不写 `modelInfo` 时，应用按模型目录和默认值处理。

## CiteBox 模型参数

CiteBox 插件写入同样的 `modelInfo: { id, context, output, efforts }`，写入、切换和恢复规则与上文一致。应用只采用 ID 与当前 `model` 一致的快照；格式不对的 `modelInfo` 整体忽略，不影响三项连接字段。

| 值 | 来源 |
| --- | --- |
| 最大输出 Token | `modelInfo.output`；未知时 8192 |
| 推理档位 | `modelInfo.efforts`；未知时没有可选档位，不发送 `reasoning_effort`，使用供应商默认 |
| 默认档位 | 依次取 medium、high、首个档位 |

思考强度在 CiteBox 设置页“模型配置”的 Magpie 面板中设置，不使用 `magpie.json` 的用户字段。面板只列出上述档位，选择保存在 CiteBox 数据库的独立设置项中，不写入个人模型配置，也不包含网关地址或密钥；下一次 AI 操作生效，不需要重启。切换到不支持该档位的模型时使用默认档位，切回后恢复之前的选择。CiteBox 不再强制关闭思考或把输出固定为 8192；请求只发送 `reasoning_effort`，不发送部分网关使用的 `thinking` 开关。

AI 助手的检索规划和证据判定在回答前运行，返回简短 JSON。Magpie 接入时它们使用 low 档位（其次 minimal；用户已选更低档位时沿用），输出上限增加 4096 Token 供推理使用，超时从 20 秒放宽到 45 秒；失败时仍跳过该步骤照常回答。经 Magpie 调用 `codex/gpt-6.1-sol` 实测，检索规划在 low 约 13 秒、high 约 21 秒、xhigh 约 32 秒，12 条证据的判定在 low 约 22 秒。

需要包含对应读取逻辑的 CiteBox 构建。旧插件不写 `modelInfo` 时，应用使用 8192 输出上限，不发送推理档位。
