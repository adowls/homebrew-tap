# adowls/tap

自定义 Homebrew Tap，提供少量 macOS Cask。普通 Cask 直接跟随上游发布；FileZilla 和 Muse 由仓库内同步器下载、镜像到 GitHub Releases，并自动维护 Cask 元数据。

## 安装

```bash
brew install adowls/tap/<cask>
```

或先添加 Tap：

```bash
brew tap adowls/tap
brew install <cask>
```

也可在 `Brewfile` 中使用：

```ruby
tap "adowls/tap"
brew "<cask>"
```

## 包含的 Cask

| Cask | 说明 | 更新方式 |
| --- | --- | --- |
| `double-commander` | 双栏文件管理器 | 上游 livecheck + 自动 bump |
| `filezilla` | FTP、FTPS、SFTP 客户端 | 专用同步器镜像到 GitHub Releases |
| `i4tools` | 爱思助手 | 上游 livecheck + 自动 bump |
| `mediainfoex` | MediaInfo Finder 扩展 | 上游 livecheck + 自动 bump |
| `muse` | Muse AI 客户端 | 专用同步器镜像到 GitHub Releases |
| `zap` | Zed Attack Proxy | 上游 livecheck + 自动 bump |

## 自动化

### `sync-apps.yml`

- 每天 UTC 03:00（北京时间 11:00）运行，也支持手动触发。
- 读取 `updater/apps.json`。
- 在 Linux runner 中用 Playwright 伪装 macOS 会话。
- 下载策略按优先级执行：
  1. 抓取页面中渲染出的安装包直链。
  2. 点击 `clickSelector` 指定的下载按钮。
  3. 访问 `fallbackUrl` 作为会话内降级入口。
- 计算安装包 SHA-256。
- 发布 GitHub Release：`<id>-v<version>`。
- 更新或生成 `Casks/<id>.rb`，并提交到本仓库。

### `auto-bump.yml`

- 每天 UTC 02:00（北京时间 10:00）运行，也支持手动触发。
- 使用 `brew livecheck` 检查普通 Cask。
- 替换版本号后下载安装包、重新计算 SHA-256，并提交变更。

## 添加新的同步 App

在 `updater/apps.json` 中添加一条配置：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 唯一标识，用于 Release tag 和 Cask 文件名，例如 `muse`。 |
| `name` | 是 | 展示名称。 |
| `desc` | 否 | 写入 Cask 的描述。 |
| `homepage` | 是 | 官网地址，也用作 Playwright Referer。 |
| `pageUrl` | 是 | 包含版本信息或下载入口的页面。 |
| `versionRegex` | 是 | 版本提取正则；第一个捕获组必须是版本号。 |
| `clickSelector` | 是 | 下载按钮选择器，支持 Playwright 文本选择器。 |
| `fallbackClickSelector` | 否 | 二级页面的继续下载选择器。 |
| `downloadLinkSelector` | 否 | 优先读取的直链元素选择器。 |
| `directFilePattern` | 否 | 覆盖默认直链文件类型正则。 |
| `fallbackUrl` | 否 | 按钮下载失败时访问的降级 URL。 |
| `appBundle` | 否 | 解压/挂载后的 App 名称，例如 `Muse.app`。 |

默认直链识别覆盖：

```text
.dmg
.pkg
.zip
.app.tar.bz2
.app.tar.gz
.tar.bz2
.tar.gz
```

如果某个页面上有同名但非 macOS 的 `.zip` 或 tar 包，使用 `directFilePattern` 收紧匹配，例如：

```json
"directFilePattern": "Muse[_-][0-9.]+\\.dmg(?:[?#]|$)"
```

## 本地运行

```bash
cd updater
npm install
npx playwright install chromium

GITHUB_REPOSITORY=adowls/homebrew-tap \
GITHUB_TOKEN=<token> \
node sync-apps.mjs
```

注意：同步器会直接创建 Release 并修改 Cask，正式验证前不要指向生产仓库随意运行。
