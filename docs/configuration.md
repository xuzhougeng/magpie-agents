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

插件导出纯 `connect({ gateway })` 函数，只返回 baseURL 和 apiKey。Magpie 自己备份、更新和恢复这两个字段及声明的 model 字段。断开会恢复接入前的值；原来不存在的字段恢复为不存在。用户添加的其他字段不受影响。原本没有文件时，断开后允许保留 `{}`。

应用只读这个文件，不把其中的密钥写回原生设置、数据库、同步配置或系统钥匙串。保存个人模型设置不会覆盖此文件。文件本身包含网关访问凭据，不应提交到应用仓库。

若接入前已有完整且合法的 `magpie.json`，断开后恢复它，应用会继续使用恢复后的外部配置。接入前没有合法配置时，断开后回到应用的个人模型配置。

## 应用行为

- WispTerm：在最多 16 个个人配置之外增加一个只读 Magpie 配置，作为新会话默认；同名个人配置仍保留。已有会话保留其模型快照，用户仍可显式选择个人配置。Magpie 配置不写入 `ai_profiles`，也不改写已保存的默认模型名称。接入、切换和断开后重启应用。
- Wisp Science：进程首次读取后固定使用该配置，覆盖内置 HTTP 模型运行时，包括桌面与 CLI。个人模型编辑、凭据和验证仍使用原有配置。接入、切换和断开后重启应用；ACP 外部代理有自己的模型管理方式。
- CiteBox：每次新的 AI 操作读取配置，覆盖文本模型池的运行时端点、模型和密钥，同时保留模型 ID、场景绑定及提示词。个人设置的读取、保存和验证使用原配置。正在运行的操作保留已有快照，后续操作读取新配置。独立的图像生成等专用服务配置不由此协议管理。

基础协议不包含模型能力声明。三个应用均以 Chat Completions 连接，图片输入、流式工具调用和供应商特有选项需由实际所选模型支持；本次网关验证覆盖文本请求。
