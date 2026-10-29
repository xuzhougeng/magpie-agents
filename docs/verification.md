# 验证记录

验证日期：2026-10-29 UTC（本地 US/Pacific 为 2026-10-28）。运行环境为 macOS arm64。

## 已验证的链路

使用官方 **Magpie v0.1.1986**，不是模拟其配置恢复实现。三包分别经过 `npm pack`，解压后通过 `magpie plugin add` 安装。网关连接本地虚拟 Provider `fixture`，提供 `first`、`second` 两个模型。

每个插件均验证：

1. 安装后注册 Agent，连接时写入运行时网关地址、访问密钥和原样模型 ID。
2. `fixture/first` 和 `fixture/second` 都能通过网关到达上游；上游接收到对应模型名及供应商密钥。
3. 应用自身的读取代码与 HTTP 客户端也分别完成两次真实 HTTP 请求。WispTerm 使用实际平台 HTTP 实现；Wisp Science 使用 `wisp-llm` Provider；CiteBox 使用 `AIService` 的运行时设置和 Provider 调用。
4. 切换模型不会覆盖第一次接入前的备份；正常断开恢复原端点、密钥和模型。
5. 连接期间添加的无关字段被保留；原本缺失的字段、布尔值、数字和 null 均按原类型恢复。
6. 原本没有配置文件时，连接、切换、断开完成后允许文件缺失或 `{}`，应用回到个人模型。

所有请求均使用假密钥和本地测试响应，不消耗真实供应商额度。测试 HOME、数据库和 Magpie 设置均与用户环境隔离。

## 检查结果

| 检查 | 结果 |
| --- | --- |
| 三包静态检查、Node 单元测试 | 通过，6 项测试 |
| 三包独立打包 | 通过，每包只有 agent.js、package.json、README 和 LICENSE |
| 官方 Magpie 生命周期与三应用 HTTP 联调 | 通过，三个子测试，六次应用客户端请求 |
| WispTerm `zig build test` | 通过 |
| WispTerm `zig build test-full -Dtarget=aarch64-macos` | 通过 |
| WispTerm Windows 文件路径检查 | 无非法路径、大小写冲突或符号链接 |
| Wisp Science `cargo test -p wisp-llm magpie --offline` | 通过，3 项测试 |
| Wisp Science CLI、桌面 `cargo check` | 通过，仍有原有的编译警告 |
| Wisp Science 个人模型设置验证隔离测试 | 通过，1 项桌面测试 |
| Wisp Science `cargo fmt --all -- --check` | 通过 |
| CiteBox Magpie 解析和运行时测试 | 通过 |
| CiteBox `make ci` | 通过：180 项 JavaScript 测试、PowerShell 脚本测试、完整 Go 测试 |

工具版本：Zig 0.15.2、Rust 1.99.0、Go 1.27.3、Node 22.23.4、PowerShell 7.5.4。CiteBox CI 指定 Node 22；最初用本机 Node 26.11.1 执行时，一个既有测试假定 `Map.prototype.getOrInsertComputed` 不存在而失败。换用 Node 22 后 180 项全部通过，没有修改该前端测试。

这里验证的是插件生命周期、原配置保护与文本 HTTP 请求。没有执行三个应用桌面 GUI 的逐项点击测试、Windows/Linux 构建、真实供应商付费请求，或流式工具调用及图片生成验证。应用仍需包含对应读取逻辑的新构建。npm 安装及社区 registry 状态见仓库 README。

## Agent 页显示回归

在 Magpie **v0.1.1992** 的真实 macOS 页面复现：三包均已安装并启用，但 WispTerm 和 CiteBox 没有 PATH 命令，也没有 `~/.config/<agent-id>` 目录，因此不出现在 Agent 页。原测试仅断言 `magpie agents` 包含名称，无法发现这个问题。

`0.1.0-alpha.2` 增加 `setup.mjs` 加载入口（下一版已撤销，见[检测应用本身](#检测应用本身)）：Magpie 安装并加载插件时，由其 Bun 插件进程创建空接入目录。`agent.js` 仍使用 moejs，只声明连接字段。没有 npm 安装脚本，没有初始化模型、密钥或配置文件；重复加载保持已有内容和权限，遇到同名文件冲突会报错而不是替换它。

修复后的集成测试在全新 HOME 中安装三个打包产物，在执行其他命令之前断言各自目录已自动创建且为空；随后在没有应用命令的 PATH 下断言 `magpie ls` 检测到三者。测试不再手动创建目录来满足检测条件。

还用隔离 HOME 的官方 Magpie v0.1.1992 Web 界面验证了插件加载自动创建目录，并在点击“重新检测本机的 Agent”后确认三个条目可见。Agent 页有缓存，已打开的页面可能需要点击重新检测。npm 安装会准备 Magpie 自带的 Bun；本地源码 GUI 测试也必须提供该运行时，仅把 Bun 放进 PATH 不会被 GUI 的 `HasBun()` 检查识别。

v0.1.1992 回归结果：静态检查、15 项单元测试，以及包含自动初始化检测和三应用配置生命周期的 5 项集成测试全部通过。此次回归没有重新运行三个应用客户端探针，上面的应用 HTTP 联调结果来自 v0.1.1986。

发布后又从公共 npm registry 下载三个 `0.1.0-alpha.2` 包，验证 registry 的 SHA-512 完整性，并逐字节比对本地已测试的打包产物。在全新 HOME 中分别执行 `magpie plugin add <包名>@alpha`，确认安装直接创建空目录，安装版本为 `0.1.0-alpha.2`，且 `magpie ls` 检测到全部三个 Agent。本机已有的三个插件也已升级；升级前后 `magpie.json` 的存在状态、内容摘要和文件权限一致。

## WispTerm 图片输入回归

WispTerm 的旧 Magpie 读取代码将 `vision` 硬编码为 `off`，且忽略外部文件同名字段。[WispTerm PR #697](https://github.com/xuzhougeng/wispterm/pull/697) 改为默认允许图片输入，并读取用户可选的 `vision` 开关；本次不改变插件写入的三个连接字段，也不需要新的 npm 插件版本。

完整应用测试通过：`zig build test-full -Dtarget=aarch64-macos --summary all`，65 个构建步骤成功、17,529 项通过、149 项条件跳过。公开的 `alpha.2` 插件产物搭配修复后的 WispTerm 探针，在官方 Magpie v0.1.1992 下通过全部 6 项集成测试。探针使用真实请求序列化和 macOS HTTP 实现：缺省、true、`"on"` 时，一个校验正确的 PNG 经网关原样到达本地虚拟上游；false、`"off"` 时没有图片块。原有视觉偏好在模型切换和断开恢复时保留。

这验证图片请求传输，不验证真实模型的识图质量，也没有重新执行 Wisp Science 和 CiteBox 的应用客户端探针。图片输入仍要求上游模型支持。编译上面的 WispTerm 探针后，可单独启用这一回归：

```sh
MAGPIE_BIN=/absolute/path/to/magpie \
WISPTERM_PROBE_BIN=/tmp/wispterm-magpie-probe \
MAGPIE_VERIFY_VISION=1 npm run test:integration
```

## WispTerm 推理与模型容量回归

`0.1.0-alpha.3` 将 Magpie 提供的模型上下文容量、输出上限和推理档位写入独立的 `modelInfo` 快照。WispTerm 采用与当前模型 ID 匹配的信息生成默认值，并读取用户的 `thinking`、`reasoningEffort`、`maxTokens`、`protocol`、`stream`、`agent` 和 `systemPrompt`。上下文容量只用于显示，不冒充最大输出长度，也不新增自动压缩行为。

在官方 Magpie v0.1.1992、隔离 HOME 和本地虚拟 Provider 下，打包后的三个插件通过全部 7 项集成测试。WispTerm 使用真实序列化和 macOS HTTP 客户端验证：模型切换更新容量和默认推理强度；用户推理强度与输出上限在 Chat Completions、Responses 两种协议下到达上游；切换不会覆盖用户选项；断开恢复原始 `modelInfo` 对象；图片输入回归继续通过。Responses 路径包含 Magpie 到上游 Chat Completions 的协议转换。

静态检查与 16 项 Node 单元测试通过。WispTerm 最终 `zig build test-full -Dtarget=aarch64-macos --summary all` 为 65/65 步骤成功，17,566 项测试通过、149 项条件跳过；macOS ReleaseFast 应用构建为 27/27 步骤成功。此轮没有重新运行 Wisp Science、CiteBox 的应用客户端，也没有调用真实付费模型。

发布后从公共 npm registry 下载 WispTerm `alpha.3`，SHA-512 和逐字节比对均通过。本机通过 npm `@alpha` 安装，验证安装代码一致，并保持当前模型、现有连接值和文件权限，仅刷新 `modelInfo`。Magpie 安装加载时可能自动重新应用已有连接，因此安装后的文件内容会多出该模型快照。

## 检测应用本身

社区维护者在 [magpie-community/plugins#479](https://github.com/magpie-community/plugins/pull/479) 指出：插件加载时创建 `~/.config/<agent-id>` 会让 Magpie 把未安装的应用报告为已安装，检测应当找到应用本身。WispTerm `0.1.0-alpha.4`、CiteBox 和 Wisp Science `0.1.0-alpha.3` 因此删除了 `setup.mjs` 和 `package.json` 的 `main`，也不再声明 `dir`。每个包只剩 `agent.js`，加载时不运行任何代码，也不创建文件。

依据 Magpie 当前源码（`internal/agentplug` 的 `Desc` 和 `internal/agent` 的 `Detected`）：插件只能声明 `bin`（在 PATH 中查找命令）和 `dir`（目录存在即视为检测到）；配置文件存在也算检测到。内置桌面 Agent 使用的 macOS bundle、`%LOCALAPPDATA%\Programs` 和注册表检测（`desktopApps`、`HasApp`）没有对插件开放。三个应用的桌面版都不会在 PATH 中放置命令，所以已向上游提交 [yetone/magpie#4206](https://github.com/yetone/magpie/issues/4206)，提议在插件中声明桌面应用。在此之前，只装了桌面版的用户需要先用 CLI 接入一次。

在官方 Magpie v0.1.1992、隔离 HOME 和本地虚拟 Provider 下，三个新打包产物通过全部 6 项集成测试：

1. 安装后不存在 `~/.config/<agent-id>`。
2. PATH 中没有应用命令、也未接入时，`magpie ls` 不报告任何一个 Agent。
3. 在 PATH 中放入与 `bin` 同名的可执行文件后，三者都被检测到，且仍未创建任何目录。
4. 在没有预先创建目录的情况下，`magpie <id> fixture/first` 能完成接入，Magpie 会自己写入 `magpie.json`，之后 Agent 被检测到；断开后恢复原状态。
5. 三个应用原有的配置保护、模型切换和恢复测试保持通过。

静态检查和 7 项 Node 单元测试通过；原先针对 `setup.mjs` 的 9 项测试随文件一并删除。此轮没有运行三个应用的客户端探针（检测改动不影响应用读取 `magpie.json`），也没有在 Windows、Linux 或桌面 GUI 中逐项点击验证。

## 已确认的 Magpie 上游问题

Magpie v0.1.1986 的连续断开并不幂等。当 `magpie.json` 原先包含 `model` 时：

```text
原始文件 → 接入 → 切换 → default：正确恢复原 model
再次 default：删除刚恢复的 model
```

三个 Agent 均复现了该行为。正常的一次断开通过全部恢复断言。插件只声明字段和连接值，备份/恢复由 Magpie 实现，应用个人设置在另一个存储中。因此目前每次连接只执行一次 `default`；集成测试不会把第二次断开误记为通过。升级 Magpie 后应重新验证此项。

## 复现插件测试

从[官方 Magpie 发布页](https://github.com/yetone/magpie-releases/releases)获取 CLI。本次使用的 macOS arm64 二进制 SHA-256 为：

```text
79e326cbc83a070d5111259d18ff6a8cc3f42646cc7e2a521de6d345d19293a1
```

```sh
npm run check
npm test
npm run pack
MAGPIE_BIN=/absolute/path/to/magpie npm run test:integration
```

Magpie 可能需要在隔离 HOME 中下载 Bun。可设置 `MAGPIE_TEST_BUN=/absolute/path/to/bun`，测试会把它复制到隔离 PATH，避免重复下载。网关和测试服务器会在结束后停止，临时配置随之删除。

## 加入三个应用客户端

以下命令在各主程序仓库执行，需要包含本次代码。路径按本机实际位置替换。

WispTerm（macOS，Zig 0.15.2）：

```sh
magpie_sdk_path=$(xcrun --show-sdk-path)
zig build-exe src/test_magpie_gateway.zig \
  -x objective-c src/platform/http_client_macos_bridge.m -x none \
  -lc -lobjc -framework Foundation -framework CoreFoundation \
  -F "$magpie_sdk_path/System/Library/Frameworks" \
  -I "$magpie_sdk_path/usr/include" -L "$magpie_sdk_path/usr/lib" \
  -femit-bin=/tmp/wispterm-magpie-probe
```

Wisp Science：

```sh
cargo build -p wisp-llm --example magpie_probe --offline
```

CiteBox：

```sh
go test -c -o /tmp/citebox-magpie.test ./internal/service
```

回到插件仓库运行：

```sh
MAGPIE_BIN=/absolute/path/to/magpie \
MAGPIE_VERIFY_APPS=1 \
WISPTERM_PROBE_BIN=/tmp/wispterm-magpie-probe \
WISP_SCIENCE_PROBE_BIN=/absolute/path/to/wisp-science/target/debug/examples/magpie_probe \
CITEBOX_PROBE_BIN=/tmp/citebox-magpie.test \
npm run test:integration
```

驱动器为每次应用探针设置 `MAGPIE_TEST_CONFIG`，要求上游请求数增加且模型/认证正确。设置 `MAGPIE_VERIFY_APPS=1` 时缺少任意探针会失败，不能把仅 Node 请求验证当作三应用联调。
